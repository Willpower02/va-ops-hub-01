
-- Enums
create type public.app_role as enum ('admin', 'operations_manager', 'team_lead', 'va', 'viewer');
create type public.va_status as enum ('active', 'paused', 'idle', 'offline');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.task_status as enum ('pending', 'active', 'paused', 'completed');
create type public.timer_status as enum ('running', 'paused', 'stopped');

-- Organizations
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now()
);
alter table public.organizations enable row level security;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  avatar_url text,
  organization_id uuid references public.organizations(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- User roles (separate table per security requirements)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  unique(user_id, organization_id)
);
alter table public.user_roles enable row level security;

-- Team members (managed by org admins)
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  email text not null,
  first_name text not null,
  last_name text not null,
  role app_role not null default 'va',
  avatar_url text,
  is_active boolean not null default true,
  status va_status default 'idle',
  last_activity_at timestamptz,
  assigned_team_lead_id uuid references public.team_members(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.team_members enable row level security;

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  assigned_va_id uuid references public.team_members(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  priority task_priority not null default 'medium',
  category text not null default '',
  status task_status not null default 'pending',
  due_date date,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.tasks enable row level security;

-- Timers
create table public.timers (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  va_id uuid references public.team_members(id) on delete cascade not null,
  started_at bigint not null,
  paused_at bigint,
  stopped_at bigint,
  total_seconds integer not null default 0,
  status timer_status not null default 'running',
  organization_id uuid references public.organizations(id) on delete cascade not null
);
alter table public.timers enable row level security;

-- Activity logs
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action_type text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}',
  organization_id uuid references public.organizations(id) on delete cascade not null,
  created_at timestamptz not null default now()
);
alter table public.activity_logs enable row level security;

-- Comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null,
  comment text not null,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;

-- Security definer: get user org
create or replace function public.get_user_org_id(_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = _user_id limit 1
$$;

-- Security definer: check role
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: Organizations
create policy "Users can view own org" on public.organizations
  for select using (id = public.get_user_org_id(auth.uid()));
create policy "Auth users can create orgs" on public.organizations
  for insert with check (auth.uid() = owner_id);
create policy "Owners can update org" on public.organizations
  for update using (owner_id = auth.uid());

-- RLS: Profiles
create policy "Users can view own profile" on public.profiles
  for select using (id = auth.uid());
create policy "Users can update own profile" on public.profiles
  for update using (id = auth.uid());
create policy "System can insert profiles" on public.profiles
  for insert with check (true);

-- RLS: User roles
create policy "Users can view own roles" on public.user_roles
  for select using (user_id = auth.uid());
create policy "Users can insert own roles" on public.user_roles
  for insert with check (user_id = auth.uid());

-- RLS: Team members (scoped to org)
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
  for select using (organization_id = public.get_user_org_id(auth.uid()));
create policy "Org members can insert timers" on public.timers
  for insert with check (organization_id = public.get_user_org_id(auth.uid()));
create policy "Org members can update timers" on public.timers
  for update using (organization_id = public.get_user_org_id(auth.uid()));

-- RLS: Activity logs
create policy "Org members can view logs" on public.activity_logs
  for select using (organization_id = public.get_user_org_id(auth.uid()));
create policy "Org members can insert logs" on public.activity_logs
  for insert with check (organization_id = public.get_user_org_id(auth.uid()));

-- RLS: Comments
create policy "Org members can view comments" on public.comments
  for select using (organization_id = public.get_user_org_id(auth.uid()));
create policy "Org members can insert comments" on public.comments
  for insert with check (organization_id = public.get_user_org_id(auth.uid()));
