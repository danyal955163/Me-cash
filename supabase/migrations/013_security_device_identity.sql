-- Apply manually in Supabase SQL Editor.
alter table public.profiles add column if not exists device_id text;
create unique index if not exists profiles_device_id_unique on public.profiles(device_id) where device_id is not null;
create index if not exists profiles_phone_idx on public.profiles(phone);
alter table public.notifications enable row level security;
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select using (auth.uid() = user_id);
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);