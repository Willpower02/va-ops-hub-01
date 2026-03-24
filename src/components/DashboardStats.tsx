import { Users, Clock, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import { getElapsedSeconds, formatTime } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { isTaskOverdue } from '@/hooks/use-task-notifications';

interface DashboardStatsProps {
  vas: any[];
  tasks: any[];
  timers: any[];
  activeFilter?: string | null;
  onFilterChange?: (filter: string | null) => void;
}

export function DashboardStats({ vas, tasks, timers }: DashboardStatsProps) {
  const navigate = useNavigate();

  const activeVAs = vas.filter((v: any) => v.status === 'active').length;
  const idleVAs = vas.filter((v: any) => v.status === 'idle' || v.status === 'offline').length;
  const activeTasks = tasks.filter((t: any) => t.status === 'active').length;
  const completedToday = tasks.filter((t: any) => {
    if (t.status !== 'completed') return false;
    return new Date(t.created_at).toDateString() === new Date().toDateString();
  }).length;
  const overdueTasks = tasks.filter((t: any) => isTaskOverdue(t)).length;

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
      link: '/team?status=active',
    },
    {
      label: 'Running Tasks',
      value: activeTasks,
      sub: `${completedToday} completed today`,
      icon: Clock,
      color: 'text-primary',
      bg: 'bg-primary/10',
      glowClass: activeTasks > 0 ? 'glow-border' : '',
      link: '/tasks?status=running',
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
      link: '/reports?view=today',
    },
    {
      label: 'Idle Members',
      value: idleVAs,
      sub: idleVAs > 0 ? 'available for tasks' : 'everyone is busy',
      icon: AlertTriangle,
      color: idleVAs > 0 ? 'text-warning' : 'text-muted-foreground',
      bg: idleVAs > 0 ? 'bg-warning/10' : 'bg-muted',
      glowClass: '',
      link: '/team?status=idle',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <button
          key={stat.label}
          onClick={() => navigate(stat.link)}
          className={`glass-card rounded-2xl border border-border/10 p-6 text-left shadow-sm transition-all duration-300 cursor-pointer hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 hover:ring-2 hover:ring-primary/20 active:scale-[0.99] active:ring-2 active:ring-primary/30 active:border-primary ${stat.glowClass}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
          </div>
          <p className={`text-3xl font-bold ${stat.color} mt-2 ${'isTimer' in stat && stat.isTimer ? 'timer-digits' : ''}`}>{stat.value}</p>
          <p className="text-sm text-muted-foreground mt-1">{stat.sub}</p>
        </button>
      ))}
    </div>
  );
}
