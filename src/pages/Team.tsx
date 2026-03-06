import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddMemberModal } from '@/components/AddMemberModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembers } from '@/hooks/use-data';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground',
  operations_manager: 'bg-secondary text-secondary-foreground',
  team_lead: 'bg-accent text-accent-foreground',
  va: 'bg-success/10 text-success',
  viewer: 'bg-muted text-muted-foreground',
};

export default function TeamPage() {
  const { can } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const { data: users = [] } = useTeamMembers();

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
          const teamLead = u.assigned_team_lead_id ? users.find((tl: any) => tl.id === u.assigned_team_lead_id) : null;
          return (
            <div key={u.id} className="bg-card rounded-xl border p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                  {u.first_name[0]}{u.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-card-foreground">{u.first_name} {u.last_name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`${ROLE_COLORS[u.role]} text-xs capitalize`}>{u.role.replace('_', ' ')}</Badge>
                    {u.is_active ? (
                      <span className="text-xs text-success">Active</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Inactive</span>
                    )}
                  </div>
                  {teamLead && <p className="text-xs text-muted-foreground mt-1">Lead: {teamLead.first_name} {teamLead.last_name}</p>}
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
