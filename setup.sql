-- Money Magnet: run this once in Supabase → SQL Editor → New query → Run.
-- It creates the trades table. Each person can only see and change their own trades.

create table if not exists public.trades (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trade_date  date not null,
  symbol      text not null,
  side        text not null check (side in ('Buy','Sell')),
  lot         numeric not null default 0,
  entry       numeric,
  sl          numeric,
  tp          numeric,
  exit_price  numeric,
  pnl         numeric not null default 0,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists trades_user_date on public.trades (user_id, trade_date);

alter table public.trades enable row level security;

drop policy if exists "Read own trades"   on public.trades;
drop policy if exists "Add own trades"    on public.trades;
drop policy if exists "Edit own trades"   on public.trades;
drop policy if exists "Delete own trades" on public.trades;

create policy "Read own trades"   on public.trades for select using (auth.uid() = user_id);
create policy "Add own trades"    on public.trades for insert with check (auth.uid() = user_id);
create policy "Edit own trades"   on public.trades for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own trades" on public.trades for delete using (auth.uid() = user_id);
