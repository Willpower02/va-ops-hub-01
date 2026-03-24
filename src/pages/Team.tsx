import { useState } from 'react';
import { Plus, RotateCw, Trash2, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { AddMemberModal } from '@/components/AddMemberModal';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembers, useResendInvite, useDeleteTeamMember } from '@/hooks/use-data';
import { useSubscription, useMaxVAs, useTrialDaysLeft } from '@/hooks/use-subscription';
import { Navigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-primary/20 text-primary',
  team_lead: 'bg-success/20 text-success',
  va: 'bg-success/10 text-success',
};

const STATUS_OPTIONS = ['all', 'active', 'idle', 'offline', 'pending'] as const;

export default function TeamPage() {
  const { can } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { data: users = [] } = useTeamMembers();
  const { data: sub } = useSubscription();
  const maxVAs = useMaxVAs();
  const trialDaysLeft = useTrialDaysLeft();
  const vaCount = users.filter((u: any) => u.role === 'va').length;
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const resendInvite = useResendInvite();
  const deleteTeamMember = useDeleteTeamMember();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleInviteClick = () => {
    if (maxVAs !== null && vaCount >= maxVAs) {
      setUpgradeOpen(true);
    } else {
      setAddOpen(true);
    }
  };

  if (!can('viewTeam')) {
    return <Navigate to="/tasks" replace />;
  }

  const setStatusFilter = (s: string) => {
    if (s === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', s);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const filtered = users.filter((u: any) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return u.invite_status === 'pending';
    if (statusFilter === 'active') return u.status === 'active';
    if (statusFilter === 'idle') return u.status === 'idle' || u.status === 'offline';
    return u.status === statusFilter;
  });

  const handleResendInvite = async (member: { name: string; email: string; role: string }) => {
    try {
      await resendInvite.mutateAsync(member);
      toast.success('Invitation resent successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend invitation');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteTeamMember.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.name} removed from team`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove team member');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Team</h1>
        {can('addMembers') && (
          <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90 glow-border"><Plus className="h-4 w-4 mr-1" /> Invite Team Member</Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {STATUS_OPTIONS.map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((u: any) => {
          const initials = u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
          const isPending = u.invite_status === 'pending';
          return (
            <div key={u.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isPending ? 'bg-warning/20 text-warning' : 'bg-primary/20 text-primary'}`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{u.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`${ROLE_COLORS[u.role] || 'bg-muted text-muted-foreground'} text-xs capitalize border-0`}>{u.role.replace('_', ' ')}</Badge>
                    {isPending ? (
                      <Badge className="bg-warning/10 text-warning text-xs border-0">⏳ Pending</Badge>
                    ) : (
                      <span className={`text-xs ${u.status !== 'offline' ? 'text-success' : 'text-muted-foreground'}`}>
                        {u.status !== 'offline' ? '● Active' : '○ Inactive'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {isPending && can('addMembers') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-primary hover:text-primary/80 h-7 px-2"
                        onClick={() => handleResendInvite({ name: u.name, email: u.email, role: u.role })}
                        disabled={resendInvite.isPending}
                      >
                        <RotateCw className="h-3 w-3 mr-1" />
                        Resend Invite
                      </Button>
                    )}
                    {can('addMembers') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:text-destructive h-7 px-2"
                        onClick={() => setDeleteTarget({ id: u.id, name: u.name })}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">No team members match this filter</p>
        )}
      </div>

      <AddMemberModal open={addOpen} onClose={() => setAddOpen(false)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteTarget?.name} from the team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
