export type Role = 'admin' | 'team_lead' | 'va';
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
  admin: {
    manageOrg: true,
    addMembers: true,
    removeMembers: true,
    createTasks: true,
    editTasks: true,
    deleteTasks: true,
    controlTimers: true,
    viewAnalytics: true,
    exportCsv: true,
    viewTeam: true,
    viewDashboard: true,
    addComments: true,
    viewJournal: true,
  },
  team_lead: {
    manageOrg: false,
    addMembers: false,
    removeMembers: false,
    createTasks: true,
    editTasks: true,
    deleteTasks: false,
    controlTimers: true,
    viewAnalytics: false,
    exportCsv: false,
    viewTeam: true,
    viewDashboard: true,
    addComments: true,
    viewJournal: true,
  },
  va: {
    manageOrg: false,
    addMembers: false,
    removeMembers: false,
    createTasks: false,
    editTasks: false,
    deleteTasks: false,
    controlTimers: false,
    viewAnalytics: false,
    exportCsv: false,
    viewTeam: false,
    viewDashboard: false,
    addComments: true,
    viewJournal: false,
  },
} as const;
