import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isOnLocalDay } from '@trackvibe/shared/domain';
import { useWeight } from '@/hooks/useWeight';
import { toast } from '@/components/shared/ToastProvider';
import { toLocalDateString } from '@/lib/dateRanges';

interface WeightLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WeightLogModal({ open, onOpenChange }: WeightLogModalProps) {
  const { addWeight, weightEntries, latestWeight } = useWeight();
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Prefill on open: prefer today's entry (so the user can actually edit it),
  // otherwise fall back to the most recent weight as a sensible starting value.
  useEffect(() => {
    if (!open) return;
    const today = new Date();
    // `isSameDay(new Date(e.date), today)` read the API's bare `YYYY-MM-DD` as UTC midnight,
    // so west of UTC it never found today's entry — the modal then prefilled from the
    // previous reading and offered to "add" a weight the user had already logged.
    const todaysEntry = weightEntries.find((e) => isOnLocalDay(e.date, today));
    const prefill = todaysEntry ?? latestWeight;
    setWeight(prefill?.weight?.toString() ?? '');
    setNotes(todaysEntry?.notes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    const w = Number(weight);
    if (!Number.isFinite(w) || w < 10 || w > 500) {
      toast.error('Please enter a valid weight');
      return;
    }
    setSaving(true);
    try {
      const today = toLocalDateString(new Date());
      await addWeight({ date: today, weight: w, notes: notes || undefined });
      toast.success('Weight saved');
      onOpenChange(false);
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
          <DialogDescription>Record today's weight to keep your trend up to date.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Weight (kg)</Label>
            <Input
              type="number" inputMode="numeric"
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
