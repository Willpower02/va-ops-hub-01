import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { useAuth } from '@/contexts/AuthContext';
import { getTasks, getVAs, getUser, getTimerForTask, getElapsedSeconds, formatTime } from '@/lib/store';
import { Task, TaskStatus } from '@/lib/types';

const PRIORITY_CLASSES: Record<string, string> = {
  low: 'badge-priority-low',
  medium: 'badge-priority-medium',
  high: 'badge-priority-high',
  urgent: 'badge-priority-urgent',
};

export default function TasksPage() {
  const { can } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [vaFilter, setVaFilter] = useState('all');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const allTasks = getTasks();
  const vas = getVAs();

  const filterTasks = (status: TaskStatus) =>
    allTasks.filter(t => {
      if (t.status !== status) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (vaFilter !== 'all' && t.assigned_va_id !== vaFilter) return false;
      return true;
    });

  const statuses: TaskStatus[] = ['pending', 'active', 'paused', 'completed'];

  const renderTask = (task: Task) => {
    const va = getUser(task.assigned_va_id);
    const timer = getTimerForTask(task.id);
    const elapsed = timer ? getElapsedSeconds(timer) : 0;
    return (
      <div key={task.id} className="bg-card rounded-lg border p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-card-foreground">{task.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_CLASSES[task.priority]}`}>{task.priority}</span>
            {task.category && <Badge variant="outline" className="text-xs">{task.category}</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{va ? `${va.first_name} ${va.last_name}` : 'Unassigned'}</span>
            {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
          </div>
        </div>
        {timer && timer.status === 'running' && (
          <span className="font-mono font-bold text-success text-lg">{formatTime(elapsed)}</span>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
        {can('createTasks') && (
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Task</Button>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
        <Select value={vaFilter} onValueChange={setVaFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Assigned VA" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All VAs</SelectItem>
            {vas.map(v => <SelectItem key={v.id} value={v.id}>{v.first_name} {v.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          {statuses.map(s => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s} ({filterTasks(s).length})
            </TabsTrigger>
          ))}
        </TabsList>
        {statuses.map(s => (
          <TabsContent key={s} value={s} className="mt-4 space-y-3">
            {filterTasks(s).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No {s} tasks</p>
            ) : filterTasks(s).map(renderTask)}
          </TabsContent>
        ))}
      </Tabs>

      <CreateTaskModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => setTick(t => t + 1)} />
    </div>
  );
}
