import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/use-subscription';

const PRO_CHECKOUT_URL = 'https://whop.com/va-tracker/pro-e1-9109';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function UpgradeModal({ open, onClose }: Props) {
  const { data: sub } = useSubscription();
  const planLabel = sub?.plan === 'trial' ? 'free trial' : 'Starter plan';
  const message = sub?.plan === 'trial'
    ? 'Your free trial includes up to 3 VAs. Upgrade to Pro for unlimited VAs.'
    : 'Your Starter plan includes up to 3 VAs. Upgrade to Pro for unlimited VAs.';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-card border-border/30">
        <DialogHeader>
          <DialogTitle className="text-foreground">VA Limit Reached</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="border-border/50">Cancel</Button>
            <Button onClick={() => { onClose(); window.open(PRO_CHECKOUT_URL, '_blank'); }} className="bg-primary hover:bg-primary/90">
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
