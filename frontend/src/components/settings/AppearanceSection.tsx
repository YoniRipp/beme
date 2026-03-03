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
import { SCHEDULE_CATEGORIES, SCHEDULE_COLOR_PRESET_IDS, CATEGORY_EMOJIS } from '@/types/schedule';
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

  const categoryColors = settings.scheduleCategoryColors ?? {};
  const handleScheduleCategoryColorChange = (category: string, value: string) => {
    const next = { ...categoryColors };
    if (value === '') {
      delete next[category];
    } else {
      next[category] = value;
    }
    updateSettings({ scheduleCategoryColors: Object.keys(next).length > 0 ? next : undefined });
    toast.success('Schedule color updated');
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
        <div className="space-y-3 pt-4 border-t">
          <Label>Schedule category colors</Label>
          <p className="text-sm text-muted-foreground">
            Default color for each schedule category. Items can override in edit.
          </p>
          <div className="space-y-2">
            {SCHEDULE_CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="w-24 text-sm shrink-0">{CATEGORY_EMOJIS[cat]} {cat}</span>
                <Select
                  value={categoryColors[cat] ?? 'default'}
                  onValueChange={(v) => handleScheduleCategoryColorChange(cat, v === 'default' ? '' : v)}
                >
                  <SelectTrigger className="max-w-[180px]">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    {SCHEDULE_COLOR_PRESET_IDS.map((presetId) => (
                      <SelectItem key={presetId} value={presetId}>
                        {presetId.charAt(0).toUpperCase() + presetId.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
