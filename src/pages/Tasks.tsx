import { useState, useEffect } from 'react';
import { Plus, Pause, Play, Trash2, Square, Loader2, MessageSquare } from 'lucide-react';
import { TaskComments } from '@/components/TaskComments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { CompleteTaskModal } from '@/components/CompleteTaskModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks, useVAs, useTimers, useTimerControls, useDeleteTask } from '@/hooks/use-data';
import { getElapsedSeconds, formatTime } from '@/lib/store';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { TASK_CATEGORIES, CATEGORY_COLORS } from '@/lib/constants';
import { isTaskOverdue, isTaskDueSoon, formatTaskDueLabel, useTaskNotifications } from '@/hooks/use-task-notifications';

const PRIORITY_CLASSES: Record<string, string> = {
  low: 'badge-priority-low',
  medium: 'badge-priority-medium',
  high: 'badge-priority-high',
  urgent: 'badge-priority-urgent',
};

const normalizeTaskStatus = (status: string) => (status === 'running' ? 'active' : status);

export default function TasksPage() {
  const { can } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [vaFilter, setVaFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [, setTick] = useState(0);
  const [searchParams] = useSearchParams();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [stopTarget, setStopTarget] = useState<{ id: string } | null>(null);
  const { data: allTasks = [] } = useTasks();
  const { data: vas = [] } = useVAs();
  const { data: timers = [] } = useTimers();
  const timerControls = useTimerControls();
  const deleteTaskMutation = useDeleteTask();

  useTaskNotifications(allTasks);

  const statusParam = searchParams.get('status');
  const defaultTab = statusParam === 'running' ? 'active' : 'pending';

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const setLoading = (taskId: string, loading: boolean) =>
    setActionLoading((prev) => ({ ...prev, [taskId]: loading }));

  const handlePause = async (task: any) => {
    setLoading(task.id, true);
    try {
      await timerControls.pause.mutateAsync(task.id);
      toast.success('Task paused');
    } catch (err: any) {
      toast.error(err.message || 'Failed to pause task');
    } finally {
      setLoading(task.id, false);
    }
  };

  const handleResume = async (task: any) => {
    if (!task.assigned_team_member_id) {
      toast.error('No team member assigned');
      return;
    }

    setLoading(task.id, true);
    try {
      await timerControls.start.mutateAsync({ taskId: task.id, teamMemberId: task.assigned_team_member_id });
      toast.success('Task resumed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resume task');
    } finally {
      setLoading(task.id, false);
    }
  };

  const handleStop = (task: any) => {
    setStopTarget({ id: task.id });
  };

  const confirmStop = async (notes: string) => {
    if (!stopTarget) return;
    const taskId = stopTarget.id;
    setLoading(taskId, true);
    try {
      await timerControls.stop.mutateAsync({ taskId, notes: notes || undefined });
      toast.success('Task completed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to stop task');
    } finally {
      setLoading(taskId, false);
      setStopTarget(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setLoading(deleteTarget.id, true);
    try {
      await deleteTaskMutation.mutateAsync(deleteTarget.id);
      toast.success('Task deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete task');
    } finally {
      setLoading(deleteTarget.id, false);
      setDeleteTarget(null);
    }
  };

  const filterTasks = (status: string) =>
    allTasks.filter((t: any) => {
      if (normalizeTaskStatus(t.status) !== status) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (vaFilter !== 'all' && t.assigned_team_member_id !== vaFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      return true;
    });

  const statuses = ['pending', 'active', 'paused', 'completed'];

  const renderTask = (task: any) => {
    const va = vas.find((v: any) => v.id === task.assigned_team_member_id);
    const timer = timers.find((t: any) => t.task_id === task.id && t.status !== 'stopped');
    const elapsed = timer ? getElapsedSeconds(timer) : 0;
    const isLoading = actionLoading[task.id] || false;
    const taskStatus = normalizeTaskStatus(task.status);

    return (
      <div key={task.id} className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-foreground">{task.title}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_CLASSES[task.priority]}`}>
                {task.priority}
              </span>
               {task.category && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[task.category] || CATEGORY_COLORS['Other']}`}>
                  {task.category}
                </span>
              )}
              {isTaskOverdue(task) && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Overdue</Badge>
              )}
              {!isTaskOverdue(task) && isTaskDueSoon(task) && (
                <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] px-1.5 py-0">Due Soon</Badge>
              )}
            </div>
            {(() => {
              const stoppedTimer = timers.find((t: any) => t.task_id === task.id && t.status === 'stopped' && t.notes);
              return stoppedTimer ? (
                <p className="text-xs text-muted-foreground mt-1 italic">{stoppedTimer.notes}</p>
              ) : null;
            })()}
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>{va ? va.name : 'Unassigned'}</span>
              {task.due_date && <span>Due: {formatTaskDueLabel(task)}</span>}
            </div>
          </div>

          {timer && timer.status === 'running' && (
            <span className="font-bold text-success text-lg timer-digits">{formatTime(elapsed)}</span>
          )}
          {timer && timer.status === 'paused' && (
            <span className="font-medium text-muted-foreground text-lg timer-digits">{formatTime(elapsed)}</span>
          )}

          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)} title="Comments">
              <MessageSquare className="h-4 w-4" />
            </Button>

            {taskStatus === 'active' && (
              <>
                <Button size="icon" variant="ghost" onClick={() => handlePause(task)} disabled={isLoading} title="Pause">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleStop(task)} disabled={isLoading} title="Complete">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                </Button>
              </>
            )}

            {taskStatus === 'paused' && (
              <Button size="icon" variant="ghost" onClick={() => handleResume(task)} disabled={isLoading} title="Resume">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              </Button>
            )}

            {taskStatus === 'pending' && task.assigned_team_member_id && (
              <Button size="icon" variant="ghost" onClick={() => handleResume(task)} disabled={isLoading} title="Start">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              </Button>
            )}

            {taskStatus !== 'completed' && (
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget({ id: task.id, title: task.title })}
                disabled={isLoading}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {expandedTaskId === task.id && <TaskComments taskId={task.id} />}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
        {can('createTasks') && (
          <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90 glow-border">
            <Plus className="h-4 w-4 mr-1" /> New Task
          </Button>
        )}
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36 bg-secondary/50 border-border/50">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44 bg-secondary/50 border-border/50">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TASK_CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={vaFilter} onValueChange={setVaFilter}>
          <SelectTrigger className="w-44 bg-secondary/50 border-border/50">
            <SelectValue placeholder="Assigned VA" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All VAs</SelectItem>
            {vas.map((v: any) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="bg-secondary/50 border border-border/30">
          {statuses.map((s) => (
            <TabsTrigger
              key={s}
              value={s}
              className="capitalize data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              {s} ({filterTasks(s).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {statuses.map((s) => (
          <TabsContent key={s} value={s} className="mt-4 space-y-3">
            {filterTasks(s).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No {s} tasks</p>
            ) : (
              filterTasks(s).map(renderTask)
            )}
          </TabsContent>
        ))}
      </Tabs>

      <CreateTaskModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <CompleteTaskModal
        open={!!stopTarget}
        onClose={() => setStopTarget(null)}
        onConfirm={confirmStop}
        loading={stopTarget ? actionLoading[stopTarget.id] : false}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
