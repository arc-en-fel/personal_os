/**
 * Device calendar sync service for bidirectional event synchronization.
 * Handles permissions, push/pull operations, and sync logging.
 * 
 * NOTE: This module imports expo-calendar which has version compatibility issues.
 * It should be imported dynamically only when needed.
 */

let Calendar: any;

// Safely import expo-calendar with error handling
try {
  Calendar = require('expo-calendar');
} catch (e) {
  console.warn('expo-calendar not available, calendar sync disabled:', e);
  Calendar = null;
}

import { supabase } from './supabase';

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
  recurrence_rule: string | null;
};

/**
 * Device calendar sync service for bidirectional event synchronization.
 * Handles permissions, push/pull operations, and sync logging.
 */
export class CalendarSyncService {
  private static instance: CalendarSyncService;
  private deviceCalendarId: string | null = null;
  private userId: string | null = null;

  private constructor() {}

  static getInstance(): CalendarSyncService {
    if (!CalendarSyncService.instance) {
      CalendarSyncService.instance = new CalendarSyncService();
    }
    return CalendarSyncService.instance;
  }

  /**
   * Check if calendar permissions are granted
   */
  async getCalendarPermission(): Promise<boolean> {
    if (!Calendar) {
      console.warn('Calendar not available');
      return false;
    }
    try {
      const { status } = await Calendar.getCalendarPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.warn('Error checking calendar permission:', e);
      return false;
    }
  }

