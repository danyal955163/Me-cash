-- Part 1/2 fixes: fresh users, task proof assets, storage, and safe defaults.
create extension if not exists pgcrypto;

alter table tasks add column if not exists short_description text;
alter table tasks add column if not exists short_description_ur text;
alter table tasks add column if not exists instructions_ur text;
alter table tasks add column if not exists reward_coins numeric default 0;
alter table tasks add column if not exists proof_requirements_en text;
alter table tasks add column if not exists proof_requirements_ur text;
alter table tasks add column if not exists example_images jsonb default '[]'::jsonb;
alter table task_submissions add column if not exists proof_images jsonb default '[]'::jsonb;
alter table task_submissions add column if not exists proof_type text;

-- The original foundation did not include draft; make status match the admin form.
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check check (status in ('active','paused','closed','draft'));

alter table wallets alter column coin_balance set default 0;
alter table wallets alter column red_pocket_balance set default 0;
alter table wallets alter column total_coins_earned set default 0;
alter table wallets alter column total_coins_exchanged set default 0;
alter table wallets alter column total_red_pocket_earned set default 0;
alter table wallets alter column total_red_pocket_withdrawn set default 0;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare referrer_id uuid; new_code text;
begin
  new_code := upper(substring(md5(random()::text) from 1 for 8));
  if new.raw_user_meta_data->>'referral_code' is not null then
    select id into referrer_id from profiles
      where referral_code = new.raw_user_meta_data->>'referral_code' and id <> new.id limit 1;
  end if;
  insert into profiles(id,full_name,email,phone,referral_code,referred_by,role)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name','Me Cash User'),new.email,
    new.raw_user_meta_data->>'phone',new_code,referrer_id,
    case when lower(new.email)='muhammaddanyal4545@gmail.com' then 'admin' else 'user' end)
  on conflict (id) do nothing;
  insert into wallets(user_id,coin_balance,red_pocket_balance,total_coins_earned,total_coins_exchanged,total_red_pocket_earned,total_red_pocket_withdrawn)
  values(new.id,0,0,0,0,0,0) on conflict(user_id) do nothing;
  if referrer_id is not null then insert into referrals(referrer_id,referred_user_id) values(referrer_id,new.id) on conflict(referred_user_id) do nothing; end if;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into storage.buckets(id,name,public) values('task-examples','task-examples',true) on conflict(id) do nothing;
insert into storage.buckets(id,name,public) values('proofs','proofs',false) on conflict(id) do nothing;
insert into storage.buckets(id,name,public) values('avatars','avatars',true) on conflict(id) do nothing;

drop policy if exists "Anyone can view task examples" on storage.objects;
create policy "Anyone can view task examples" on storage.objects for select using(bucket_id='task-examples');
drop policy if exists "Admins can upload task examples" on storage.objects;
create policy "Admins can upload task examples" on storage.objects for insert with check(bucket_id='task-examples' and auth.uid() in(select id from profiles where role='admin'));
drop policy if exists "Users upload own proofs" on storage.objects;
create policy "Users upload own proofs" on storage.objects for insert with check(bucket_id='proofs' and auth.uid()::text=(storage.foldername(name))[1]);
drop policy if exists "Users read own proofs" on storage.objects;
create policy "Users read own proofs" on storage.objects for select using(bucket_id='proofs' and (auth.uid()::text=(storage.foldername(name))[1] or auth.uid() in(select id from profiles where role='admin')));
