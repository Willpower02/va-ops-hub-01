import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Also check if we already have a recovery session
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setReady(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated successfully! Please sign in.');
      await supabase.auth.signOut();
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(160deg, hsl(216 55% 8%) 0%, hsl(215 45% 14%) 50%, hsl(216 40% 10%) 100%)' }}>
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center glow-border">
              <span className="text-primary font-bold">VA</span>
            </div>
            <span className="font-bold text-foreground text-2xl tracking-tight">VA Tracker</span>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <p className="text-muted-foreground text-sm">Verifying your reset link...</p>
            <p className="text-muted-foreground text-xs mt-2">If nothing happens, the link may be expired or invalid.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(160deg, hsl(216 55% 8%) 0%, hsl(215 45% 14%) 50%, hsl(216 40% 10%) 100%)' }}>
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center glow-border">
            <span className="text-primary font-bold">VA</span>
          </div>
          <span className="font-bold text-foreground text-2xl tracking-tight">VA Tracker</span>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Set New Password</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-muted-foreground">New Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="bg-secondary/50 border-border/50" />
            </div>
            <div>
              <Label className="text-muted-foreground">Confirm Password</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} className="bg-secondary/50 border-border/50" />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 glow-border font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.01]" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
