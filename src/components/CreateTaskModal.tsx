import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useVAs, useAddTask } from '@/hooks/use-data';
import { toast } from 'sonner';
import { TASK_CATEGORIES } from '@/lib/constants';

interface Props { open: boolean; onClose: () => void; preselectedVaId?: string; }

export function CreateTaskModal({ open, onClose, preselectedVaId }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [vaId, setVaId] = useState(preselectedVaId || '');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [startImmediately, setStartImmediately] = useState(false);
  const [error, setError] = useState('');

  const { data: vas = [] } = useVAs();
  const addTask = useAddTask();

  const handleCreate = async () => {
    if (!title.trim()) { setError('Task title is required'); return; }
    if (!vaId) { setError('Please assign a VA'); return; }
    try {
      await addTask.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        assigned_team_member_id: vaId,
        priority,
        status: startImmediately ? 'active' : 'pending',
        due_date: dueDate || undefined,
        due_time: dueTime || undefined,
        category: category || undefined,
        startTimer: startImmediately,
      });
      setTitle(''); setDescription(''); setVaId(preselectedVaId || ''); setPriority('medium');
      setCategory(''); setDueDate(''); setStartImmediately(false); setError('');
      toast.success('Task created!');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg glass-card border-border/30">
        <DialogHeader><DialogTitle className="text-foreground">Create Task</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div><Label className="text-muted-foreground">Task Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter task title" className="bg-secondary/50 border-border/50" /></div>
          <div><Label className="text-muted-foreground">Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the task..." rows={3} className="bg-secondary/50 border-border/50" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground">Assign VA *</Label>
              <Select value={vaId} onValueChange={setVaId}>
                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue placeholder="Select VA" /></SelectTrigger>
                <SelectContent>
                  {vas.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {TASK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-muted-foreground">Due Date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-secondary/50 border-border/50" /></div>
          <div className="flex items-center gap-2">
            <Checkbox id="startTimer" checked={startImmediately} onCheckedChange={(c) => setStartImmediately(c === true)} />
            <Label htmlFor="startTimer" className="cursor-pointer text-muted-foreground">Start timer immediately</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="border-border/50 hover:bg-secondary">Cancel</Button>
            <Button onClick={handleCreate} disabled={addTask.isPending} className="bg-primary hover:bg-primary/90 glow-border">
              {addTask.isPending ? 'Creating...' : startImmediately ? 'Create & Start Timer' : 'Create Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
