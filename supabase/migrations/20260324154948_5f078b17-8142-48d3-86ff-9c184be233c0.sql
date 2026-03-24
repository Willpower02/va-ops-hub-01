
-- Create task_comments table
CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Users can insert their own comments
CREATE POLICY "Users can insert own comments"
ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can read comments for tasks in their org
CREATE POLICY "Org members can read task comments"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
    AND t.organization_id = get_user_org_id(auth.uid())
  )
);
