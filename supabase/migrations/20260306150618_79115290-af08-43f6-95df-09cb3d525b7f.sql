
-- Update RLS policies to use simplified 3-role system (admin, team_lead, va)
-- Remove operations_manager references

-- team_members INSERT: admin only
drop policy if exists "Admins can insert team" on public.team_members;
create policy "Admins can insert team"
on public.team_members for insert to authenticated
with check (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_org_role(auth.uid()) = 'admin'
);

-- team_members UPDATE: admin or team_lead
drop policy if exists "Admins and leads can update team" on public.team_members;
create policy "Admins and leads can update team"
on public.team_members for update to authenticated
using (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_org_role(auth.uid()) in ('admin', 'team_lead')
);

-- team_members DELETE: admin only
drop policy if exists "Admins can delete team" on public.team_members;
create policy "Admins can delete team"
on public.team_members for delete to authenticated
using (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_org_role(auth.uid()) = 'admin'
);

-- tasks INSERT: admin or team_lead
drop policy if exists "Leads and admins can insert tasks" on public.tasks;
create policy "Leads and admins can insert tasks"
on public.tasks for insert to authenticated
with check (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_org_role(auth.uid()) in ('admin', 'team_lead')
);

-- tasks UPDATE: admin or team_lead
drop policy if exists "Leads and admins can update tasks" on public.tasks;
create policy "Leads and admins can update tasks"
on public.tasks for update to authenticated
using (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_org_role(auth.uid()) in ('admin', 'team_lead')
);

-- tasks DELETE: admin only
drop policy if exists "Admins can delete tasks" on public.tasks;
create policy "Admins can delete tasks"
on public.tasks for delete to authenticated
using (
  organization_id = get_user_org_id(auth.uid())
  AND get_user_org_role(auth.uid()) = 'admin'
);

-- timers INSERT: admin or team_lead
drop policy if exists "Leads and admins can insert timers" on public.timers;
create policy "Leads and admins can insert timers"
on public.timers for insert to authenticated
with check (
  exists (
    select 1 from tasks t
    where t.id = timers.task_id
    and t.organization_id = get_user_org_id(auth.uid())
  )
  AND get_user_org_role(auth.uid()) in ('admin', 'team_lead')
);

-- timers UPDATE: admin or team_lead
drop policy if exists "Leads and admins can update timers" on public.timers;
create policy "Leads and admins can update timers"
on public.timers for update to authenticated
using (
  exists (
    select 1 from tasks t
    where t.id = timers.task_id
    and t.organization_id = get_user_org_id(auth.uid())
  )
  AND get_user_org_role(auth.uid()) in ('admin', 'team_lead')
);
