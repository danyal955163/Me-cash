-- One-time referral backfill for accounts created before migration 011.
-- Run in the Supabase SQL Editor after applying 011_referral_attribution_fix.sql.
-- This only links profiles that do not already have a referrer and does not
-- create self-referrals. It is safe to rerun.

with candidates as (
  select
    referred_profile.id as referred_user_id,
    referrer_profile.id as referrer_id,
    row_number() over (
      partition by referred_profile.id
      order by (lower(referrer_profile.username) = lower(referral_value.referral)) desc
    ) as candidate_rank
  from auth.users auth_user
  join public.profiles referred_profile on referred_profile.id = auth_user.id
  cross join lateral (
    select nullif(trim(coalesce(
      nullif(auth_user.raw_user_meta_data->>'referral_username', ''),
      nullif(auth_user.raw_user_meta_data->>'referral_code', '')
    )), '') as referral
  ) referral_value
  join public.profiles referrer_profile
    on referrer_profile.id <> referred_profile.id
   and (
     lower(referrer_profile.username) = lower(referral_value.referral)
     or lower(referrer_profile.referral_code) = lower(referral_value.referral)
   )
  where referral_value.referral is not null
    and referred_profile.referred_by is null
)
update public.profiles referred_profile
set referred_by = candidates.referrer_id
from candidates
where candidates.candidate_rank = 1
  and referred_profile.id = candidates.referred_user_id
  and referred_profile.referred_by is null;

insert into public.referrals (referrer_id, referred_user_id)
select referred_profile.referred_by, referred_profile.id
from public.profiles referred_profile
where referred_profile.referred_by is not null
  and referred_profile.referred_by <> referred_profile.id
on conflict (referred_user_id) do nothing;

-- Optional verification: this returns the number of referral records by owner.
select referrer_id, count(*) as referral_count
from public.referrals
group by referrer_id
order by referral_count desc;
