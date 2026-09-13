/**
 * Notification Service - v2.0 Rewrite
 * 
 * Single reliable pipeline for event reminder notifications using Expo SDK 54
 * Features:
 * - Absolute DATE-based triggers for precise scheduling
 * - Notification ID persistence for tracking/cancellation
 * - Comprehensive diagnostic logging
 * - Verification via getAllScheduledNotificationsAsync()
 * - Duplicate prevention
 * - Reminder lifecycle management
 */

import { supabase } from './supabase';
import { Alert } from 'react-native';

export type NotificationChannel = 'push' | 'in_app' | 'email' | 'sms';

export type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: boolean;
  badge?: number;
};

// Version identifier for scheduler lifecycle tracking
const SCHEDULER_VERSION = '2.0.0';

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const Notifications = await import('expo-notifications');
    
    console.log('[requestNotificationPermissions] Requesting notification permissions...');
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[requestNotificationPermissions] Current status:', existingStatus);
    
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[requestNotificationPermissions] After request:', finalStatus);
    }
    
    const granted = finalStatus === 'granted';
    console.log('[requestNotificationPermissions] Permissions granted:', granted);
    return granted;
  } catch (e) {
    console.error('[requestNotificationPermissions] Error:', e);
    return false;
  }
};

/**
 * Configure notification handler
 */
export const configureNotificationHandler = async () => {
  try {
    const Notifications = await import('expo-notifications');
    
    console.log('[configureNotificationHandler] Configuring notification handler...');
    
    if (Notifications?.setNotificationHandler) {
      Notifications.setNotificationHandler({
        handleNotification: async notification => {
          console.log('[handleNotification] Notification received:', notification);
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        },
      });
      console.log('[configureNotificationHandler] Handler configured successfully');
    }
  } catch (e) {
    const errorMsg = String(e);
    // Suppress push token warnings
    if (!errorMsg?.includes('Android Push notifications')) {
      console.warn('[configureNotificationHandler] Failed to configure:', e);
    }
  }
};

/**
 * TEST NOTIFICATION
 * Schedule a test notification 5 seconds from now
 * Used for debugging on physical devices
 */
export const testNotification = async (): Promise<boolean> => {
  try {
    console.log('[testNotification] Starting test notification...');
    
    const Notifications = await import('expo-notifications');
    const now = new Date();
    const testTime = new Date(now.getTime() + 5000); // 5 seconds from now
    
    console.log('[testNotification] Current time:', now.toISOString());
    console.log('[testNotification] Test notification time:', testTime.toISOString());
    console.log('[testNotification] Seconds until trigger: 5');
    
    // SDK 54 requires explicit trigger type
    const trigger: any = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    };
    console.log('[testNotification] Trigger object:', JSON.stringify(trigger));
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'This is a test notification - appears 5 seconds from now',
        data: { testNotification: true },
        sound: 'default',
      },
      trigger,
    });
    
    console.log('[testNotification] Successfully scheduled with ID:', notificationId);
    
    // Log all scheduled notifications after scheduling
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log('[testNotification] All scheduled notifications:', scheduled.length);
      const testNotif = scheduled.find(n => n.identifier === notificationId);
      if (testNotif) {
        console.log('[testNotification] Test notification found in scheduled list:', JSON.stringify(testNotif));
      }
    } catch (e) {
      console.error('[testNotification] Error fetching scheduled notifications:', e);
    }
    
    return true;
  } catch (e) {
    console.error('[testNotification] Failed to schedule:', e);
    return false;
  }
};

/**
 * CORE FUNCTION: Schedule Reminder
 * 
 * NEW DETERMINISTIC IMPLEMENTATION
 * 
 * Single responsibility: Take a reminder database record and schedule it to OS.
 * 
 * This is the ONLY function that calls Notifications.scheduleNotificationAsync().
 * All event reminders go through this function.
 * 
 * Flow:
 * 1. Validate reminder time is in future
 * 2. Build DATE trigger (SDK 54 requirement)
 * 3. Schedule OS notification
 * 4. Verify in getAllScheduledNotificationsAsync()
 * 5. Persist notification ID to database
 * 6. Log diagnostics
 * 
 * @param reminderId - Database ID of event_reminder record
 * @param eventTitle - Title of the event
 * @param remindAtTime - Absolute timestamp when reminder should fire (already calculated: eventStart - minutesBefore)
 * @param eventId - Associated calendar_event ID
 * @param minutesBefore - How many minutes before event (for logging)
 * @returns Object with success flag and notification ID
 */
