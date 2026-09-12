/**
 * Recurring Events Utilities
 * Handles recurring event expansion, instance editing, and recurrence rule parsing
 */

import * as rruleModule from 'rrule';
const { RRule } = rruleModule as any;
const Frequency = rruleModule.FREQUENCIES || { DAILY: 0, WEEKLY: 1, MONTHLY: 2, YEARLY: 3 };
const Weekday = rruleModule.WEEKDAYS || { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

export type RecurrenceMode = 'single' | 'this_and_following' | 'all';

export type RecurringEventInstance = {
  id: string; // original event ID
  instanceDate: Date;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  event_type: string;
  color: string;
  recurrence_rule: string;
  isModified: boolean;
  originalStart: string;
  originalEnd: string;
};

export type RecurrenceException = {
  id: string;
  original_event_id: string;
  instance_date: string;
  exception_type: 'cancelled' | 'modified' | 'moved';
  modified_title?: string;
  modified_start_time?: string;
  modified_end_time?: string;
  notes?: string;
  created_at: string;
};

/**
 * Parse RFC 5545 RRULE string
 */
export const parseRRule = (rruleString: string): any => {
  try {
    return new RRule(rruleString);
  } catch (e) {
    console.error('Failed to parse RRULE:', e);
    return null;
  }
};

/**
 * Generate instances of a recurring event within a date range
 */
export const generateRecurringInstances = (
  event: any,
  startDate: Date,
  endDate: Date
): RecurringEventInstance[] => {
  if (!event.recurrence_rule) {
    return [];
  }

  const instances: RecurringEventInstance[] = [];

  try {
    const rrule = parseRRule(event.recurrence_rule);
    if (!rrule) return [];

    // Get occurrences within date range
    const occurrences = rrule.between(startDate, endDate, true);

    for (const occurrence of occurrences) {
      // Calculate time offset from original
      const originalStart = new Date(event.start_time);
      const originalEnd = new Date(event.end_time);
      const duration = originalEnd.getTime() - originalStart.getTime();

      // Apply same time of day to occurrence date
      const instanceStart = new Date(occurrence);
      instanceStart.setHours(
        originalStart.getHours(),
        originalStart.getMinutes(),
        originalStart.getSeconds(),
        originalStart.getMilliseconds()
      );

      const instanceEnd = new Date(instanceStart.getTime() + duration);

      instances.push({
        id: event.id,
        instanceDate: occurrence,
        title: event.title,
        description: event.description,
        start_time: instanceStart.toISOString(),
        end_time: instanceEnd.toISOString(),
        all_day: event.all_day,
        event_type: event.event_type,
        color: event.color,
        recurrence_rule: event.recurrence_rule,
        isModified: false,
        originalStart: event.start_time,
        originalEnd: event.end_time,
      });
    }
  } catch (e) {
    console.error('Failed to generate recurring instances:', e);
  }

  return instances;
};

/**
 * Generate RRULE string from frequency and settings
 */
export const generateRRule = (
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  startDate: Date,
  interval: number = 1,
  endDate?: Date,
  daysOfWeek?: number[] // 0-6 for Sun-Sat
): string => {
  const freqMap = {
    daily: 'DAILY',
    weekly: 'WEEKLY',
    monthly: 'MONTHLY',
    yearly: 'YEARLY',
  };

  const options: any = {
    freq: freqMap[frequency],
    dtstart: startDate,
    interval,
  };

  if (endDate) {
    options.until = endDate;
  }

  if (daysOfWeek && daysOfWeek.length > 0) {
    const dayMap = [0, 1, 2, 3, 4, 5, 6]; // Sun-Sat
    options.byweekday = daysOfWeek.map(day => dayMap[day]);
  }

  const rrule = new RRule(options);
  return rrule.toString();
};

/**
 * Get human-readable recurrence description
 */
export const getRecurrenceDescription = (rruleString: string): string => {
  try {
    const rrule = parseRRule(rruleString);
    if (!rrule) return 'No recurrence';

    const freqMap: Record<string, string> = {
      DAILY: 'Daily',
      WEEKLY: 'Weekly',
      MONTHLY: 'Monthly',
      YEARLY: 'Yearly',
    };

    const freqText = freqMap[(rrule as any).options?.freq] || 'Unknown';

    if ((rrule as any).options?.interval && (rrule as any).options.interval > 1) {
      return `Every ${(rrule as any).options.interval} ${freqText.toLowerCase()}s`;
    }

    if ((rrule as any).options?.byweekday && (rrule as any).options.byweekday.length > 0) {
      const days = (rrule as any).options.byweekday.map((d: any) => {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return dayNames[d];
      });
      return `${freqText} on ${days.join(', ')}`;
    }

    if ((rrule as any).options?.until) {
      const untilDate = new Date((rrule as any).options.until);
      return `${freqText} until ${untilDate.toLocaleDateString()}`;
    }

    return freqText;
  } catch (e) {
    return 'No recurrence';
  }
};

/**
 * Get next occurrence date
 */
export const getNextOccurrence = (rruleString: string, afterDate: Date = new Date()): Date | null => {
  try {
    const rrule = parseRRule(rruleString);
    if (!rrule) return null;

    const next = rrule.after(afterDate);
    return next || null;
  } catch (e) {
    return null;
  }
};

/**
 * Get all occurrences up to a limit
 */
export const getOccurrences = (rruleString: string, limit: number = 10): Date[] => {
  try {
    const rrule = parseRRule(rruleString);
    if (!rrule) return [];

    return rrule.all((date, i) => i < limit);
  } catch (e) {
    return [];
  }
};

/**
 * Cancel a recurring event instance
 */
export const cancelRecurrenceInstance = (
  originalEventId: string,
  instanceDate: Date
): RecurrenceException => {
  return {
    id: `${originalEventId}-${instanceDate.toISOString()}`,
    original_event_id: originalEventId,
    instance_date: instanceDate.toISOString(),
    exception_type: 'cancelled',
    created_at: new Date().toISOString(),
  };
};

/**
 * Modify a recurring event instance
 */
export const modifyRecurrenceInstance = (
  originalEventId: string,
  instanceDate: Date,
  changes: {
    title?: string;
    start_time?: string;
    end_time?: string;
  }
): RecurrenceException => {
  return {
    id: `${originalEventId}-${instanceDate.toISOString()}`,
    original_event_id: originalEventId,
    instance_date: instanceDate.toISOString(),
    exception_type: 'modified',
    modified_title: changes.title,
    modified_start_time: changes.start_time,
    modified_end_time: changes.end_time,
    created_at: new Date().toISOString(),
  };
};

/**
 * Check if a date matches an instance
 */
export const isInstanceOnDate = (event: any, date: Date): boolean => {
  if (!event.recurrence_rule) return false;

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  try {
    const rrule = parseRRule(event.recurrence_rule);
    if (!rrule) return false;

    const occurrences = rrule.between(dayStart, dayEnd, true);
    return occurrences.length > 0;
  } catch (e) {
    return false;
  }
};

/**
 * Get recurrence frequency from RRULE
 */
export const getRecurrenceFrequency = (
  rruleString: string
): 'daily' | 'weekly' | 'monthly' | 'yearly' | null => {
  try {
    const rrule = parseRRule(rruleString);
    if (!rrule) return null;

    const freqMap: Record<Frequency, 'daily' | 'weekly' | 'monthly' | 'yearly'> = {
      [Frequency.DAILY]: 'daily',
      [Frequency.WEEKLY]: 'weekly',
      [Frequency.MONTHLY]: 'monthly',
      [Frequency.YEARLY]: 'yearly',
    };

    return freqMap[rrule.options.freq] || null;
  } catch (e) {
    return null;
  }
};

export default {
  parseRRule,
  generateRecurringInstances,
  generateRRule,
  getRecurrenceDescription,
  getNextOccurrence,
  getOccurrences,
  cancelRecurrenceInstance,
  modifyRecurrenceInstance,
  isInstanceOnDate,
  getRecurrenceFrequency,
};
