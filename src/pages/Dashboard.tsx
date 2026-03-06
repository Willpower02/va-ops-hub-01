import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { VACard } from '@/components/VACard';
import { AddMemberModal } from '@/components/AddMemberModal';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { useAuth } from '@/contexts/AuthContext';
import { useVAs, useTimers, useTasks } from '@/hooks/use-data';

export default function Dashboard() {
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const { data: vas = [] } = useVAs();
  const { data: timers = [] } = useTimers();
  const { data: tasks = [] } = useTasks();

  const filtered = vas.filter((va: any) => {
    const nameMatch = va.name.toLowerCase().includes(search.toLowerCase());
    const statusMatch = statusFilter === 'all' || va.status === statusFilter;
    return nameMatch && statusMatch;
  });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search VAs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'paused', 'idle', 'offline'].map(s => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)} className="capitalize">
              {s}
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

      <AddMemberModal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} />
      <CreateTaskModal open={createTaskOpen} onClose={() => setCreateTaskOpen(false)} />
    </div>
  );
}
