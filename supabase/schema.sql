-- Run this in Supabase Dashboard -> SQL Editor

-- ─── Expenses table ─────────────────────────────────────────────
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date date not null,
  amount numeric(10,2) not null check (amount > 0),
  category text not null check (category in ('Education', 'Aftercare')),
  kid_name text,
  notes text,
  added_by uuid references auth.users(id),
  reimbursement_requested boolean not null default false,
  reimbursement_date date,
  receipt_url text
);

create index if not exists expenses_date_idx on expenses (date desc);
create index if not exists expenses_category_idx on expenses (category);

-- ─── Row Level Security ─────────────────────────────────────────
-- This is a shared household app: any logged-in user (you + your wife)
-- can read/write all rows. Nobody unauthenticated can touch anything.
alter table expenses enable row level security;

create policy "Authenticated users can read all expenses"
  on expenses for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert expenses"
  on expenses for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update expenses"
  on expenses for update
  using (auth.role() = 'authenticated');

create policy "Authenticated users can delete expenses"
  on expenses for delete
  using (auth.role() = 'authenticated');

-- ─── Storage bucket for receipts ────────────────────────────────
-- Run this after creating the "receipts" bucket in Dashboard -> Storage
-- (Storage UI creates the bucket; these policies control access to it)

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "Authenticated users can upload receipts"
  on storage.objects for insert
  with check (bucket_id = 'receipts' and auth.role() = 'authenticated');

create policy "Authenticated users can view receipts"
  on storage.objects for select
  using (bucket_id = 'receipts' and auth.role() = 'authenticated');

create policy "Authenticated users can delete receipts"
  on storage.objects for delete
  using (bucket_id = 'receipts' and auth.role() = 'authenticated');
