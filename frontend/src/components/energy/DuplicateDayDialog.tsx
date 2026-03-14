import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { toLocalDateString } from '@/lib/dateRanges';
import { format, addDays } from 'date-fns';

interface DuplicateDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceDate: Date;
  entryCount: number;
  onDuplicate: (sourceDate: string, targetDate: string) => Promise<void>;
}

export function DuplicateDayDialog({
  open,
  onOpenChange,
  sourceDate,
  entryCount,
  onDuplicate,
}: DuplicateDayDialogProps) {
  const [targetDate, setTargetDate] = useState(() =>
    toLocalDateString(addDays(new Date(), 1)),
  );
  const [saving, setSaving] = useState(false);

  const handleDuplicate = async () => {
    setSaving(true);
    try {
      await onDuplicate(toLocalDateString(sourceDate), targetDate);
      toast.success(`Copied ${entryCount} entries to ${format(new Date(targetDate + 'T00:00:00'), 'MMM d')}`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to duplicate entries. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Day&apos;s Menu</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Copy <span className="font-medium text-foreground">{entryCount} food entries</span> from{' '}
            <span className="font-medium text-foreground">{format(sourceDate, 'EEEE, MMM d')}</span> to
            another day.
          </p>

          <div>
            <label htmlFor="target-date" className="text-sm font-medium">
              Target Date
            </label>
            <Input
              id="target-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={saving || !targetDate}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Copying...
              </>
            ) : (
              `Copy ${entryCount} Entries`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
