import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { getElapsedSeconds, formatTime } from '@/lib/store';

interface ActiveTasksBannerProps {
  tasks: any[];
  timers: any[];
  vas: any[];
}

export function ActiveTasksBanner({ tasks, timers, vas }: ActiveTasksBannerProps) {
  const [, setTick] = useState(0);

  const activeTasks = tasks.filter((t: any) => t.status === 'active');
  const activeTimers = activeTasks
    .map((task: any) => {
      const timer = timers.find((t: any) => t.task_id === task.id && t.status === 'running');
      const va = vas.find((v: any) => v.id === task.assigned_team_member_id);
      return timer ? { task, timer, va } : null;
    })
    .filter(Boolean) as { task: any; timer: any; va: any }[];

  useEffect(() => {
    if (activeTimers.length === 0) return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeTimers.length]);

  if (activeTimers.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-4 glow-border animate-glow-pulse">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-primary">Live Activity</h3>
        <span className="ml-auto text-xs text-muted-foreground">{activeTimers.length} running</span>
      </div>
      <div className="space-y-2">
        {activeTimers.map(({ task, timer, va }) => (
          <div key={task.id} className="flex items-center gap-3 bg-secondary/50 rounded-xl px-3 py-2 border border-border/30">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
              <p className="text-xs text-muted-foreground">{va?.name || 'Unassigned'}</p>
            </div>
            <span className="font-bold text-success text-sm timer-digits">
              {formatTime(getElapsedSeconds(timer))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
