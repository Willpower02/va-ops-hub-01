import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Square, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMember, useTasks, useTimers, useTeamMembers, useTimerControls, useAddComment, useComments } from '@/hooks/use-data';
import { getElapsedSeconds, formatTime } from '@/lib/store';

const PRIORITY_CLASSES: Record<string, string> = {
  low: 'badge-priority-low',
  medium: 'badge-priority-medium',
  high: 'badge-priority-high',
  urgent: 'badge-priority-urgent',
};

export default function VADetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, profile } = useAuth();
  const [tick, setTick] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: va } = useTeamMember(id);
  const { data: allTasks = [] } = useTasks();
  const { data: timers = [] } = useTimers();
  const { data: members = [] } = useTeamMembers();
  const { data: comments = [] } = useComments(selectedTaskId);
  const timerControls = useTimerControls();
  const addCommentMutation = useAddComment();

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!va) return <div className="p-8 text-center text-muted-foreground">VA not found</div>;

  const tasks = allTasks.filter((t: any) => t.assigned_va_id === va.id);
  const activeTasks = tasks.filter((t: any) => t.status === 'active');
  const pendingTasks = tasks.filter((t: any) => t.status === 'pending');
  const pausedTasks = tasks.filter((t: any) => t.status === 'paused');
  const completedTasks = tasks.filter((t: any) => t.status === 'completed');

  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-success text-success-foreground',
    paused: 'bg-warning text-warning-foreground',
    idle: 'bg-muted text-muted-foreground',
    offline: 'bg-foreground/20 text-foreground',
  };

  const handleComment = async (taskId: string) => {
    if (!commentText.trim()) return;
    await addCommentMutation.mutateAsync({ taskId, comment: commentText.trim() });
    setCommentText('');
  };

  const renderTaskList = (taskList: any[], showTimer: boolean) => (
    <div className="space-y-3">
      {taskList.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center">No tasks</p>}
      {taskList.map((task: any) => {
        const timer = timers.find((t: any) => t.task_id === task.id && t.status !== 'stopped');
        const elapsed = timer ? getElapsedSeconds(timer) : 0;
        const taskComments = selectedTaskId === task.id ? comments : [];
        return (
          <div key={task.id} className="bg-card rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-card-foreground">{task.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_CLASSES[task.priority]}`}>{task.priority}</span>
                  {task.category && <Badge variant="outline" className="text-xs">{task.category}</Badge>}
                </div>
                {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                {task.due_date && <p className="text-xs text-muted-foreground mt-1">Due: {new Date(task.due_date).toLocaleDateString()}</p>}
              </div>
              {showTimer && (
                <div className="text-right shrink-0">
                  <p className="text-xl font-mono font-bold text-success">{formatTime(elapsed)}</p>
                  {can('controlTimers') && (
                    <div className="flex gap-1 mt-2 justify-end">
                      {(!timer || timer.status === 'paused') && (
                        <Button size="sm" variant="outline" onClick={() => timerControls.start.mutate({ taskId: task.id, vaId: va.id })}>
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      {timer?.status === 'running' && (
                        <Button size="sm" variant="outline" onClick={() => timerControls.pause.mutate(task.id)}>
                          <Pause className="h-3 w-3" />
                        </Button>
                      )}
                      {timer && timer.status !== 'stopped' && (
                        <Button size="sm" variant="outline" onClick={() => timerControls.stop.mutate(task.id)}>
                          <Square className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t">
              <button onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
                <MessageSquare className="h-3 w-3" /> Comments
              </button>
              {selectedTaskId === task.id && (
                <div className="mt-2 space-y-2">
                  {taskComments.map((c: any) => {
                    const author = members.find((u: any) => u.id === c.user_id);
                    return (
                      <div key={c.id} className="text-sm bg-muted rounded p-2">
                        <span className="font-medium">{author?.first_name || profile?.first_name || 'You'}: </span>
                        <span className="text-muted-foreground">{c.comment}</span>
                      </div>
                    );
                  })}
                  {can('addComments') && (
                    <div className="flex gap-2">
                      <Input size={1} value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add comment..." className="text-sm" onKeyDown={e => e.key === 'Enter' && handleComment(task.id)} />
                      <Button size="sm" onClick={() => handleComment(task.id)} disabled={addCommentMutation.isPending}>Send</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
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
          {va.first_name[0]}{va.last_name[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{va.first_name} {va.last_name}</h1>
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
    </div>
  );
}
