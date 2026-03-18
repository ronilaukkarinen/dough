-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text not null default '',
  locale text not null default 'en' check (locale in ('en', 'fi')),
  ynab_access_token text,
  ynab_budget_id text,
  last_ynab_sync timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Recurring bills
create table public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  amount numeric(10,2) not null,
  due_day integer not null check (due_day between 1 and 31),
  category text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recurring_bills enable row level security;

create policy "Users can manage own bills"
  on public.recurring_bills for all
  using (auth.uid() = user_id);

-- Income sources
create table public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  amount numeric(10,2) not null,
  expected_day integer not null check (expected_day between 1 and 31),
  is_recurring boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.income_sources enable row level security;

create policy "Users can manage own income"
  on public.income_sources for all
  using (auth.uid() = user_id);

-- Debts
create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  total_amount numeric(12,2) not null,
  remaining_amount numeric(12,2) not null,
  interest_rate numeric(5,2) not null default 0,
  minimum_payment numeric(10,2) not null default 0,
  due_day integer check (due_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.debts enable row level security;

create policy "Users can manage own debts"
  on public.debts for all
  using (auth.uid() = user_id);

-- Cached transactions (from YNAB)
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  ynab_id text,
  date date not null,
  amount numeric(10,2) not null,
  payee text not null default '',
  category text default '',
  memo text default '',
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Users can manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id);

create index idx_transactions_user_date on public.transactions(user_id, date desc);
create unique index idx_transactions_ynab_id on public.transactions(user_id, ynab_id) where ynab_id is not null;

-- Chat messages
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "Users can manage own messages"
  on public.chat_messages for all
  using (auth.uid() = user_id);

create index idx_chat_messages_user on public.chat_messages(user_id, created_at desc);
