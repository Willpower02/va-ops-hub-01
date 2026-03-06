import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertCircle } from 'lucide-react';
import { getElapsedSeconds, formatTime } from '@/lib/store';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success',
  paused: 'bg-warning',
  idle: 'bg-muted-foreground/40',
  offline: 'bg-foreground/30',
};

const STATUS_BORDER: Record<string, string> = {
  active: 'border-success/30 glow-border-success',
  paused: 'border-warning/30',
  idle: 'border-border/50',
  offline: 'border-border/30',
};

const AVATAR_COLORS = [
  'bg-primary/20 text-primary', 'bg-success/20 text-success', 'bg-secondary text-foreground', 'bg-warning/20 text-warning', 'bg-destructive/20 text-destructive',
];

interface VACardProps {
  va: any;
  index: number;
  timers: any[];
  tasks: any[];
}

export function VACard({ va, index, timers, tasks }: VACardProps) {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);

  const vaTasks = tasks.filter((t: any) => t.assigned_team_member_id === va.id);
  const activeTask = vaTasks.find((t: any) => t.status === 'active');
  const pendingCount = vaTasks.filter((t: any) => t.status === 'pending').length;
  const completedCount = vaTasks.filter((t: any) => t.status === 'completed').length;

  const activeTaskTimer = activeTask
    ? timers.find((t: any) => t.task_id === activeTask.id && t.status === 'running')
    : null;

  const todayStr = new Date().toDateString();
  const todayTotal = timers
    .filter((t: any) => vaTasks.some((vt: any) => vt.id === t.task_id))
    .reduce((sum: number, t: any) => {
      if (new Date(t.started_at).toDateString() !== todayStr) return sum;
      return sum + getElapsedSeconds(t);
    }, 0);

  useEffect(() => {
    if (!activeTaskTimer) { setElapsed(0); return; }
    const update = () => setElapsed(getElapsedSeconds(activeTaskTimer));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeTaskTimer?.id, activeTaskTimer?.status, activeTaskTimer?.started_at]);

  const initials = va.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const status = va.status || 'offline';
  const isIdle = status === 'idle' || status === 'offline';

  return (
    <div
      onClick={() => navigate(`/va/${va.id}`)}
      className={`glass-card rounded-2xl border ${STATUS_BORDER[status]} p-5 cursor-pointer hover:scale-[1.02] transition-all duration-300 group ${isIdle ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <div className={`w-10 h-10 rounded-full ${AVATAR_COLORS[index % AVATAR_COLORS.length]} flex items-center justify-center font-bold text-sm shrink-0`}>
            {initials}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${STATUS_COLORS[status]} ${status === 'active' ? 'animate-pulse' : ''}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{va.name}</h3>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">{status}</p>
        </div>
        {isIdle && pendingCount === 0 && (
          <div className="shrink-0" title="No tasks assigned">
            <AlertCircle className="h-4 w-4 text-warning" />
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {activeTask ? (
          <div className="bg-success/10 border border-success/20 rounded-xl px-3 py-2">
            <p className="text-xs font-medium text-success truncate">{activeTask.title}</p>
            <p className="text-lg font-bold text-success timer-digits">{formatTime(elapsed)}</p>
          </div>
        ) : isIdle && pendingCount > 0 ? (
          <div className="bg-warning/10 border border-warning/20 rounded-xl px-3 py-2">
            <p className="text-xs font-medium text-warning">Idle — {pendingCount} task{pendingCount !== 1 ? 's' : ''} waiting</p>
          </div>
        ) : (
          <div className="bg-muted/50 rounded-xl px-3 py-2">
            <p className="text-xs text-muted-foreground">No active task</p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{pendingCount} pending</span>
            <span>{completedCount} done</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="timer-digits">{formatTime(todayTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
