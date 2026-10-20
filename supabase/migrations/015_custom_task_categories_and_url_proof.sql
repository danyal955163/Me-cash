-- Apply manually in the Supabase SQL Editor before deploying code that uses these fields.

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 60),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_name_case_insensitive_unique
  ON public.categories (lower(btrim(name)));
CREATE INDEX IF NOT EXISTS categories_sort_order_name_idx
  ON public.categories (sort_order, lower(name));

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.categories FROM anon, authenticated;
GRANT ALL ON TABLE public.categories TO service_role;

INSERT INTO public.categories (name, sort_order)
SELECT seed.name, seed.sort_order
FROM (VALUES
  ('Download & Play', 10),
  ('Share Message', 20),
  ('Social Post', 30),
  ('Simple Tasks', 40)
) AS seed(name, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories AS existing
  WHERE lower(btrim(existing.name)) = lower(btrim(seed.name))
);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS require_url_proof boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tasks_category_id_fkey'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- Preserve existing category placement while replacing the legacy enum with category IDs.
UPDATE public.tasks AS task
SET category_id = category.id
FROM public.categories AS category
WHERE task.category_id IS NULL
  AND lower(btrim(category.name)) = CASE lower(btrim(coalesce(task.category, 'simple')))
    WHEN 'download_play' THEN 'download & play'
    WHEN 'share_message' THEN 'share message'
    WHEN 'social_post' THEN 'social post'
    WHEN 'simple' THEN 'simple tasks'
    ELSE lower(btrim(task.category))
  END;

CREATE INDEX IF NOT EXISTS tasks_category_id_status_created_idx
  ON public.tasks(category_id, status, created_at DESC);

ALTER TABLE public.task_accounts
  ADD COLUMN IF NOT EXISTS assigned_username text;

DROP FUNCTION IF EXISTS public.assign_task_account(uuid, uuid);
CREATE OR REPLACE FUNCTION public.assign_task_account(
  p_task_id uuid,
  p_user_id uuid,
  p_username text
)
RETURNS TABLE(email text, password text, status text, assigned_username text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_account_id uuid;
  v_email text;
  v_password text;
  v_status text;
  v_assigned_username text;
  v_requested_username text := nullif(btrim(p_username), '');
BEGIN
  IF p_task_id IS NULL OR p_user_id IS NULL
     OR v_requested_username IS NULL
     OR char_length(v_requested_username) > 64 THEN
    RAISE EXCEPTION 'invalid_assignment_request' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = p_task_id AND is_account_task = true AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'task_not_available' USING ERRCODE = 'P0001';
  END IF;

  -- Serialize retries for the same user/task pair and lock each inventory row while assigning it.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_task_id::text || ':' || p_user_id::text, 0));

  SELECT ta.id, ta.email, ta.password, ta.status, ta.assigned_username
    INTO v_account_id, v_email, v_password, v_status, v_assigned_username
    FROM public.task_accounts AS ta
    WHERE ta.task_id = p_task_id
      AND ta.assigned_to = p_user_id
      AND ta.status IN ('assigned', 'completed')
    LIMIT 1;

  IF FOUND THEN
    IF v_assigned_username IS NULL THEN
      UPDATE public.task_accounts AS ta
        SET assigned_username = v_requested_username
        WHERE ta.id = v_account_id;
      v_assigned_username := v_requested_username;
    END IF;
    RETURN QUERY SELECT v_email, v_password, v_status, v_assigned_username;
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
    SET assigned_to = p_user_id,
        assigned_username = v_requested_username,
        status = 'assigned',
        assigned_at = now()
    WHERE ta.id = v_account_id
    RETURNING ta.email, ta.password, ta.status, ta.assigned_username
      INTO v_email, v_password, v_status, v_assigned_username;

  RETURN QUERY SELECT v_email, v_password, v_status, v_assigned_username;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_task_account(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_task_account(uuid, uuid, text) TO service_role;
