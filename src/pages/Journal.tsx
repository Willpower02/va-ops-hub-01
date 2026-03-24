import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { BookOpen, Download, CalendarIcon } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLogs, useVAs, useTasks } from '@/hooks/use-data';
import { formatTime } from '@/lib/store';

const ACTION_LABELS: Record<string, string> = {
  task_created: 'Created task',
  timer_started: 'Started timer on',
  timer_paused: 'Paused timer on',
  timer_stopped: 'Stopped timer on',
  task_completed: 'Completed',
  task_deleted: 'Deleted task',
  member_added: 'Added team member',
  member_removed: 'Removed team member',
};

const ACTION_FILTER_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'task_created', label: 'Task Created' },
  { value: 'timer_started', label: 'Timer Started' },
  { value: 'timer_stopped', label: 'Timer Stopped' },
  { value: 'task_completed', label: 'Task Completed' },
];

export default function JournalPage() {
  const { can } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [vaFilter, setVaFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: logs = [] } = useActivityLogs();
  const { data: vas = [] } = useVAs();
  const { data: tasks = [] } = useTasks();

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  const entries = useMemo(() => {
    return logs
      .filter((log: any) => {
        const logDate = format(new Date(log.created_at), 'yyyy-MM-dd');
        if (logDate !== selectedDateStr) return false;
        if (actionFilter !== 'all' && log.action !== actionFilter) return false;
        const details = log.details as any;
        if (vaFilter !== 'all') {
          const taskId = details?.task_id;
          if (taskId) {
            const task = tasks.find((t: any) => t.id === taskId);
            if (!task || task.assigned_team_member_id !== vaFilter) return false;
          } else {
            return false;
          }
        }
        return true;
      })
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((log: any) => {
        const details = log.details as any;
        const taskId = details?.task_id;
        const task = taskId ? tasks.find((t: any) => t.id === taskId) : null;
        const taskTitle = details?.title || task?.title || 'Unknown task';
        const va = task
          ? vas.find((v: any) => v.id === task.assigned_team_member_id)
          : null;
        const durationSec = details?.duration_seconds;
        const notes = details?.notes;

        return {
          id: log.id,
          time: format(new Date(log.created_at), 'hh:mm a'),
          vaName: va?.name || details?.name || '—',
          vaInitials: va
            ? va.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
            : '?',
          action: ACTION_LABELS[log.action] || log.action,
          taskTitle,
          duration: durationSec ? formatTime(durationSec) : null,
          notes: notes || null,
        };
      });
  }, [logs, tasks, vas, selectedDateStr, vaFilter, actionFilter]);

  if (!can('viewJournal')) {
    return <Navigate to="/tasks" replace />;
  }

  const handleExport = () => {
    const rows = [['Time', 'VA Name', 'Action', 'Task', 'Duration', 'Notes']];
    entries.forEach((e) => {
      rows.push([e.time, e.vaName, e.action, e.taskTitle, e.duration || '', e.notes || '']);
    });
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-${selectedDateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Journal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} className="border-border/50 hover:bg-secondary">
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[200px] justify-start text-left font-normal bg-secondary/50 border-border/50',
                !selectedDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>

        <Select value={vaFilter} onValueChange={setVaFilter}>
          <SelectTrigger className="w-44 bg-secondary/50 border-border/50">
            <SelectValue placeholder="All VAs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All VAs</SelectItem>
            {vas.map((v: any) => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48 bg-secondary/50 border-border/50">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No activity recorded for this date</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="glass-card rounded-xl p-4 flex items-start gap-4">
              <span className="text-xs text-muted-foreground w-20 shrink-0 pt-1 timer-digits">
                {entry.time}
              </span>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {entry.vaInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{entry.vaName}</span>
                  {' '}
                  <span className="text-muted-foreground">{entry.action}</span>
                  {' '}
                  <span className="font-medium">{entry.taskTitle}</span>
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {entry.duration && (
                    <span className="text-xs text-primary timer-digits">{entry.duration}</span>
                  )}
                  {entry.notes && (
                    <span className="text-xs text-muted-foreground italic">{entry.notes}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
