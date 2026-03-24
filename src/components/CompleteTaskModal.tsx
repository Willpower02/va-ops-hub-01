import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CompleteTaskModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  loading?: boolean;
}

export function CompleteTaskModal({ open, onClose, onConfirm, loading }: CompleteTaskModalProps) {
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(notes);
    setNotes('');
  };

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="completion-notes">Completion Notes (optional)</Label>
            <Textarea
              id="completion-notes"
              placeholder="What was accomplished? Any blockers or follow-ups?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? 'Completing...' : 'Complete Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