export const scheduleReminder = async (
  reminderId: string,
  eventTitle: string,
  remindAtTime: Date,
  eventId: string,
  minutesBefore: number
): Promise<{
  success: boolean;
  notificationId: string | null;
  error?: string;
}> => {
  try {
    const Notifications = await import('expo-notifications');
    const now = new Date();

    console.log(`\n[scheduleReminder] ▶️  SCHEDULING REMINDER`);
    console.log(`[scheduleReminder] Reminder ID: ${reminderId}`);
    console.log(`[scheduleReminder] Event: "${eventTitle}"`);
    console.log(`[scheduleReminder] Current time: ${now.toISOString()}`);
    console.log(`[scheduleReminder] Remind at: ${remindAtTime.toISOString()}`);
    console.log(`[scheduleReminder] Minutes until trigger: ${Math.floor((remindAtTime.getTime() - now.getTime()) / 1000 / 60)}`);
    console.log(`[scheduleReminder] Seconds until trigger: ${Math.floor((remindAtTime.getTime() - now.getTime()) / 1000)}`);

    // VALIDATION: Is reminder in the past?
    if (remindAtTime <= now) {
      console.log(`[scheduleReminder] ❌ EXPIRED: Reminder time is in the past. Skipping.`);
      return {
        success: false,
        notificationId: null,
        error: 'REMINDER_IN_PAST',
      };
    }

    // BUILD TRIGGER: SDK 54 requires explicit type
    const trigger: any = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: remindAtTime,
    };
    console.log(`[scheduleReminder] Trigger object:`, JSON.stringify(trigger));

    // SCHEDULE: Call Expo notification service
    console.log(`[scheduleReminder] Calling Notifications.scheduleNotificationAsync()...`);
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Reminder',
        body: eventTitle,
        data: {
          reminderId,
          eventId,
          eventTitle,
          minutesBefore,
        },
        sound: 'default',
      },
      trigger,
    });

    if (!notificationId) {
      console.error(`[scheduleReminder] ❌ FAILED: Expo returned no notification ID`);
      return {
        success: false,
        notificationId: null,
        error: 'NO_NOTIFICATION_ID',
      };
    }

    console.log(`[scheduleReminder] ✓ Expo returned notification ID: ${notificationId}`);

    // VERIFY: Check that notification is in OS scheduled list
    try {
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const found = allScheduled.find(n => n.identifier === notificationId);

      console.log(`[scheduleReminder] Total notifications in OS: ${allScheduled.length}`);

      if (found) {
        console.log(`[scheduleReminder] ✓ Notification verified in OS scheduled list`);
      } else {
        console.warn(`[scheduleReminder] ⚠️  WARNING: Notification NOT found in OS scheduled list after scheduling`);
      }
    } catch (e) {
      console.warn(`[scheduleReminder] ⚠️  Could not verify notification in OS:`, e);
    }

    // PERSIST: Save notification ID to database
    try {
      const { error } = await supabase
        .from('event_reminders')
        .update({
          notification_id: notificationId,
          notification_id_scheduled_at: now.toISOString(),
          scheduled_by_version: SCHEDULER_VERSION,
        })
        .eq('id', reminderId);

      if (error) {
        console.error(`[scheduleReminder] ⚠️  Failed to persist notification ID to DB:`, error);
      } else {
        console.log(`[scheduleReminder] ✓ Persisted notification ID to database`);
      }
    } catch (e) {
      console.error(`[scheduleReminder] ⚠️  Error persisting to DB:`, e);
    }

    console.log(`[scheduleReminder] ✅ SUCCESS: Reminder scheduled\n`);

    return {
      success: true,
      notificationId,
    };
  } catch (e) {
    console.error(`[scheduleReminder] ❌ EXCEPTION:`, e);
    return {
      success: false,
      notificationId: null,
      error: String(e),
    };
  }
};

/**
 * CANCELLATION: Cancel scheduled event reminder
 * Removes both the OS notification and database record
 */
