import { User, Task, TimerRecord, ActivityLog, Comment } from './types';

const KEYS = {
  users: 'vat_users',
  tasks: 'vat_tasks',
  timers: 'vat_timers',
  activity: 'vat_activity_log',
  comments: 'vat_comments',
  currentUser: 'vat_current_user',
  seeded: 'vat_seeded',
};

function get<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

function set<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

function uid() {
  return crypto.randomUUID();
}

// Seed
export function seedIfNeeded() {
  if (localStorage.getItem(KEYS.seeded)) return;
  const now = new Date().toISOString();
  const users: User[] = [
    { id: uid(), email: 'admin@vatracker.io', first_name: 'Alex', last_name: 'Morgan', role: 'admin', is_active: true, created_at: now },
    { id: uid(), email: 'lead@vatracker.io', first_name: 'Jordan', last_name: 'Lee', role: 'team_lead', is_active: true, created_at: now },
    { id: uid(), email: 'va@vatracker.io', first_name: 'Sam', last_name: 'Rivera', role: 'va', is_active: true, status: 'idle', last_activity_at: now, created_at: now },
  ];
  set(KEYS.users, users);
  set(KEYS.tasks, []);
  set(KEYS.timers, []);
  set(KEYS.activity, []);
  set(KEYS.comments, []);
  localStorage.setItem(KEYS.currentUser, JSON.stringify(users[0]));
  localStorage.setItem(KEYS.seeded, 'true');
}

// Users
export const getUsers = () => get<User>(KEYS.users);
export const getVAs = () => getUsers().filter(u => u.role === 'va');
export const getUser = (id: string) => getUsers().find(u => u.id === id);
export const addUser = (user: Omit<User, 'id' | 'created_at'>) => {
  const users = getUsers();
  const newUser: User = { ...user, id: uid(), created_at: new Date().toISOString() };
  users.push(newUser);
  set(KEYS.users, users);
  logActivity(getCurrentUser()?.id || '', 'member_added', 'user', newUser.id, { name: `${user.first_name} ${user.last_name}` });
  return newUser;
};
export const updateUser = (id: string, updates: Partial<User>) => {
  const users = getUsers().map(u => u.id === id ? { ...u, ...updates } : u);
  set(KEYS.users, users);
  // Update current user if it's the same
  const cur = getCurrentUser();
  if (cur?.id === id) setCurrentUser({ ...cur, ...updates } as User);
};

// Current User
export const getCurrentUser = (): User | null => {
  try { return JSON.parse(localStorage.getItem(KEYS.currentUser) || 'null'); } catch { return null; }
};
export const setCurrentUser = (user: User) => localStorage.setItem(KEYS.currentUser, JSON.stringify(user));

// Tasks
export const getTasks = () => get<Task>(KEYS.tasks);
export const getTask = (id: string) => getTasks().find(t => t.id === id);
export const addTask = (task: Omit<Task, 'id' | 'created_at'>) => {
  const tasks = getTasks();
  const newTask: Task = { ...task, id: uid(), created_at: new Date().toISOString() };
  tasks.push(newTask);
  set(KEYS.tasks, tasks);
  logActivity(getCurrentUser()?.id || '', 'task_created', 'task', newTask.id, { title: task.title });
  return newTask;
};
export const updateTask = (id: string, updates: Partial<Task>) => {
  const tasks = getTasks().map(t => t.id === id ? { ...t, ...updates } : t);
  set(KEYS.tasks, tasks);
};

// Timers
export const getTimers = () => get<TimerRecord>(KEYS.timers);
export const getTimerForTask = (taskId: string) => getTimers().find(t => t.task_id === taskId && t.status !== 'stopped');
export const getRunningTimerForVA = (vaId: string) => getTimers().find(t => t.va_id === vaId && t.status === 'running');

