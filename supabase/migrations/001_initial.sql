-- Me Cash Step 2 foundation: Supabase Auth + PostgreSQL schema.
-- Apply with: supabase db push
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  email text unique not null,
  phone text unique,
  avatar_url text,
  role text default 'user' check (role in ('user','admin')),
  referral_code text unique not null,
  referred_by uuid references profiles(id),
  payment_method text check (payment_method in ('jazzcash','easypaisa','bank')),
  payment_account_name text,
  payment_account_number text,
  is_banned boolean default false,
  language text default 'en',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists wallets (
  user_id uuid primary key references profiles(id) on delete cascade,
  total_earned numeric default 0 check (total_earned >= 0),
  total_withdrawn numeric default 0 check (total_withdrawn >= 0),
  balance numeric default 0 check (balance >= 0),
  updated_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text check (type in ('task_reward','referral_bonus','withdrawal','adjustment')),
  amount numeric not null,
  status text default 'completed' check (status in ('pending','completed','failed')),
  reference_id uuid,
  description text,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_ur text,
  description text not null,
  description_ur text,
  instructions text,
  instructions_ur text,
  link text,
  reward numeric not null check (reward > 0),
  proof_type text check (proof_type in ('screenshot','link','text','any')),
  slots int default 100,
  completed_count int default 0,
  status text default 'active' check (status in ('active','paused','closed')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  proof_text text,
  proof_url text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  unique(task_id, user_id)
);

create table if not exists withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  method text check (method in ('jazzcash','easypaisa','bank')),
  account_name text not null,
  account_number text not null,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  processed_by uuid references profiles(id),
  processed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references profiles(id) on delete cascade,
  referred_user_id uuid references profiles(id) on delete cascade unique,
  commission_earned numeric default 0,
  created_at timestamptz default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

create index if not exists transactions_user_created_idx on transactions(user_id, created_at desc);
create index if not exists tasks_status_created_idx on tasks(status, created_at desc);
create index if not exists submissions_user_idx on task_submissions(user_id, created_at desc);
create index if not exists withdrawals_user_created_idx on withdrawals(user_id, created_at desc);

-- RLS: users can read/update their own records; active tasks are publicly readable.
alter table profiles enable row level security;
alter table wallets enable row level security;
alter table transactions enable row level security;
alter table tasks enable row level security;
alter table task_submissions enable row level security;
alter table withdrawals enable row level security;
alter table referrals enable row level security;
alter table settings enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "wallets_select_own" on wallets for select using (auth.uid() = user_id);
create policy "transactions_select_own" on transactions for select using (auth.uid() = user_id);
create policy "tasks_select_active" on tasks for select using (status = 'active');
create policy "submissions_select_own" on task_submissions for select using (auth.uid() = user_id);
create policy "submissions_insert_own" on task_submissions for insert with check (auth.uid() = user_id);
create policy "withdrawals_select_own" on withdrawals for select using (auth.uid() = user_id);
create policy "withdrawals_insert_own" on withdrawals for insert with check (auth.uid() = user_id);
create policy "referrals_select_own" on referrals for select using (auth.uid() = referrer_id or auth.uid() = referred_user_id);

-- New accounts receive a profile and zero-balance wallet.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, referral_code)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Me Cash User'), new.email,
          'ME-' || upper(substr(replace(new.id::text, '-', ''), 1, 8)))
  on conflict (id) do nothing;
  insert into public.wallets (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();
