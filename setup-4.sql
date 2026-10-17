-- Money Magnet update 4: MT5 import.
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Stores each MT5 position ticket so importing the same report twice never creates duplicates.

alter table public.trades add column if not exists mt5_ticket text;
create unique index if not exists trades_user_mt5_ticket on public.trades (user_id, mt5_ticket);
