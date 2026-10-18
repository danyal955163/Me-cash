-- Notification types used for task/referral/withdrawal activity.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check check (type in (
    'task_submitted', 'task_approved', 'task_rejected',
    'withdrawal_requested', 'withdrawal_approved', 'withdrawal_rejected',
    'referral_activity', 'referral_bonus', 'referral_milestone', 'referral_completed',
    'announcement', 'bonus'
  ));

-- Allow the requested one-time reward transaction type.
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions
  add constraint transactions_type_check
  check (type in ('task_reward', 'referral_bonus', 'referral_milestone', 'withdrawal', 'refund', 'adjustment', 'bonus'));

-- Serialize claims per user, inspect the ledger, credit the wallet and record the
-- transaction atomically. The API invokes this only via a server-side service-role client.
create or replace function public.claim_whatsapp_channel_bonus(p_user_id uuid)
returns table(already_claimed boolean, coins_awarded integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':whatsapp-channel-bonus', 0));

  if exists (
    select 1
    from public.transactions t
    where t.user_id = p_user_id
      and t.description = 'WhatsApp channel bonus'
  ) then
    return query select true, 0;
    return;
  end if;

  perform public.increment_wallet_coins(p_user_id, 1000);
  insert into public.transactions(user_id, type, amount, description)
  values (p_user_id, 'bonus', 1000, 'WhatsApp channel bonus');

  return query select false, 1000;
end;
$$;

revoke all on function public.claim_whatsapp_channel_bonus(uuid) from public, anon, authenticated;
grant execute on function public.claim_whatsapp_channel_bonus(uuid) to service_role;
