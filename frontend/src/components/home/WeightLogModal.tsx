import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWeight } from '@/hooks/useWeight';
import { toast } from 'sonner';

interface WeightLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WeightLogModal({ open, onOpenChange }: WeightLogModalProps) {
  const { addWeight, latestWeight } = useWeight();
  const [weight, setWeight] = useState(latestWeight?.weight?.toString() ?? '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const w = Number(weight);
    if (!w || w < 10 || w > 500) {
      toast.error('Please enter a valid weight');
      return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await addWeight({ date: today, weight: w, notes: notes || undefined });
      toast.success('Weight logged');
      onOpenChange(false);
      setWeight('');
      setNotes('');
    } catch {
      toast.error('Could not save weight');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Weight</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Weight (kg)</Label>
            <Input
              type="number"
              placeholder="70.0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              min={10}
              max={500}
              step={0.1}
              autoFocus
            />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input
              placeholder="Morning weigh-in..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
