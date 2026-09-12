/**
 * Reminder Testing Utility
 * For testing the complete reminder flow end-to-end
 */

import { supabase } from './supabase';
import { processPendingReminders } from './reminder-scheduler';
import { Alert } from 'react-native';

/**
 * Create a test event with a reminder set to fire immediately
 */
export const createTestEventWithReminder = async (
  userId: string,
  eventTitle: string = 'Test Event',
  reminderMinutesBefore: number = 0
): Promise<{ eventId: string; reminderId: string } | null> => {
  try {
    // Create event starting 1 minute from now
    const startTime = new Date(Date.now() + 1 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const { data: eventData, error: eventError } = await supabase
      .from('calendar_events')
      .insert({
        user_id: userId,
        title: eventTitle,
        event_type: 'custom',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        all_day: false,
        color: '#607A62',
        description: 'Test event for reminder testing',
      })
      .select('id')
      .single();

    if (eventError) throw eventError;
    if (!eventData) throw new Error('No event data returned');

    const eventId = eventData.id;

    // Create reminder scheduled to fire now (or in reminderMinutesBefore)
    const scheduledTime = new Date(Date.now() - reminderMinutesBefore * 60 * 1000);

    const { data: reminderData, error: reminderError } = await supabase
      .from('event_reminders')
      .insert({
        user_id: userId,
        event_id: eventId,
        title: `Reminder: ${eventTitle}`,
        description: `Test reminder for ${eventTitle}`,
        minutes_before: reminderMinutesBefore,
        notification_type: 'notification',
        scheduled_time: scheduledTime.toISOString(),
        enabled: true,
      })
      .select('id')
      .single();

    if (reminderError) throw reminderError;
    if (!reminderData) throw new Error('No reminder data returned');

    console.log(`✓ Created test event ${eventId} and reminder ${reminderData.id}`);
    return { eventId, reminderId: reminderData.id };
  } catch (e) {
    console.error('Error creating test event/reminder:', e);
    Alert.alert('Error', `Failed to create test event: ${String(e)}`);
    return null;
  }
};

/**
 * Test reminder notification firing
 */
export const testReminderNotification = async (userId: string): Promise<boolean> => {
  try {
    console.log('🧪 Starting reminder notification test...');

    // Create test event
    const result = await createTestEventWithReminder(userId, 'Test Notification', 0);
    if (!result) return false;

    console.log('⏳ Waiting 2 seconds before processing reminders...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Process pending reminders
    console.log('🔔 Processing pending reminders...');
    const scheduledCount = await processPendingReminders(userId);

    if (scheduledCount > 0) {
      console.log(`✓ Successfully processed ${scheduledCount} reminder(s)`);
      Alert.alert('✓ Success', `Reminder notification test passed! Scheduled ${scheduledCount} reminder(s).`);
      return true;
    } else {
      console.warn('⚠ No reminders were scheduled');
      Alert.alert('⚠ Warning', 'No reminders were scheduled (may have already fired)');
      return false;
    }
  } catch (e) {
    console.error('Error in reminder notification test:', e);
    Alert.alert('✗ Test Failed', `Reminder test error: ${String(e)}`);
    return false;
  }
};

/**
 * Verify reminder was created and persisted
 */
export const verifyReminderPersistence = async (reminderId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('event_reminders')
      .select('*')
      .eq('id', reminderId)
      .single();

    if (error) throw error;

    if (data) {
      console.log('✓ Reminder found in database:', {
        id: data.id,
        title: data.title,
        minutes_before: data.minutes_before,
        notification_type: data.notification_type,
        enabled: data.enabled,
        scheduled_time: data.scheduled_time,
      });
      return true;
    }

    console.warn('✗ Reminder not found');
    return false;
  } catch (e) {
    console.error('Error verifying reminder:', e);
    return false;
  }
};

/**
 * Cleanup test reminders and events
 */
export const cleanupTestData = async (userId: string): Promise<void> => {
  try {
    // Delete test reminders
    const { data: reminders } = await supabase
      .from('event_reminders')
      .select('id')
      .eq('user_id', userId)
      .ilike('title', '%Test%');

    if (reminders && reminders.length > 0) {
      for (const reminder of reminders) {
        await supabase.from('event_reminders').delete().eq('id', reminder.id);
      }
      console.log(`✓ Deleted ${reminders.length} test reminder(s)`);
    }

    // Delete test events
    const { data: events } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('user_id', userId)
      .ilike('title', '%Test%');

    if (events && events.length > 0) {
      for (const event of events) {
        await supabase.from('calendar_events').delete().eq('id', event.id);
      }
      console.log(`✓ Deleted ${events.length} test event(s)`);
    }
  } catch (e) {
    console.warn('Error cleaning up test data:', e);
  }
};

export default {
  createTestEventWithReminder,
  testReminderNotification,
  verifyReminderPersistence,
  cleanupTestData,
};
