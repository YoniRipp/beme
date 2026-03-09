import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNotifications } from '@/context/NotificationContext';
import { SettingsSection } from './SettingsSection';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '@/lib/pushSubscription';

export function NotificationsSection() {
  const {
    preferences,
    updatePreferences,
    permission,
    requestPermission,
    testNotification,
  } = useNotifications();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    if (FEATURE_FLAGS.PWA_PUSH_NOTIFICATIONS) {
      isPushSubscribed().then(setPushEnabled);
    }
  }, []);

  const handlePushToggle = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        const sub = await subscribeToPush();
        setPushEnabled(sub !== null);
      }
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <SettingsSection icon={Bell} title="Notifications" iconColor="text-blue-600">
      <div className="space-y-4">
        {permission === 'default' && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              Enable browser notifications to receive reminders
            </p>
            <Button onClick={requestPermission} size="sm">
              Enable Notifications
            </Button>
          </div>
        )}

        {permission === 'denied' && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          </div>
        )}

        {permission === 'granted' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive daily reminders for logging food and sleep
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.enabled}
                onChange={(e) => updatePreferences({ enabled: e.target.checked })}
                className="rounded"
              />
            </div>

            {preferences.enabled && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Food Logging Reminder</Label>
                    <input
                      type="checkbox"
                      checked={preferences.logFoodReminder}
                      onChange={(e) =>
                        updatePreferences({ logFoodReminder: e.target.checked })
                      }
                      className="rounded"
                    />
                  </div>
                  {preferences.logFoodReminder && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        value={preferences.logFoodReminderTime.hours}
                        onChange={(e) =>
                          updatePreferences({
                            logFoodReminderTime: {
                              ...preferences.logFoodReminderTime,
                              hours: parseInt(e.target.value) || 20,
                            },
                          })
                        }
                        placeholder="Hour"
                      />
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={preferences.logFoodReminderTime.minutes}
                        onChange={(e) =>
                          updatePreferences({
                            logFoodReminderTime: {
                              ...preferences.logFoodReminderTime,
                              minutes: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder="Minute"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Sleep Logging Reminder</Label>
                    <input
                      type="checkbox"
                      checked={preferences.logSleepReminder}
                      onChange={(e) =>
                        updatePreferences({ logSleepReminder: e.target.checked })
                      }
                      className="rounded"
                    />
                  </div>
                  {preferences.logSleepReminder && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        value={preferences.logSleepReminderTime.hours}
                        onChange={(e) =>
                          updatePreferences({
                            logSleepReminderTime: {
                              ...preferences.logSleepReminderTime,
                              hours: parseInt(e.target.value) || 22,
                            },
                          })
                        }
                        placeholder="Hour"
                      />
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={preferences.logSleepReminderTime.minutes}
                        onChange={(e) =>
                          updatePreferences({
                            logSleepReminderTime: {
                              ...preferences.logSleepReminderTime,
                              minutes: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder="Minute"
                      />
                    </div>
                  )}
                </div>

                <Button onClick={testNotification} variant="outline" size="sm">
                  Test Notification
                </Button>

                {FEATURE_FLAGS.PWA_PUSH_NOTIFICATIONS && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications even when the app is closed
                        </p>
                      </div>
                      <Button
                        onClick={handlePushToggle}
                        disabled={pushLoading}
                        variant={pushEnabled ? 'destructive' : 'default'}
                        size="sm"
                      >
                        {pushLoading ? 'Loading...' : pushEnabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </SettingsSection>
  );
}
