# 📅 How to Create Events and Add Notifications

**Status:** ✅ COMPLETE  
**Date:** September 5, 2026

---

## Complete Workflow: From Event to Notification

### Step 1: Create an Event

**Navigate to Calendar**
```
Home screen → Any navigation button 
  ↓
Find Calendar (or go directly to Calendar)
```

**Tap "+ Create" Button**
```
Calendar screen has a "+ Create" button at the top right
  ↓
Tap it
  ↓
Create Event screen opens
```

**Fill in Event Details**
```
┌─────────────────────────────┐
│ Create Event                │
│                             │
│ Event Title *               │
│ [Doctor's Appointment___]   │
│                             │
│ Date                        │
│ [2026-09-06________________]│
│                             │
│ Start Time    End Time      │
│ [14:00      ] [14:30     ]  │
│                             │
│ Event Type                  │
│ [Appointment] Personal Work │
│                             │
│ Color                       │
│ [🔵] [🔴] [🟡] [🟢] [🟣]   │
│                             │
│ Description                 │
│ [Regular checkup___________]│
│                             │
│ Location                    │
│ [Downtown Medical Center__]│
│                             │
│ [Cancel] [Create Event]     │
└─────────────────────────────┘
```

**Details to Fill:**

| Field | Required? | Example |
|-------|-----------|---------|
| **Event Title** | ✓ Yes | "Doctor's Appointment" |
| **Date** | Optional | 2026-09-06 |
| **Start Time** | Optional | 14:00 (2 PM) |
| **End Time** | Optional | 14:30 (2:30 PM) |
| **Event Type** | Optional | Appointment, Meeting, Personal |
| **Color** | Optional | Blue, Red, Green, etc. |
| **Description** | Optional | "Regular checkup" |
| **Location** | Optional | "Downtown Medical Center" |

**Tap "Create Event"**
```
Event created! ✅
  ↓
Automatically opens event detail screen
```

---

### Step 2: View Event Details

**Event Details Screen Opens**
```
‹ Back

Doctor's Appointment
appointment

DETAILS
Start: Sep 6, 2026, 2:00 PM
End: Sep 6, 2026, 2:30 PM
Location: Downtown Medical Center

DESCRIPTION
Regular checkup

NOTIFICATIONS
+ Add notification

[✎ Edit] [🗑 Delete]
```

---

### Step 3: Add Notifications

**Scroll to "NOTIFICATIONS" Section**
```
You'll see:
NOTIFICATIONS
+ Add notification
```

**Tap "+ Add notification"**
```
Modal appears from bottom:
┌────────────────────────────┐
│ ✕    Add notification      │
│                            │
│ When to notify             │
│  At time of event          │
│  5 minutes before          │
│  10 minutes before         │
│  15 minutes before   ✓     │
│  30 minutes before         │
│  1 hour before             │
│  1 day before              │
│                            │
│ How to notify              │
│  🔔 Notification     ✓     │
│  📧 Email                  │
│                            │
│ [Cancel] [Add]             │
└────────────────────────────┘
```

**Choose Timing**
- Tap any time option
- Shows checkmark when selected
- Default: "15 minutes before"

**Choose Notification Type**
- 🔔 **Notification** = Push notification (appears on phone)
- 📧 **Email** = Email notification

**Tap "Add"**
```
Notification added! ✅
Modal closes
Returns to event details
```

---

## Complete Example: Doctor's Appointment

### Creating the Event

```
STEP 1: Calendar → Tap "+ Create"
STEP 2: Fill in:
  Title: Doctor's Appointment
  Date: Tomorrow (2026-09-06)
  Start: 14:00 (2 PM)
  End: 14:30
  Type: Appointment
  Color: Blue
  Location: Downtown Medical Center
STEP 3: Tap "Create Event" ✅
```

### Adding Notifications

```
STEP 1: Event opens automatically
STEP 2: Scroll to NOTIFICATIONS
STEP 3: Tap "+ Add notification"
  
First notification:
  When: 1 day before
  How: 📧 Email
  Tap "Add" ✅

Second notification:
  When: 1 hour before
  How: 🔔 Notification
  Tap "Add" ✅

Third notification:
  When: 15 minutes before
  How: 🔔 Notification
  Tap "Add" ✅
```

### Result

```
Event Details:
Doctor's Appointment
Tomorrow 2:00 PM

NOTIFICATIONS
🔔 15 minutes before
📧 1 day before
🔔 1 hour before
+ Add notification

You'll be notified:
  Tomorrow at 2:00 PM (same time): Email
  Tomorrow at 1:00 PM: Push notification
  Tomorrow at 1:45 PM: Push notification
```

---

## Quick Reference: Event Creation

### Required Fields
- **Event Title** - What's the event called?

