import { useEffect, useState } from 'react';
import { User } from '@/lib/types';
import { getElapsedSeconds, getRunningTimerForVA, getTasks, getTimers, formatTime, getTodayTotalForVA } from '@/lib/store';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success',
  paused: 'bg-warning',
  idle: 'bg-muted-foreground/40',
  offline: 'bg-foreground/30',
};

const AVATAR_COLORS = [
  'bg-primary', 'bg-accent', 'bg-secondary', 'bg-warning', 'bg-destructive',
];

export function VACard({ va, index }: { va: User; index: number }) {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const runningTimer = getRunningTimerForVA(va.id);
  const tasks = getTasks().filter(t => t.assigned_va_id === va.id);
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const activeTask = tasks.find(t => t.status === 'active');
  const todayTotal = getTodayTotalForVA(va.id);

  useEffect(() => {
    if (!runningTimer) { setElapsed(0); return; }
    const update = () => setElapsed(getElapsedSeconds(runningTimer));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [runningTimer?.id, runningTimer?.status, runningTimer?.started_at]);

  return (
    <div
      onClick={() => navigate(`/va/${va.id}`)}
      className="bg-card rounded-xl border p-5 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 group"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full ${AVATAR_COLORS[index % AVATAR_COLORS.length]} flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0`}>
          {va.first_name[0]}{va.last_name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-card-foreground truncate">{va.first_name} {va.last_name}</h3>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[va.status || 'offline']} ${va.status === 'active' ? 'animate-pulse-dot' : ''}`} />
          </div>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">{va.status || 'offline'}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {activeTask ? (
          <div className="bg-success/10 rounded-lg px-3 py-2">
            <p className="text-xs font-medium text-success truncate">{activeTask.title}</p>
            <p className="text-lg font-mono font-bold text-success">{formatTime(elapsed)}</p>
          </div>
        ) : (
          <div className="bg-muted rounded-lg px-3 py-2">
            <p className="text-xs text-muted-foreground">No active task</p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{pendingCount} pending task{pendingCount !== 1 ? 's' : ''}</span>
          <span>Today: {formatTime(todayTotal)}</span>
        </div>
      </div>
    </div>
  );
}
