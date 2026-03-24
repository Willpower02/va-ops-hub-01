import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  fetchTeamMembers, fetchVAs, fetchTeamMember, fetchTasks, fetchTimers,
  fetchActivityLogs, addTeamMember, addTask, logActivity,
  startTimerOp, pauseTimerOp, stopTimerOp, deleteTask, updateTask,
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
  const qc = useQueryClient();

  // Subscribe to realtime changes on timers
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel('timers-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'timers' },
        () => {
          qc.invalidateQueries({ queryKey: ['timers', orgId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, qc]);

  return useQuery({
    queryKey: ['timers', orgId],
    queryFn: () => fetchTimers(orgId!),
    enabled: !!orgId,
  });
}

export function useActivityLogs() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ['activity_logs', orgId],
    queryFn: () => fetchActivityLogs(orgId!),
    enabled: !!orgId,
    refetchInterval: 30000,
  });
}

export function useAddTeamMember() {
  const qc = useQueryClient();
  const { orgId, session } = useAuth();
  return useMutation({
    mutationFn: async (member: { name: string; email: string; role: string; status?: string; avatar_url?: string }) => {
      const result = await addTeamMember({ ...member, organization_id: orgId! });
      await logActivity({ user_id: session!.user.id, action: 'member_added', details: { name: member.name }, organization_id: orgId! });
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team_members'] });
      qc.invalidateQueries({ queryKey: ['vas'] });
      qc.invalidateQueries({ queryKey: ['activity_logs'] });
    },
  });
}

export function useInviteTeamMember() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (member: { name: string; email: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke('invite-member', {
        body: member,
      });
      if (error) throw new Error(error.message || 'Failed to send invitation');
      if (data?.error) throw new Error(data.error);
      return data.member;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team_members'] });
      qc.invalidateQueries({ queryKey: ['vas'] });
      qc.invalidateQueries({ queryKey: ['activity_logs'] });
    },
  });
}

export function useResendInvite() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke('resend-invite', {
        body: { email },
      });
      if (error) throw new Error(error.message || 'Failed to resend invitation');
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}

export function useAddTask() {
  const qc = useQueryClient();
  const { orgId, session } = useAuth();
  return useMutation({
    mutationFn: async (task: { title: string; description: string; assigned_team_member_id: string; priority: string; status: string; due_date?: string; startTimer?: boolean }) => {
      const { startTimer: shouldStart, ...taskData } = task;
      const result = await addTask({ ...taskData, organization_id: orgId! });
      await logActivity({ user_id: session!.user.id, action: 'task_created', details: { title: task.title }, organization_id: orgId! });
      if (shouldStart) {
        await startTimerOp(result.id, task.assigned_team_member_id, orgId!, session!.user.id);
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['timers'] });
      qc.invalidateQueries({ queryKey: ['vas'] });
      qc.invalidateQueries({ queryKey: ['team_members'] });
      qc.invalidateQueries({ queryKey: ['activity_logs'] });
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
      qc.invalidateQueries({ queryKey: ['activity_logs'] });
    };
  const start = useMutation({
    mutationFn: ({ taskId, teamMemberId }: { taskId: string; teamMemberId: string }) =>
      startTimerOp(taskId, teamMemberId, orgId!, session!.user.id),
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

export function useDeleteTask() {
  const qc = useQueryClient();
  const { orgId, session } = useAuth();
  return useMutation({
    mutationFn: async (taskId: string) => {
      await deleteTask(taskId);
      await logActivity({ user_id: session!.user.id, action: 'task_deleted', details: { task_id: taskId }, organization_id: orgId! });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['timers'] });
      qc.invalidateQueries({ queryKey: ['vas'] });
      qc.invalidateQueries({ queryKey: ['team_members'] });
      qc.invalidateQueries({ queryKey: ['activity_logs'] });
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      await updateTask(taskId, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTeamMember() {
  const qc = useQueryClient();
  const { orgId, session } = useAuth();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
      await logActivity({ user_id: session!.user.id, action: 'member_removed', details: { member_id: memberId }, organization_id: orgId! });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team_members'] });
      qc.invalidateQueries({ queryKey: ['vas'] });
      qc.invalidateQueries({ queryKey: ['activity_logs'] });
    },
  });
}
