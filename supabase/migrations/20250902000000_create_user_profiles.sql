-- Create user_profiles table if it does not exist
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected_instrument_id uuid null,
  display_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique index for safety (primary key already enforces uniqueness)
create unique index if not exists user_profiles_user_id_idx
  on public.user_profiles(user_id);

-- Trigger to update updated_at
create or replace function public.update_user_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_update_user_profiles_updated_at on public.user_profiles;
create trigger trg_update_user_profiles_updated_at
before update on public.user_profiles
for each row execute procedure public.update_user_profiles_updated_at();

-- Enable RLS and policies
alter table public.user_profiles enable row level security;

-- Each user can select their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'user_profiles_select_own'
  ) THEN
    CREATE POLICY "user_profiles_select_own"
      ON public.user_profiles
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Each user can insert their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'user_profiles_insert_own'
  ) THEN
    CREATE POLICY "user_profiles_insert_own"
      ON public.user_profiles
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Each user can update their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'user_profiles_update_own'
  ) THEN
    CREATE POLICY "user_profiles_update_own"
      ON public.user_profiles
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Optional: allow delete of own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'user_profiles_delete_own'
  ) THEN
    CREATE POLICY "user_profiles_delete_own"
      ON public.user_profiles
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;


