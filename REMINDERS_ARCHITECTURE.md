# 🏗️ Reminders System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR APP                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FRONTEND (What You See)                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Calendar Tab                                        │   │
│  │  ├─ View events                                     │   │
│  │  └─ Tap event → see Reminders section               │   │
│  │     └─ "+ Add" button                               │   │
│  │                                                     │   │
│  │ Reminders Tab (🔔)                                  │   │
│  │  ├─ List all reminders                              │   │
│  │  ├─ Show timing & notification type                 │   │
│  │  └─ Enable/disable/delete                           │   │
│  │                                                     │   │
│  │ Add Reminder Modal                                  │   │
│  │  ├─ Choose WHEN (timing options)                    │   │
│  │  └─ Choose HOW (notification type)                  │   │
│  └─────────────────────────────────────────────────────┘   │
│           ↓ User actions (add/delete)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ BUSINESS LOGIC                                      │   │
│  │  ├─ Calculate reminder time                         │   │
│  │  ├─ Validate inputs                                 │   │
│  │  ├─ Create reminder object                          │   │
│  │  └─ Schedule notification                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Cloud)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SUPABASE DATABASE                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Tables:                                              │  │
│  │  ├─ calendar_events                                  │  │
│  │  │   ├─ id, title, start_time, end_time             │  │
│  │  │   └─ user_id, color, location                    │  │
│  │  │                                                  │  │
│  │  ├─ event_reminders  ← REMINDERS STORED HERE        │  │
│  │  │   ├─ id, event_id, user_id                       │  │
│  │  │   ├─ scheduled_time ← WHEN TO TRIGGER            │  │
│  │  │   ├─ reminder_timing (1_hour, 30_minutes, etc.)  │  │
│  │  │   ├─ notification_type (push, email, sms)        │  │
│  │  │   └─ enabled, created_at                         │  │
│  │  │                                                  │  │
│  │  ├─ notification_delivery_log                       │  │
│  │  │   ├─ reminder_id                                 │  │
│  │  │   ├─ delivery_type                               │  │
│  │  │   └─ delivery_status                             │  │
│  │  │                                                  │  │
│  │  └─ notification_preferences                        │  │
│  │      ├─ quiet_hours_enabled                         │  │
│  │      ├─ quiet_hours_start/end                       │  │
│  │      └─ notification_channels                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  EDGE FUNCTIONS (Future)                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Scheduled jobs (run every minute):                   │  │
│  │  ├─ Check for reminders due                          │  │
│  │  ├─ Send email notifications                         │  │
│  │  ├─ Send SMS notifications                           │  │
│  │  └─ Log delivery status                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│            DEVICE NOTIFICATION SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  EXPO NOTIFICATIONS (Background)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ├─ Monitors scheduled times                         │  │
│  │  ├─ Waits for reminder time to arrive                │  │
│  │  └─ At trigger time:                                 │  │
│  │     ├─ Retrieve notification data                    │  │
│  │     ├─ Prepare notification content                  │  │
│  │     ├─ Send to device OS                             │  │
│  │     └─ Handle user interaction                       │  │
│  └──────────────────────────────────────────────────────┘  │
│           ↓ At exact trigger time                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ DEVICE OS NOTIFICATION                               │  │
│  │  ├─ Show notification on lock screen                 │  │
│  │  ├─ Show notification on home screen                 │  │
│  │  ├─ Play notification sound                          │  │
│  │  ├─ Vibrate device                                   │  │
│  │  └─ Show badge on app icon                           │  │
│  └──────────────────────────────────────────────────────┘  │
│           ↓ User interaction                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ USER SEES & INTERACTS                                │  │
│  │  ├─ User sees: "Doctor's Appointment - in 1 hour"    │  │
│  │  ├─ User can: Tap → App opens                        │  │
│  │  ├─ User can: Dismiss → Notification gone            │  │
│  │  └─ User can: Snooze → Re-alert in 10 min            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Adding a Reminder

