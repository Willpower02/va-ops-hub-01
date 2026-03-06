import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddMemberModal } from '@/components/AddMemberModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembers } from '@/hooks/use-data';
import { Navigate } from 'react-router-dom';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground',
  team_lead: 'bg-accent text-accent-foreground',
  va: 'bg-success/10 text-success',
};

export default function TeamPage() {
  const { can } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const { data: users = [] } = useTeamMembers();

  if (!can('viewTeam')) {
    return <Navigate to="/tasks" replace />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Team</h1>
        {can('addMembers') && (
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Team Member</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u: any) => {
          const initials = u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={u.id} className="bg-card rounded-xl border p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-card-foreground">{u.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`${ROLE_COLORS[u.role] || 'bg-muted text-muted-foreground'} text-xs capitalize`}>{u.role.replace('_', ' ')}</Badge>
                    <span className={`text-xs ${u.status !== 'offline' ? 'text-success' : 'text-muted-foreground'}`}>
                      {u.status !== 'offline' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AddMemberModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
