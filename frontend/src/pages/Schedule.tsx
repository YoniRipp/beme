import { useState, useMemo } from 'react';
import { useSchedule } from '@/hooks/useSchedule';
import { useSettings } from '@/hooks/useSettings';
import { ScheduleItem } from '@/components/home/ScheduleItem';
import { ScheduleModal } from '@/components/home/ScheduleModal';
import { ScheduleCalendarMonth } from '@/components/schedule/ScheduleCalendarMonth';
import { ScheduleWeekStrip } from '@/components/schedule/ScheduleWeekStrip';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Plus, CalendarDays, CalendarRange, List } from 'lucide-react';
import { format, subDays, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { ScheduleItem as ScheduleItemType } from '@/types/schedule';
import { utcScheduleToLocalDateStr } from '@/lib/utils';

function getItemsForDate(items: ScheduleItemType[], date: Date): ScheduleItemType[] {
  const dateStr = format(date, 'yyyy-MM-dd');
  return items
    .filter((item) => utcScheduleToLocalDateStr(item.date, item.startTime ?? '00:00') === dateStr)
    .sort((a, b) => {
      const aStart = a.startTime || '00:00';
      const bStart = b.startTime || '00:00';
      if (aStart !== bStart) return aStart.localeCompare(bStart);
      return (a.endTime || '00:00').localeCompare(b.endTime || '00:00');
    });
}

type ViewMode = 'today' | 'week' | 'month' | 'history';
type PeriodKey = '1m' | '3m' | '6m' | '1y';

const PERIOD_DAYS: Record<PeriodKey, number> = {
  '1m': 31,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};

export function Schedule() {
  const { settings } = useSettings();
  const { scheduleItems, scheduleLoading, scheduleError, addScheduleItem, updateScheduleItem, deleteScheduleItem } = useSchedule();
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [period, setPeriod] = useState<PeriodKey>('1m');
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItemType | undefined>(undefined);

  const activeItems = useMemo(
    () => scheduleItems.filter((item) => item.isActive),
    [scheduleItems]
  );

  const datesInRange = useMemo(() => {
    const days = PERIOD_DAYS[period];
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = subDays(end, days);
    const dates: Date[] = [];
    let d = new Date(start);
    d.setHours(0, 0, 0, 0);
    const endTime = end.getTime();
    while (d.getTime() <= endTime) {
      dates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return dates.reverse();
  }, [period]);

  const handleScheduleSave = async (item: Omit<ScheduleItemType, 'id'>) => {
    try {
      if (editingSchedule) {
        await updateScheduleItem(editingSchedule.id, item);
      } else {
        await addScheduleItem({ ...item, order: scheduleItems.length });
      }
      setEditingSchedule(undefined);
      setScheduleModalOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save schedule item. Please try again.');
    }
  };

  const handleScheduleEdit = (item: ScheduleItemType) => {
    setEditingSchedule(item);
    setScheduleModalOpen(true);
  };

  const renderTodaySection = (date: Date, editable: boolean) => {
    const itemsForDate = getItemsForDate(activeItems, date);
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">
          {isSameDay(date, new Date()) ? 'Today' : format(date, 'EEE, MMM d, yyyy')}
        </h2>
        <ContentWithLoading
          loading={scheduleLoading}
          loadingText="Loading schedule..."
          error={scheduleError}
          skeleton={
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <Skeleton className="h-9 w-16" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          {itemsForDate.length === 0 ? (
            <Card
              className="p-6 border-2 border-dashed cursor-pointer hover:border-primary transition-colors text-center"
              onClick={editable ? () => { setEditingSchedule(undefined); setScheduleModalOpen(true); } : undefined}
            >
              <Plus className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium mb-1">Add your first schedule item</p>
              <p className="text-sm text-muted-foreground">Tap to create a daily routine</p>
            </Card>
          ) : (
            <>
              {itemsForDate.map((item) => (
                <ScheduleItem
                  key={item.id}
                  item={item}
                  isPast={!editable}
                  onEdit={editable ? handleScheduleEdit : undefined}
                  onDelete={editable ? deleteScheduleItem : undefined}
                  categoryColors={settings.scheduleCategoryColors}
                />
              ))}
              {editable && (
                <Card
                  className="p-4 border-2 border-dashed cursor-pointer hover:border-primary transition-colors text-center bg-muted/50 mt-2"
                  onClick={() => { setEditingSchedule(undefined); setScheduleModalOpen(true); }}
                >
                  <Plus className="w-6 h-6 mx-auto text-primary" />
                  <p className="text-sm font-medium mt-1 text-muted-foreground">Add another</p>
                </Card>
              )}
            </>
          )}
        </ContentWithLoading>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="today" className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" /> Today
          </TabsTrigger>
          <TabsTrigger value="week" className="flex items-center gap-1.5">
            <CalendarRange className="w-4 h-4" /> Week
          </TabsTrigger>
          <TabsTrigger value="month" className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> Month
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <List className="w-4 h-4" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          {renderTodaySection(selectedDate, true)}
        </TabsContent>

        <TabsContent value="week" className="mt-4">
          <ScheduleWeekStrip
            currentDate={selectedDate}
            onCurrentDateChange={setSelectedDate}
            scheduleItems={scheduleItems}
            onEdit={handleScheduleEdit}
            onDelete={deleteScheduleItem}
            readOnly={false}
            categoryColors={settings.scheduleCategoryColors}
          />
        </TabsContent>

        <TabsContent value="month" className="mt-4 space-y-4">
          <ScheduleCalendarMonth
            currentDate={selectedDate}
            onCurrentDateChange={setSelectedDate}
            onSelectDate={setSelectedDate}
          />
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">Schedule for selected day</p>
            {renderTodaySection(selectedDate, false)}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <TabsList className="grid w-full grid-cols-4 max-w-md">
              <TabsTrigger value="1m">1 month</TabsTrigger>
              <TabsTrigger value="3m">3 months</TabsTrigger>
              <TabsTrigger value="6m">6 months</TabsTrigger>
              <TabsTrigger value="1y">1 year</TabsTrigger>
            </TabsList>
            <TabsContent value={period} className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Schedule items for each day in the past {period === '1m' ? 'month' : period === '3m' ? '3 months' : period === '6m' ? '6 months' : 'year'}.
              </p>
              <div className="space-y-6">
                {datesInRange.map((date) => {
                  const itemsForDate = getItemsForDate(scheduleItems, date);
                  return (
                    <div key={date.toISOString()}>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                        {format(date, 'EEE, MMM d, yyyy')}
                      </h3>
                      <div className="space-y-2">
                        {itemsForDate.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No items</p>
                        ) : (
                          itemsForDate.map((item) => (
                            <ScheduleItem
                              key={item.id}
                              item={item}
                              isPast={true}
                              categoryColors={settings.scheduleCategoryColors}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <ScheduleModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        onSave={handleScheduleSave}
        item={editingSchedule}
        initialDate={format(selectedDate, 'yyyy-MM-dd')}
      />
    </div>
  );
}
