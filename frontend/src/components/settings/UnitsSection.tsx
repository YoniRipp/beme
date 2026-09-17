import { useSettings } from '@/hooks/useSettings';
import { useProfile } from '@/hooks/useProfile';
import { Ruler } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/shared/ToastProvider';
import { SettingsSection } from './SettingsSection';

export function UnitsSection() {
  const { settings, updateSettings } = useSettings();
  const { updateProfile } = useProfile();

  const handleUnitsChange = (value: string) => {
    const units = value as (typeof settings)['units'];
    updateSettings({ units });
    toast.success('Units updated');

    // Also report it to the server. Settings are device-local by design and that does not
    // change here — this copy exists so the weight-units migration can eventually find which
    // accounts have been entering pounds (see `docs/HANDOFF.md`, "Needs the owner").
    //
    // Best-effort on purpose: the local setting is what the UI reads, so a failed sync must
    // not undo the user's choice or raise an error at them. It is logged, not swallowed.
    void updateProfile({ units }).catch((error) => {
      console.warn('Could not report unit preference to the server', error);
    });
  };

  return (
    <SettingsSection icon={Ruler} title="Units" iconColor="text-primary">
      <div className="space-y-2">
        <Label>Measurement Units</Label>
        <Select value={settings.units} onValueChange={handleUnitsChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="metric">Metric (kg, cm)</SelectItem>
            <SelectItem value="imperial">Imperial (lbs, in)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Used for weight and measurements in workouts
        </p>
      </div>
    </SettingsSection>
  );
}
