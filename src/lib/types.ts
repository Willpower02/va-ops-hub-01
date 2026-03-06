export type Role = 'admin' | 'operations_manager' | 'team_lead' | 'va' | 'viewer';
export type VAStatus = 'active' | 'paused' | 'idle' | 'offline';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'active' | 'paused' | 'completed';
export type TimerStatus = 'running' | 'paused' | 'stopped';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  team_id?: string;
  avatar_url?: string;
  status?: VAStatus;
  last_activity_at?: string;
  is_active: boolean;
  assigned_team_lead_id?: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_va_id: string;
  created_by: string;
  priority: TaskPriority;
  category: string;
  status: TaskStatus;
  due_date?: string;
  created_at: string;
  completed_at?: string;
}

export interface TimerRecord {
  id: string;
  task_id: string;
  va_id: string;
  started_at: number; // unix ms
  paused_at?: number;
  stopped_at?: number;
  total_seconds: number;
  status: TimerStatus;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: 'task' | 'timer' | 'user';
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

export const ROLE_PERMISSIONS = {
  admin: { addMembers: true, createTasks: true, controlTimers: true, addComments: true, exportCsv: true },
  operations_manager: { addMembers: true, createTasks: true, controlTimers: true, addComments: true, exportCsv: true },
  team_lead: { addMembers: false, createTasks: true, controlTimers: true, addComments: true, exportCsv: false },
  va: { addMembers: false, createTasks: false, controlTimers: false, addComments: true, exportCsv: false },
  viewer: { addMembers: false, createTasks: false, controlTimers: false, addComments: false, exportCsv: false },
} as const;
