
-- Fix permissive insert policy on profiles
drop policy "System can insert profiles" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (id = auth.uid());
