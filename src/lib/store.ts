import { supabase } from '@/lib/supabase';

// ---- Queries ----

export const fetchTeamMembers = async (orgId: string) => {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const fetchVAs = async (orgId: string) => {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('organization_id', orgId)
    .eq('role', 'va')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const fetchTeamMember = async (id: string) => {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const fetchTasks = async (orgId: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const fetchTimers = async (orgId: string) => {
  // Timers don't have org_id directly, fetch via tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('organization_id', orgId);
  if (!tasks || tasks.length === 0) return [];
  const taskIds = tasks.map(t => t.id);
  const { data, error } = await supabase
    .from('timers')
    .select('*')
    .in('task_id', taskIds);
  if (error) throw error;
  return data || [];
};

export const fetchActivityLogs = async (orgId: string) => {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
};

// ---- Mutations ----

export const addTeamMember = async (member: {
  organization_id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  avatar_url?: string;
}) => {
  const { data, error } = await supabase
    .from('team_members')
    .insert([member] as any)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateTeamMember = async (id: string, updates: Record<string, any>) => {
  const { error } = await supabase
    .from('team_members')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
};

export const addTask = async (task: {
  title: string;
  description: string;
  assigned_team_member_id: string;
  priority: string;
  status: string;
  due_date?: string;
  organization_id: string;
}) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([task] as any)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateTask = async (id: string, updates: Record<string, any>) => {
  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
};

export const deleteTask = async (id: string) => {
  // Delete associated timers first
  const { error: timerError } = await supabase
    .from('timers')
    .delete()
    .eq('task_id', id);
  if (timerError) throw timerError;
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const addTimer = async (timer: {
  task_id: string;
  started_at: string;
  duration_seconds: number;
  status: string;
}) => {
  const { data, error } = await supabase
    .from('timers')
    .insert([timer] as any)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateTimer = async (id: string, updates: Record<string, any>) => {
  const { error } = await supabase
    .from('timers')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
};

export const logActivity = async (log: {
  organization_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown>;
}) => {
  await supabase.from('activity_logs').insert([log] as any);
};

// ---- Timer operations ----

const fetchOpenTimersForTask = async (taskId: string) => {
  const { data, error } = await supabase
    .from('timers')
    .select('*')
    .eq('task_id', taskId)
    .in('status', ['running', 'paused'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const startTimerOp = async (taskId: string, teamMemberId: string, orgId: string, userId: string) => {
  const openTimers = await fetchOpenTimersForTask(taskId);
  const runningTimer = openTimers.find((t: any) => t.status === 'running');
  const pausedTimer = openTimers.find((t: any) => t.status === 'paused');

  if (!runningTimer) {
    if (pausedTimer) {
      await updateTimer(pausedTimer.id, { status: 'running', started_at: new Date().toISOString(), stopped_at: null });
    } else {
      await addTimer({ task_id: taskId, started_at: new Date().toISOString(), duration_seconds: 0, status: 'running' });
    }
  }

  await updateTask(taskId, { status: 'active' });
  await updateTeamMember(teamMemberId, { status: 'active' });
  await logActivity({ user_id: userId, action: 'timer_started', details: { task_id: taskId }, organization_id: orgId });
};

export const pauseTimerOp = async (taskId: string, orgId: string, userId: string) => {
  const openTimers = await fetchOpenTimersForTask(taskId);
  const runningTimers = openTimers.filter((t: any) => t.status === 'running');

  if (runningTimers.length === 0) {
    throw new Error('No running timer found for this task');
  }

  const now = new Date().toISOString();

  await Promise.all(
    runningTimers.map((timer: any) => {
      const elapsed = Math.floor((Date.now() - new Date(timer.started_at).getTime()) / 1000);
      return updateTimer(timer.id, {
        status: 'paused',
        stopped_at: now,
        duration_seconds: timer.duration_seconds + elapsed,
      });
    })
  );

  await updateTask(taskId, { status: 'paused' });

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('assigned_team_member_id')
    .eq('id', taskId)
    .single();

  if (taskError) throw taskError;
  if (task?.assigned_team_member_id) await updateTeamMember(task.assigned_team_member_id, { status: 'paused' });

  await logActivity({ user_id: userId, action: 'timer_paused', details: { task_id: taskId }, organization_id: orgId });
};

export const stopTimerOp = async (taskId: string, orgId: string, userId: string, notes?: string) => {
  const openTimers = await fetchOpenTimersForTask(taskId);

  if (openTimers.length === 0) {
    throw new Error('No active timer found for this task');
  }

  const now = new Date().toISOString();

  const durationTotals = openTimers.map((timer: any) => {
    let totalSec = timer.duration_seconds;
    if (timer.status === 'running') {
      totalSec += Math.floor((Date.now() - new Date(timer.started_at).getTime()) / 1000);
    }
    return { id: timer.id, totalSec };
  });

  await Promise.all(
    durationTotals.map((entry) =>
      updateTimer(entry.id, {
        status: 'stopped',
        stopped_at: now,
        duration_seconds: entry.totalSec,
        ...(notes ? { notes } : {}),
      })
    )
  );

  const totalDuration = durationTotals.reduce((sum, entry) => sum + entry.totalSec, 0);

  await updateTask(taskId, { status: 'completed' });
  const { data: task, error: taskError } = await supabase.from('tasks').select('assigned_team_member_id').eq('id', taskId).single();
  if (taskError) throw taskError;
  if (task?.assigned_team_member_id) await updateTeamMember(task.assigned_team_member_id, { status: 'idle' });
  await logActivity({ user_id: userId, action: 'timer_stopped', details: { task_id: taskId, duration_seconds: totalDuration, ...(notes ? { notes } : {}) }, organization_id: orgId });
};

// ---- Helpers ----

export const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const getElapsedSeconds = (timer: { status: string; duration_seconds: number; started_at: string }): number => {
  if (timer.status === 'running') {
    return timer.duration_seconds + Math.floor((Date.now() - new Date(timer.started_at).getTime()) / 1000);
  }
  return timer.duration_seconds;
};
