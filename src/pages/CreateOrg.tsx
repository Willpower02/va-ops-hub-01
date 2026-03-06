import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function CreateOrgPage() {
  const { session, refreshOrg } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !session) return;
    setLoading(true);
    try {
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .insert([{ name: name.trim(), owner_user_id: session.user.id }] as any)
        .select()
        .single();
      if (orgErr) throw orgErr;

      const { error: memErr } = await supabase
        .from('organization_members')
        .insert([{ organization_id: org.id, user_id: session.user.id, role: 'admin' }] as any);
      if (memErr) throw memErr;

      toast.success('Organization created!');
      await refreshOrg();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold">VA</span>
          </div>
          <span className="font-bold text-foreground text-2xl tracking-tight">VA Tracker</span>
        </div>
        <div className="bg-card rounded-xl border p-6">
          <h2 className="text-xl font-bold text-foreground mb-2">Create Your Organization</h2>
          <p className="text-sm text-muted-foreground mb-4">Set up your team workspace to get started.</p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Organization Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="My Company" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Organization'}
            </Button>
          </form>
          <Button variant="ghost" className="w-full mt-2" onClick={handleSignOut}>Sign Out</Button>
        </div>
      </div>
    </div>
  );
}
