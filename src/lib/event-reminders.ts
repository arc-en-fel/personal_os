/**
 * Event Reminders System
 * Handles reminder creation, scheduling, and notification triggers
 */

export type ReminderTiming = 'at_time' | '5_minutes' | '15_minutes' | '30_minutes' | '1_hour' | '1_day' | 'custom';

export type ReminderNotification = {
  id: string;
  event_id: string;
  user_id: string;
  title: string;
  description: string;
  scheduled_time: Date;
  reminder_timing: ReminderTiming;
  custom_minutes_before?: number;
  notification_type: 'push' | 'in_app' | 'email' | 'sms';
  is_sent: boolean;
  sent_at?: Date;
  is_snoozed: boolean;
  snooze_until?: Date;
  created_at: Date;
};

/**
 * Get minutes before event for reminder timing
 */
export const getMinutesBefore = (timing: ReminderTiming, customMinutes?: number): number => {
  const timingMap: Record<ReminderTiming, number> = {
    at_time: 0,
    '5_minutes': 5,
    '15_minutes': 15,
    '30_minutes': 30,
    '1_hour': 60,
    '1_day': 24 * 60,
    custom: customMinutes || 0,
  };

  return timingMap[timing] || 0;
};

/**
 * Calculate reminder notification time
 */
export const calculateReminderTime = (
  eventStartTime: Date,
  timing: ReminderTiming,
  customMinutes?: number
): Date => {
  const minutesBefore = getMinutesBefore(timing, customMinutes);
  return new Date(eventStartTime.getTime() - minutesBefore * 60 * 1000);
};

/**
 * Get human-readable reminder timing text
 */
export const getReminderTimingText = (timing: ReminderTiming, customMinutes?: number): string => {
  const textMap: Record<ReminderTiming, string> = {
    at_time: 'At event time',
    '5_minutes': '5 minutes before',
    '15_minutes': '15 minutes before',
    '30_minutes': '30 minutes before',
    '1_hour': '1 hour before',
    '1_day': '1 day before',
    custom: `${customMinutes} minutes before`,
  };

  return textMap[timing] || 'Unknown';
};

/**
 * Get notification type icon
 */
export const getNotificationTypeIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    push: '📱',
    in_app: '🔔',
    email: '📧',
    sms: '💬',
  };

  return iconMap[type] || '🔔';
};

/**
 * Format reminder for display
 */
export const formatReminder = (
  timing: ReminderTiming,
  notificationType: string,
  customMinutes?: number
): string => {
  const timing_text = getReminderTimingText(timing, customMinutes);
  const type_icon = getNotificationTypeIcon(notificationType);

  return `${type_icon} ${timing_text}`;
};

/**
 * Check if reminder should trigger now
 */
export const shouldReminderTrigger = (
  eventStartTime: Date,
  reminderTiming: ReminderTiming,
  customMinutes?: number,
  currentTime: Date = new Date()
): boolean => {
  const reminderTime = calculateReminderTime(eventStartTime, reminderTiming, customMinutes);
  
  // Trigger if we're within 1 minute of the reminder time
  const timeDiff = Math.abs(currentTime.getTime() - reminderTime.getTime());
  return timeDiff <= 60 * 1000;
};

/**
 * Get upcoming reminders for user
 */
export const getUpcomingReminders = (
  reminders: ReminderNotification[],
  hoursLookAhead: number = 24
): ReminderNotification[] => {
  const now = new Date();
  const futureTime = new Date(now.getTime() + hoursLookAhead * 60 * 60 * 1000);

  return reminders
    .filter(r => {
      const isInRange = r.scheduled_time >= now && r.scheduled_time <= futureTime;
      const isNotSent = !r.is_sent;
      const isNotSnoozed = !r.is_snoozed || (r.snooze_until && r.snooze_until <= now);
      
      return isInRange && isNotSent && isNotSnoozed;
    })
    .sort((a, b) => a.scheduled_time.getTime() - b.scheduled_time.getTime());
};

/**
 * Get overdue reminders (past event time, not sent)
 */
export const getOverdueReminders = (reminders: ReminderNotification[]): ReminderNotification[] => {
  const now = new Date();

  return reminders
    .filter(r => r.scheduled_time < now && !r.is_sent && !r.is_snoozed)
    .sort((a, b) => b.scheduled_time.getTime() - a.scheduled_time.getTime());
};

/**
 * Create default reminders for event
 */
export const createDefaultReminders = (eventId: string, userId: string, eventStart: Date): ReminderNotification[] => {
  return [
    {
      id: `${eventId}-reminder-1`,
      event_id: eventId,
      user_id: userId,
      title: 'Upcoming Event',
      description: 'Your event is coming up',
      scheduled_time: calculateReminderTime(eventStart, '1_hour'),
      reminder_timing: '1_hour',
      notification_type: 'in_app',
      is_sent: false,
      is_snoozed: false,
      created_at: new Date(),
    },
  ];
};

/**
 * Snooze a reminder
 */
export const snoozeReminder = (reminder: ReminderNotification, minutes: number = 10): ReminderNotification => {
  return {
    ...reminder,
    is_snoozed: true,
    snooze_until: new Date(Date.now() + minutes * 60 * 1000),
  };
};

/**
 * Dismiss a reminder
 */
export const dismissReminder = (reminder: ReminderNotification): ReminderNotification => {
  return {
    ...reminder,
    is_sent: true,
    sent_at: new Date(),
  };
};

export default {
  getMinutesBefore,
  calculateReminderTime,
  getReminderTimingText,
  getNotificationTypeIcon,
  formatReminder,
  shouldReminderTrigger,
  getUpcomingReminders,
  getOverdueReminders,
  createDefaultReminders,
  snoozeReminder,
  dismissReminder,
};
