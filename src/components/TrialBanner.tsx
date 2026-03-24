import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription, useTrialDaysLeft } from '@/hooks/use-subscription';
import { useNavigate } from 'react-router-dom';

export function TrialBanner() {
  const { data: sub } = useSubscription();
  const daysLeft = useTrialDaysLeft();
  const navigate = useNavigate();

  if (!sub) return null;

  // Expired paywall
  if (sub.subscription_status === 'expired') {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Your Subscription Has Expired</h2>
          <p className="text-muted-foreground">Choose a plan to continue using VA Tracker.</p>
          <Button onClick={() => navigate('/pricing')} className="bg-primary hover:bg-primary/90">
            Choose a Plan
          </Button>
        </div>
      </div>
    );
  }

  // Trial warning banner (show when <= 3 days left)
  if (daysLeft !== null && daysLeft <= 3) {
    return (
      <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <p className="text-sm text-foreground">
            Your trial ends in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> — Upgrade to keep access.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate('/pricing')} className="bg-primary hover:bg-primary/90 shrink-0">
          Upgrade Now
        </Button>
      </div>
    );
  }

  return null;
}
