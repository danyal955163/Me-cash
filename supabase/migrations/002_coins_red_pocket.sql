-- Step 3: dual wallet, exchange milestones, referral rewards.
alter table wallets rename column balance to coin_balance;
alter table wallets add column if not exists red_pocket_balance numeric default 0 check (red_pocket_balance >= 0);
alter table wallets add column if not exists total_coins_earned numeric default 0 check (total_coins_earned >= 0);
alter table wallets add column if not exists total_coins_exchanged numeric default 0 check (total_coins_exchanged >= 0);
alter table wallets add column if not exists total_red_pocket_earned numeric default 0 check (total_red_pocket_earned >= 0);
alter table wallets add column if not exists total_red_pocket_withdrawn numeric default 0 check (total_red_pocket_withdrawn >= 0);
alter table tasks add column if not exists reward_coins numeric default 0 check (reward_coins >= 0);
alter table withdrawals add column if not exists red_pocket_amount numeric not null default 0 check (red_pocket_amount >= 200);
alter table referrals add column if not exists referred_tasks_count int default 0 check (referred_tasks_count >= 0);
alter table referrals add column if not exists total_coins_earned numeric default 0;
alter table referrals add column if not exists total_red_pocket_earned numeric default 0;
alter table referrals add column if not exists is_reward_active boolean default true;

drop table if exists exchanges cascade;
create table exchanges (id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade not null, coins_spent numeric not null check (coins_spent in (200000,500000,1000000)), red_pocket_received numeric not null check (red_pocket_received > 0), milestone numeric not null, created_at timestamptz default now());
create table if not exists referral_earnings (id uuid primary key default gen_random_uuid(), referrer_id uuid references profiles(id) on delete cascade, referred_user_id uuid references profiles(id) on delete cascade, task_id uuid references tasks(id) on delete set null, submission_id uuid references task_submissions(id) on delete set null, coins_earned numeric default 0, red_pocket_earned numeric default 0, created_at timestamptz default now());

create or replace function public.handle_exchange() returns trigger language plpgsql security definer set search_path=public as $$
begin
 update wallets set coin_balance=coin_balance-new.coins_spent,total_coins_exchanged=total_coins_exchanged+new.coins_spent,red_pocket_balance=red_pocket_balance+new.red_pocket_received,total_red_pocket_earned=total_red_pocket_earned+new.red_pocket_received where user_id=new.user_id and coin_balance>=new.coins_spent;
 if not found then raise exception 'Insufficient coins'; end if;
 insert into transactions(user_id,type,amount,description,reference_id) values(new.user_id,'adjustment',new.coins_spent,'Coin exchange to Red Pocket',new.id);
 return new;
end; $$;
drop trigger if exists on_exchange_created on exchanges;
create trigger on_exchange_created after insert on exchanges for each row execute function public.handle_exchange();

create or replace function public.handle_withdrawal_status() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='approved' and old.status='pending' then update wallets set total_red_pocket_withdrawn=total_red_pocket_withdrawn+new.red_pocket_amount where user_id=new.user_id;
 elsif new.status='rejected' and old.status='pending' then update wallets set red_pocket_balance=red_pocket_balance+new.red_pocket_amount where user_id=new.user_id; end if;
 return new;
end; $$;
drop trigger if exists on_withdrawal_status on withdrawals;
create trigger on_withdrawal_status after update on withdrawals for each row execute function public.handle_withdrawal_status();

insert into settings(key,value) values ('coins_per_red_pocket','1000'),('exchange_milestones','[200000,500000,1000000]'),('min_withdrawal_red_pocket','200'),('referral_coins_per_task','500'),('referral_rp_every_n_tasks','5'),('referral_max_tasks','30'),('admin_emails','["muhammaddanyal4545@gmail.com"]') on conflict(key) do nothing;
alter table exchanges enable row level security;
create policy "users read own exchanges" on exchanges for select using(auth.uid()=user_id);
alter table referral_earnings enable row level security;
create policy "users read own referral earnings" on referral_earnings for select using(auth.uid()=referrer_id);
