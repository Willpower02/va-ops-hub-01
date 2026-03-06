
-- Helper: get user's role within their org
create or replace function public.get_user_org_role(_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.organization_members
  where user_id = _user_id limit 1
$$;

-- ===================== ORGANIZATIONS =====================
-- Keep existing: SELECT by org membership, INSERT by owner, UPDATE by owner
-- No changes needed

-- ===================== ORGANIZATION_MEMBERS =====================
-- DROP existing policies
drop policy if exists "Members can view org members" on public.organization_members;
drop policy if exists "Users can insert own membership" on public.organization_members;

-- SELECT: any org member can view
create policy "Members can view org members"
on public.organization_members for select to authenticated
using (organization_id = get_user_org_id(auth.uid()));

-- INSERT: only admin can add members (RPC handles self-insert during org creation)
create policy "Admins can insert members"
on public.organization_members for insert to authenticated
with check (
  user_id = auth.uid()
  OR get_user_org_role(auth.uid()) = 'admin'
);

-- UPDATE: only admin can change roles
alter table public.organization_members enable row level security;
create policy "Admins can update members"
on public.organization_members for update to authenticated
using (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_org_role(auth.uid()) = 'admin'
);

-- DELETE: only admin
create policy "Admins can delete members"
on public.organization_members for delete to authenticated
using (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_org_role(auth.uid()) = 'admin'
);

-- ===================== TEAM_MEMBERS =====================
drop policy if exists "Org members can view team" on public.team_members;
drop policy if exists "Org members can insert team" on public.team_members;
drop policy if exists "Org members can update team" on public.team_members;
drop policy if exists "Org members can delete team" on public.team_members;

-- SELECT: all org members can view
create policy "Org members can view team"
on public.team_members for select to authenticated
using (organization_id = get_user_org_id(auth.uid()));

-- INSERT: admin only
create policy "Admins can insert team"
on public.team_members for insert to authenticated
with check (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_org_role(auth.uid()) in ('admin', 'operations_manager')
);

-- UPDATE: admin or team_lead
create policy "Admins and leads can update team"
on public.team_members for update to authenticated
using (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_org_role(auth.uid()) in ('admin', 'operations_manager', 'team_lead')
);

-- DELETE: admin only
create policy "Admins can delete team"
on public.team_members for delete to authenticated
using (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_org_role(auth.uid()) in ('admin', 'operations_manager')
);

-- ===================== TASKS =====================
drop policy if exists "Org members can view tasks" on public.tasks;
drop policy if exists "Org members can insert tasks" on public.tasks;
drop policy if exists "Org members can update tasks" on public.tasks;

-- SELECT: all org members can view tasks
create policy "Org members can view tasks"
on public.tasks for select to authenticated
using (organization_id = get_user_org_id(auth.uid()));

-- INSERT: admin, ops_manager, team_lead
create policy "Leads and admins can insert tasks"
on public.tasks for insert to authenticated
with check (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_org_role(auth.uid()) in ('admin', 'operations_manager', 'team_lead')
);

-- UPDATE: admin, ops_manager, team_lead
create policy "Leads and admins can update tasks"
on public.tasks for update to authenticated
using (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_org_role(auth.uid()) in ('admin', 'operations_manager', 'team_lead')
);

-- DELETE: admin only
create policy "Admins can delete tasks"
on public.tasks for delete to authenticated
using (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_org_role(auth.uid()) in ('admin', 'operations_manager')
);

-- ===================== TIMERS =====================
drop policy if exists "Org members can view timers" on public.timers;
drop policy if exists "Org members can insert timers" on public.timers;
drop policy if exists "Org members can update timers" on public.timers;

-- SELECT: all org members
create policy "Org members can view timers"
on public.timers for select to authenticated
using (exists (
  select 1 from tasks t
  where t.id = timers.task_id
  and t.organization_id = get_user_org_id(auth.uid())
));

-- INSERT: admin, ops_manager, team_lead
create policy "Leads and admins can insert timers"
on public.timers for insert to authenticated
with check (
  exists (
    select 1 from tasks t
    where t.id = timers.task_id
    and t.organization_id = get_user_org_id(auth.uid())
  )
  AND get_user_org_role(auth.uid()) in ('admin', 'operations_manager', 'team_lead')
);

-- UPDATE: admin, ops_manager, team_lead
create policy "Leads and admins can update timers"
on public.timers for update to authenticated
using (
  exists (
    select 1 from tasks t
    where t.id = timers.task_id
    and t.organization_id = get_user_org_id(auth.uid())
  )
  AND get_user_org_role(auth.uid()) in ('admin', 'operations_manager', 'team_lead')
);

-- ===================== ACTIVITY_LOGS =====================
drop policy if exists "Org members can view logs" on public.activity_logs;
drop policy if exists "Org members can insert logs" on public.activity_logs;

-- SELECT: all org members
create policy "Org members can view logs"
on public.activity_logs for select to authenticated
using (organization_id = get_user_org_id(auth.uid()));

-- INSERT: all org members (logging is universal)
create policy "Org members can insert logs"
on public.activity_logs for insert to authenticated
with check (organization_id = get_user_org_id(auth.uid()));
