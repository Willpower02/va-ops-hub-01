import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTimers, useTasks, useVAs, useTeamMembers } from '@/hooks/use-data';
import { formatTime, getElapsedSeconds } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Download, Clock, CheckCircle, Trophy, Timer, Users, TrendingUp } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export default function ReportsPage() {
  const { can } = useAuth();
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view'); // 'today' highlights today's data

  const { data: timers = [] } = useTimers();
  const { data: tasks = [] } = useTasks();
  const { data: vas = [] } = useVAs();
  const { data: members = [] } = useTeamMembers();

  const todayStr = new Date().toDateString();

  const memberStats = useMemo(() => {
    return members.map((m: any) => {
      const mTasks = tasks.filter((t: any) => t.assigned_team_member_id === m.id);
      const mTaskIds = new Set(mTasks.map((t: any) => t.id));
      const mTimers = timers.filter((t: any) => mTaskIds.has(t.task_id));
      const totalSec = mTimers.reduce((s: number, t: any) => s + getElapsedSeconds(t), 0);
      const completed = mTasks.filter((t: any) => t.status === 'completed').length;
      const todaySec = mTimers
        .filter((t: any) => new Date(t.started_at).toDateString() === todayStr)
        .reduce((s: number, t: any) => s + getElapsedSeconds(t), 0);
      return { id: m.id, name: m.name, totalSec, todaySec, completed, role: m.role };
    }).sort((a: any, b: any) => b.totalSec - a.totalSec);
  }, [members, tasks, timers, todayStr]);

  const weeklyData = useMemo(() => {
    const days: { day: string; hours: number; tasks: number; isToday: boolean }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const sec = timers
        .filter((t: any) => new Date(t.started_at).toDateString() === dateStr)
        .reduce((s: number, t: any) => s + getElapsedSeconds(t), 0);
      const done = tasks.filter((t: any) => t.status === 'completed' && new Date(t.created_at).toDateString() === dateStr).length;
      days.push({ day: label, hours: Math.round((sec / 3600) * 100) / 100, tasks: done, isToday: i === 0 });
    }
    return days;
  }, [timers, tasks]);

  const perUserData = useMemo(() => {
    return memberStats
      .filter((m: any) => m.completed > 0)
      .map((m: any) => ({ name: m.name.split(' ')[0], completed: m.completed, hours: Math.round((m.totalSec / 3600) * 10) / 10 }));
  }, [memberStats]);

  if (!can('viewAnalytics')) {
    return <Navigate to="/tasks" replace />;
  }

  const todayTimers = timers.filter((t: any) => new Date(t.started_at).toDateString() === todayStr);
  const totalTodaySeconds = todayTimers.reduce((s: number, t: any) => s + getElapsedSeconds(t), 0);
  const completedToday = tasks.filter((t: any) => t.status === 'completed' && new Date(t.created_at).toDateString() === todayStr).length;

  const stoppedTimers = timers.filter((t: any) => t.status === 'stopped');
  const avgDuration = stoppedTimers.length > 0
    ? stoppedTimers.reduce((s: number, t: any) => s + t.duration_seconds, 0) / stoppedTimers.length
    : 0;

  const mostActive = memberStats[0];

  const handleExport = () => {
    const rows = [['Member', 'Task', 'Duration (s)', 'Status', 'Date']];
    timers.forEach((t: any) => {
      const task = tasks.find((tk: any) => tk.id === t.task_id);
      const member = task ? members.find((m: any) => m.id === task.assigned_team_member_id) : null;
      rows.push([member?.name || '', task?.title || '', String(t.duration_seconds), t.status, new Date(t.started_at).toLocaleDateString()]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `analytics-export-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  const statCards = [
    { label: 'Hours Tracked Today', value: formatTime(totalTodaySeconds), icon: Clock, color: 'text-primary', bg: 'bg-primary/10', highlight: view === 'today' },
    { label: 'Tasks Completed Today', value: completedToday, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', highlight: view === 'today' },
    { label: 'Most Active Member', value: mostActive?.name || 'N/A', sub: mostActive ? formatTime(mostActive.totalSec) : '', icon: Trophy, color: 'text-warning', bg: 'bg-warning/10', highlight: false },
    { label: 'Avg Task Duration', value: formatTime(Math.round(avgDuration)), icon: Timer, color: 'text-primary', bg: 'bg-primary/10', highlight: false },
  ];

  const CHART_COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(48, 96%, 53%)', 'hsl(0, 84%, 60%)', 'hsl(215, 28%, 40%)'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {view === 'today' ? "Today's time tracking overview" : 'Team performance overview'}
          </p>
        </div>
        {can('exportCsv') && (
          <Button variant="outline" onClick={handleExport} className="border-border/50 hover:bg-secondary"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className={`glass-card rounded-2xl p-5 transition-all ${s.highlight ? 'ring-2 ring-primary/30 border-primary' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            {s.sub && <p className="text-xs text-muted-foreground mt-0.5 timer-digits">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Weekly Productivity</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(215, 28%, 20%)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(215, 20%, 55%)' }} stroke="hsl(215, 28%, 20%)" />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(215, 20%, 55%)' }} stroke="hsl(215, 28%, 20%)" label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'hsl(215, 20%, 55%)' } }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid hsl(215, 28%, 20%)', fontSize: 12, background: 'hsl(216, 45%, 14%)', color: 'hsl(213, 31%, 91%)' }}
                formatter={(value: any, name: string) => [name === 'hours' ? `${value}h` : value, name === 'hours' ? 'Hours' : 'Tasks']}
              />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {weeklyData.map((entry, i) => (
                  <Cell key={i} fill={view === 'today' && entry.isToday ? 'hsl(142, 71%, 45%)' : 'hsl(217, 91%, 60%)'} />
                ))}
              </Bar>
              <Bar dataKey="tasks" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Tasks Completed Per Member</h3>
          </div>
          {perUserData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">No completed tasks yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={perUserData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(215, 28%, 20%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(215, 20%, 55%)' }} stroke="hsl(215, 28%, 20%)" />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(215, 20%, 55%)' }} stroke="hsl(215, 28%, 20%)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(215, 28%, 20%)', fontSize: 12, background: 'hsl(216, 45%, 14%)', color: 'hsl(213, 31%, 91%)' }}
                  formatter={(value: any, name: string) => [value, name === 'completed' ? 'Tasks' : 'Hours']}
                />
                <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
                  {perUserData.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-semibold mb-4 text-foreground">Team Leaderboard</h3>
        <div className="space-y-3">
          {memberStats.length === 0 && <p className="text-muted-foreground text-sm">No data yet</p>}
          {memberStats.map((m: any, i: number) => (
            <div key={m.id} className="flex items-center gap-3">
              <span className={`text-sm font-bold w-6 ${i === 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">{m.name}</span>
              <span className="text-xs text-muted-foreground">{m.completed} tasks</span>
              <div className="w-28 bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${mostActive?.totalSec ? (m.totalSec / mostActive.totalSec) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground w-20 text-right timer-digits">{formatTime(m.totalSec)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
