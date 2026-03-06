import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchTeamMembers, fetchVAs, fetchTeamMember, fetchTasks, fetchTimers,
  fetchComments, addTeamMember, updateTeamMember, addTask, updateTask,
  addTimer, addComment, logActivity,
  startTimerOp, pauseTimerOp, stopTimerOp,
} from '@/lib/store';

export function useTeamMembers() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ['team_members', orgId],
    queryFn: () => fetchTeamMembers(orgId!),
    enabled: !!orgId,
  });
}

export function useVAs() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ['vas', orgId],
    queryFn: () => fetchVAs(orgId!),
    enabled: !!orgId,
  });
}

export function useTeamMember(id: string | undefined) {
  return useQuery({
    queryKey: ['team_member', id],
    queryFn: () => fetchTeamMember(id!),
    enabled: !!id,
  });
}

export function useTasks() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ['tasks', orgId],
    queryFn: () => fetchTasks(orgId!),
    enabled: !!orgId,
  });
}

export function useTimers() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ['timers', orgId],
    queryFn: () => fetchTimers(orgId!),
    enabled: !!orgId,
    refetchInterval: 5000,
  });
}

export function useComments(taskId: string | null) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => fetchComments(taskId!),
    enabled: !!taskId,
  });
}

export function useAddTeamMember() {
  const qc = useQueryClient();
  const { orgId, session } = useAuth();
  return useMutation({
    mutationFn: async (member: { email: string; first_name: string; last_name: string; role: string; is_active: boolean; status?: string; last_activity_at?: string; assigned_team_lead_id?: string }) => {
      const result = await addTeamMember({ ...member, organization_id: orgId! });
      await logActivity({ user_id: session!.user.id, action_type: 'member_added', entity_type: 'user', entity_id: result.id, metadata: { name: `${member.first_name} ${member.last_name}` }, organization_id: orgId! });
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team_members'] });
      qc.invalidateQueries({ queryKey: ['vas'] });
    },
  });
}

export function useAddTask() {
  const qc = useQueryClient();
  const { orgId, session } = useAuth();
  return useMutation({
    mutationFn: async (task: { title: string; description: string; assigned_va_id: string; priority: string; category: string; status: string; due_date?: string; startTimer?: boolean }) => {
      const { startTimer: shouldStart, ...taskData } = task;
      const result = await addTask({ ...taskData, created_by: session!.user.id, organization_id: orgId! });
      await logActivity({ user_id: session!.user.id, action_type: 'task_created', entity_type: 'task', entity_id: result.id, metadata: { title: task.title }, organization_id: orgId! });
      if (shouldStart) {
        await startTimerOp(result.id, task.assigned_va_id, orgId!, session!.user.id);
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['timers'] });
      qc.invalidateQueries({ queryKey: ['vas'] });
      qc.invalidateQueries({ queryKey: ['team_members'] });
    },
  });
}

export function useTimerControls() {
  const qc = useQueryClient();
  const { orgId, session } = useAuth();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['timers'] });
    qc.invalidateQueries({ queryKey: ['vas'] });
    qc.invalidateQueries({ queryKey: ['team_members'] });
  };
  const start = useMutation({
    mutationFn: ({ taskId, vaId }: { taskId: string; vaId: string }) =>
      startTimerOp(taskId, vaId, orgId!, session!.user.id),
    onSuccess: invalidate,
  });
  const pause = useMutation({
    mutationFn: (taskId: string) => pauseTimerOp(taskId, orgId!, session!.user.id),
    onSuccess: invalidate,
  });
  const stop = useMutation({
    mutationFn: (taskId: string) => stopTimerOp(taskId, orgId!, session!.user.id),
    onSuccess: invalidate,
  });
  return { start, pause, stop };
}

export function useAddComment() {
  const qc = useQueryClient();
  const { orgId, session } = useAuth();
  return useMutation({
    mutationFn: async ({ taskId, comment }: { taskId: string; comment: string }) => {
      const result = await addComment({ task_id: taskId, user_id: session!.user.id, comment, organization_id: orgId! });
      await logActivity({ user_id: session!.user.id, action_type: 'comment_added', entity_type: 'task', entity_id: taskId, metadata: { comment }, organization_id: orgId! });
      return result;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['comments', vars.taskId] });
    },
  });
}
