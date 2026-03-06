import { Users, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { getElapsedSeconds, formatTime } from '@/lib/store';

interface DashboardStatsProps {
  vas: any[];
  tasks: any[];
  timers: any[];
}

export function DashboardStats({ vas, tasks, timers }: DashboardStatsProps) {
  const activeVAs = vas.filter((v: any) => v.status === 'active').length;
  const idleVAs = vas.filter((v: any) => v.status === 'idle' || v.status === 'offline').length;
  const activeTasks = tasks.filter((t: any) => t.status === 'active').length;
  const completedToday = tasks.filter((t: any) => {
    if (t.status !== 'completed') return false;
    return new Date(t.created_at).toDateString() === new Date().toDateString();
  }).length;

  const todayStr = new Date().toDateString();
  const totalTrackedToday = timers
    .filter((t: any) => new Date(t.started_at).toDateString() === todayStr)
    .reduce((sum: number, t: any) => sum + getElapsedSeconds(t), 0);

  const stats = [
    {
      label: 'Active Now',
      value: activeVAs,
      sub: `of ${vas.length} team members`,
      icon: Users,
      color: 'text-success',
      bg: 'bg-success/10',
      glowClass: activeVAs > 0 ? 'glow-border-success' : '',
    },
    {
      label: 'Running Tasks',
      value: activeTasks,
      sub: `${completedToday} completed today`,
      icon: Clock,
      color: 'text-primary',
      bg: 'bg-primary/10',
      glowClass: activeTasks > 0 ? 'glow-border' : '',
    },
    {
      label: 'Time Tracked Today',
      value: formatTime(totalTrackedToday),
      sub: 'across all members',
      icon: CheckCircle,
      color: 'text-primary',
      bg: 'bg-primary/10',
      glowClass: '',
      isTimer: true,
    },
    {
      label: 'Idle Members',
      value: idleVAs,
      sub: idleVAs > 0 ? 'available for tasks' : 'everyone is busy',
      icon: AlertTriangle,
      color: idleVAs > 0 ? 'text-warning' : 'text-muted-foreground',
      bg: idleVAs > 0 ? 'bg-warning/10' : 'bg-muted',
      glowClass: '',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className={`glass-card rounded-2xl p-4 transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 ${stat.glowClass}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
          </div>
          <p className={`text-2xl font-bold ${stat.color} ${'isTimer' in stat && stat.isTimer ? 'timer-digits' : ''}`}>{stat.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
        </div>
      ))}
    </div>
  );
}
