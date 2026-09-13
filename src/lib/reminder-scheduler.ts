/**
 * Reminder Scheduler Service - v2.0 Rewrite
 * 
 * Simplified single pipeline for checking and scheduling pending reminders.
 * Uses new scheduleEventReminder() function from notification-service.
 * 
 * Key improvements:
 * - Uses single unified scheduleEventReminder() pipeline
 * - Checks notification_id to prevent duplicate scheduling
 * - Comprehensive diagnostics for each reminder
 * - Atomic operations (schedule + persist = single function)
 * - Cleaner pending reminder query
 */

import { supabase } from './supabase';
import { scheduleEventReminder, getNotificationPreferences } from './notification-service';

type ReminderRecord = {
  id: string;
  user_id: string;
  event_id: string;
  notification_id: string | null;
  notification_id_scheduled_at: string | null;
  minutes_before: number;
  notification_type: 'email' | 'notification';
  scheduled_time: string;
  enabled: boolean;
  calendar_events: {
    id: string;
    title: string;
    start_time: string;
  } | null;
};

/**
 * Fetch all pending reminders that need scheduling
 * 
 * A reminder is "pending" if:
 * 1. enabled = true
 * 2. scheduled_time is in the future
 * 3. No OS notification has been scheduled yet (notification_id is null)
 * 
 * OR if notification_id exists but might need rescheduling (rare edge case)
 */
export const getPendingReminders = async (userId: string): Promise<ReminderRecord[]> => {
  try {
    const now = new Date();

    console.log(`\n[getPendingReminders] ===== FETCHING PENDING REMINDERS =====`);
    console.log(`[getPendingReminders] User ID: ${userId}`);
    console.log(`[getPendingReminders] Current time: ${now.toISOString()}`);

    // First, get ALL reminders to diagnose
    const { data: allReminders, error: allError } = await supabase
      .from('event_reminders')
      .select(`
        id,
        user_id,
        event_id,
        notification_id,
        notification_id_scheduled_at,
        title,
        minutes_before,
        notification_type,
        scheduled_time,
        enabled,
        calendar_events (id, title, start_time)
      `)
      .eq('user_id', userId)
      .order('scheduled_time', { ascending: true });

    if (allError) {
      console.error(`[getPendingReminders] Query failed:`, allError.message);
      return [];
    }

    console.log(`[getPendingReminders] Total reminders in database: ${allReminders?.length || 0}`);
    
    // Log all reminders for diagnosis
    if (allReminders && allReminders.length > 0) {
      allReminders.forEach((r: any, i: number) => {
        const scheduledDate = new Date(r.scheduled_time);
        const isPast = scheduledDate <= now;
        const hasNotifId = !!r.notification_id;
        console.log(`[getPendingReminders] Reminder ${i + 1}:`);
        console.log(`  - ID: ${r.id}`);
        console.log(`  - Event: ${r.calendar_events?.title || 'NO EVENT'}`);
        console.log(`  - Scheduled: ${r.scheduled_time}`);
        console.log(`  - Minutes before: ${r.minutes_before}`);
        console.log(`  - Enabled: ${r.enabled}`);
        console.log(`  - Notification ID: ${hasNotifId ? r.notification_id : 'NULL'}`);
        console.log(`  - Status: ${isPast ? '⏱️ PAST' : '⏳ FUTURE'} (${(scheduledDate.getTime() - now.getTime()) / 1000}s)`);
      });
    }

    // Now filter for pending
    const { data, error } = await supabase
      .from('event_reminders')
      .select(`
        id,
        user_id,
        event_id,
        notification_id,
        notification_id_scheduled_at,
        title,
        minutes_before,
        notification_type,
        scheduled_time,
        enabled,
        calendar_events (id, title, start_time)
      `)
      .eq('user_id', userId)
      .eq('enabled', true)
      .gt('scheduled_time', now.toISOString())
      .is('notification_id', null)  // Only get reminders NOT yet scheduled
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error('[getPendingReminders] Filter query failed:', error.message);
      return [];
    }

    const reminderCount = data?.length || 0;
    console.log(`[getPendingReminders] ✓ PENDING (unscheduled + future): ${reminderCount}`);

    if (reminderCount > 0) {
      console.log(`[getPendingReminders] Next reminder in:`, (new Date(data![0].scheduled_time).getTime() - now.getTime()) / 1000, 'seconds');
    }

    console.log(`[getPendingReminders] ===== END FETCH =====\n`);

    const reminders = (data || []) as unknown as ReminderRecord[];
    return reminders;
  } catch (e) {
    console.error('[getPendingReminders] Unexpected error:', e);
    return [];
  }
};

/**
 * Schedule a single reminder notification via unified pipeline
 * 
 * This is a simple wrapper that calls scheduleEventReminder() with
 * data from the database reminder record.
 */
