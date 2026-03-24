export const TASK_CATEGORIES = [
  'Lead Gen',
  'Admin',
  'Research',
  'Communication',
  'Data Entry',
  'Other',
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  'Lead Gen': 'bg-blue-500/20 text-blue-400',
  'Admin': 'bg-purple-500/20 text-purple-400',
  'Research': 'bg-yellow-500/20 text-yellow-400',
  'Communication': 'bg-green-500/20 text-green-400',
  'Data Entry': 'bg-orange-500/20 text-orange-400',
  'Other': 'bg-muted text-muted-foreground',
};
