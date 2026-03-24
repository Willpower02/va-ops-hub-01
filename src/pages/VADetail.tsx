import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Square, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskComments } from '@/components/TaskComments';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompleteTaskModal } from '@/components/CompleteTaskModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMember, useTasks, useTimers, useTimerControls } from '@/hooks/use-data';
import { getElapsedSeconds, formatTime } from '@/lib/store';
import { toast } from 'sonner';

const PRIORITY_CLASSES: Record<string, string> = {
  low: 'badge-priority-low',
  medium: 'badge-priority-medium',
  high: 'badge-priority-high',
  urgent: 'badge-priority-urgent',
};

export default function VADetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [tick, setTick] = useState(0);
  const [stopTarget, setStopTarget] = useState<string | null>(null);
  const [stopLoading, setStopLoading] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const { data: va } = useTeamMember(id);
  const { data: allTasks = [] } = useTasks();
  const { data: timers = [] } = useTimers();
  const timerControls = useTimerControls();

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const confirmStop = async (notes: string) => {
    if (!stopTarget) return;
    setStopLoading(true);
    try {
      await timerControls.stop.mutateAsync({ taskId: stopTarget, notes: notes || undefined });
      toast.success('Task completed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to stop task');
    } finally {
      setStopLoading(false);
      setStopTarget(null);
    }
  };

  if (!va) return <div className="p-8 text-center text-muted-foreground">VA not found</div>;

  const tasks = allTasks.filter((t: any) => t.assigned_team_member_id === va.id);
  const activeTasks = tasks.filter((t: any) => t.status === 'active' || t.status === 'running');
  const pendingTasks = tasks.filter((t: any) => t.status === 'pending');
  const pausedTasks = tasks.filter((t: any) => t.status === 'paused');
  const completedTasks = tasks.filter((t: any) => t.status === 'completed');

  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-success text-success-foreground',
    paused: 'bg-warning text-warning-foreground',
    idle: 'bg-muted text-muted-foreground',
    offline: 'bg-foreground/20 text-foreground',
  };

  const initials = va.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const renderTaskList = (taskList: any[], showTimer: boolean) => (
    <div className="space-y-3">
      {taskList.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center">No tasks</p>}
      {taskList.map((task: any) => {
        const timer = timers.find((t: any) => t.task_id === task.id && t.status !== 'stopped');
        const elapsed = timer ? getElapsedSeconds(timer) : 0;
        return (
          <div key={task.id} className="bg-card rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 cursor-pointer" onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-card-foreground">{task.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_CLASSES[task.priority]}`}>{task.priority}</span>
                </div>
                {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                {(() => {
                  const stoppedTimer = timers.find((t: any) => t.task_id === task.id && t.status === 'stopped' && t.notes);
                  return stoppedTimer ? <p className="text-xs text-muted-foreground mt-1 italic">{stoppedTimer.notes}</p> : null;
                })()}
                {task.due_date && <p className="text-xs text-muted-foreground mt-1">Due: {new Date(task.due_date).toLocaleDateString()}</p>}
              </div>
              <div className="text-right shrink-0">
                {showTimer && (
                  <>
                    <p className="text-xl font-mono font-bold text-success">{formatTime(elapsed)}</p>
                    {can('controlTimers') && (
                      <div className="flex gap-1 mt-2 justify-end">
                        {(!timer || timer.status === 'paused') && (
                          <Button size="sm" variant="outline" onClick={() => timerControls.start.mutate({ taskId: task.id, teamMemberId: va.id })}>
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                        {timer?.status === 'running' && (
                          <Button size="sm" variant="outline" onClick={() => timerControls.pause.mutate(task.id)}>
                            <Pause className="h-3 w-3" />
                          </Button>
                        )}
                        {timer && timer.status !== 'stopped' && (
                          <Button size="sm" variant="outline" onClick={() => setStopTarget(task.id)}>
                            <Square className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
                <Button size="icon" variant="ghost" className="mt-1" onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)} title="Comments">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {expandedTaskId === task.id && <TaskComments taskId={task.id} />}
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
      </Button>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{va.name}</h1>
          <Badge className={`${STATUS_COLORS[va.status || 'offline']} capitalize mt-1`}>{va.status || 'offline'}</Badge>
        </div>
      </div>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeTasks.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingTasks.length})</TabsTrigger>
          <TabsTrigger value="paused">Paused ({pausedTasks.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">{renderTaskList(activeTasks, true)}</TabsContent>
        <TabsContent value="pending" className="mt-4">{renderTaskList(pendingTasks, false)}</TabsContent>
        <TabsContent value="paused" className="mt-4">{renderTaskList(pausedTasks, true)}</TabsContent>
        <TabsContent value="completed" className="mt-4">{renderTaskList(completedTasks, false)}</TabsContent>
      </Tabs>
      <CompleteTaskModal
        open={!!stopTarget}
        onClose={() => setStopTarget(null)}
        onConfirm={confirmStop}
        loading={stopLoading}
      />
    </div>
  );
}