### Optional Fields
- Date - When?
- Start/End Times - What hours?
- Event Type - Category? (Appointment, Meeting, etc.)
- Color - Visual color?
- Description - Notes?
- Location - Where?

### Default Values
- Date: Today
- Start Time: 10:00 AM
- End Time: 11:00 AM (1 hour after start)
- Event Type: Meeting
- Color: Blue

---

## Quick Reference: Notifications

### When to Notify Options
- At time of event
- 5 minutes before
- 10 minutes before
- 15 minutes before
- 30 minutes before
- 1 hour before
- 1 day before

### How to Notify Options
- 🔔 Notification (push alert)
- 📧 Email

### Best Practices
- **Important meeting:** 15 min before + 1 hour before
- **Flight:** 1 day before + 2 hours before
- **Doctor:** 1 day before + 15 min before
- **Birthday:** 1 day before (email)

---

## Complete Flow Diagram

```
┌──────────────────┐
│ Home Screen      │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Calendar Tab     │
│                  │
│ + Create ← TAP   │
└────────┬─────────┘
         │
         ↓
┌────────────────────────┐
│ Create Event Screen    │
│                        │
│ Fill:                  │
│  - Title (required)    │
│  - Date, Time          │
│  - Type, Color         │
│  - Description         │
│  - Location            │
│                        │
│ [Create Event]         │
└────────┬───────────────┘
         │
         ↓
┌────────────────────────┐
│ Event Details Screen   │
│                        │
│ Shows event info       │
│                        │
│ NOTIFICATIONS          │
│ + Add notification ← TAP
└────────┬───────────────┘
         │
         ↓
┌────────────────────────┐
│ Add Notification Modal │
│                        │
│ When to notify?        │
│ (Pick one)             │
│                        │
│ How to notify?         │
│ (Pick one)             │
│                        │
│ [Add]                  │
└────────┬───────────────┘
         │
         ↓
┌────────────────────────┐
│ ✅ Notification Added  │
│                        │
│ Shows in event details │
│ Can add more or save   │
└────────────────────────┘
```

---

## Troubleshooting

### "Can't find + Create button"
**Solution:** 
- Tap Calendar tab/go to Calendar screen
- Look at top right of screen
- "+ Create" button is there
- Tap it to create an event

### "Event title is required"
**Solution:**
- Type something in "Event Title" field
- Can be anything: "Meeting", "Lunch", "Study", etc.

### "Can't find Notifications section"
**Solution:**
- After creating event, scroll DOWN
- "NOTIFICATIONS" section is below event details
- Tap "+ Add notification" button

### "Notification not appearing"
**Solution:**
- Make sure you tapped "Add" button
- Check event details again - scroll to NOTIFICATIONS
- Notification should appear in the list

### "Want to delete a notification"
**Solution:**
- In event details, scroll to NOTIFICATIONS
- Tap the ✕ on the notification you want to remove
- Confirm deletion

---

## Tips & Tricks

### Tip 1: Multiple Notifications
Add different types for one event:
- Email reminder early (1 day before)
- Push notification closer to time (1 hour before)
- Final alert (15 minutes before)

### Tip 2: Reuse Event Types
Choose from pre-made types or create your own:
- Appointment → Medical, Business
- Meeting → Work, Personal
- Other → Birthday, Task

### Tip 3: Color Coding
Use colors to quickly identify event types:
- Blue = Meetings
- Red = Appointments
- Green = Personal
- Purple = Study

### Tip 4: Quick Events
Create simple events fast:
- Title only (minimum required)
- Time/date auto-fill
- Add details later by editing

---

## What You Can Do Now

✅ **Create events** with all details  
✅ **Add multiple notifications** per event  
✅ **Choose notification timing** (7 options)  
✅ **Choose notification type** (push or email)  
✅ **View all event details** in one place  
✅ **Edit events** (tap ✎ Edit button)  
✅ **Delete events** (tap 🗑 Delete button)  
✅ **Delete notifications** (tap ✕ on notification)  

---

## Complete Workflow Summary

```
1. Open Calendar
2. Tap "+ Create" button
3. Fill event details
   (only Title is required)
4. Tap "Create Event"
5. Event details open automatically
6. Scroll to "NOTIFICATIONS"
7. Tap "+ Add notification"
8. Choose timing (when)
9. Choose type (how)
10. Tap "Add"
11. ✅ Done!
    Notification added to event
    Will trigger at scheduled time
```

---

## Next Steps

1. **Create your first event** - Try the "+ Create" button
2. **Add notifications** - Follow the 11-step workflow above
3. **View results** - Check event details to see notifications
4. **Add more events** - Repeat process for other events

---

## That's It!

You can now:
- ✅ Create events
- ✅ Add notifications
- ✅ Get alerts at scheduled times
- ✅ Never miss important events!

**Try it out now!** 🎉
