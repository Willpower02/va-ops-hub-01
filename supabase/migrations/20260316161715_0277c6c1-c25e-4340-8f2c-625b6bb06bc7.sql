CREATE POLICY "Admins can delete timers"
ON public.timers
FOR DELETE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = timers.task_id
    AND t.organization_id = get_user_org_id(auth.uid())
  ))
  AND (get_user_org_role(auth.uid()) = ANY (ARRAY['admin'::text, 'team_lead'::text]))
);