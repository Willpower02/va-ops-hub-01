export type Role = 'admin' | 'operations_manager' | 'team_lead' | 'va' | 'viewer';
export type VAStatus = 'active' | 'paused' | 'idle' | 'offline';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'active' | 'paused' | 'completed';
export type TimerStatus = 'running' | 'paused' | 'stopped';

export interface TimerRecord {
  id: string;
  task_id: string;
  started_at: string;
  stopped_at?: string | null;
  duration_seconds: number;
  status: TimerStatus;
  created_at: string;
}

export const ROLE_PERMISSIONS = {
  admin: { addMembers: true, createTasks: true, controlTimers: true, addComments: true, exportCsv: true },
  operations_manager: { addMembers: true, createTasks: true, controlTimers: true, addComments: true, exportCsv: true },
  team_lead: { addMembers: false, createTasks: true, controlTimers: true, addComments: true, exportCsv: false },
  va: { addMembers: false, createTasks: false, controlTimers: false, addComments: true, exportCsv: false },
  viewer: { addMembers: false, createTasks: false, controlTimers: false, addComments: false, exportCsv: false },
} as const;
