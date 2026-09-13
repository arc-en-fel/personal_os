/**
 * Reminder Scheduler Service - v3.0 Deterministic
 * 
 * SIMPLIFIED RECONCILIATION SCHEDULER
 * 
 * This scheduler only reconciles orphaned reminders:
 * - Reminders that were created but not scheduled (notification_id = NULL)
 * - This happens rarely if Phase 1 immediate scheduling works correctly
 * - Safety net for edge cases (app crashed after insert, network errors, etc.)
 * 
 * The scheduler does NOT:
 * - Calculate reminder times (done at creation)
 * - Handle event updates (done in event update handler)
 * - Handle deletions (done in event delete handler)
 */

import { supabase } from './supabase';
import { scheduleReminder } from './notification-service';

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
 * Pending means:
 * 1. enabled = true
 * 2. scheduled_time > now (reminder time is in future)
 * 3. notification_id = NULL (not yet scheduled to OS)
 */
export const getPendingReminders = async (userId: string): Promise<ReminderRecord[]> => {
  try {
    const now = new Date();

    console.log(`\n[getPendingReminders] Checking for orphaned reminders...`);
    console.log(`[getPendingReminders] User: ${userId}, Current time: ${now.toISOString()}`);

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
      .is('notification_id', null)
      .order('scheduled_time', { ascending: true });

    if (error) {
      console.error(`[getPendingReminders] Query error:`, error.message);
      return [];
    }

    const count = data?.length || 0;
    console.log(`[getPendingReminders] Found ${count} orphaned reminder(s) to schedule`);

    if (count > 0) {
      data!.forEach((r: any, i) => {
        console.log(`  ${i + 1}. "${r.calendar_events?.title}" @ ${r.scheduled_time}`);
      });
    }

    return (data || []) as unknown as ReminderRecord[];
  } catch (e) {
    console.error('[getPendingReminders] Error:', e);
    return [];
  }
};

/**
 * Schedule a single reminder using the new deterministic function
 */
export const scheduleReminderNotification = async (reminder: ReminderRecord): Promise<boolean> => {
  try {
    const event = reminder.calendar_events;
    if (!event) {
      console.warn(`[scheduleReminderNotification] Reminder ${reminder.id} has no event, skipping`);
      return false;
    }

    const remindAtTime = new Date(reminder.scheduled_time);

    const result = await scheduleReminder(
      reminder.id,
      event.title,
      remindAtTime,
      reminder.event_id,
      reminder.minutes_before
    );

    return result.success;
  } catch (e) {
    console.error(`[scheduleReminderNotification] Error:`, e);
    return false;
  }
};

/**
 * Process all pending reminders for a user
 * 
 * This is the periodic check (runs every 60 seconds).
 * It ONLY schedules reminders that were created but not scheduled.
 * 
 * @returns Count of successfully scheduled reminders
 */
export const processPendingReminders = async (userId: string): Promise<number> => {
  try {
    console.log(`\n[processPendingReminders] ▶️  PERIODIC CHECK`);

    const reminders = await getPendingReminders(userId);

    if (reminders.length === 0) {
      console.log(`[processPendingReminders] No orphaned reminders found`);
      console.log(`[processPendingReminders] ◀️  CHECK COMPLETE\n`);
      return 0;
    }

    let successCount = 0;

    for (let i = 0; i < reminders.length; i++) {
      const reminder = reminders[i];
      console.log(`[processPendingReminders] Scheduling orphaned reminder ${i + 1}/${reminders.length}...`);
      const success = await scheduleReminderNotification(reminder);
      if (success) {
        successCount++;
      }
    }

    console.log(`[processPendingReminders] ✓ Scheduled ${successCount}/${reminders.length}`);
    console.log(`[processPendingReminders] ◀️  CHECK COMPLETE\n`);

    return successCount;
  } catch (e) {
    console.error('[processPendingReminders] Error:', e);
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
