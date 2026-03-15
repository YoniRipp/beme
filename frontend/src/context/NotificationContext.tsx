import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
  scheduleDailyReminder,
  cancelScheduledNotification,
} from '@/lib/notifications';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEYS } from '@/lib/storage';

export interface NotificationPreferences {
  enabled: boolean;
  logFoodReminder: boolean;
  logFoodReminderTime: { hours: number; minutes: number };
  logSleepReminder: boolean;
  logSleepReminderTime: { hours: number; minutes: number };
}

const defaultPreferences: NotificationPreferences = {
  enabled: false,
  logFoodReminder: false,
  logFoodReminderTime: { hours: 20, minutes: 0 },
  logSleepReminder: false,
  logSleepReminderTime: { hours: 22, minutes: 0 },
};

interface NotificationContextType {
  preferences: NotificationPreferences;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  permission: 'default' | 'granted' | 'denied';
  requestPermission: () => Promise<void>;
  testNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useLocalStorage<NotificationPreferences>(
    STORAGE_KEYS.NOTIFICATION_PREFERENCES || 'trackvibe_notification_preferences',
    defaultPreferences
  );
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>(
    getNotificationPermission()
  );
  const [scheduledIds, setScheduledIds] = useState<number[]>([]);

  // Request permission
  const handleRequestPermission = useCallback(async () => {
    const newPermission = await requestNotificationPermission();
    setPermission(newPermission);
    if (newPermission === 'granted') {
      setPreferences(prev => ({ ...prev, enabled: true }));
    }
  }, [setPreferences]);

  // Test notification
  const testNotification = useCallback(() => {
    if (permission === 'granted') {
      showNotification('Test Notification', {
        body: 'Notifications are working!',
      });
    }
  }, [permission]);

  // Update preferences
  const updatePreferences = useCallback(
    (updates: Partial<NotificationPreferences>) => {
      setPreferences(prev => ({ ...prev, ...updates }));
    },
    [setPreferences]
  );

  // Schedule reminders based on preferences
  useEffect(() => {
    // Clear existing scheduled notifications
    scheduledIds.forEach(id => cancelScheduledNotification(id));
    setScheduledIds([]);

    if (!preferences.enabled || permission !== 'granted') {
      return;
    }

    const newIds: number[] = [];

    // Schedule food reminder
    if (preferences.logFoodReminder) {
      const foodId = scheduleDailyReminder(
        'Time to log your food!',
        preferences.logFoodReminderTime.hours,
        preferences.logFoodReminderTime.minutes,
        { body: 'Don\'t forget to track what you ate today' }
      );
      if (foodId !== null) {
        newIds.push(foodId);
      }
    }

    // Schedule sleep reminder
    if (preferences.logSleepReminder) {
      const sleepId = scheduleDailyReminder(
        'Time to log your sleep!',
        preferences.logSleepReminderTime.hours,
        preferences.logSleepReminderTime.minutes,
        { body: 'Log how many hours you slept' }
      );
      if (sleepId !== null) {
        newIds.push(sleepId);
      }
    }

    setScheduledIds(newIds);

    // Cleanup on unmount
    return () => {
      newIds.forEach(id => cancelScheduledNotification(id));
    };
  }, [preferences, permission]);

  // Check permission on mount
  useEffect(() => {
    if (isNotificationSupported()) {
      setPermission(getNotificationPermission());
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        preferences,
        updatePreferences,
        permission,
        requestPermission: handleRequestPermission,
        testNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
