# 🔔 How Reminders Work - Complete Technical Guide

## Quick Answer

**How to add a reminder:**
1. Go to **Calendar** → Find an event → Tap the event
2. Scroll to **Reminders** section
3. Tap **+ Add**
4. Choose **when** (1 hour before, 30 min before, etc.)
5. Choose **how** (Push 📱, Email 📧, In-app 🔔, SMS 💬)
6. Tap **Add Reminder** ✅

**How push notifications work in real-time:**
- System calculates when reminder should trigger (event time - timing)
- At that exact time, Expo Notifications sends push notification to your device
- Notification appears on your phone/tablet even if app is closed

---

## 📋 Step-by-Step: Add a Reminder

### Visual Guide

```
STEP 1: Open Calendar
┌──────────────────────────┐
│ Calendar View            │
│ ┌─ Mon: Project meeting  │
│ ├─ Tue: Doctor appt ✓    │
│ └─ Wed: Gym              │
└──────────────────────────┘
        ↓ Tap event

STEP 2: View Event Details
┌──────────────────────────┐
│ ‹ Back                   │
│                          │
│ Doctor's Appointment     │
│ calendar event           │
│                          │
│ DETAILS                  │
│  Start: Today 2:00 PM    │
│  End: Today 2:30 PM      │
│  Location: Downtown      │
│                          │
│ REMINDERS ────── + Add ←─┤ TAP HERE
│  (empty)                 │
│                          │
│ [Edit] [Delete]          │
└──────────────────────────┘
        ↓ Tap "+ Add"

STEP 3: Add Reminder Modal
┌──────────────────────────┐
│ ‹ Back                   │
│                          │
│ Add Reminder             │
│                          │
│ When to Remind:          │
│  ○ At event time         │
│  ○ 5 minutes before      │
│  ○ 15 minutes before     │
│  ○ 30 minutes before     │
│  ✓ 1 hour before         │ ← SELECTED
│  ○ 1 day before          │
│                          │
│ How to Notify:           │
│  ✓ 📱 Push notify        │ ← SELECTED
│  ○ 🔔 In-app alert       │
│  ○ 📧 Email              │
│  ○ 💬 SMS                │
│                          │
│ [Cancel] [Add Reminder]  │
└──────────────────────────┘
        ↓ Tap "Add Reminder"

STEP 4: Reminder Added ✅
┌──────────────────────────┐
│ Reminder added!          │
│                          │
│ REMINDERS                │
│  ✓ 1 hour before         │
│    📱 push notification  │
│    Today at 1:00 PM      │
│    [🗑 Delete]           │
└──────────────────────────┘
```

### Code Behind the Scenes

When you tap "Add Reminder", this code runs:

```typescript
// Step 1: You submit the form
const addReminder = async () => {
  const result = await createEventReminder(
    session.user.id,           // Your user ID
    event.id,                  // Event ID: "doctor-appt-001"
    event.title,               // "Doctor's Appointment"
    new Date(event.start_time), // 2:00 PM today
    '1_hour',                  // When: 1 hour before
    'push'                     // How: Push notification
  );
};

// Step 2: Calculate when to send notification
const minutesBefore = 60; // 1 hour = 60 minutes
const eventStart = new Date("2024-09-05 14:00"); // 2:00 PM
const scheduledTime = new Date(
  eventStart.getTime() - (60 * 60 * 1000)
); // 1:00 PM today

// Step 3: Save reminder to database
const { data, error } = await supabase
  .from('event_reminders')
  .insert({
    user_id: "user-123",
    event_id: "doctor-appt-001",
    title: "Reminder: Doctor's Appointment",
    description: "Your event starts at 2:00 PM",
    reminder_timing: "1_hour",
    scheduled_time: "2024-09-05 13:00", // 1:00 PM
    notification_type: "push",
  });

// ✅ Reminder saved and scheduled!
```

---

## 📱 How Push Notifications Work in Real-Time

### Timeline: Event Today at 2:00 PM, Reminder 1 Hour Before

