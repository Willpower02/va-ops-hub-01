import { useMemo } from 'react';
import { getElapsedSeconds, formatTime } from '@/lib/store';

interface WeeklySummaryProps {
  timers: any[];
  tasks: any[];
}

export function WeeklySummary({ timers, tasks }: WeeklySummaryProps) {
  const weekData = useMemo(() => {
    const now = new Date();
    const days: { label: string; date: string; seconds: number; completed: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'short' });

      const seconds = timers
        .filter((t: any) => new Date(t.started_at).toDateString() === dateStr)
        .reduce((sum: number, t: any) => sum + getElapsedSeconds(t), 0);

      const completed = tasks.filter(
        (t: any) => t.status === 'completed' && new Date(t.created_at).toDateString() === dateStr
      ).length;

      days.push({ label: dayLabel, date: dateStr, seconds, completed });
    }
    return days;
  }, [timers, tasks]);

  const maxSeconds = Math.max(...weekData.map(d => d.seconds), 1);
  const totalWeek = weekData.reduce((s, d) => s + d.seconds, 0);
  const totalCompleted = weekData.reduce((s, d) => s + d.completed, 0);

  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-card-foreground">Weekly Productivity</h3>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{formatTime(totalWeek)} tracked</span>
          <span>{totalCompleted} tasks done</span>
        </div>
      </div>
      <div className="flex items-end gap-2 h-28">
        {weekData.map((day) => {
          const pct = maxSeconds > 0 ? (day.seconds / maxSeconds) * 100 : 0;
          const isToday = day.label === 'Today';
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground font-mono">
                {day.seconds > 0 ? formatTime(day.seconds).slice(0, 5) : '—'}
              </span>
              <div className="w-full flex items-end" style={{ height: '60px' }}>
                <div
                  className={`w-full rounded-t-md transition-all ${isToday ? 'bg-primary' : 'bg-primary/30'}`}
                  style={{ height: `${Math.max(pct, 4)}%` }}
                />
              </div>
              <span className={`text-[10px] font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
