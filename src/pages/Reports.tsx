import { getTimers, getTasks, getVAs, formatTime, getUsers } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function ReportsPage() {
  const { can } = useAuth();
  const timers = getTimers();
  const tasks = getTasks();
  const vas = getVAs();

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const weekTimers = timers.filter(t => t.started_at >= weekAgo);
  const totalWeekSeconds = weekTimers.reduce((s, t) => s + t.total_seconds, 0);
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const weekCompleted = completedTasks.filter(t => t.completed_at && new Date(t.completed_at).getTime() >= weekAgo);

  const avgDuration = completedTasks.length > 0
    ? timers.filter(t => t.status === 'stopped').reduce((s, t) => s + t.total_seconds, 0) / completedTasks.length
    : 0;

  const vaHours = vas.map(va => ({
    name: `${va.first_name} ${va.last_name}`,
    seconds: timers.filter(t => t.va_id === va.id).reduce((s, t) => s + t.total_seconds, 0),
  })).sort((a, b) => b.seconds - a.seconds);

  const topVA = vaHours[0];

  const handleExport = () => {
    const rows = [['VA', 'Task', 'Duration (s)', 'Status', 'Date']];
    timers.forEach(t => {
      const task = tasks.find(tk => tk.id === t.task_id);
      const va = getUsers().find(u => u.id === t.va_id);
      rows.push([
        va ? `${va.first_name} ${va.last_name}` : '',
        task?.title || '',
        String(t.total_seconds),
        t.status,
        new Date(t.started_at).toLocaleDateString(),
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `va-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const metrics = [
    { label: 'Hours This Week', value: formatTime(totalWeekSeconds) },
    { label: 'Tasks Completed (Week)', value: weekCompleted.length },
    { label: 'Avg Task Duration', value: formatTime(Math.round(avgDuration)) },
    { label: 'Top Performer', value: topVA ? `${topVA.name} (${formatTime(topVA.seconds)})` : 'N/A' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        {can('exportCsv') && (
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map(m => (
          <div key={m.label} className="bg-card rounded-xl border p-5">
            <p className="text-sm text-muted-foreground">{m.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border p-5">
        <h3 className="font-semibold mb-4 text-foreground">VA Hours Leaderboard</h3>
        <div className="space-y-3">
          {vaHours.length === 0 && <p className="text-muted-foreground text-sm">No data yet</p>}
          {vaHours.map((v, i) => (
            <div key={v.name} className="flex items-center gap-3">
              <span className="text-sm font-medium w-6 text-muted-foreground">{i + 1}.</span>
              <span className="flex-1 text-sm font-medium text-foreground">{v.name}</span>
              <div className="w-32 bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${topVA?.seconds ? (v.seconds / topVA.seconds) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-mono text-muted-foreground w-20 text-right">{formatTime(v.seconds)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
