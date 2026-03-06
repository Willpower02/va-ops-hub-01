import { supabase } from '@/integrations/supabase/client';

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
  const { data, error } = await supabase
    .from('timers')
    .select('*')
    .eq('organization_id', orgId);
  if (error) throw error;
  return data || [];
};

export const fetchComments = async (taskId: string) => {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

// ---- Mutations ----

export const addTeamMember = async (member: {
  organization_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  status?: string;
  last_activity_at?: string;
  assigned_team_lead_id?: string;
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
  assigned_va_id: string;
  created_by: string;
  priority: string;
  category: string;
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

export const addTimer = async (timer: {
  task_id: string;
  va_id: string;
  started_at: number;
  total_seconds: number;
  status: string;
  organization_id: string;
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

export const addComment = async (comment: {
  task_id: string;
  user_id: string;
  comment: string;
  organization_id: string;
}) => {
  const { data, error } = await supabase
    .from('comments')
    .insert([comment] as any)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const logActivity = async (log: {
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  organization_id: string;
}) => {
  await supabase.from('activity_logs').insert([log] as any);
};

// ---- Timer operations ----

export const startTimerOp = async (taskId: string, vaId: string, orgId: string, userId: string) => {
  // Check for existing non-stopped timer
  const { data: existing } = await supabase
    .from('timers')
    .select('*')
    .eq('task_id', taskId)
    .neq('status', 'stopped')
    .maybeSingle();

  if (existing && existing.status === 'paused') {
    await updateTimer(existing.id, { status: 'running', started_at: Date.now() });
  } else if (!existing) {
    await addTimer({ task_id: taskId, va_id: vaId, started_at: Date.now(), total_seconds: 0, status: 'running', organization_id: orgId });
  }
  await updateTask(taskId, { status: 'active' });
  await updateTeamMember(vaId, { status: 'active', last_activity_at: new Date().toISOString() });
  await logActivity({ user_id: userId, action_type: 'timer_started', entity_type: 'timer', entity_id: taskId, metadata: {}, organization_id: orgId });
};

export const pauseTimerOp = async (taskId: string, orgId: string, userId: string) => {
  const { data: timer } = await supabase
    .from('timers')
    .select('*')
    .eq('task_id', taskId)
    .eq('status', 'running')
    .maybeSingle();
  if (!timer) return;
  const elapsed = Math.floor((Date.now() - timer.started_at) / 1000);
  await updateTimer(timer.id, { status: 'paused', paused_at: Date.now(), total_seconds: timer.total_seconds + elapsed });
  await updateTask(taskId, { status: 'paused' });
  await updateTeamMember(timer.va_id, { status: 'paused' });
  await logActivity({ user_id: userId, action_type: 'timer_paused', entity_type: 'timer', entity_id: timer.id, metadata: {}, organization_id: orgId });
};

export const stopTimerOp = async (taskId: string, orgId: string, userId: string) => {
  const { data: timer } = await supabase
    .from('timers')
    .select('*')
    .eq('task_id', taskId)
    .neq('status', 'stopped')
    .maybeSingle();
  if (!timer) return;
  let totalSec = timer.total_seconds;
  if (timer.status === 'running') {
    totalSec += Math.floor((Date.now() - timer.started_at) / 1000);
  }
  await updateTimer(timer.id, { status: 'stopped', stopped_at: Date.now(), total_seconds: totalSec });
  await updateTask(taskId, { status: 'completed', completed_at: new Date().toISOString() });
  await updateTeamMember(timer.va_id, { status: 'idle' });
  await logActivity({ user_id: userId, action_type: 'timer_stopped', entity_type: 'timer', entity_id: timer.id, metadata: { total_seconds: totalSec }, organization_id: orgId });
};

// ---- Helpers ----

export const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const getElapsedSeconds = (timer: { status: string; total_seconds: number; started_at: number }): number => {
  if (timer.status === 'running') {
    return timer.total_seconds + Math.floor((Date.now() - timer.started_at) / 1000);
  }
  return timer.total_seconds;
};
