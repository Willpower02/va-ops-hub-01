import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddTeamMember, useTeamMembers } from '@/hooks/use-data';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddMemberModal({ open, onClose }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('va');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [error, setError] = useState('');

  const { data: members = [] } = useTeamMembers();
  const addMember = useAddTeamMember();
  const teamLeads = members.filter((u: any) => u.role === 'team_lead');

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('All fields are required'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email format'); return;
    }
    if (members.some((u: any) => u.email === email)) {
      setError('Email already exists'); return;
    }
    try {
      await addMember.mutateAsync({
        first_name: firstName, last_name: lastName, email, role,
        is_active: true,
        status: role === 'va' ? 'idle' : undefined,
        last_activity_at: role === 'va' ? new Date().toISOString() : undefined,
        assigned_team_lead_id: teamLeadId || undefined,
      });
      setFirstName(''); setLastName(''); setEmail(''); setRole('va'); setTeamLeadId(''); setError('');
      toast.success('Team member added!');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First Name</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" /></div>
            <div><Label>Last Name</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" /></div>
          </div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" /></div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="operations_manager">Operations Manager</SelectItem>
                <SelectItem value="team_lead">Team Lead</SelectItem>
                <SelectItem value="va">Virtual Assistant</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {teamLeads.length > 0 && (
            <div>
              <Label>Assigned Team Lead (optional)</Label>
              <Select value={teamLeadId} onValueChange={setTeamLeadId}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {teamLeads.map((tl: any) => (
                    <SelectItem key={tl.id} value={tl.id}>{tl.first_name} {tl.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={addMember.isPending}>
              {addMember.isPending ? 'Saving...' : 'Save Member'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
