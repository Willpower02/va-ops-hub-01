import { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { VACard } from '@/components/VACard';
import { DashboardStats } from '@/components/DashboardStats';
import { WeeklySummary } from '@/components/WeeklySummary';
import { ActiveTasksBanner } from '@/components/ActiveTasksBanner';
import { ActivityFeed } from '@/components/ActivityFeed';
import { AddMemberModal } from '@/components/AddMemberModal';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { useAuth } from '@/contexts/AuthContext';
import { useVAs, useTimers, useTasks, useTeamMembers } from '@/hooks/use-data';
import { useIdleDetection } from '@/hooks/use-idle-detection';
import { useTaskNotifications } from '@/hooks/use-task-notifications';
import { Navigate } from 'react-router-dom';
import { TrialBanner } from '@/components/TrialBanner';

export default function Dashboard() {
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [, setTick] = useState(0);

  const { data: vas = [] } = useVAs();
  const { data: allMembers = [] } = useTeamMembers();
  const { data: timers = [] } = useTimers();
  const { data: tasks = [] } = useTasks();

  useIdleDetection();

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!can('viewDashboard')) {
    return <Navigate to="/tasks" replace />;
  }

  const filtered = vas.filter((va: any) => {
    const nameMatch = va.name.toLowerCase().includes(search.toLowerCase());
    const statusMatch = statusFilter === 'all' || va.status === statusFilter;
    return nameMatch && statusMatch;
  });

  const statusCounts = {
    all: vas.length,
    active: vas.filter((v: any) => v.status === 'active').length,
    paused: vas.filter((v: any) => v.status === 'paused').length,
    idle: vas.filter((v: any) => v.status === 'idle').length,
    offline: vas.filter((v: any) => v.status === 'offline').length,
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-5">
      <TrialBanner />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Live Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{today}</p>
        </div>
        <div className="flex gap-2">
          {can('createTasks') && (
            <Button variant="outline" onClick={() => setCreateTaskOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Task
            </Button>
          )}
          {can('addMembers') && (
            <Button onClick={() => setAddMemberOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Team Member
            </Button>
          )}
        </div>
      </div>

      <DashboardStats vas={allMembers} tasks={tasks} timers={timers} />
      <ActiveTasksBanner tasks={tasks} timers={timers} vas={allMembers} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WeeklySummary timers={timers} tasks={tasks} />
        <ActivityFeed />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Virtual Assistants</h2>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search VAs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'active', 'paused', 'idle', 'offline'] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
                className="capitalize"
              >
                {s}
                <span className="ml-1.5 text-xs opacity-70">{statusCounts[s]}</span>
              </Button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No VAs found</p>
            {can('addMembers') && (
              <Button className="mt-4" onClick={() => setAddMemberOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Your First VA
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((va: any, i: number) => (
              <VACard key={va.id} va={va} index={i} timers={timers} tasks={tasks} />
            ))}
          </div>
        )}
      </div>

      <AddMemberModal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} />
      <CreateTaskModal open={createTaskOpen} onClose={() => setCreateTaskOpen(false)} />
    </div>
  );
}
