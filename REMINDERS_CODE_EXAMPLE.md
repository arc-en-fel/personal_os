# Reminders - Code Examples

## Quick Start: Create a Reminder

```typescript
import { createEventReminder } from '@/src/lib/notification-service';

// Example: Remind me 1 hour before my meeting
const reminderResult = await createEventReminder(
  userId,                           // Your user ID
  eventId,                          // The event's ID
  "Team Meeting",                   // Event title
  new Date("2026-09-10T14:00:00"),  // Event start time
  '1_hour',                         // Timing: 1 hour before
  'push'                            // Type: push notification
);

if (reminderResult.success) {
  console.log('✅ Reminder created!', reminderResult.reminderId);
} else {
  console.log('❌ Failed:', reminderResult.message);
}
```

---

## Reminder Timing Options

```typescript
// All available timing options:
const timingOptions = [
  'at_time',      // Remind exactly at event start
  '5_minutes',    // 5 minutes before
  '15_minutes',   // 15 minutes before
  '30_minutes',   // 30 minutes before
  '1_hour',       // 1 hour before
  '1_day',        // 1 day (24 hours) before
  'custom'        // Custom minutes (specify in next parameter)
];

// Example: Custom reminder 90 minutes before
const customReminder = await createEventReminder(
  userId,
  eventId,
  "Important Meeting",
  eventStart,
  'custom',
  'email',
  90  // Custom: 90 minutes before
);
```

---

## Notification Types

```typescript
// All notification channel options:
const channelOptions = [
  'in_app',   // 🔔 Alert popup in app
  'push',     // 📱 Device push notification
  'email',    // 📧 Email notification
  'sms'       // 💬 SMS text message
];

// Example: Create 4 reminders with different channels
const reminders = [
  // 1 day before: Email
  await createEventReminder(userId, eventId, title, eventStart, '1_day', 'email'),
  
  // 1 hour before: In-app
  await createEventReminder(userId, eventId, title, eventStart, '1_hour', 'in_app'),
  
  // 30 min before: Push notification
  await createEventReminder(userId, eventId, title, eventStart, '30_minutes', 'push'),
  
  // At time: Both in-app and push (create 2 reminders)
  await createEventReminder(userId, eventId, title, eventStart, 'at_time', 'in_app'),
  await createEventReminder(userId, eventId, title, eventStart, 'at_time', 'push')
];

const successCount = reminders.filter(r => r.success).length;
console.log(`✅ Created ${successCount}/${reminders.length} reminders`);
```

---

## Set Notification Preferences

```typescript
import { updateNotificationPreferences } from '@/src/lib/notification-service';

// Customize how you get notified
await updateNotificationPreferences(userId, {
  enable_push: true,           // Allow push notifications
  enable_email: false,         // Don't send emails
  enable_sms: false,           // Don't send texts
  quiet_hours_enabled: true,   // Enable quiet hours
  quiet_hours_start: "22:00",  // Start quiet at 10 PM
  quiet_hours_end: "08:00"     // End quiet at 8 AM
});

// Reminders will still be created, but won't send notifications
// during quiet hours (10 PM - 8 AM)
```

---

## Get Notification Preferences

```typescript
import { getNotificationPreferences } from '@/src/lib/notification-service';

const prefs = await getNotificationPreferences(userId);

console.log('Push enabled?', prefs.enable_push);
console.log('Quiet hours:', `${prefs.quiet_hours_start} - ${prefs.quiet_hours_end}`);
```

---

## Full Example: Create Event with Multiple Reminders

```typescript
import { supabase } from '@/src/lib/supabase';
import { createEventReminder } from '@/src/lib/notification-service';

async function createEventWithReminders(userId: string) {
  // Step 1: Create event
  const { data: eventData, error: eventError } = await supabase
    .from('calendar_events')
    .insert({
      user_id: userId,
      title: "Project Deadline",
      description: "Submit final project",
      event_type: 'work',
      start_time: new Date("2026-09-15T17:00:00").toISOString(),
      end_time: new Date("2026-09-15T18:00:00").toISOString(),
      all_day: false,
      color: '#FF6B6B'
    })
    .select()
    .single();

  if (eventError) {
    console.error('Failed to create event:', eventError);
    return;
  }

  const eventId = eventData.id;
  console.log('✅ Event created:', eventId);

  // Step 2: Add multiple reminders
  const reminders = [
    // 1 day before: Email
    await createEventReminder(
      userId,
      eventId,
      "Project Deadline",
      new Date("2026-09-15T17:00:00"),
      '1_day',
      'email'
    ),

    // 1 hour before: In-app alert
    await createEventReminder(
      userId,
      eventId,
      "Project Deadline",
      new Date("2026-09-15T17:00:00"),
      '1_hour',
      'in_app'
    ),

    // 30 minutes before: Push notification
    await createEventReminder(
      userId,
      eventId,
      "Project Deadline",
      new Date("2026-09-15T17:00:00"),
      '30_minutes',
      'push'
    )
  ];

  // Step 3: Report results
  const successCount = reminders.filter(r => r.success).length;
  console.log(`✅ Created ${successCount}/${reminders.length} reminders`);

  // Log reminder IDs
  reminders.forEach((r, i) => {
    if (r.success) {
      console.log(`  Reminder ${i + 1}: ${r.reminderId}`);
    }
  });

  return {
    eventId,
    reminders
  };
}

// Usage:
const result = await createEventWithReminders(userIdHere);
```

