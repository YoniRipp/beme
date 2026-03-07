import { useState } from 'react';
import { Plus, X, Dumbbell, UtensilsCrossed, Moon } from 'lucide-react';
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

export function QuickAddMenu() {
  const [open, setOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<MenuAction | null>(null);

  const { addWorkout } = useWorkouts();
  const { addFoodEntry, addCheckIn, getCheckInByDate, updateCheckIn } = useEnergy();

  const handleSelect = (action: MenuAction) => {
    setOpen(false);
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
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* FAB + menu - mobile only, above bottom nav */}
      <div className="fixed bottom-16 right-4 z-50 lg:hidden flex flex-col items-end gap-2">
        {/* Expanding menu items */}
        {open && MENU_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              className="flex items-center gap-2 animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
              onClick={() => handleSelect(item.key)}
            >
              <span className="text-sm font-medium text-foreground bg-card px-3 py-1.5 rounded-full shadow-md">
                {item.label}
              </span>
              <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </button>
          );
        })}

        {/* Main FAB button */}
        <button
          type="button"
          className={`w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 active:scale-95 transition-all ${open ? 'rotate-45' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close quick add menu' : 'Open quick add menu'}
        >
          {open ? <X className="w-5 h-5 text-primary-foreground" /> : <Plus className="w-5 h-5 text-primary-foreground" />}
        </button>
      </div>

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