  /**
   * Request calendar permissions from user
   */
  async requestCalendarPermission(): Promise<boolean> {
    if (!Calendar) {
      console.warn('Calendar not available');
      return false;
    }
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      console.warn('Error requesting calendar permission:', e);
      return false;
    }
  }

  /**
   * Initialize sync service for a user
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;

    try {
      // Check and request permissions if needed
      const hasPermission = await this.getCalendarPermission();
      if (!hasPermission) {
        const granted = await this.requestCalendarPermission();
        if (!granted) {
          console.warn('Calendar permissions not granted');
          return;
        }
      }

      // Get or create device calendar
      await this.ensureCalendarExists();
    } catch (e) {
      console.warn('Failed to initialize calendar sync:', e);
    }
  }

  /**
   * Get or create the device calendar for this user
   */
  private async ensureCalendarExists(): Promise<void> {
    if (!this.userId) return;

    try {
      // Get calendar settings
      const { data: settings } = await supabase
        .from('calendar_settings')
        .select('device_calendar_id, device_calendar_name')
        .eq('user_id', this.userId)
        .single();

      if (settings?.device_calendar_id) {
        this.deviceCalendarId = settings.device_calendar_id;
        return;
      }

      // Create new calendar if not exists
      const calendarName = settings?.device_calendar_name || 'Personal Tracker';

      try {
        const newCalendarId = await Calendar.createCalendarAsync({
          title: calendarName,
          color: '#3B82F6',
          entityType: Calendar.EntityTypes.EVENT,
          source: {
            name: 'Personal Tracker',
            isLocalAccount: true
          },
          name: 'personal-tracker',
          ownerAccount: 'personal-tracker'
        });

        this.deviceCalendarId = newCalendarId;

        // Save to settings
        if (this.userId) {
          await supabase
            .from('calendar_settings')
            .update({ device_calendar_id: newCalendarId })
            .eq('user_id', this.userId);
        }
      } catch (e) {
        console.warn('Failed to create calendar:', e);
        // Continue without device calendar
      }
    } catch (e) {
      console.warn('Failed to ensure calendar exists:', e);
    }
  }

  /**
   * Push a single event to device calendar
   */
  async pushEventToDevice(event: CalendarEvent): Promise<boolean> {
    if (!Calendar || !this.deviceCalendarId || !this.userId) {
      console.warn('Calendar not available or not initialized');
      return false;
    }

    try {
      const startDate = new Date(event.start_time);
      const endDate = new Date(event.end_time);

      const calendarEvent: any = {
        title: event.title,
        notes: event.description || '',
        startDate,
        endDate,
        allDay: event.all_day,
        location: '',
        timeZone: 'UTC',
        ...(event.recurrence_rule && {
          recurrenceRule: this.convertRRuleToCalendarRecurrence(event.recurrence_rule)
        })
      };

      const deviceEventId = await Calendar.createEventAsync(this.deviceCalendarId, calendarEvent);

      // Save device event ID to database
      await supabase
        .from('calendar_events')
        .update({
          is_synced_to_device: true,
          device_calendar_id: deviceEventId
        })
        .eq('id', event.id);

      // Log sync
      await this.logSync(event.id, 'push', 'success');

      return true;
    } catch (e) {
      console.error('Failed to push event to device:', e);
      await this.logSync(event.id, 'push', 'failed', String(e));
      return false;
    }
  }

  /**
   * Sync all unsync'd events to device calendar
   */
  async syncAllEventsToDevice(): Promise<number> {
    if (!this.userId) return 0;

    try {
      // Get unsync'd events
      const { data: events } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_synced_to_device', false)
        .order('start_time', { ascending: true })
        .limit(100);

      let syncedCount = 0;

      for (const event of (events as CalendarEvent[] | null) ?? []) {
        const success = await this.pushEventToDevice(event);
        if (success) syncedCount++;
      }

      return syncedCount;
    } catch (e) {
      console.error('Failed to sync all events:', e);
      return 0;
    }
  }

  /**
   * Pull events from device calendar (TODO: bidirectional sync)
   */
  async pullEventsFromDevice(): Promise<number> {
    if (!this.deviceCalendarId || !this.userId) return 0;

    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60000); // 1 year

      const deviceEvents = await Calendar.getEventsAsync(
        [this.deviceCalendarId],
        now,
        futureDate
      );

      let pulledCount = 0;

      for (const deviceEvent of deviceEvents) {
        // Check if already in database
        const { data: existing } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('device_calendar_id', deviceEvent.id)
          .eq('user_id', this.userId)
          .single();

        if (existing) continue;

        // Create calendar event from device event
        const { error } = await supabase.from('calendar_events').insert({
          user_id: this.userId,
          title: deviceEvent.title,
          description: deviceEvent.notes || null,
          event_type: 'custom',
          start_time: deviceEvent.startDate?.toISOString() || new Date().toISOString(),
          end_time: deviceEvent.endDate?.toISOString() || new Date().toISOString(),
          all_day: deviceEvent.allDay || false,
          color: '#808080',
          is_synced_to_device: true,
          device_calendar_id: deviceEvent.id,
          metadata: { source: 'device', pulled_from_calendar: true }
        });

        if (!error) {
          pulledCount++;
          await this.logSync(null, 'pull', 'success', 'device');
        }
      }

      return pulledCount;
    } catch (e) {
      console.error('Failed to pull events from device:', e);
      return 0;
    }
  }

  /**
   * Delete an event from device calendar
   */
  async deleteEventFromDevice(deviceEventId: string): Promise<boolean> {
    if (!this.deviceCalendarId) return false;

    try {
      await Calendar.deleteEventAsync(this.deviceCalendarId, deviceEventId);
      return true;
    } catch (e) {
      console.error('Failed to delete event from device:', e);
      return false;
    }
  }

  /**
   * Update an event on device calendar
   */
  async updateEventOnDevice(
    deviceEventId: string,
    updates: Partial<CalendarEvent>
  ): Promise<boolean> {
    if (!this.deviceCalendarId) return false;

    try {
      const calendarEvent: Partial<Calendar.CreateEventAsyncOptions> = {};

      if (updates.title) calendarEvent.title = updates.title;
      if (updates.description) calendarEvent.notes = updates.description;
      if (updates.start_time) calendarEvent.startDate = new Date(updates.start_time);
      if (updates.end_time) calendarEvent.endDate = new Date(updates.end_time);
      if (updates.all_day !== undefined) calendarEvent.allDay = updates.all_day;

      await Calendar.updateEventAsync(deviceEventId, calendarEvent);
      return true;
    } catch (e) {
      console.error('Failed to update event on device:', e);
      return false;
    }
  }

  /**
   * Convert RFC 5545 RRULE to Expo Calendar format
   */
  private convertRRuleToCalendarRecurrence(rrule: string): Calendar.RecurrenceRule {
    const recurrenceRule: Calendar.RecurrenceRule = {};

    if (rrule.includes('DAILY')) {
      recurrenceRule.frequency = Calendar.Frequency.DAILY;
    } else if (rrule.includes('WEEKLY')) {
      recurrenceRule.frequency = Calendar.Frequency.WEEKLY;
    } else if (rrule.includes('MONTHLY')) {
      recurrenceRule.frequency = Calendar.Frequency.MONTHLY;
    } else if (rrule.includes('YEARLY')) {
      recurrenceRule.frequency = Calendar.Frequency.YEARLY;
    }

    // Extract interval if present
    const intervalMatch = rrule.match(/INTERVAL=(\d+)/);
    if (intervalMatch) {
      recurrenceRule.interval = parseInt(intervalMatch[1], 10);
    }

    // Extract end date if present
    const endMatch = rrule.match(/UNTIL=(\d{8})/);
    if (endMatch) {
      const dateStr = endMatch[1];
      recurrenceRule.endDate = new Date(
        parseInt(dateStr.substring(0, 4), 10),
        parseInt(dateStr.substring(4, 6), 10) - 1,
        parseInt(dateStr.substring(6, 8), 10)
      );
    }

    return recurrenceRule;
  }

  /**
   * Log sync operation for audit trail
   */
  private async logSync(
    eventId: string | null,
    direction: 'push' | 'pull',
    status: 'success' | 'failed',
    source?: string
  ): Promise<void> {
    if (!this.userId) return;

    try {
      await supabase.from('calendar_sync_log').insert({
        user_id: this.userId,
        event_id: eventId,
        sync_direction: direction,
        sync_status: status,
        source: source || 'device',
        synced_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to log sync:', e);
    }
  }
}

// Lazy singleton - only instantiate when actually needed
let instance: CalendarSyncService | null = null;

export function getCalendarSyncService(): CalendarSyncService {
  if (!instance) {
    instance = CalendarSyncService.getInstance();
  }
  return instance;
}