---

## Reminder Calculation Example

```typescript
import { calculateReminderTime, getReminderTimingText } from '@/src/lib/event-reminders';

// Event at 2:00 PM
const eventStart = new Date("2026-09-10T14:00:00");

// Calculate when reminders trigger
console.log('Event time:', eventStart.toLocaleTimeString());

const oneHourBefore = calculateReminderTime(eventStart, '1_hour');
console.log('1 hour before:', oneHourBefore.toLocaleTimeString());
// Output: 1:00 PM

const thirtyMinBefore = calculateReminderTime(eventStart, '30_minutes');
console.log('30 min before:', thirtyMinBefore.toLocaleTimeString());
// Output: 1:30 PM

const atTime = calculateReminderTime(eventStart, 'at_time');
console.log('At event time:', atTime.toLocaleTimeString());
// Output: 2:00 PM

const custom = calculateReminderTime(eventStart, 'custom', 90);
console.log('Custom (90 min):', custom.toLocaleTimeString());
// Output: 12:30 PM

// Get human-readable text
console.log(getReminderTimingText('1_hour'));
// Output: "1 hour before"

console.log(getReminderTimingText('custom', 90));
// Output: "90 minutes before"
```

---

## Log Notification Delivery

```typescript
import { logNotificationDelivery } from '@/src/lib/notification-service';

// Log when a reminder was sent
await logNotificationDelivery(
  userId,
  reminderId,
  'push',     // Delivery channel
  'sent'      // Status: 'sent' or 'failed'
);

// Later query the delivery log
const { data: logs } = await supabase
  .from('notification_delivery_log')
  .select('*')
  .eq('reminder_id', reminderId);

console.log('Delivery history:', logs);
```

---

## Snooze & Dismiss Reminders

```typescript
import { snoozeReminder, dismissReminder } from '@/src/lib/event-reminders';

// User taps Snooze on alert
const snoozed = snoozeReminder(reminder, 10);  // 10 minutes
console.log('Reminder snoozed until:', snoozed.snooze_until);

// User taps Dismiss
const dismissed = dismissReminder(reminder);
console.log('Reminder marked as sent');
```

---

## Get Upcoming Reminders

```typescript
import { getUpcomingReminders } from '@/src/lib/event-reminders';

// Fetch all reminders
const { data: allReminders } = await supabase
  .from('event_reminders')
  .select('*')
  .eq('user_id', userId);

// Filter to only upcoming (next 24 hours)
const upcoming = getUpcomingReminders(allReminders, 24);

upcoming.forEach(reminder => {
  console.log(
    `📍 ${reminder.title} - Remind at ${reminder.scheduled_time.toLocaleString()}`
  );
});
```

---

## Real-World Workflow

```typescript
// 1. User creates event
const event = await createEvent(userId, "Dentist Appointment", eventStart);

// 2. User adds reminder
const reminder = await createEventReminder(
  userId,
  event.id,
  event.title,
  eventStart,
  '1_day',
  'email'
);

// 3. At reminder time (1 day before), system sends notification
// (handled by notification service automatically)

// 4. User receives email: "Reminder: Dentist Appointment - Tomorrow at 2:00 PM"

// 5. User confirms they got it
// System logs the delivery
await logNotificationDelivery(userId, reminder.reminderId, 'email', 'sent');

// 6. Event day arrives, user sees event in calendar
// Second reminder triggers (if set)
```

---

## Testing Reminders

```typescript
// Create an event for RIGHT NOW to test immediately
const testEventStart = new Date();
testEventStart.setSeconds(0, 0);

// Create reminder for 1 minute from now
const testReminder = await createEventReminder(
  userId,
  testEventId,
  "Test Reminder",
  new Date(testEventStart.getTime() + 60000),  // 1 minute from now
  '1_minute',  // Custom: 1 minute before
  'in_app'
);

console.log('⏱️ Test reminder scheduled. Check for alert in 1 minute!');
```

---

## Summary

**Key Functions:**
- `createEventReminder()` - Create reminder for event
- `getNotificationPreferences()` - Get user settings
- `updateNotificationPreferences()` - Update settings
- `scheduleNotification()` - Schedule notification
- `calculateReminderTime()` - When will reminder trigger?
- `logNotificationDelivery()` - Track delivery

**Use Cases:**
- ✅ Meeting prep time
- ✅ Travel time buffer
- ✅ Task due date alerts
- ✅ Habit tracking reminders
- ✅ Important event notifications

Get started with reminders today! 🚀
