-- Apply only in the Daytlas project after reviewing the exact schema.
-- No health records, Oura tokens, sleep goals, email lists or digest subscriptions.
begin;
create table public.account_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40 and display_name !~ '[[:cntrl:]]')
);
alter table public.account_profiles enable row level security;
alter table public.account_profiles force row level security;
revoke all on public.account_profiles from public, anon, authenticated;
grant select, insert, update on public.account_profiles to authenticated;
create policy "Read own account profile" on public.account_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own account profile" on public.account_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own account profile" on public.account_profiles
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
commit;