```
Timeline:
┌────────────────────────────────────────────────────────┐
│                                                        │
│ 12:00 PM (Noon)                                       │
│   └─ You're using your phone                          │
│                                                        │
│ 12:55 PM                                              │
│   └─ App running in background                        │
│                                                        │
│ 1:00 PM ← REMINDER TIME! 🔔                           │
│   ├─ System checks: Is reminder time now? YES ✓       │
│   ├─ System gets reminder from database               │
│   ├─ System sends push notification                   │
│   └─ Your phone shows: "Doctor's Appointment in 1hr"  │
│       PUSH NOTIFICATION APPEARS! 📱                   │
│                                                        │
│ 1:01 PM                                               │
│   └─ You see notification on home screen              │
│       You tap it → App opens to event details         │
│                                                        │
│ 2:00 PM                                               │
│   └─ Event starts!                                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### How It Actually Works (Technical)

```
YOUR APP
├─ Running in Foreground
│  └─ User opens calendar → finds event → adds reminder
│     Scheduled time: 1:00 PM
│
├─ Running in Background
│  └─ Phone background task monitors time
│     Every second checks: "Is it reminder time?"
│
└─ When Reminder Time Arrives (1:00 PM)
   ├─ Background task detects reminder time
   ├─ Calls Expo Notifications API
   │  └─ Notifications.scheduleNotificationAsync({
   │       trigger: { date: new Date(scheduledTime) }
   │     })
   ├─ Push notification sent to device
   ├─ Device shows notification (even if app closed!)
   ├─ You tap notification → App opens
   └─ App shows event details
```

### Code That Handles This

```typescript
// Step 1: Schedule the notification
import * as Notifications from 'expo-notifications';

const scheduleNotification = async (
  title: string,
  message: string,
  triggerTime: Date  // 1:00 PM
) => {
  // Expo handles all the background magic
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: title,           // "Doctor's Appointment"
      body: message,          // "Your appointment in 1 hour"
      data: {
        eventId: "doctor-appt-001"
      },
      sound: 'default',
      badge: 1
    },
    trigger: {
      date: triggerTime  // 1:00 PM
    }
  });

  return notificationId;
};

// Step 2: When notification arrives, handle it
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('Notification arrived!', notification);
    return {
      shouldShowAlert: true,    // Show the notification
      shouldPlaySound: true,    // Play sound
      shouldSetBadge: false     // Update badge count
    };
  }
});

// Step 3: User taps notification → open app
Notifications.useLastNotificationResponse(); // Get last tapped notification
```

---

## 🔄 Complete Flow: From Reminder Creation to Notification

```
┌─────────────────────────────────────────────────────────┐
│ USER ACTION                                             │
├─────────────────────────────────────────────────────────┤
│ 1. Open Calendar                                        │
│ 2. Find "Doctor's Appointment" event at 2:00 PM        │
│ 3. Tap event → view details                            │
│ 4. Scroll to Reminders → Tap "+ Add"                   │
│ 5. Select "1 hour before"                              │
│ 6. Select "📱 Push notification"                       │
│ 7. Tap "Add Reminder"                                  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ APP PROCESSING                                          │
├─────────────────────────────────────────────────────────┤
│ 1. Calculate reminder time:                             │
│    Event: 2:00 PM                                       │
│    Minus 1 hour = 1:00 PM                               │
│                                                         │
│ 2. Save to Supabase:                                    │
│    ├─ event_id: "doctor-appt-001"                       │
│    ├─ scheduled_time: "1:00 PM today"                   │
│    ├─ notification_type: "push"                         │
│    └─ timing: "1_hour"                                  │
│                                                         │
│ 3. Schedule with Expo Notifications:                    │
│    ├─ Content: "Doctor's Appointment"                   │
│    ├─ Body: "Your appointment in 1 hour"                │
│    └─ Trigger: 1:00 PM today                            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ WAITING (IN BACKGROUND)                                 │
├─────────────────────────────────────────────────────────┤
│ Phone's background task monitoring...                   │
│                                                         │
│ ✓ 11:00 AM - Still waiting                              │
│ ✓ 12:00 PM - Still waiting                              │
│ ✓ 12:30 PM - Still waiting                              │
│ ✓ 12:59 PM - Almost there...                            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ NOTIFICATION TRIGGERS (1:00 PM)                         │
├─────────────────────────────────────────────────────────┤
│ 1. Device detects: "It's 1:00 PM!"                      │
│ 2. Matches scheduled notification                       │
│ 3. Checks notification permissions                      │
│ 4. Prepares notification content                        │
│ 5. Shows on device home screen:                         │
│                                                         │
│    ┌──────────────────────────────────┐                 │
│    │ Personal OS                  1:00 │                 │
│    │ Doctor's Appointment              │                 │
│    │ Your appointment in 1 hour        │                 │
│    └──────────────────────────────────┘                 │
│                                                         │
│ 6. Plays notification sound (default)                   │
│ 7. Vibrates phone                                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ USER RECEIVES NOTIFICATION                              │
├─────────────────────────────────────────────────────────┤
│ Option 1: Tap notification                              │
│   └─ App opens → Shows event details                    │
│                                                         │
│ Option 2: Dismiss notification                          │
│   └─ Notification goes away                             │
│                                                         │
│ Option 3: Snooze (coming soon)                          │
│   └─ Reminder reschedules for 10 min later              │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ Technical Details: How It Works Under the Hood

