import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';

export default function SettingsPage() {
  const { userName, userEmail, role, can } = useAuth();

  if (!can('manageOrg')) {
    return <Navigate to="/tasks" replace />;
  }

  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>
      <div className="bg-card rounded-xl border p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-foreground mb-3">Profile</h3>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
              {initials}
            </div>
            <div>
              <p className="font-medium text-foreground">{userName}</p>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
              <Badge className="mt-1 capitalize">{role?.replace('_', ' ')}</Badge>
            </div>
          </div>
        </div>
        <Separator />
        <div>
          <h3 className="font-semibold text-foreground mb-2">Account</h3>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>Sign Out</Button>
        </div>
        <Separator />
        <div>
          <h3 className="font-semibold text-foreground mb-2">About</h3>
          <p className="text-sm text-muted-foreground">VA Tracker — Live Operations Dashboard v2.0</p>
          <p className="text-sm text-muted-foreground">Connected to Lovable Cloud</p>
        </div>
      </div>
    </div>
  );
}
