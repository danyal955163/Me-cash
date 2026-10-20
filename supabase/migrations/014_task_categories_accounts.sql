-- Apply manually in the Supabase SQL Editor before enabling the new task-account UI.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'simple',
  ADD COLUMN IF NOT EXISTS is_account_task boolean NOT NULL DEFAULT false;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_category_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_category_check
  CHECK (category IN ('download_play', 'share_message', 'social_post', 'simple'));

CREATE INDEX IF NOT EXISTS tasks_category_status_created_idx
  ON public.tasks(category, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.task_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  email text NOT NULL,
  password text NOT NULL,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'assigned', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_accounts_assignment_state_check CHECK (
    (status = 'available' AND assigned_to IS NULL AND assigned_at IS NULL)
    OR (status IN ('assigned', 'completed') AND assigned_to IS NOT NULL AND assigned_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS task_accounts_task_email_unique
  ON public.task_accounts(task_id, lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS task_accounts_task_user_unique
  ON public.task_accounts(task_id, assigned_to)
  WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS task_accounts_available_idx
  ON public.task_accounts(task_id, created_at, id)
  WHERE status = 'available';

-- Credentials are sensitive: only service-role routes/functions may access this table.
ALTER TABLE public.task_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.task_accounts FROM anon, authenticated;
GRANT ALL ON TABLE public.task_accounts TO service_role;

CREATE OR REPLACE FUNCTION public.assign_task_account(p_task_id uuid, p_user_id uuid)
RETURNS TABLE(email text, password text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_email text;
  v_password text;
  v_status text;
BEGIN
  IF p_task_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_assignment_request' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = p_task_id AND is_account_task = true AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'task_not_available' USING ERRCODE = 'P0001';
  END IF;

  -- Serialize simultaneous retries by the same user, while row-locking different users' picks below.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_task_id::text || ':' || p_user_id::text, 0));

  SELECT ta.email, ta.password, ta.status
    INTO v_email, v_password, v_status
    FROM public.task_accounts AS ta
    WHERE ta.task_id = p_task_id
      AND ta.assigned_to = p_user_id
      AND ta.status IN ('assigned', 'completed')
    LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_email, v_password, v_status;
    RETURN;
  END IF;

  SELECT ta.id
    INTO v_account_id
    FROM public.task_accounts AS ta
    WHERE ta.task_id = p_task_id AND ta.status = 'available'
    ORDER BY ta.created_at, ta.id
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'no_available_account' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.task_accounts AS ta
    SET assigned_to = p_user_id, status = 'assigned', assigned_at = now()
    WHERE ta.id = v_account_id
    RETURNING ta.email, ta.password, ta.status
      INTO v_email, v_password, v_status;

  RETURN QUERY SELECT v_email, v_password, v_status;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_task_account(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_task_account(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_task_account_completed_after_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    UPDATE public.task_accounts
      SET status = 'completed'
      WHERE task_id = NEW.task_id
        AND assigned_to = NEW.user_id
        AND status = 'assigned';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_account_submission_approval ON public.task_submissions;
CREATE TRIGGER on_task_account_submission_approval
  AFTER UPDATE OF status ON public.task_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_task_account_completed_after_approval();
