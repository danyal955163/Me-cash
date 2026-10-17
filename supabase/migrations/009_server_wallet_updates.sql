-- Server-side wallet updates are now performed by authenticated API routes using the service-role client.
-- Remove legacy triggers so approvals, exchanges, and withdrawals cannot apply wallet changes twice.
drop trigger if exists on_submission_approval on task_submissions;
drop trigger if exists on_withdrawal_status on withdrawals;
drop trigger if exists on_exchange_created on exchanges;

alter table transactions drop constraint if exists transactions_type_check;
alter table transactions add constraint transactions_type_check check (type in ('task_reward','referral_bonus','referral_milestone','withdrawal','refund','adjustment'));

create or replace function public.increment_wallet_coins(p_user_id uuid,p_coins numeric)
returns void language plpgsql security definer set search_path=public as $$
begin
  update wallets set coin_balance=coalesce(coin_balance,0)+p_coins,total_coins_earned=coalesce(total_coins_earned,0)+p_coins,updated_at=now() where user_id=p_user_id;
  if not found then raise exception 'Wallet not found for user %',p_user_id; end if;
end; $$;

create or replace function public.increment_wallet_red_pocket(p_user_id uuid,p_amount numeric)
returns void language plpgsql security definer set search_path=public as $$
begin
  update wallets set red_pocket_balance=coalesce(red_pocket_balance,0)+p_amount,total_red_pocket_earned=coalesce(total_red_pocket_earned,0)+case when p_amount>0 then p_amount else 0 end,updated_at=now() where user_id=p_user_id;
  if not found then raise exception 'Wallet not found for user %',p_user_id; end if;
end; $$;

create or replace function public.decrement_wallet_red_pocket(p_user_id uuid,p_amount numeric)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  update wallets set red_pocket_balance=red_pocket_balance-p_amount,updated_at=now() where user_id=p_user_id and coalesce(red_pocket_balance,0)>=p_amount;
  return found;
end; $$;