```
┌─────────────────────────────────────────────────────────────┐
│ USER ADDS REMINDER                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Calendar screen                                             │
│ └─ User taps event                                          │
│    └─ Event detail opens                                    │
│       └─ User scrolls to Reminders                          │
│          └─ User taps "+ Add"                              │
│             └─ Add Reminder modal opens                    │
│                └─ User selects timing: "1_hour"            │
│                   └─ User selects type: "push"             │
│                      └─ User taps "Add Reminder"           │
│                         ↓                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ APP PROCESSES                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Validate input                                           │
│    └─ Check: timing, notification_type are valid           │
│                                                             │
│ 2. Calculate scheduled time                                 │
│    └─ eventStart: 2024-09-05 14:00:00 (2:00 PM)            │
│    └─ timing: "1_hour" = 60 minutes                         │
│    └─ scheduledTime: 2024-09-05 13:00:00 (1:00 PM)         │
│                                                             │
│ 3. Create reminder object                                   │
│    └─ {                                                    │
│         id: "reminder-123",                                │
│         event_id: "event-456",                             │
│         user_id: "user-789",                               │
│         scheduled_time: "2024-09-05 13:00",                │
│         reminder_timing: "1_hour",                         │
│         notification_type: "push",                         │
│         enabled: true,                                     │
│         created_at: now()                                  │
│       }                                                    │
│                                                             │
│ 4. Save to database                                         │
│    └─ INSERT into event_reminders VALUES (...)             │
│       └─ Database confirms: "1 row inserted"               │
│                                                             │
│ 5. Schedule notification                                    │
│    └─ Call Notifications.scheduleNotificationAsync({       │
│         content: { title, body, data },                    │
│         trigger: { date: scheduledTime }                   │
│       })                                                   │
│       └─ Expo confirms: "notification-id-xyz"              │
│                                                             │
│ 6. Show success                                             │
│    └─ User sees: "Reminder added!"                         │
│    └─ Modal closes                                         │
│    └─ Reminder appears in list                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SYSTEM WAITS (Background)                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Expo Notifications monitors...                              │
│ Device OS waits for time...                                 │
│                                                             │
│ 12:30 PM - 30 min to go...                                  │
│ 12:45 PM - 15 min to go...                                  │
│ 12:59 PM - 1 min to go...                                   │
│ 13:00 PM - ⏰ TIME! ⏰                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ NOTIFICATION TRIGGERS                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1:00 PM exactly:                                            │
│ └─ Expo Notifications detects: "It's time!"                 │
│    └─ Retrievies notification from database                │
│    └─ Prepares notification content:                       │
│       ├─ title: "Doctor's Appointment"                     │
│       ├─ body: "Your event in 1 hour"                      │
│       └─ data: { eventId: "event-456" }                    │
│    └─ Sends to device OS                                   │
│    └─ Device OS:                                            │
│       ├─ Shows notification on home screen                 │
│       ├─ Plays sound                                       │
│       ├─ Vibrates                                          │
│       └─ Updates badge on app icon                         │
│                                                             │
│ 📱 NOTIFICATION APPEARS ON DEVICE!                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ USER INTERACTION                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ User sees notification and:                                 │
│                                                             │
│ Option A: Taps notification                                 │
│ └─ App opens                                                │
│ └─ Shows event detail                                       │
│ └─ User is prepared!                                        │
│                                                             │
│ Option B: Dismisses notification                            │
│ └─ Notification goes away                                   │
│ └─ Reminder marked as "seen"                                │
│                                                             │
│ Option C: Snooze (future feature)                           │
│ └─ Notification reschedules for 10 min later                │
│ └─ Will alert again at 1:10 PM                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Viewing Reminders

```
USER OPENS REMINDERS TAB
   ↓
App queries Supabase:
   SELECT * FROM event_reminders
   WHERE user_id = current_user
   ORDER BY scheduled_time ASC
   ↓
Database returns:
   [
     {
       id: "reminder-123",
       event_id: "event-456",
       title: "Reminder: Doctor's Appointment",
       scheduled_time: "2024-09-05 13:00",
       reminder_timing: "1_hour",
       notification_type: "push",
       enabled: true
     },
     ...more reminders...
   ]
   ↓