export const cancelEventReminder = async (reminderId: string, notificationId: string | null): Promise<boolean> => {
  try {
    console.log(`[cancelEventReminder] Cancelling reminder ${reminderId}`);

    const Notifications = await import('expo-notifications');

    // Cancel OS notification if ID available
    if (notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        console.log(`[cancelEventReminder] Cancelled OS notification ${notificationId}`);
      } catch (e) {
        console.warn(`[cancelEventReminder] Failed to cancel OS notification:`, e);
      }
    }

    // Update database to clear notification tracking
    const { error } = await supabase
      .from('event_reminders')
      .update({
        notification_id: null,
        notification_id_scheduled_at: null,
      })
      .eq('id', reminderId);

    if (error) {
      console.error(`[cancelEventReminder] Failed to update database:`, error);
      return false;
    }

    console.log(`[cancelEventReminder] Successfully cancelled reminder ${reminderId}`);
    return true;
  } catch (e) {
    console.error(`[cancelEventReminder] Error cancelling reminder:`, e);
    return false;
  }
};

/**
 * CANCELLATION: Cancel all reminders for an event
 * Used when event is deleted or rescheduled
 */
export const cancelAllRemindersForEvent = async (eventId: string): Promise<number> => {
  try {
    console.log(`[cancelAllRemindersForEvent] Cancelling all reminders for event ${eventId}`);

    // Fetch all reminders for this event
    const { data: reminders, error: fetchError } = await supabase
      .from('event_reminders')
      .select('id, notification_id')
      .eq('event_id', eventId);

    if (fetchError) {
      console.error(`[cancelAllRemindersForEvent] Failed to fetch reminders:`, fetchError);
      return 0;
    }

    if (!reminders || reminders.length === 0) {
      console.log(`[cancelAllRemindersForEvent] No reminders found for event ${eventId}`);
      return 0;
    }

    console.log(`[cancelAllRemindersForEvent] Found ${reminders.length} reminder(s) to cancel`);

    const Notifications = await import('expo-notifications');
    let cancelledCount = 0;

    // Cancel each reminder
    for (const reminder of reminders) {
      if (reminder.notification_id) {
        try {
          await Notifications.cancelScheduledNotificationAsync(reminder.notification_id);
          console.log(`[cancelAllRemindersForEvent] Cancelled OS notification ${reminder.notification_id}`);
        } catch (e) {
          console.warn(`[cancelAllRemindersForEvent] Failed to cancel OS notification ${reminder.notification_id}:`, e);
        }
      }

      // Clear notification tracking in database
      try {
        await supabase
          .from('event_reminders')
          .update({
            notification_id: null,
            notification_id_scheduled_at: null,
          })
          .eq('id', reminder.id);

        cancelledCount++;
      } catch (e) {
        console.error(`[cancelAllRemindersForEvent] Failed to update reminder ${reminder.id}:`, e);
      }
    }

    console.log(`[cancelAllRemindersForEvent] Successfully cancelled ${cancelledCount} reminder(s)`);
    return cancelledCount;
  } catch (e) {
    console.error(`[cancelAllRemindersForEvent] Error cancelling reminders:`, e);
    return 0;
  }
};

/**
 * Get user's notification preferences
 */
export const getNotificationPreferences = async (
  userId: string
): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.log('[getNotificationPreferences] Preferences unavailable (table may not exist)');
      return null;
    }

    return data || null;
  } catch (e) {
    console.log('[getNotificationPreferences] Error fetching preferences (using defaults):', e);
    return null;
  }
};

/**
 * Check if currently in quiet hours
 */
export const isInQuietHours = (preferences: any): boolean => {
  if (!preferences?.quiet_hours_enabled || !preferences?.quiet_hours_start || !preferences?.quiet_hours_end) {
    return false;
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return currentTime >= preferences.quiet_hours_start && currentTime <= preferences.quiet_hours_end;
};

export default {
  configureNotificationHandler,
  requestNotificationPermissions,
  testNotification,
  scheduleReminder,  // NEW: Core scheduling function
  cancelEventReminder,
  cancelAllRemindersForEvent,
  getNotificationPreferences,
  isInQuietHours,
};
