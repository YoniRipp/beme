import { useState } from 'react';
import { Dumbbell, UtensilsCrossed, Moon } from 'lucide-react';
import { WorkoutModal } from '@/components/body/WorkoutModal';
import { FoodEntryModal } from '@/components/energy/FoodEntryModal';
import { SleepEditModal } from '@/components/energy/SleepEditModal';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useEnergy } from '@/hooks/useEnergy';
import type { Workout } from '@/types/workout';
import type { FoodEntry } from '@/types/energy';
import { toast } from 'sonner';

const MENU_ITEMS = [
  { key: 'workout', label: 'Workout', icon: Dumbbell, color: 'bg-blue-500' },
  { key: 'food', label: 'Food', icon: UtensilsCrossed, color: 'bg-orange-500' },
  { key: 'sleep', label: 'Sleep', icon: Moon, color: 'bg-indigo-500' },
] as const;

type MenuAction = (typeof MENU_ITEMS)[number]['key'];

interface QuickAddMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAddMenu({ open, onOpenChange }: QuickAddMenuProps) {
  const [activeModal, setActiveModal] = useState<MenuAction | null>(null);

  const { addWorkout } = useWorkouts();
  const { addFoodEntry, addCheckIn, getCheckInByDate, updateCheckIn } = useEnergy();

  const handleSelect = (action: MenuAction) => {
    onOpenChange(false);
    setActiveModal(action);
  };

  const handleWorkoutSave = (workout: Omit<Workout, 'id'>) => {
    addWorkout(workout);
    toast.success('Workout added');
    setActiveModal(null);
  };

  const handleFoodSave = (entry: Omit<FoodEntry, 'id'>) => {
    addFoodEntry(entry);
    toast.success('Food entry added');
    setActiveModal(null);
  };

  const handleSleepSave = (hours: number) => {
    const todayCheckIn = getCheckInByDate(new Date());
    if (todayCheckIn) {
      updateCheckIn(todayCheckIn.id, { sleepHours: hours });
      toast.success('Sleep updated');
    } else {
      addCheckIn({ date: new Date(), sleepHours: hours });
      toast.success('Sleep logged');
    }
    setActiveModal(null);
  };

  const todayCheckIn = getCheckInByDate(new Date());

  return (
    <>
      {/* Bottom sheet backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={() => onOpenChange(false)}
          aria-hidden
        />
      )}

      {/* Bottom sheet menu */}
      {open && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl animate-fade-up p-6 pb-8">
          <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-6" />
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Quick Add</p>
          <div className="grid grid-cols-3 gap-4">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className="flex flex-col items-center gap-3 py-4 px-2 rounded-2xl bg-muted hover:bg-muted/80 active:scale-[0.97] transition-all"
                  onClick={() => handleSelect(item.key)}
                >
                  <div className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <WorkoutModal
        open={activeModal === 'workout'}
        onOpenChange={(isOpen) => { if (!isOpen) setActiveModal(null); }}
        onSave={handleWorkoutSave}
      />

      <FoodEntryModal
        open={activeModal === 'food'}
        onOpenChange={(isOpen) => { if (!isOpen) setActiveModal(null); }}
        onSave={handleFoodSave}
      />

      <SleepEditModal
        open={activeModal === 'sleep'}
        onOpenChange={(isOpen) => { if (!isOpen) setActiveModal(null); }}
        onSave={handleSleepSave}
        currentHours={todayCheckIn?.sleepHours}
      />
    </>
  );
}
