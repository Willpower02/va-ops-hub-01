import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function UpgradeModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-card border-border/30">
        <DialogHeader>
          <DialogTitle className="text-foreground">Upgrade Required</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Starter plan is limited to 3 VAs. Upgrade to Pro for unlimited team members.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="border-border/50">Cancel</Button>
            <Button onClick={() => { onClose(); navigate('/pricing'); }} className="bg-primary hover:bg-primary/90">
              View Plans
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
