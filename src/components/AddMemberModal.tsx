import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInviteTeamMember, useTeamMembers } from '@/hooks/use-data';
import { useMaxVAs } from '@/hooks/use-subscription';
import { UpgradeModal } from '@/components/UpgradeModal';
import { toast } from 'sonner';

interface Props { open: boolean; onClose: () => void; }

export function AddMemberModal({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('va');
  const [error, setError] = useState('');

  const [showUpgrade, setShowUpgrade] = useState(false);
  const { data: members = [] } = useTeamMembers();
  const inviteMember = useInviteTeamMember();
  const maxVAs = useMaxVAs();
  const vaCount = members.filter((m: any) => m.role === 'va').length;

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) { setError('All fields are required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email format'); return; }
    if (members.some((u: any) => u.email === email)) { setError('Email already exists'); return; }
    try {
      await inviteMember.mutateAsync({ name: name.trim(), email, role });
      setName(''); setEmail(''); setRole('va'); setError('');
      toast.success('Invitation sent successfully');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-card border-border/30">
        <DialogHeader><DialogTitle className="text-foreground">Invite Team Member</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div><Label className="text-muted-foreground">Full Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className="bg-secondary/50 border-border/50" /></div>
          <div><Label className="text-muted-foreground">Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="bg-secondary/50 border-border/50" /></div>
          <div>
            <Label className="text-muted-foreground">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="team_lead">Team Lead</SelectItem>
                <SelectItem value="va">Virtual Assistant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="border-border/50 hover:bg-secondary">Cancel</Button>
            <Button onClick={handleSave} disabled={inviteMember.isPending} className="bg-primary hover:bg-primary/90 glow-border">
              {inviteMember.isPending ? 'Sending Invite...' : 'Send Invitation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
