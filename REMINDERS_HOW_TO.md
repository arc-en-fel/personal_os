# How Reminders Work - Complete Guide

## Overview

The reminder system lets you get notified before your events happen. You can set multiple reminders per event with different timing and notification types.

---

## Step 1: Create an Event

First, you need a calendar event:
1. Go to **Calendar** tab
2. Tap the **+** button or create an event
3. Set event title, date, and time
4. Save the event

---

## Step 2: Add a Reminder to the Event

Currently, reminders need to be added programmatically via the code. Here's how it will work in the UI:

### Reminder Options

When you access event details, you can choose from these reminder timings:

| Timing | When You Get Reminded |
|--------|----------------------|
| **At event time** | Right when the event starts |
| **5 minutes before** | 5 minutes before start |
| **15 minutes before** | 15 minutes before start |
| **30 minutes before** | 30 minutes before start |
| **1 hour before** | 1 hour before start |
| **1 day before** | 24 hours before start |
| **Custom** | Any custom number of minutes |

### Notification Types

You can choose how you want to be reminded:

| Type | What Happens |
|------|------|
| **In-App Alert** 🔔 | Popup appears in the app |
| **Push Notification** 📱 | Device notification (even if app is closed) |
| **Email** 📧 | Email sent to your account |
| **SMS** 💬 | Text message to your phone |

---

## Step 3: How Reminders Trigger

### Timeline Example

Let's say you have a **Doctor's Appointment** on **Sep 10 at 2:00 PM** and you set:
- ✅ Reminder 1 hour before → Gets alert at **1:00 PM**
- ✅ Reminder 30 minutes before → Gets alert at **1:30 PM**
- ✅ Reminder at event time → Gets alert at **2:00 PM**

### Behind the Scenes

1. **System calculates when to remind you**
   - Takes event start time (2:00 PM)
   - Subtracts reminder time (1 hour)
   - Stores scheduled time (1:00 PM)

2. **System checks current time**
   - At 1:00 PM, system recognizes reminder time has arrived
   - Sends notification based on your chosen type

3. **You get notified**
   - If **In-App**: Alert popup appears
   - If **Push**: Device notification (with sound)
   - If **Email**: Message sent to email
   - If **SMS**: Text message received

---

## Quiet Hours (Optional)

You can set "quiet hours" where reminders won't send notifications:

**Example:** 10:00 PM - 8:00 AM
- If a reminder is scheduled during this time, it will be silently queued
- When quiet hours end, you'll get the notification

This prevents notifications waking you up at night!

---

## Managing Reminders

### View Reminders
- Open an event detail
- See all reminders listed with timing and type

### Edit a Reminder
- Change the timing (e.g., 1 hour before → 30 minutes before)
- Change notification type (e.g., in-app → push)

### Delete a Reminder
- Swipe or tap delete button on reminder
- No more notifications for that timing

### Snooze a Reminder
When you get a reminder alert:
- Tap **Snooze** to be reminded again in 10 minutes
- Tap **Dismiss** to close without snoozing

---

## Real-World Examples

### Example 1: Work Meeting
**Event:** Team standup at 9:00 AM
**Reminders:**
- 15 minutes before → Push notification (wakes you up)
- 1 hour before → In-app alert (so you can prep)

**Result:**
- 8:00 AM: Sees in-app alert, starts preparing
- 8:45 AM: Gets push notification on phone
- 9:00 AM: Ready for meeting!

### Example 2: Appointment
**Event:** Doctor's appointment at 2:00 PM
**Reminders:**
- 1 day before → Email reminder
- 1 hour before → In-app alert

**Result:**
- Sep 9, 2:00 PM: Email arrives reminding you to prepare
- Sep 10, 1:00 PM: In-app alert reminds you to leave soon

### Example 3: Project Deadline
**Event:** Submit project by 5:00 PM
**Reminders:**
- 1 hour before → Push notification
- Custom: 30 minutes before → In-app alert

**Result:**
- 4:00 PM: Push notification reminds you to start submitting
- 4:30 PM: In-app alert as final warning
- 5:00 PM: Can submit on time!

---

## How to Add Reminders Currently

Since the UI isn't yet integrated, here's how you'd do it via code:

```typescript
import { createEventReminder } from '@/src/lib/notification-service';

// Create a reminder
const result = await createEventReminder(
  userId,              // Your user ID
  eventId,             // The event to remind about
  "Doctor's Appointment",  // Event title
  new Date("2026-09-10T14:00:00"), // Event start time
  '1_hour',            // Remind 1 hour before
  'push'               // Send as push notification
);

if (result.success) {
  console.log('Reminder created:', result.reminderId);
}
```

---

## Reminder Storage

Reminders are stored in the database:

### `event_reminders` Table
Stores each reminder with:
- Event ID (which event it's for)
- Reminder timing (when to remind)
- Notification type (how to notify)
- Scheduled time (calculated trigger time)
- Status (sent/pending/snoozed)

### `notification_delivery_log` Table
Tracks when reminders were sent:
- When notification was delivered
- Success/failure status
- Number of retry attempts
- Error messages (if failed)

---

## Notification Preferences

You can customize notification behavior:

```typescript
import { updateNotificationPreferences } from '@/src/lib/notification-service';

await updateNotificationPreferences(userId, {
  enable_push: true,           // Allow push notifications
  enable_email: false,         // Don't send emails
  enable_sms: false,           // Don't send texts
  quiet_hours_enabled: true,
  quiet_hours_start: "22:00",  // 10 PM
  quiet_hours_end: "08:00"     // 8 AM
});
```

---

## Limitations

- **No server-side cron**: Reminders run on-device when app is open
- **Device-dependent**: If app is closed, you'll get push notifications
- **Email/SMS**: Infrastructure ready but requires backend setup

---

## Future Features (Phase 14+)

- ✅ UI integration for reminder creation
- ✅ Edit existing reminders
- ✅ Set different reminders for different event types
- ✅ Recurring reminders for recurring events
- ✅ Smart reminders (suggest best reminder times)
- ✅ Analytics (track which reminders you actually use)

---

## Troubleshooting

**Q: I'm not getting push notifications**
A: Check if push notifications are enabled in app settings

**Q: Email reminders aren't working**
A: Email delivery backend needs to be configured

**Q: Reminders stopped working after update**
A: Clear app cache and restart: Settings → Apps → Personal Tracker → Storage → Clear

**Q: Snooze doesn't work**
A: Tap snooze while alert is visible. Snoozed reminders hide for set time.

---

## Summary

**Reminders Help You:**
- 🎯 Never miss important events
- ⏰ Get advance notice to prepare
- 🔔 Choose how you want to be reminded
- 🛌 Control when you receive notifications

**Next Step:** When UI integration is complete, you'll see reminder options in the event detail screen!
