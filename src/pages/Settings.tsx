import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      <div className="bg-card rounded-xl border p-6 space-y-6">
        <div>
          <h3 className="font-semibold text-foreground mb-3">Profile</h3>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div>
              <p className="font-medium text-foreground">{user?.first_name} {user?.last_name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge className="mt-1 capitalize">{user?.role?.replace('_', ' ')}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-foreground mb-2">Subscription</h3>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">Starter Plan</Badge>
            <span className="text-sm text-muted-foreground">Mock Mode — No billing active</span>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-foreground mb-2">About</h3>
          <p className="text-sm text-muted-foreground">VA Tracker — Live Operations Dashboard v1.0</p>
          <p className="text-sm text-muted-foreground">Mock Mode with localStorage persistence</p>
        </div>
      </div>
    </div>
  );
}