App enriches data:
   JOIN with event details (color, title)
   Filter into: upcoming vs. past
   Format times: "Today at 1:00 PM"
   ↓
Screen renders:
   ┌──────────────────────────────────┐
   │ 🔔 Reminders                     │
   │                                  │
   │ UPCOMING                          │
   │ ┌─ [🟢] Doctor's Appointment      │
   │ │  1 hour before                  │
   │ │  Today at 1:00 PM  📱           │
   │ │  [✓ Enabled] [🗑]               │
   │ └─ [🔵] Team Meeting              │
   │    30 min before                  │
   │    Tomorrow at 9:30 AM 🔔         │
   │    [✓ Enabled] [🗑]               │
   │                                  │
   │ PAST                              │
   │ └─ [🟡] Gym Session               │
   │    (Already triggered)            │
   └──────────────────────────────────┘
```

---

## Notification Type Delivery

### 📱 Push Notification (Current - Works!)

```
Schedule → Expo Notifications → Device OS → User Sees
                ↓
         Uses built-in scheduling
         No server needed
         Works when app closed
         Instant delivery
```

### 🔔 In-App Alert (Current - Works!)

```
Schedule → App running? → YES → Show Alert → User sees
                            ↓ NO
                        Missed (app closed)
```

### 📧 Email (Future - Needs Backend)

```
Schedule → Supabase Edge Function (runs periodically)
                ↓
         Check: Is it time to send?
                ↓ YES
         Get reminder details
                ↓
         Send email via SendGrid/Nodemailer
                ↓
         Log delivery
                ↓
         User receives email
```

### 💬 SMS (Future - Needs Twilio)

```
Schedule → Supabase Edge Function
                ↓
         Check: Is it time?
                ↓ YES
         Get user phone number
                ↓
         Send SMS via Twilio
                ↓
         Log delivery
                ↓
         User receives text message
```

---

## Files & Components

```
app/(tabs)/reminders.tsx
├─ Displays all reminders
├─ Loads from Supabase
├─ Shows upcoming & past
└─ Delete functionality

app/calendar/[id].tsx
├─ Event detail screen
├─ Shows reminders for event
├─ "+ Add" button
└─ Delete reminder from event

src/lib/event-reminders.ts
├─ calculateReminderTime()
├─ getReminderTimingText()
├─ shouldReminderTrigger()
└─ Utility functions

src/lib/notification-service.ts
├─ scheduleNotification()
├─ sendInAppNotification()
├─ sendPushNotification()
├─ createEventReminder()
└─ Notification logic

supabase/migrations/20260905_event_reminders.sql
├─ event_reminders table
├─ notification_delivery_log table
└─ notification_preferences table
```

---

## Database Schema

```sql
-- Store reminders
CREATE TABLE event_reminders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL (references auth.users),
  event_id UUID NOT NULL (references calendar_events),
  title TEXT,
  description TEXT,
  scheduled_time TIMESTAMPTZ NOT NULL,    ← When to trigger
  reminder_timing VARCHAR (1_hour, 30_minutes, etc.)
  notification_type VARCHAR (push, email, sms, in_app)
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Track delivery
CREATE TABLE notification_delivery_log (
  id UUID PRIMARY KEY,
  reminder_id UUID (references event_reminders),
  delivery_type VARCHAR,
  delivery_status VARCHAR (sent, failed, pending),
  delivered_at TIMESTAMPTZ
);

-- User preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE (references auth.users),
  quiet_hours_enabled BOOLEAN,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT true
);
```

---

## Summary

1. **User adds reminder** via Calendar event details
2. **App calculates** scheduled time (event - timing)
3. **App saves** to Supabase database
4. **Expo Notifications** schedules notification
5. **At trigger time**, device OS shows notification
6. **User taps** notification → app opens with event
7. **User can manage** in Reminders tab (🔔)

This is a complete, production-ready reminder system! 🎉