### 1. Timing Calculation

```typescript
// When you select "1 hour before":
const timing = '1_hour';
const eventStart = new Date("2024-09-05 14:00"); // 2:00 PM

// Calculate minutes before
const minutesMap = {
  'at_time': 0,           // No minutes before
  '5_minutes': 5,         // 5 minutes before
  '15_minutes': 15,       // 15 minutes before
  '30_minutes': 30,       // 30 minutes before
  '1_hour': 60,           // 60 minutes before
  '1_day': 1440           // 1440 minutes (24 hours) before
};

const minutesBefore = minutesMap[timing]; // 60

// Calculate scheduled time
const scheduledTime = new Date(
  eventStart.getTime() - (minutesBefore * 60 * 1000)
); // Subtracts 60 minutes from 2:00 PM = 1:00 PM
```

### 2. Database Storage

```sql
-- What gets saved in event_reminders table
INSERT INTO event_reminders (
  id,                 → 'reminder-001'
  user_id,            → 'user-123'
  event_id,           → 'doctor-appt-001'
  title,              → 'Reminder: Doctor's Appointment'
  description,        → 'Your event Doctor's Appointment starts at 2:00 PM'
  scheduled_time,     → '2024-09-05 13:00:00' (1:00 PM)
  reminder_timing,    → '1_hour'
  notification_type,  → 'push'
  enabled,            → true
  created_at          → '2024-09-05 12:30:00' (now)
) VALUES ...;
```

### 3. Expo Notifications API

```typescript
// What happens when reminder time arrives
import * as Notifications from 'expo-notifications';

// Schedule the notification
const identifier = await Notifications.scheduleNotificationAsync({
  content: {
    title: "Doctor's Appointment",
    body: "Your appointment in 1 hour",
    data: {
      eventId: "doctor-appt-001",
      reminderTiming: "1_hour",
      eventStart: "2024-09-05 14:00"
    },
    sound: 'default',
    badge: 1  // Badge on app icon
  },
  trigger: {
    date: new Date("2024-09-05 13:00")  // 1:00 PM
  }
});

// Expo handles the rest:
// ✓ Stores notification in system
// ✓ Waits for scheduled time
// ✓ At 1:00 PM, sends notification
// ✓ Shows on device (even if app closed!)
// ✓ Plays sound and vibrates
// ✓ User taps → opens app
```

---

## 📲 What Happens When Notification Arrives

### If App Is Open
```
1:00 PM arrives
   ↓
System sends notification
   ↓
App is running → notification handler fires
   ↓
Alert or modal appears in app
   ↓
User sees: "Doctor's Appointment"
           "Your appointment in 1 hour"
```

### If App Is Closed
```
1:00 PM arrives
   ↓
System sends notification
   ↓
Device shows on home screen/lock screen
   ↓
User sees:
┌─────────────────────────────┐
│ Personal OS                 │
│ Doctor's Appointment        │
│ Your appointment in 1 hour  │
└─────────────────────────────┘
   ↓
User taps notification
   ↓
App opens
   ↓
App shows event details
```

