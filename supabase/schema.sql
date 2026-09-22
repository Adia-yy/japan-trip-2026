-- Supabase schema for the Japan Trip 2026 shared ledger and checklists.
-- Run this file in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null default 'japan-trip-2026',
  description text not null check (char_length(description) between 1 and 60),
  expense_date date not null,
  amount_jpy integer not null check (amount_jpy > 0),
  payer text not null,
  participants text[] not null check (cardinality(participants) > 0),
  settled boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checklist_items (
  id text not null,
  trip_id text not null default 'japan-trip-2026',
  checklist_type text not null check (checklist_type in ('task', 'packing')),
  checked boolean not null default false,
  updated_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (trip_id, checklist_type, id)
);

create index if not exists expenses_trip_date_idx
  on public.expenses (trip_id, expense_date desc, created_at desc);

create index if not exists checklist_trip_type_idx
  on public.checklist_items (trip_id, checklist_type);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists checklist_set_updated_at on public.checklist_items;
create trigger checklist_set_updated_at
before update on public.checklist_items
for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;
alter table public.checklist_items enable row level security;

drop policy if exists "authenticated users can read trip expenses" on public.expenses;
create policy "authenticated users can read trip expenses"
on public.expenses for select to authenticated
using (trip_id = 'japan-trip-2026');

drop policy if exists "authenticated users can create trip expenses" on public.expenses;
create policy "authenticated users can create trip expenses"
on public.expenses for insert to authenticated
with check (trip_id = 'japan-trip-2026' and created_by = auth.uid());

drop policy if exists "authenticated users can update trip expenses" on public.expenses;
create policy "authenticated users can update trip expenses"
on public.expenses for update to authenticated
using (trip_id = 'japan-trip-2026')
with check (trip_id = 'japan-trip-2026');

drop policy if exists "authenticated users can delete trip expenses" on public.expenses;
create policy "authenticated users can delete trip expenses"
on public.expenses for delete to authenticated
using (trip_id = 'japan-trip-2026');

drop policy if exists "authenticated users can read trip checklists" on public.checklist_items;
create policy "authenticated users can read trip checklists"
on public.checklist_items for select to authenticated
using (trip_id = 'japan-trip-2026');

drop policy if exists "authenticated users can write trip checklists" on public.checklist_items;
create policy "authenticated users can write trip checklists"
on public.checklist_items for insert to authenticated
with check (trip_id = 'japan-trip-2026' and updated_by = auth.uid());

create policy "authenticated users can update trip checklists"
on public.checklist_items for update to authenticated
using (trip_id = 'japan-trip-2026')
with check (trip_id = 'japan-trip-2026');

drop policy if exists "authenticated users can delete trip checklists" on public.checklist_items;
create policy "authenticated users can delete trip checklists"
on public.checklist_items for delete to authenticated
using (trip_id = 'japan-trip-2026');

-- Enable live updates for the shared expense ledger.
alter publication supabase_realtime add table public.expenses;
