import { useSettings } from '@/hooks/useSettings';
import { Palette } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BALANCE_DISPLAY_COLORS,
  BALANCE_DISPLAY_LAYOUTS,
} from '@/types/settings';
import { toast } from 'sonner';
import { SettingsSection } from './SettingsSection';

export function AppearanceSection() {
  const { settings, updateSettings } = useSettings();

  const handleBalanceColorChange = (value: string) => {
    updateSettings({ balanceDisplayColor: value as (typeof settings)['balanceDisplayColor'] });
    toast.success('Accent color updated');
  };

  const handleBalanceLayoutChange = (value: string) => {
    updateSettings({ balanceDisplayLayout: value as (typeof settings)['balanceDisplayLayout'] });
    toast.success('Balance layout updated');
  };

  return (
    <SettingsSection icon={Palette} title="Appearance" iconColor="text-primary">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Accent color</Label>
          <Select value={settings.balanceDisplayColor} onValueChange={handleBalanceColorChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BALANCE_DISPLAY_COLORS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Primary color for buttons, links, and highlights across the app.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Header balance</Label>
          <Select value={settings.balanceDisplayLayout} onValueChange={handleBalanceLayoutChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BALANCE_DISPLAY_LAYOUTS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Show only balance or balance with income and expenses
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
