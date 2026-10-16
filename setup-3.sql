-- Money Magnet update 3: Instagram-style usernames.
-- Run once in Supabase → SQL Editor → New query → paste → Run.

alter table public.profiles add column if not exists username text;

-- 3–20 characters: lowercase letters, numbers, dot and underscore; no dot at the start or end
alter table public.profiles drop constraint if exists username_format;
alter table public.profiles add constraint username_format
  check (username is null or username ~ '^[a-z0-9_][a-z0-9._]{1,18}[a-z0-9_]$');

-- every username is unique
create unique index if not exists profiles_username_unique on public.profiles (lower(username));
