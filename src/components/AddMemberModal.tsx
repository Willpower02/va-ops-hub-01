import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddTeamMember, useTeamMembers } from '@/hooks/use-data';
import { toast } from 'sonner';

interface Props { open: boolean; onClose: () => void; }

export function AddMemberModal({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('va');
  const [error, setError] = useState('');

  const { data: members = [] } = useTeamMembers();
  const addMember = useAddTeamMember();

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) { setError('All fields are required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email format'); return; }
    if (members.some((u: any) => u.email === email)) { setError('Email already exists'); return; }
    try {
      await addMember.mutateAsync({
        name: name.trim(), email, role,
        status: role === 'va' ? 'idle' : 'offline',
      });
      setName(''); setEmail(''); setRole('va'); setError('');
      toast.success('Team member added!');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div><Label>Full Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" /></div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="team_lead">Team Lead</SelectItem>
                <SelectItem value="va">Virtual Assistant</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
