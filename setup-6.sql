-- Money Magnet update 6: withdrawals and deposits.
-- Run once in Supabase → SQL Editor → New query → paste → Run.

create table if not exists public.cashflows (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  flow_date  date not null,
  kind       text not null check (kind in ('withdrawal','deposit')),
  amount     numeric not null check (amount > 0),
  ccy        text not null default 'USD',
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists cashflows_user_date on public.cashflows (user_id, flow_date);
alter table public.cashflows enable row level security;
drop policy if exists "Read own cashflows" on public.cashflows;
drop policy if exists "Add own cashflows" on public.cashflows;
drop policy if exists "Edit own cashflows" on public.cashflows;
drop policy if exists "Delete own cashflows" on public.cashflows;
create policy "Read own cashflows" on public.cashflows for select using (auth.uid() = user_id);
create policy "Add own cashflows" on public.cashflows for insert with check (auth.uid() = user_id);
create policy "Edit own cashflows" on public.cashflows for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own cashflows" on public.cashflows for delete using (auth.uid() = user_id);
