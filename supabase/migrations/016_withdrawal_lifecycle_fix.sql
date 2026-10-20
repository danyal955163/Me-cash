-- Withdrawal lifecycle fix:
-- reserve RP exactly once when a request is created; approval only changes status;
-- rejection refunds the reservation without increasing lifetime earnings.
create or replace function public.process_withdrawal(p_user_id uuid, p_amount numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then
    return false;
  end if;
  update public.wallets
  set red_pocket_balance = coalesce(red_pocket_balance, 0) - p_amount,
      updated_at = now()
  where user_id = p_user_id
    and coalesce(red_pocket_balance, 0) >= p_amount;
  return found;
end;
$$;

create or replace function public.refund_withdrawal_rp(p_user_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.wallets
  set red_pocket_balance = coalesce(red_pocket_balance, 0) + p_amount,
      updated_at = now()
  where user_id = p_user_id;
  if not found then raise exception 'Wallet not found'; end if;
end;
$$;

create or replace function public.increment_withdrawn_rp(p_user_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.wallets
  set total_red_pocket_withdrawn = coalesce(total_red_pocket_withdrawn, 0) + p_amount,
      updated_at = now()
  where user_id = p_user_id;
  if not found then raise exception 'Wallet not found'; end if;
end;
$$;

revoke all on function public.process_withdrawal(uuid, numeric) from public, anon, authenticated;
revoke all on function public.refund_withdrawal_rp(uuid, numeric) from public, anon, authenticated;
revoke all on function public.increment_withdrawn_rp(uuid, numeric) from public, anon, authenticated;
grant execute on function public.process_withdrawal(uuid, numeric) to service_role;
grant execute on function public.refund_withdrawal_rp(uuid, numeric) to service_role;
grant execute on function public.increment_withdrawn_rp(uuid, numeric) to service_role;

-- Keep any legacy trigger disabled even if an older migration was applied.
drop trigger if exists on_withdrawal_status on public.withdrawals;
