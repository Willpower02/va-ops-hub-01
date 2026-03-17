import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import LandingPage from './LandingPage';

export default function AuthPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        console.log('[Auth] login started');
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        console.log('[Auth] login success', data.session ? 'session found' : 'no session found');
        toast.success('Signed in successfully!');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { first_name: firstName, last_name: lastName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success('Check your email to confirm your account!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (!showAuth) {
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(160deg, hsl(216 55% 8%) 0%, hsl(215 45% 14%) 50%, hsl(216 40% 10%) 100%)' }}>
      <div className="w-full max-w-sm animate-fade-in">
        <button
          onClick={() => setShowAuth(false)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center glow-border">
            <span className="text-primary font-bold">VA</span>
          </div>
          <span className="font-bold text-foreground text-2xl tracking-tight">VA Tracker</span>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">{isLogin ? 'Sign In' : 'Start Your Free Trial'}</h2>
          {!isLogin && (
            <p className="text-sm text-muted-foreground mb-4">7 days free. No credit card required.</p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground">First Name</Label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} required className="bg-secondary/50 border-border/50" />
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Name</Label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} required className="bg-secondary/50 border-border/50" />
                </div>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-secondary/50 border-border/50" />
            </div>
            <div>
              <Label className="text-muted-foreground">Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="bg-secondary/50 border-border/50" />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 glow-border font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.01]"
              disabled={loading}
            >
              {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Start Free Trial'}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-4">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
