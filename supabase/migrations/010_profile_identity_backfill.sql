-- Apply manually in Supabase SQL Editor. This migration is intentionally not executed by the app agent.
alter table profiles add column if not exists username text;
alter table transactions drop constraint if exists transactions_type_check;
alter table transactions add constraint transactions_type_check check (type in ('task_reward','referral_bonus','referral_milestone','withdrawal','refund','exchange','adjustment'));
drop trigger if exists on_submission_approval on task_submissions;
drop trigger if exists on_withdrawal_status on withdrawals;
drop trigger if exists on_exchange_created on exchanges;
create or replace function public.increment_withdrawn_rp(p_user_id uuid,p_amount numeric) returns void language plpgsql security definer set search_path=public as $$ begin update wallets set total_red_pocket_withdrawn=coalesce(total_red_pocket_withdrawn,0)+p_amount,updated_at=now() where user_id=p_user_id; if not found then raise exception 'Wallet not found'; end if; end; $$;

create unique index if not exists profiles_username_unique on profiles(username);

-- Generate stable usernames at signup and preserve metadata full name/phone.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare referrer uuid; code text; avatar text;
begin
  code := 'mecash' || lower(substr(replace(gen_random_uuid()::text,'-',''),1,3));
  avatar := '/avatars/' || (1 + floor(random()*15))::int || '.png';
  if new.raw_user_meta_data->>'referral_code' is not null then
    select id into referrer from profiles where (username=new.raw_user_meta_data->>'referral_code' or referral_code=new.raw_user_meta_data->>'referral_code') and id<>new.id limit 1;
  end if;
  insert into profiles(id,email,full_name,phone,referral_code,username,avatar_url,referred_by,role)
  values(new.id,new.email,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'User'),nullif(new.raw_user_meta_data->>'phone',''),code,code,avatar,referrer,case when lower(new.email)='muhammaddanyal4545@gmail.com' then 'admin' else 'user' end)
  on conflict(id) do nothing;
  insert into wallets(user_id,coin_balance,red_pocket_balance,total_coins_earned,total_coins_exchanged,total_red_pocket_earned,total_red_pocket_withdrawn) values(new.id,0,0,0,0,0,0) on conflict(user_id) do nothing;
  if referrer is not null then insert into referrals(referrer_id,referred_user_id) values(referrer,new.id) on conflict(referred_user_id) do nothing; end if;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- One-time backfill for existing accounts.
update profiles p set username='mecash'||lower(substr(replace(gen_random_uuid()::text,'-',''),1,3)) where username is null or username='';
update profiles p set full_name=coalesce(nullif(p.full_name,''),nullif(u.raw_user_meta_data->>'full_name',''),'User'), phone=coalesce(nullif(p.phone,''),nullif(u.raw_user_meta_data->>'phone','')), avatar_url=coalesce(nullif(p.avatar_url,''),'/avatars/'||(1+floor(random()*15))::int||'.png') from auth.users u where u.id=p.id;
