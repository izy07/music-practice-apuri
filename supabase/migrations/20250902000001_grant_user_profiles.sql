-- Ensure privileges for anon/authenticated and expose to PostgREST
do $$ begin
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='user_profiles') then
    raise notice 'user_profiles table does not exist; skipping grants';
  end if;
end $$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.user_profiles to anon, authenticated;

-- In case future columns are added, grant default privileges
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;


