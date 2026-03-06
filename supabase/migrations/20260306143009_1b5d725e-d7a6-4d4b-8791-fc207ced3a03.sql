
-- Create a function that handles org creation + membership atomically
create or replace function public.create_organization(_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _org_id uuid;
  _user_id uuid := auth.uid();
begin
  if _user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.organizations (name, owner_user_id)
  values (_name, _user_id)
  returning id into _org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (_org_id, _user_id, 'admin');

  return _org_id;
end;
$$;
