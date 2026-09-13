/**
 * Notification Service
 * Handles notification delivery across multiple channels
 * Uses lazy-loading to avoid push token warnings in Expo Go
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
 * Test notification - schedule a notification 5 seconds from now
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
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'This is a test notification - appears 5 seconds from now',
        data: { testNotification: true },
        sound: 'default',
      },
      trigger: {
        seconds: 5,
      },
    });
    
    console.log('[testNotification] Successfully scheduled with ID:', notificationId);
    return true;
  } catch (e) {
    console.error('[testNotification] Failed to schedule:', e);
    return false;
  }
};

/**
 * Send in-app notification (alert)
 */
export const sendInAppNotification = (
  title: string,
  message: string,
  options?: {
    buttons?: Array<{ text: string; onPress?: () => void }>;
  }
): Promise<boolean> => {
  return new Promise(resolve => {
    Alert.alert(
      title,
      message,
      [
        ...(options?.buttons || [{ text: 'OK' }]),
        {
          text: 'Dismiss',
          onPress: () => resolve(false),
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
    resolve(true);
  });
};

/**
 * Send push notification
 */
export const sendPushNotification = async (
  payload: NotificationPayload
): Promise<boolean> => {
  try {
    const Notifications = await import('expo-notifications');
    
    // Schedule local notification (works in Expo Go)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sound: payload.sound !== false ? 'default' : undefined,
        badge: payload.badge,
      },
      trigger: {
        seconds: 1,
      },
    });

    return true;
  } catch (e) {
    console.error('Failed to send push notification:', e);
    return false;
  }
};

/**
 * Schedule notification for later
 */
export const scheduleNotification = async (
  payload: NotificationPayload,
  triggerDate: Date
): Promise<string | null> => {
  try {
    const Notifications = await import('expo-notifications');
    
    // Calculate seconds until trigger
    const now = new Date();
    const secondsUntilTrigger = Math.max(1, Math.floor((triggerDate.getTime() - now.getTime()) / 1000));

    console.log(`[scheduleNotification] Scheduling notification:`);
    console.log(`  Title: ${payload.title}`);
    console.log(`  Trigger time: ${triggerDate.toISOString()}`);
    console.log(`  Current time: ${now.toISOString()}`);
    console.log(`  Seconds until trigger: ${secondsUntilTrigger}`);

    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sound: payload.sound !== false ? 'default' : undefined,
        badge: payload.badge,
      },
      trigger: {
        seconds: secondsUntilTrigger,
      },
    });

    if (!notificationId) {
      console.error('[scheduleNotification] No notification ID returned - scheduling may have failed');
      return null;
    }

    console.log(`[scheduleNotification] Successfully scheduled with ID: ${notificationId}`);
    return notificationId;
  } catch (e) {
    console.error('[scheduleNotification] Error scheduling notification:', {
      error: String(e),
      title: payload.title,
      triggerDate: triggerDate.toISOString(),
    });
    return null;
  }
};

/**
 * Cancel scheduled notification
 */
export const cancelNotification = async (identifier: string): Promise<void> => {
  try {
    const Notifications = await import('expo-notifications');
    if (Notifications?.cancelScheduledNotificationAsync) {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    }
  } catch (e) {
    console.error('Failed to cancel notification:', e);
  }
};

/**
 * Create or update event reminder
 */
export const createEventReminder = async (
  userId: string,
  eventId: string,
  eventTitle: string,
  eventStart: Date,
  reminderTiming: string,
  notificationType: NotificationChannel,
  customMinutes?: number
): Promise<{ success: boolean; reminderId?: string; message: string }> => {
  try {
    // Calculate reminder time
    const minutesBefore = getMinutesBefore(reminderTiming, customMinutes);
    const scheduledTime = new Date(eventStart.getTime() - minutesBefore * 60 * 1000);

    // Insert reminder
    const { data, error } = await supabase
      .from('event_reminders')
      .insert({
        user_id: userId,
        event_id: eventId,
        title: `Reminder: ${eventTitle}`,
        description: `Your event ${eventTitle} starts at ${eventStart.toLocaleTimeString()}`,
        reminder_timing: reminderTiming,
        custom_minutes_before: customMinutes,
        scheduled_time: scheduledTime.toISOString(),
        notification_type: notificationType,
      })
      .select('id')
      .single();

    if (error) throw error;

    return {
      success: true,
      reminderId: data.id,
      message: 'Reminder created',
    };
  } catch (e) {
    console.error('Error creating reminder:', e);
    return {
      success: false,
      message: `Error: ${String(e)}`,
    };
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

    // If table doesn't exist or no data, return null (use defaults)
    if (error) {
      console.log('Notification preferences unavailable (table may not exist yet)');
      return null;
    }

    if (!data) {
      return null;
    }

    return data;
  } catch (e) {
    console.log('Error fetching preferences (using defaults):', e);
    return null;
  }
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (
  userId: string,
  preferences: Record<string, any>
): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .update(preferences)
      .eq('user_id', userId);

    if (error) throw error;

    return {
      success: true,
      message: 'Preferences updated',
    };
  } catch (e) {
    console.error('Error updating preferences:', e);
    return {
      success: false,
      message: `Error: ${String(e)}`,
    };
  }
};

/**
 * Log notification delivery
 */
export const logNotificationDelivery = async (
  userId: string,
  reminderId: string,
  deliveryType: NotificationChannel,
  status: 'sent' | 'failed'
): Promise<void> => {
  try {
    await supabase.from('notification_delivery_log').insert({
      user_id: userId,
      reminder_id: reminderId,
      delivery_type: deliveryType,
      delivery_status: status,
      delivered_at: status === 'sent' ? new Date().toISOString() : null,
    });
  } catch (e) {
    console.warn('Failed to log delivery:', e);
  }
};

/**
 * Helper: get minutes before from timing
 */
const getMinutesBefore = (timing: string, customMinutes?: number): number => {
  const timingMap: Record<string, number> = {
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
  sendInAppNotification,
  sendPushNotification,
  scheduleNotification,
  cancelNotification,
  createEventReminder,
  getNotificationPreferences,
  updateNotificationPreferences,
  logNotificationDelivery,
  isInQuietHours,
};
