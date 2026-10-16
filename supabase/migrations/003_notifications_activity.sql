create table if not exists notifications(id uuid primary key default gen_random_uuid(),user_id uuid references profiles(id) on delete cascade not null,title text not null,message text not null,type text check(type in ('task_approved','task_rejected','withdrawal_approved','withdrawal_rejected','referral_bonus','referral_milestone','referral_completed','announcement','bonus')),is_read boolean default false,link text,created_at timestamptz default now());
create table if not exists admin_activity_log(id uuid primary key default gen_random_uuid(),admin_id uuid references profiles(id),action text not null,target_type text,target_id uuid,details jsonb,created_at timestamptz default now());
alter table notifications enable row level security;
create policy "users read own notifications" on notifications for select using(auth.uid()=user_id);
create policy "users update own notifications" on notifications for update using(auth.uid()=user_id);
alter table admin_activity_log enable row level security;

-- Admin whitelist and referral engine: only the first 30 approved tasks count.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare referrer uuid; code text;
begin
 code := upper(substr(md5(random()::text),1,8));
 if new.raw_user_meta_data->>'referral_code' is not null then select id into referrer from profiles where referral_code=new.raw_user_meta_data->>'referral_code' and id<>new.id limit 1; end if;
 insert into profiles(id,email,full_name,phone,referral_code,referred_by,role) values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name','User'),new.raw_user_meta_data->>'phone',code,referrer,case when lower(new.email)='muhammaddanyal4545@gmail.com' then 'admin' else 'user' end);
 insert into wallets(user_id) values(new.id);
 if referrer is not null then insert into referrals(referrer_id,referred_user_id) values(referrer,new.id); end if;
 return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.handle_submission_approval() returns trigger language plpgsql security definer set search_path=public as $$
declare task_reward numeric; referrer uuid; count_now int; begin
 if new.status='approved' and old.status is distinct from 'approved' then
  select coalesce(reward_coins,reward*1000) into task_reward from tasks where id=new.task_id;
  update wallets set coin_balance=coin_balance+task_reward,total_coins_earned=total_coins_earned+task_reward where user_id=new.user_id;
  insert into transactions(user_id,type,amount,description) values(new.user_id,'task_reward',task_reward,'Task reward in coins');
  update tasks set completed_count=completed_count+1 where id=new.task_id;
  select referred_by into referrer from profiles where id=new.user_id;
  if referrer is not null then select referred_tasks_count into count_now from referrals where referrer_id=referrer and referred_user_id=new.user_id;
   if coalesce(count_now,0)<30 then count_now:=coalesce(count_now,0)+1; update referrals set referred_tasks_count=count_now,total_coins_earned=total_coins_earned+500,total_red_pocket_earned=total_red_pocket_earned+case when count_now%5=0 then 1 else 0 end,is_reward_active=count_now<30 where referrer_id=referrer and referred_user_id=new.user_id;
    update wallets set coin_balance=coin_balance+500,total_coins_earned=total_coins_earned+500,red_pocket_balance=red_pocket_balance+case when count_now%5=0 then 1 else 0 end,total_red_pocket_earned=total_red_pocket_earned+case when count_now%5=0 then 1 else 0 end where user_id=referrer;
    insert into referral_earnings(referrer_id,referred_user_id,task_id,submission_id,coins_earned,red_pocket_earned) values(referrer,new.user_id,new.task_id,new.id,500,case when count_now%5=0 then 1 else 0 end);
    insert into notifications(user_id,title,message,type,link) values(referrer,'Referral Bonus 🪙','You earned 500 coins from a referred task','referral_bonus','/dashboard/referral');
   end if;
  end if;
  insert into notifications(user_id,title,message,type,link) values(new.user_id,'Task Approved ✅','Your task reward was added','task_approved','/dashboard/wallet');
 elsif new.status='rejected' and old.status is distinct from 'rejected' then
  insert into notifications(user_id,title,message,type,link) values(new.user_id,'Task Rejected ❌',coalesce(new.admin_note,'Your submission was rejected'),'task_rejected','/dashboard/tasks');
 end if; return new; end; $$;
drop trigger if exists on_submission_approval on task_submissions;
create trigger on_submission_approval after update on task_submissions for each row execute function public.handle_submission_approval();
