-- Create full user_profiles table matching app expectations
create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text null,
  selected_instrument_id uuid null,
  practice_level text null check (practice_level in ('beginner','intermediate','advanced')),
  level_selected_at timestamptz null,
  total_practice_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_user_id on public.user_profiles(user_id);

create or replace function public.trg_set_updated_at_user_profiles()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_user_profiles on public.user_profiles;
create trigger set_updated_at_user_profiles
before update on public.user_profiles
for each row execute procedure public.trg_set_updated_at_user_profiles();

alter table public.user_profiles enable row level security;

-- RLS policies
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='user_profiles_select_own'
  ) then
    create policy user_profiles_select_own on public.user_profiles for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='user_profiles_insert_own'
  ) then
    create policy user_profiles_insert_own on public.user_profiles for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='user_profiles_update_own'
  ) then
    create policy user_profiles_update_own on public.user_profiles for update using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_profiles' and policyname='user_profiles_delete_own'
  ) then
    create policy user_profiles_delete_own on public.user_profiles for delete using (auth.uid() = user_id);
  end if;
end $$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.user_profiles to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;




