/**
 * Reminder Scheduler Service
 * Periodically checks for pending reminders and schedules notifications
 */

import { supabase } from './supabase';
import { scheduleNotification, logNotificationDelivery, getNotificationPreferences, isInQuietHours } from './notification-service';
import { Alert } from 'react-native';

type ReminderRecord = {
  id: string;
  user_id: string;
  event_id: string;
  event: {
    title: string;
    start_time: string;
  };
  title: string;
  description?: string;
  scheduled_time: string;
  minutes_before: number;
  notification_type: 'email' | 'notification';
  enabled: boolean;
};

/**
 * Fetch all pending reminders for a user
 */
export const getPendingReminders = async (userId: string): Promise<ReminderRecord[]> => {
  try {
    const now = new Date();

    console.log(`[getPendingReminders] Current time: ${now.toISOString()}`);

    const { data, error } = await supabase
      .from('event_reminders')
      .select(`
        id,
        user_id,
        event_id,
        title,
        description,
        scheduled_time,
        minutes_before,
        notification_type,
        enabled,
        calendar_events (id, title, start_time)
      `)
      .eq('user_id', userId)
      .eq('enabled', true)
      .gt('scheduled_time', now.toISOString())  // ← FIXED: Get reminders AFTER now (future)
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.log('Reminder table unavailable (may not be created yet)');
      return [];
    }

    console.log(`[getPendingReminders] Found ${data?.length || 0} future reminders`);
    
    return data || [];
  } catch (e) {
    console.log('Error fetching pending reminders:', e);
    return [];
  }
};

/**
 * Schedule a single reminder notification
 */
export const scheduleReminderNotification = async (
  reminder: ReminderRecord,
  preferences: any
): Promise<boolean> => {
  try {
    // Check quiet hours
    if (reminder.notification_type === 'notification' && isInQuietHours(preferences)) {
      console.log(`[scheduleReminderNotification] Reminder ${reminder.id} suppressed by quiet hours`);
      return false;
    }

    const event = reminder.event as any;
    const eventTitle = event?.title || reminder.title;
    const triggerDate = new Date(reminder.scheduled_time);
    const now = new Date();

    // Diagnostic logs
    console.log(`[scheduleReminderNotification] Processing reminder ${reminder.id}:`);
    console.log(`  Event: ${eventTitle}`);
    console.log(`  Current time: ${now.toISOString()}`);
    console.log(`  Raw reminder timestamp: ${reminder.scheduled_time}`);
    console.log(`  Parsed trigger date: ${triggerDate.toISOString()}`);
    console.log(`  Milliseconds until trigger: ${triggerDate.getTime() - now.getTime()}`);

    // VALIDATION: Skip if reminder is in the past
    if (triggerDate <= now) {
      console.log(`[scheduleReminderNotification] Reminder ${reminder.id} skipped - scheduled time is in the past (${triggerDate.toISOString()} <= ${now.toISOString()})`);
      return false;
    }

    // Schedule push notification
    if (reminder.notification_type === 'notification') {
      console.log(`[scheduleReminderNotification] Scheduling push notification for reminder ${reminder.id}`);
      
      const notificationId = await scheduleNotification(
        {
          title: 'Reminder',
          body: `${eventTitle} - ${triggerDate.toLocaleTimeString()}`,
          data: {
            reminderId: reminder.id,
            eventId: reminder.event_id,
            eventTitle,
          },
          sound: true,
        },
        triggerDate
      );

      if (notificationId) {
        // Log delivery attempt
        await logNotificationDelivery(reminder.user_id, reminder.id, 'push', 'sent');
        console.log(`[scheduleReminderNotification] Successfully scheduled reminder ${reminder.id} for ${triggerDate.toISOString()}`);
        return true;
      } else {
        console.error(`[scheduleReminderNotification] Failed to schedule notification for reminder ${reminder.id}`);
        await logNotificationDelivery(reminder.user_id, reminder.id, 'push', 'failed');
        return false;
      }
    } else if (reminder.notification_type === 'email') {
      // For email reminders, log as pending (would need backend service to send)
      console.log(`[scheduleReminderNotification] Email reminder ${reminder.id} scheduled for ${triggerDate.toISOString()}`);
      return true;
    }

    return false;
  } catch (e) {
    console.error(`[scheduleReminderNotification] Error processing reminder ${reminder.id}:`, e);
    await logNotificationDelivery(reminder.user_id, reminder.id, reminder.notification_type === 'email' ? 'email' : 'push', 'failed');
    return false;
  }
};

/**
 * Process all pending reminders for a user
 */
export const processPendingReminders = async (userId: string): Promise<number> => {
  try {
    const reminders = await getPendingReminders(userId);
    const preferences = await getNotificationPreferences(userId);

    let scheduledCount = 0;

    for (const reminder of reminders) {
      const success = await scheduleReminderNotification(reminder, preferences);
      if (success) {
        scheduledCount++;
      }
    }

    console.log(`Processed ${reminders.length} pending reminders, scheduled ${scheduledCount}`);
    return scheduledCount;
  } catch (e) {
    console.error('Error processing pending reminders:', e);
    return 0;
  }
};

/**
 * Start periodic reminder checking (runs every minute)
 */
let reminderCheckInterval: NodeJS.Timeout | null = null;

export const startReminderScheduler = (userId: string, intervalMs: number = 60000) => {
  if (reminderCheckInterval) {
    console.log('Reminder scheduler already running');
    return;
  }

  console.log('Starting reminder scheduler...');

  // Check immediately on start
  void processPendingReminders(userId);

  // Then check periodically
  reminderCheckInterval = setInterval(() => {
    void processPendingReminders(userId);
  }, intervalMs);
};

/**
 * Stop periodic reminder checking
 */
export const stopReminderScheduler = () => {
  if (reminderCheckInterval) {
    clearInterval(reminderCheckInterval);
    reminderCheckInterval = null;
    console.log('Reminder scheduler stopped');
  }
};

/**
 * Mark reminder as processed (disable it after firing)
 */
export const markReminderProcessed = async (reminderId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('event_reminders')
      .update({ enabled: false })
      .eq('id', reminderId);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Error marking reminder as processed:', e);
    return false;
  }
};

export default {
  getPendingReminders,
  scheduleReminderNotification,
  processPendingReminders,
  startReminderScheduler,
  stopReminderScheduler,
  markReminderProcessed,
};
