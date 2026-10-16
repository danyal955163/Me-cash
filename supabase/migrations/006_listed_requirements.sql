-- Referral username is the public referral_code used in /signup?ref=USERNAME.
alter table profiles add column if not exists username text;
update profiles set username=referral_code where username is null;
create unique index if not exists profiles_username_unique on profiles(username);

-- Proof images are public only through their generated URLs so admins can preview them.
update storage.buckets set public=true where id='proofs';

-- Rebuild the signup trigger so referral_code/username are generated consistently.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare referrer uuid; code text;
begin
 code:=upper(substr(md5(random()::text),1,8));
 if new.raw_user_meta_data->>'referral_code' is not null then select id into referrer from profiles where referral_code=new.raw_user_meta_data->>'referral_code' and id<>new.id limit 1; end if;
 insert into profiles(id,email,full_name,phone,referral_code,username,referred_by,role) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name','User'),new.raw_user_meta_data->>'phone',code,code,referrer,case when lower(new.email)='muhammaddanyal4545@gmail.com' then 'admin' else 'user' end) on conflict(id) do nothing;
 insert into wallets(user_id,coin_balance,red_pocket_balance,total_coins_earned,total_coins_exchanged,total_red_pocket_earned,total_red_pocket_withdrawn) values(new.id,0,0,0,0,0,0) on conflict(user_id) do nothing;
 if referrer is not null then insert into referrals(referrer_id,referred_user_id) values(referrer,new.id) on conflict(referred_user_id) do nothing; end if; return new;
end; $$;

-- Approval credits coins and notifies the user; withdrawal approval deducts RP and notifies the user.
create or replace function public.handle_withdrawal_status() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='approved' and old.status='pending' then
  update wallets set red_pocket_balance=red_pocket_balance-new.red_pocket_amount,total_red_pocket_withdrawn=total_red_pocket_withdrawn+new.red_pocket_amount where user_id=new.user_id and red_pocket_balance>=new.red_pocket_amount;
  if not found then raise exception 'Insufficient Red Pocket balance'; end if;
  insert into transactions(user_id,type,amount,status,description,reference_id) values(new.user_id,'withdrawal',new.red_pocket_amount,'completed','Red Pocket withdrawal',new.id);
  insert into notifications(user_id,title,message,type,link) values(new.user_id,'Withdrawal Approved ✅','Your withdrawal was approved and RP was deducted.','withdrawal_approved','/dashboard/wallet');
 elsif new.status='rejected' and old.status='pending' then
  insert into notifications(user_id,title,message,type,link) values(new.user_id,'Withdrawal Rejected','Your withdrawal was rejected. RP remains in your wallet.','withdrawal_rejected','/dashboard/wallet');
 end if; return new;
end; $$;
drop trigger if exists on_withdrawal_status on withdrawals;
create trigger on_withdrawal_status after update on withdrawals for each row execute function public.handle_withdrawal_status();