export const startTimer = (taskId: string, vaId: string) => {
  const timers = getTimers();
  const existing = timers.find(t => t.task_id === taskId && t.status !== 'stopped');
  if (existing && existing.status === 'paused') {
    // Resume
    const updated = timers.map(t => t.id === existing.id ? { ...t, status: 'running' as const, started_at: Date.now(), total_seconds: t.total_seconds } : t);
    set(KEYS.timers, updated);
    updateTask(taskId, { status: 'active' });
    updateUser(vaId, { status: 'active', last_activity_at: new Date().toISOString() });
    logActivity(getCurrentUser()?.id || '', 'timer_started', 'timer', existing.id, {});
    return;
  }
  const timer: TimerRecord = { id: uid(), task_id: taskId, va_id: vaId, started_at: Date.now(), total_seconds: 0, status: 'running' };
  timers.push(timer);
  set(KEYS.timers, timers);
  updateTask(taskId, { status: 'active' });
  updateUser(vaId, { status: 'active', last_activity_at: new Date().toISOString() });
  logActivity(getCurrentUser()?.id || '', 'timer_started', 'timer', timer.id, {});
};

export const pauseTimer = (taskId: string) => {
  const timers = getTimers();
  const timer = timers.find(t => t.task_id === taskId && t.status === 'running');
  if (!timer) return;
  const elapsed = Math.floor((Date.now() - timer.started_at) / 1000);
  const updated = timers.map(t => t.id === timer.id ? { ...t, status: 'paused' as const, paused_at: Date.now(), total_seconds: t.total_seconds + elapsed } : t);
  set(KEYS.timers, updated);
  updateTask(taskId, { status: 'paused' });
  updateUser(timer.va_id, { status: 'paused' });
  logActivity(getCurrentUser()?.id || '', 'timer_paused', 'timer', timer.id, {});
};

export const stopTimer = (taskId: string) => {
  const timers = getTimers();
  const timer = timers.find(t => t.task_id === taskId && t.status !== 'stopped');
  if (!timer) return;
  let totalSec = timer.total_seconds;
  if (timer.status === 'running') {
    totalSec += Math.floor((Date.now() - timer.started_at) / 1000);
  }
  const updated = timers.map(t => t.id === timer.id ? { ...t, status: 'stopped' as const, stopped_at: Date.now(), total_seconds: totalSec } : t);
  set(KEYS.timers, updated);
  updateTask(taskId, { status: 'completed', completed_at: new Date().toISOString() });
  updateUser(timer.va_id, { status: 'idle' });
  logActivity(getCurrentUser()?.id || '', 'timer_stopped', 'timer', timer.id, { total_seconds: totalSec });
};

// Activity
export const logActivity = (userId: string, actionType: string, entityType: 'task' | 'timer' | 'user', entityId: string, metadata: Record<string, unknown>) => {
  const logs = get<ActivityLog>(KEYS.activity);
  logs.push({ id: uid(), user_id: userId, action_type: actionType, entity_type: entityType, entity_id: entityId, metadata, created_at: new Date().toISOString() });
  set(KEYS.activity, logs);
};

// Comments
export const getComments = (taskId: string) => get<Comment>(KEYS.comments).filter(c => c.task_id === taskId);
export const addComment = (taskId: string, userId: string, comment: string) => {
  const comments = get<Comment>(KEYS.comments);
  const newComment: Comment = { id: uid(), task_id: taskId, user_id: userId, comment, created_at: new Date().toISOString() };
  comments.push(newComment);
  set(KEYS.comments, comments);
  logActivity(userId, 'comment_added', 'task', taskId, { comment });
  return newComment;
};

// Helpers
export const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const getElapsedSeconds = (timer: TimerRecord): number => {
  if (timer.status === 'running') {
    return timer.total_seconds + Math.floor((Date.now() - timer.started_at) / 1000);
  }
  return timer.total_seconds;
};

export const getTodayTotalForVA = (vaId: string): number => {
  const today = new Date().toDateString();
  return getTimers()
    .filter(t => t.va_id === vaId)
    .reduce((sum, t) => {
      const timerDate = new Date(t.started_at).toDateString();
      if (timerDate !== today) return sum;
      return sum + getElapsedSeconds(t);
    }, 0);
};
