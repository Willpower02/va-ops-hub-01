
-- Drop restrictive SELECT policies on profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Org members can view fellow member profiles" ON public.profiles;

-- Recreate as PERMISSIVE (default) so either condition allows access
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Org members can view fellow member profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT om.user_id FROM public.organization_members om
      WHERE om.organization_id = public.get_user_org_id(auth.uid())
    )
  );
