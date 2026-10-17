-- Ensure signup referral usernames are resolved server-side, linked to profiles,
-- and represented in the referrals table. Apply this migration in Supabase.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  referrer uuid;
  referral_value text;
  code text;
  avatar text;
begin
  referral_value := nullif(trim(coalesce(
    nullif(new.raw_user_meta_data->>'referral_username', ''),
    nullif(new.raw_user_meta_data->>'referral_code', '')
  )), '');

  if referral_value is not null then
    select p.id into referrer
    from public.profiles p
    where p.id <> new.id
      and (
        lower(p.username) = lower(referral_value)
        or lower(p.referral_code) = lower(referral_value)
      )
    order by (lower(p.username) = lower(referral_value)) desc
    limit 1;
  end if;

  code := lower(nullif(trim(new.raw_user_meta_data->>'username'), ''));
  if code is null then
    code := 'mecash' || lower(substr(replace(new.id::text, '-', ''), 1, 8));
  end if;

  -- Honor a supplied username unless it is already in use; use a UUID-derived
  -- fallback to satisfy both unique profile identity columns.
  while exists (
    select 1 from public.profiles p
    where p.id <> new.id
      and (lower(p.username) = lower(code) or lower(p.referral_code) = lower(code))
  ) loop
    code := 'mecash' || lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end loop;

  avatar := '/avatars/' || (1 + floor(random() * 15))::int || '.png';

  insert into public.profiles as existing_profile (
    id, email, full_name, phone, referral_code, username, avatar_url, referred_by, role
  ) values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'User'),
    nullif(new.raw_user_meta_data->>'phone', ''),
    code,
    code,
    avatar,
    referrer,
    case when lower(new.email) = 'muhammaddanyal4545@gmail.com' then 'admin' else 'user' end
  )
  on conflict (id) do update
    set referred_by = coalesce(existing_profile.referred_by, excluded.referred_by);

  insert into public.wallets (
    user_id, coin_balance, red_pocket_balance, total_coins_earned,
    total_coins_exchanged, total_red_pocket_earned, total_red_pocket_withdrawn
  ) values (new.id, 0, 0, 0, 0, 0, 0)
  on conflict (user_id) do nothing;

  -- Use the profile's final attribution in case a profile already existed.
  select p.referred_by into referrer from public.profiles p where p.id = new.id;
  if referrer is not null and referrer <> new.id then
    insert into public.referrals (referrer_id, referred_user_id)
    values (referrer, new.id)
    on conflict (referred_user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
