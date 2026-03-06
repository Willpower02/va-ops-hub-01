
-- Drop functions with CASCADE to remove dependent policies
drop function if exists public.get_user_org_id(uuid) cascade;
drop function if exists public.has_role(uuid, public.app_role) cascade;

-- Drop trigger
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

-- Drop all tables
drop table if exists public.comments cascade;
drop table if exists public.activity_logs cascade;
drop table if exists public.timers cascade;
drop table if exists public.tasks cascade;
drop table if exists public.team_members cascade;
drop table if exists public.user_roles cascade;
drop table if exists public.profiles cascade;
drop table if exists public.organizations cascade;
drop table if exists public.organization_members cascade;

-- Drop old types
drop type if exists public.app_role cascade;
drop type if exists public.va_status cascade;
drop type if exists public.task_priority cascade;
drop type if exists public.task_status cascade;
drop type if exists public.timer_status cascade;

-- Organizations
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now()
);
alter table public.organizations enable row level security;

-- Organization members
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  unique(organization_id, user_id)
);
alter table public.organization_members enable row level security;

-- Team members
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  name text not null,
  email text not null,
  role text not null default 'va',
  status text not null default 'idle',
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.team_members enable row level security;

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  assigned_team_member_id uuid references public.team_members(id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'pending',
  priority text not null default 'medium',
  due_date date,
  created_at timestamptz not null default now()
);
alter table public.tasks enable row level security;

-- Timers
create table public.timers (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  started_at timestamptz not null default now(),
  stopped_at timestamptz,
  duration_seconds integer not null default 0,
  status text not null default 'running',
  created_at timestamptz not null default now()
);
alter table public.timers enable row level security;

-- Activity logs
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.activity_logs enable row level security;

-- Helper function
create or replace function public.get_user_org_id(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.organization_members
  where user_id = _user_id limit 1
$$;

-- RLS: Organizations
create policy "Members can view own org" on public.organizations
  for select using (id = public.get_user_org_id(auth.uid()));
create policy "Auth users can create orgs" on public.organizations
  for insert with check (auth.uid() = owner_user_id);
create policy "Owners can update org" on public.organizations
  for update using (owner_user_id = auth.uid());

-- RLS: Organization members
create policy "Members can view org members" on public.organization_members
  for select using (organization_id = public.get_user_org_id(auth.uid()));
create policy "Users can insert own membership" on public.organization_members
  for insert with check (user_id = auth.uid());

-- RLS: Team members
create policy "Org members can view team" on public.team_members
  for select using (organization_id = public.get_user_org_id(auth.uid()));
create policy "Org members can insert team" on public.team_members
  for insert with check (organization_id = public.get_user_org_id(auth.uid()));
create policy "Org members can update team" on public.team_members
  for update using (organization_id = public.get_user_org_id(auth.uid()));
create policy "Org members can delete team" on public.team_members
  for delete using (organization_id = public.get_user_org_id(auth.uid()));

-- RLS: Tasks
create policy "Org members can view tasks" on public.tasks
  for select using (organization_id = public.get_user_org_id(auth.uid()));
create policy "Org members can insert tasks" on public.tasks
  for insert with check (organization_id = public.get_user_org_id(auth.uid()));
create policy "Org members can update tasks" on public.tasks
  for update using (organization_id = public.get_user_org_id(auth.uid()));

-- RLS: Timers
create policy "Org members can view timers" on public.timers
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id and t.organization_id = public.get_user_org_id(auth.uid()))
  );
create policy "Org members can insert timers" on public.timers
  for insert with check (
    exists (select 1 from public.tasks t where t.id = task_id and t.organization_id = public.get_user_org_id(auth.uid()))
  );
create policy "Org members can update timers" on public.timers
  for update using (
    exists (select 1 from public.tasks t where t.id = task_id and t.organization_id = public.get_user_org_id(auth.uid()))
  );

-- RLS: Activity logs
create policy "Org members can view logs" on public.activity_logs
  for select using (organization_id = public.get_user_org_id(auth.uid()));
create policy "Org members can insert logs" on public.activity_logs
  for insert with check (organization_id = public.get_user_org_id(auth.uid()));
