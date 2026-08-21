-- Run this in Supabase Dashboard -> SQL Editor

create extension if not exists pgcrypto;

-- ─── Profiles table ───────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'parent' check (role in ('parent', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Authenticated users can read all profiles" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Authenticated users can read all profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── Kids table ───────────────────────────────────────────────
create table if not exists public.kids (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.kids enable row level security;

drop policy if exists "Authenticated users can read all kids" on public.kids;
drop policy if exists "Authenticated users can insert kids" on public.kids;
drop policy if exists "Authenticated users can update kids" on public.kids;

create policy "Authenticated users can read all kids"
  on public.kids for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert kids"
  on public.kids for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update kids"
  on public.kids for update
  using (auth.role() = 'authenticated');

-- ─── Expenses table ───────────────────────────────────────────
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date date not null,
  amount numeric(10,2) not null check (amount > 0),
  category text not null check (category in ('Education', 'Aftercare')),
  kid_id uuid references public.kids(id) on delete set null,
  notes text,
  added_by uuid not null references auth.users(id) on delete cascade,
  reimbursement_requested boolean not null default false,
  reimbursement_date date,
  receipt_url text
);

alter table public.expenses add column if not exists kid_id uuid references public.kids(id) on delete set null;
alter table public.expenses add column if not exists notes text;
alter table public.expenses add column if not exists added_by uuid references auth.users(id) on delete cascade;
alter table public.expenses add column if not exists reimbursement_requested boolean not null default false;
alter table public.expenses add column if not exists reimbursement_date date;
alter table public.expenses add column if not exists receipt_url text;

create index if not exists expenses_date_idx on public.expenses (date desc);
create index if not exists expenses_category_idx on public.expenses (category);

-- ─── Row Level Security ─────────────────────────────────────────
-- This is a shared household app: any logged-in user (you + your wife)
-- can read/write all rows. Nobody unauthenticated can touch anything.
alter table public.expenses enable row level security;

drop policy if exists "Authenticated users can read all expenses" on public.expenses;
drop policy if exists "Authenticated users can insert expenses" on public.expenses;
drop policy if exists "Authenticated users can update expenses" on public.expenses;
drop policy if exists "Authenticated users can delete expenses" on public.expenses;

create policy "Authenticated users can read all expenses"
  on public.expenses for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert expenses"
  on public.expenses for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update expenses"
  on public.expenses for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete expenses"
  on public.expenses for delete
  using (auth.role() = 'authenticated');

-- ─── Storage bucket for receipts ────────────────────────────────
-- Run this after creating the "receipts" bucket in Dashboard -> Storage
-- (Storage UI creates the bucket; these policies control access to it)

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload receipts" on storage.objects;
drop policy if exists "Authenticated users can view receipts" on storage.objects;
drop policy if exists "Authenticated users can delete receipts" on storage.objects;

create policy "Authenticated users can upload receipts"
  on storage.objects for insert
  with check (bucket_id = 'receipts' and auth.role() = 'authenticated');

create policy "Authenticated users can view receipts"
  on storage.objects for select
  using (bucket_id = 'receipts' and auth.role() = 'authenticated');

create policy "Authenticated users can delete receipts"
  on storage.objects for delete
  using (bucket_id = 'receipts' and auth.role() = 'authenticated');
