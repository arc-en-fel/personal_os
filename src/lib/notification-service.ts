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
 * CORE FUNCTION: Schedule Event Reminder
 * 
 * Single unified pipeline for scheduling event reminders to OS notifications.
 * This is the main entry point for all event reminder scheduling.
 * 
 * Flow:
 * 1. Calculate reminder trigger time (event.start_time - minutes_before)
 * 2. Validate reminder (not in past, not duplicate, quiet hours check)
 * 3. Schedule OS notification with DATE trigger
 * 4. Persist notification ID to database
 * 5. Verify notification is in OS scheduled list
 * 6. Log comprehensive diagnostics
 * 
 * @param reminderId - Database ID of event_reminder record
 * @param eventId - Associated calendar_event ID
 * @param eventTitle - Title of the event
 * @param eventStartTime - When the event starts
 * @param minutesBefore - How many minutes before event to trigger
 * @param notificationType - 'notification' or 'email'
 * @param userPreferences - User's notification preferences (quiet hours, etc.)
 * @returns Object with success flag, notification ID, and diagnostics
 */
export const scheduleEventReminder = async (
  reminderId: string,
  eventId: string,
  eventTitle: string,
  eventStartTime: Date,
  minutesBefore: number,
  notificationType: 'notification' | 'email',
  userPreferences: any = null
): Promise<{
  success: boolean;
  notificationId: string | null;
  scheduledTime: Date | null;
  diagnostics: Record<string, any>;
}> => {
  const diagnostics: Record<string, any> = {
    reminderId,
    eventId,
    eventTitle,
    minutesBefore,
    schedulerVersion: SCHEDULER_VERSION,
  };

  try {
    const Notifications = await import('expo-notifications');
    const now = new Date();

    // Step 1: Calculate reminder trigger time
    const reminderTriggerTime = new Date(eventStartTime.getTime() - minutesBefore * 60 * 1000);
    diagnostics.eventStartTime = eventStartTime.toISOString();
    diagnostics.reminderTriggerTime = reminderTriggerTime.toISOString();
    diagnostics.currentTime = now.toISOString();
    diagnostics.msUntilTrigger = reminderTriggerTime.getTime() - now.getTime();
    diagnostics.secondsUntilTrigger = Math.floor(diagnostics.msUntilTrigger / 1000);

    console.log(`[scheduleEventReminder] Processing event reminder ${reminderId}:`);
    console.log(`  Event: ${eventTitle}`);
    console.log(`  Event start: ${eventStartTime.toISOString()}`);
    console.log(`  Trigger time: ${reminderTriggerTime.toISOString()}`);
    console.log(`  Current time: ${now.toISOString()}`);
    console.log(`  Minutes before: ${minutesBefore}`);
    console.log(`  Time until trigger: ${diagnostics.secondsUntilTrigger}s`);

    // Step 2: Validation - is reminder in the past?
    if (reminderTriggerTime <= now) {
      diagnostics.skipReason = 'REMINDER_IN_PAST';
      console.log(`[scheduleEventReminder] Skipped: reminder is in the past`);
      return {
        success: false,
        notificationId: null,
        scheduledTime: null,
        diagnostics,
      };
    }

    // Step 2b: Validation - check quiet hours
    if (notificationType === 'notification' && userPreferences && isInQuietHours(userPreferences)) {
      diagnostics.skipReason = 'QUIET_HOURS';
      console.log(`[scheduleEventReminder] Skipped: quiet hours active`);
      return {
        success: false,
        notificationId: null,
        scheduledTime: null,
        diagnostics,
      };
    }

    // Step 3: Check if notification already scheduled for this reminder
    const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const alreadyScheduled = existingNotifications.some(
      notif => notif.trigger && 
               typeof notif.trigger === 'object' &&
               'date' in notif.trigger &&
               new Date(notif.trigger.date).getTime() === reminderTriggerTime.getTime() &&
               notif.content?.data?.reminderId === reminderId
    );

    if (alreadyScheduled) {
      diagnostics.skipReason = 'ALREADY_SCHEDULED';
      console.log(`[scheduleEventReminder] Skipped: notification already scheduled for this reminder`);
      return {
        success: false,
        notificationId: null,
        scheduledTime: null,
        diagnostics,
      };
    }

    // Step 4: Schedule OS notification with DATE trigger (SDK 54 requirement)
    const trigger: any = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderTriggerTime,
    };

    console.log(`[scheduleEventReminder] Scheduling notification with DATE trigger for ${reminderTriggerTime.toISOString()}`);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Reminder',
        body: `${eventTitle} - ${reminderTriggerTime.toLocaleTimeString()}`,
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
      diagnostics.error = 'NO_NOTIFICATION_ID_RETURNED';
      console.error(`[scheduleEventReminder] Failed: no notification ID returned from OS`);
      return {
        success: false,
        notificationId: null,
        scheduledTime: null,
        diagnostics,
      };
    }

    diagnostics.notificationId = notificationId;
    console.log(`[scheduleEventReminder] OS scheduled with notification ID: ${notificationId}`);

    // Step 5: Persist notification ID to database
    try {
      const { error: updateError } = await supabase
        .from('event_reminders')
        .update({
          notification_id: notificationId,
          notification_id_scheduled_at: new Date().toISOString(),
          scheduled_by_version: SCHEDULER_VERSION,
        })
        .eq('id', reminderId);

      if (updateError) {
        console.warn(`[scheduleEventReminder] Failed to persist notification ID: ${updateError.message}`);
        diagnostics.persistError = updateError.message;
      } else {
        console.log(`[scheduleEventReminder] Persisted notification ID to database`);
        diagnostics.persistedToDB = true;
      }
    } catch (e) {
      console.error(`[scheduleEventReminder] Error persisting notification ID:`, e);
      diagnostics.persistError = String(e);
    }

    // Step 6: Verify notification in OS scheduled list
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const verifyNotif = scheduledNotifications.find(n => n.identifier === notificationId);

      diagnostics.totalScheduledNotifications = scheduledNotifications.length;

      if (verifyNotif) {
        diagnostics.verifiedInOS = true;
        console.log(`[scheduleEventReminder] Verified in OS scheduled list (total: ${scheduledNotifications.length})`);
        console.log(`[scheduleEventReminder] Scheduled notification details:`, JSON.stringify({
          identifier: verifyNotif.identifier,
          trigger: verifyNotif.trigger,
          content: {
            title: verifyNotif.content.title,
            body: verifyNotif.content.body,
          },
        }, null, 2));
      } else {
        console.warn(`[scheduleEventReminder] WARNING: Notification ID not found in OS scheduled list after scheduling`);
        diagnostics.verifiedInOS = false;
      }
    } catch (e) {
      console.error(`[scheduleEventReminder] Error verifying scheduled notifications:`, e);
      diagnostics.verificationError = String(e);
    }

    console.log(`[scheduleEventReminder] SUCCESS: Reminder ${reminderId} scheduled for ${reminderTriggerTime.toISOString()}`);

    return {
      success: true,
      notificationId,
      scheduledTime: reminderTriggerTime,
      diagnostics,
    };
  } catch (e) {
    diagnostics.error = String(e);
    console.error(`[scheduleEventReminder] Exception while scheduling reminder ${reminderId}:`, e);

    return {
      success: false,
      notificationId: null,
      scheduledTime: null,
      diagnostics,
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
  scheduleEventReminder,
  cancelEventReminder,
  cancelAllRemindersForEvent,
  getNotificationPreferences,
  isInQuietHours,
};