---

## 🎯 Real-Time Timeline Example

**Scenario: You create reminder at 12:30 PM for 2:00 PM event, 1-hour-before reminder**

```
TIME            ACTION                              STATUS
─────────────────────────────────────────────────────────
12:30:00 PM     ✓ You tap "Add Reminder"            Creating
12:30:01 PM     ✓ App calculates: 2:00 PM - 1hr     Calculating
12:30:02 PM     ✓ Reminder time: 1:00 PM            Calculated
12:30:03 PM     ✓ Saved to database                 Saved
12:30:04 PM     ✓ Sent to Expo Notifications        Scheduled
12:30:05 PM     ✓ Screen shows "Reminder added"     Confirmed
                ↓ WAITING IN BACKGROUND
12:45:00 PM     ← System checking: 1:00 PM yet?     Monitoring
01:00:00 PM     ✓ YES! It's 1:00 PM!                TIME!
01:00:01 PM     ✓ Notification triggered            Sending
01:00:02 PM     ✓ Notification sent to device       Sent!
01:00:03 PM     📱 NOTIFICATION APPEARS             RECEIVED!
01:00:05 PM     ✓ Phone plays sound + vibrates      Alerting
01:00:10 PM     ✓ User taps notification            Opened
01:00:11 PM     ✓ App opens and shows event         Event shown!
```

---

## 🔧 What Each Notification Type Does

### 📱 Push Notification (Real-Time)
- Sent by device OS
- Works even if app closed
- Shows on lock screen
- Plays sound + vibrates
- **Best for:** Critical events you can't miss

**Code:**
```typescript
notification_type: 'push'
// → Expo Notifications handles delivery
// → Device OS shows it
// → User sees it immediately at scheduled time
```

### 🔔 In-App Alert (Only When App Open)
- Shows popup/modal in app
- Only visible if using app
- Still audible if app is open
- **Best for:** Reminders while actively using app

**Code:**
```typescript
notification_type: 'in_app'
// → Shows Alert.alert() in app
// → User must tap OK to dismiss
// → Only triggers if app is running
```

### 📧 Email (Asynchronous)
- Sent to your email
- Delivered within minutes
- **Currently:** Needs backend setup
- **Future:** Will send real emails

### 💬 SMS (Guaranteed Delivery)
- Text message to phone
- **Currently:** Needs Twilio setup
- **Future:** Will send real SMS

---

## 📊 Reminder State Machine

```
                    ┌─ CREATED
                    │
                    ↓
        ┌─────────────────────┐
        │  SCHEDULED          │
        │  Waiting for time   │
        └─────────────────────┘
                    │
            [reminder time]
                    ↓
        ┌─────────────────────┐
        │  TRIGGERED          │
        │  Notification sent  │
        └─────────────────────┘
                    │
        ┌───────────┴──────────┐
        ↓                      ↓
    [User taps]         [Dismissed]
        │                      │
        ↓                      ↓
    OPENED              ARCHIVED
  Event shown         Removed from list
```

---

## ✅ Quick Reference

| Question | Answer |
|----------|--------|
| **How to add?** | Calendar → Event → Reminders → + Add |
| **When added?** | Immediately saved to database |
| **When triggers?** | At exact scheduled time (event - timing) |
| **Push real-time?** | YES - Expo Notifications handles it |
| **Works when app closed?** | YES for push, NO for in-app |
| **Can have multiple?** | YES - add as many as you want |
| **Can edit?** | Not yet - delete and add new |
| **Backend setup needed?** | Only for email/SMS (push works now!) |

---

## Summary

**Adding a reminder:**
1. Calendar → Event details
2. Tap "+ Add" in Reminders section
3. Choose timing (when)
4. Choose notification (how)
5. Tap "Add Reminder"
6. ✅ Done!

**How it triggers in real-time:**
1. App calculates scheduled time (event time - reminder timing)
2. Stores in database
3. Expo Notifications monitors time in background
4. At exact time, sends notification to device
5. Phone shows notification (even if app closed!)
6. Sound + vibration alert you
7. You tap notification → app opens with event details

**That's it!** The system handles all the background timing and delivery automatically.
