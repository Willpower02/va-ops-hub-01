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
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !session) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('create_organization', {
        _name: name.trim(),
      });
      if (rpcErr) throw rpcErr;
      if (!data) throw new Error('Organization creation returned no ID');

      toast.success('Organization created!');
      await refreshOrg();
    } catch (err: any) {
      const msg = err.message || 'Failed to create organization';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
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
          {error && <p className="text-sm text-destructive mb-3">{error}</p>}
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Organization Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="My Company" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !session}>
              {loading ? 'Creating...' : 'Create Organization'}
            </Button>
          </form>
          <Button variant="ghost" className="w-full mt-2" onClick={() => supabase.auth.signOut()}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