export const scheduleReminderNotification = async (
  reminder: ReminderRecord,
  userPreferences: any
): Promise<boolean> => {
  try {
    // Parse event data
    const event = reminder.calendar_events;
    if (!event) {
      console.warn(`[scheduleReminderNotification] Reminder ${reminder.id} has no associated event`);
      return false;
    }

    const eventTitle = event.title;
    const eventStartTime = new Date(event.start_time);

    console.log(`[scheduleReminderNotification] Scheduling reminder ${reminder.id}:`);
    console.log(`  Event: "${eventTitle}"`);
    console.log(`  Event start: ${eventStartTime.toISOString()}`);
    console.log(`  Minutes before: ${reminder.minutes_before}`);
    console.log(`  Notification type: ${reminder.notification_type}`);

    // Call unified scheduling pipeline
    const result = await scheduleEventReminder(
      reminder.id,
      reminder.event_id,
      eventTitle,
      eventStartTime,
      reminder.minutes_before,
      reminder.notification_type as 'notification' | 'email',
      userPreferences
    );

    if (result.success) {
      console.log(`[scheduleReminderNotification] ✓ Success for reminder ${reminder.id}`);
      console.log(`[scheduleReminderNotification] Notification ID: ${result.notificationId}`);
      console.log(`[scheduleReminderNotification] Scheduled for: ${result.scheduledTime?.toISOString()}`);
      return true;
    } else {
      console.warn(`[scheduleReminderNotification] ✗ Failed for reminder ${reminder.id}`);
      console.warn(`[scheduleReminderNotification] Skip reason: ${result.diagnostics.skipReason || 'UNKNOWN'}`);
      console.warn(`[scheduleReminderNotification] Diagnostics:`, result.diagnostics);
      return false;
    }
  } catch (e) {
    console.error(`[scheduleReminderNotification] Exception for reminder ${reminder.id}:`, e);
    return false;
  }
};

/**
 * Process all pending reminders for a user
 * 
 * This is the main periodic check function:
 * 1. Fetch all pending reminders
 * 2. Get user preferences (quiet hours, etc.)
 * 3. For each reminder, schedule via unified pipeline
 * 4. Log results
 * 
 * @returns Count of successfully scheduled reminders
 */
export const processPendingReminders = async (userId: string): Promise<number> => {
  try {
    console.log(`\n[processPendingReminders] ▶️  PROCESSING CHECK STARTED`);
    const checkStartTime = Date.now();

    // Fetch pending reminders
    const reminders = await getPendingReminders(userId);
    
    // Fetch user preferences
    const preferences = await getNotificationPreferences(userId);
    if (!preferences) {
      console.log('[processPendingReminders] ℹ️  No user preferences found (using defaults)');
    }

    console.log(`[processPendingReminders] Processing ${reminders.length} pending reminder(s)`);

    if (reminders.length === 0) {
      const checkDurationMs = Date.now() - checkStartTime;
      console.log(`[processPendingReminders] ⏸️  No reminders to schedule`);
      console.log(`[processPendingReminders] ◀️  CHECK COMPLETE (${checkDurationMs}ms)\n`);
      return 0;
    }

    let successCount = 0;
    let skipCount = 0;

    // Process each reminder
    for (let i = 0; i < reminders.length; i++) {
      const reminder = reminders[i];
      console.log(`[processPendingReminders] Processing reminder ${i + 1}/${reminders.length}...`);
      const success = await scheduleReminderNotification(reminder, preferences);
      if (success) {
        successCount++;
        console.log(`[processPendingReminders]   ✓ SUCCESS`);
      } else {
        skipCount++;
        console.log(`[processPendingReminders]   ✗ SKIPPED`);
      }
    }

    const checkDurationMs = Date.now() - checkStartTime;

    console.log(`[processPendingReminders] ◀️  CHECK COMPLETE`);
    console.log(`[processPendingReminders] ✓ Scheduled: ${successCount}, ✗ Skipped: ${skipCount}, Duration: ${checkDurationMs}ms`);
    console.log(`[processPendingReminders] Next check in 60 seconds\n`);

    return successCount;
  } catch (e) {
    console.error('[processPendingReminders] 💥 FATAL ERROR:', e);
    return 0;
  }
};

/**
 * Start periodic reminder checking (runs every 60 seconds)
 * 
 * Scheduler lifecycle:
 * - On startup: immediately processes pending reminders
 * - Then: repeats every 60 seconds
 * - Continues until stopReminderScheduler() called
 */
let reminderCheckInterval: NodeJS.Timeout | null = null;
let currentUserId: string | null = null;

export const startReminderScheduler = (userId: string, intervalMs: number = 60000) => {
  if (reminderCheckInterval) {
    console.log(`\n[startReminderScheduler] ⚠️  Scheduler already running for user ${currentUserId}`);
    return;
  }

  currentUserId = userId;
  console.log(`\n[startReminderScheduler] 🚀 STARTING REMINDER SCHEDULER`);
  console.log(`[startReminderScheduler] User ID: ${userId}`);
  console.log(`[startReminderScheduler] Check interval: ${intervalMs}ms (${intervalMs / 1000}s)`);

  // Check immediately on start
  console.log(`[startReminderScheduler] Running initial check...`);
  void processPendingReminders(userId).then(count => {
    console.log(`[startReminderScheduler] Initial check complete: ${count} scheduled`);
  });

  // Then check periodically
  reminderCheckInterval = setInterval(() => {
    void processPendingReminders(userId);
  }, intervalMs);

  console.log(`[startReminderScheduler] ✓ Scheduler started. Next check in ${intervalMs / 1000}s\n`);
};

/**
 * Stop periodic reminder checking
 */
export const stopReminderScheduler = () => {
  if (reminderCheckInterval) {
    clearInterval(reminderCheckInterval);
    reminderCheckInterval = null;
    console.log(`\n[stopReminderScheduler] ⏹️  Scheduler stopped for user ${currentUserId}\n`);
    currentUserId = null;
  }
};

/**
 * Get scheduler status
 */
export const getReminderSchedulerStatus = (): {
  running: boolean;
  userId: string | null;
} => {
  return {
    running: reminderCheckInterval !== null,
    userId: currentUserId,
  };
};

export default {
  getPendingReminders,
  scheduleReminderNotification,
  processPendingReminders,
  startReminderScheduler,
  stopReminderScheduler,
  getReminderSchedulerStatus,
};
