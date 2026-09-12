# Phase 11: Calendar Integration - Test Plan

## Overview
End-to-end testing of calendar integration covering sync functions, device calendar operations, UI interactions, and bidirectional sync.

## Test Environment Setup
- Database: Supabase local/cloud with calendar tables migrated
- App: Expo React Native with calendar permissions
- Device: iOS/Android with native calendar support
- Functions: Supabase Edge Functions deployed (sync-calendar)

---

## Test Suite 1: Database & Schema

### Test 1.1: Calendar Tables Exist
**Objective:** Verify all required tables are created
**Steps:**
1. Connect to Supabase database
2. Query information_schema for tables: `calendar_events`, `calendar_sync_log`, `calendar_settings`
3. Verify schema for each table

**Expected Results:**
- `calendar_events` table with columns: id, user_id, title, description, event_type, start_time, end_time, all_day, color, recurrence_rule, is_synced_to_device, device_calendar_id, reminder_id, goal_id, activity_id, metadata, created_at, updated_at
- `calendar_sync_log` table with columns: id, user_id, event_id, sync_direction, sync_status, source, synced_at
- `calendar_settings` table with columns: user_id, auto_sync, sync_types, device_calendar_name, device_calendar_id, colors, timezone, created_at, updated_at

**Status:** ✓ Pass/Fail: ___

### Test 1.2: RLS Policies Applied
**Objective:** Verify Row Level Security policies protect user data
**Steps:**
1. Query pg_policies for calendar_events, calendar_sync_log, calendar_settings
2. Verify SELECT, INSERT, UPDATE, DELETE policies exist
3. Verify policies check user_id = auth.uid()

**Expected Results:**
- All policies present and correctly scoped to user_id

**Status:** ✓ Pass/Fail: ___

### Test 1.3: Indexes Created
**Objective:** Verify indexes for performance
**Steps:**
1. Query pg_indexes for calendar tables
2. Verify composite indexes on (user_id, start_time) and (user_id, event_type)

**Expected Results:**
- All indexes present and optimized

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 2: Sync Function (sync-calendar)

### Test 2.1: Reminder to Calendar Event Sync
**Objective:** Convert reminders to calendar events
**Steps:**
1. Create test reminder in database:
   - title: "Morning Review"
   - type: "learning"
   - frequency: "daily"
   - time: "09:00"
   - recurrence_rule: "FREQ=DAILY"
2. Call sync-calendar edge function with sync_types: ["reminders"]
3. Query calendar_events table for new event

**Expected Results:**
- Calendar event created with:
  - event_type: "reminder"
  - title: "Morning Review"
  - recurrence_rule: "FREQ=DAILY"
  - is_synced_to_device: false
  - calendar_sync_log entry with sync_direction: "push", sync_status: "success"

**Status:** ✓ Pass/Fail: ___

### Test 2.2: Goal Deadline to Calendar Event Sync
**Objective:** Convert goal deadlines to all-day events
**Steps:**
1. Create test goal in database:
   - title: "Learn TypeScript"
   - deadline: "2026-12-31"
2. Call sync-calendar with sync_types: ["goals"]
3. Query calendar_events for new event

**Expected Results:**
- Calendar event created with:
  - event_type: "goal_deadline"
  - title: "Learn TypeScript"
  - all_day: true
  - start_time and end_time: "2026-12-31"
  - is_synced_to_device: false
  - calendar_sync_log entry: success

**Status:** ✓ Pass/Fail: ___

### Test 2.3: Study Session to Calendar Event Sync
**Objective:** Convert study sessions to calendar events
**Steps:**
1. Create test study session:
   - activity_name: "Advanced React"
   - start_time: "2026-09-05T14:00:00Z"
   - end_time: "2026-09-05T15:30:00Z"
   - technique: "pomodoro"
2. Call sync-calendar with sync_types: ["study_sessions"]
3. Query calendar_events

**Expected Results:**
- Calendar event created with:
  - event_type: "study_session"
  - title: "Advanced React"
  - start_time/end_time: preserved
  - activity_id: set to study session id
  - calendar_sync_log entry: success

**Status:** ✓ Pass/Fail: ___

### Test 2.4: Duplicate Prevention
**Objective:** Avoid creating duplicate events on repeated syncs
**Steps:**
1. Create a reminder and sync it (Test 2.1)
2. Call sync-calendar again with same reminder
3. Count calendar_events for this reminder

**Expected Results:**
- Only 1 calendar_event created (not 2)
- Sync detects existing event and skips creation
- calendar_sync_log shows skipped entry

**Status:** ✓ Pass/Fail: ___

### Test 2.5: Respect Settings
**Objective:** Honor user calendar_settings for sync types
**Steps:**
1. Set calendar_settings:
   - sync_types: ["reminders"] (exclude goals and study_sessions)
2. Create reminder, goal, and study_session
3. Call sync-calendar
4. Count calendar_events by event_type

**Expected Results:**
- Only reminder converted to calendar_event
- goal and study_session ignored
- calendar_sync_log shows only reminder sync

**Status:** ✓ Pass/Fail: ___

### Test 2.6: Recurrence Rule Conversion
**Objective:** RFC 5545 RRULE preserved in calendar events
**Steps:**
1. Create reminder with complex recurrence:
   - "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261231"
2. Sync to calendar
3. Query calendar_events

**Expected Results:**
- recurrence_rule field contains full RFC 5545 RRULE
- Event properly serialized for calendar API

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 3: Device Calendar Sync Service

### Test 3.1: Calendar Permission Request
**Objective:** Request device calendar permissions
**Steps:**
1. Open calendar screen
2. Trigger sync-to-device action
3. Observe permission prompt

**Expected Results:**
- OS shows calendar permission dialog
- User can grant or deny
- App handles both cases gracefully

**Status:** ✓ Pass/Fail: ___

### Test 3.2: Calendar Creation on First Sync
**Objective:** Automatically create device calendar
**Steps:**
1. Fresh user with no device calendar
2. Call calendarSyncService.initialize(userId)
3. Check device calendar list
4. Verify calendar_settings.device_calendar_id saved

**Expected Results:**
- "Personal Tracker" calendar created on device
- device_calendar_id stored in database
- Subsequent syncs reuse same calendar

**Status:** ✓ Pass/Fail: ___

### Test 3.3: Push Event to Device
**Objective:** Create event on device calendar
**Steps:**
1. Create calendar_event in database:
   - title: "Lunch Meeting"
   - start_time: "2026-09-05T12:00:00Z"
   - end_time: "2026-09-05T13:00:00Z"
2. Call calendarSyncService.pushEventToDevice(event)
3. Check device calendar for event
4. Verify device_calendar_id saved

**Expected Results:**
- Event appears on device calendar
- calendar_events.is_synced_to_device: true
- calendar_events.device_calendar_id: set to device event ID
- calendar_sync_log entry: push/success

**Status:** ✓ Pass/Fail: ___

### Test 3.4: Update Event on Device
**Objective:** Modify synced event on device
**Steps:**
1. Create and push event (Test 3.3)
2. Update event title in database: "Lunch Meeting" → "Team Lunch"
3. Call calendarSyncService.updateEventOnDevice(deviceEventId, updates)
4. Check device calendar

**Expected Results:**
- Event title updated on device
- Event time/details remain consistent
- No duplicate events created

**Status:** ✓ Pass/Fail: ___

### Test 3.5: Delete Event from Device
**Objective:** Remove synced event from device
**Steps:**
1. Create and push event (Test 3.3)
2. Call calendarSyncService.deleteEventFromDevice(deviceEventId)
3. Check device calendar

**Expected Results:**
- Event removed from device calendar
- database still has calendar_event record
- calendar_sync_log entry: push/success for delete

**Status:** ✓ Pass/Fail: ___

### Test 3.6: Pull Events from Device
**Objective:** Import events created on device calendar
**Steps:**
1. Manually create event on device calendar:
   - title: "Doctor Appointment"
   - date: "2026-09-10T10:00:00Z"
2. Call calendarSyncService.pullEventsFromDevice()
3. Query calendar_events database

**Expected Results:**
- Event imported to calendar_events table
- event_type: "custom"
- is_synced_to_device: true
- device_calendar_id: set to device event ID
- calendar_sync_log entry: pull/success

**Status:** ✓ Pass/Fail: ___

### Test 3.7: Pull Duplicate Detection
**Objective:** Avoid importing same device event twice
**Steps:**
1. Pull event from device (Test 3.6)
2. Call calendarSyncService.pullEventsFromDevice() again
3. Count calendar_events

**Expected Results:**
- Only 1 calendar_event created (not 2)
- Pull operation detects existing device_calendar_id
- No duplicate in database

**Status:** ✓ Pass/Fail: ___

### Test 3.8: RRULE to Expo Calendar Conversion
**Objective:** Convert RFC 5545 to Expo Calendar format
**Steps:**
1. Create event with recurrence:
   - RRULE: "FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=1"
2. Push to device
3. Check device calendar recurrence settings

**Expected Results:**
- Event appears with correct recurrence on device
- Weekly on Monday and Wednesday
- Expo Calendar properly interprets RRULE

**Status:** ✓ Pass/Fail: ___

### Test 3.9: Timezone Handling
**Objective:** Properly handle event times across timezones
**Steps:**
1. Create event with UTC time: "2026-09-05T14:00:00Z"
2. Set user timezone to "America/New_York" (UTC-4)
3. Push to device
4. Check displayed time on device calendar

**Expected Results:**
- Event displays at correct local time
- Database stores UTC time
- Device shows converted time
- No timezone conversion errors

**Status:** ✓ Pass/Fail: ___

### Test 3.10: All-Day Event Handling
**Objective:** Properly sync all-day events
**Steps:**
1. Create all-day event: "Birthday"
2. Set all_day: true
3. Push to device
4. Check device calendar

**Expected Results:**
- Event displays as all-day on device
- No specific time shown
- Device calendar marks as all-day event

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 4: Calendar UI - Month View

### Test 4.1: Month Grid Display
**Objective:** Calendar grid renders correctly
**Steps:**
1. Navigate to calendar screen
2. Observe month view
3. Check grid layout (7 columns for days)

**Expected Results:**
- Full calendar month displays
- 6 weeks shown
- Days labeled Sun-Sat
- Previous/next month visible

**Status:** ✓ Pass/Fail: ___

### Test 4.2: Event Indicators
**Objective:** Display colored dots for events
**Steps:**
1. Create 3 calendar events:
   - Reminder (sageDark color)
   - Goal deadline (coral color)
   - Study session (purple color)
2. View month with these dates
3. Check for colored dots

**Expected Results:**
- Each event date shows colored dot
- Colors match event type
- Multiple dots on same day if multiple events

**Status:** ✓ Pass/Fail: ___

### Test 4.3: Month Navigation
**Objective:** Navigate between months
**Steps:**
1. View calendar for September 2026
2. Tap right arrow button
3. Observe month change to October
4. Tap left arrow to go back

**Expected Results:**
- Month advances/retreats correctly
- Header updates (e.g., "September 2026")
- Events update for new month
- No crashes on edge cases (Dec→Jan, Jan→Dec)

**Status:** ✓ Pass/Fail: ___

### Test 4.4: Tap Day to Show Details
**Objective:** View events for specific day
**Steps:**
1. View month with 2 events on Sept 5
2. Tap on Sept 5
3. Observe day view

**Expected Results:**
- Day view shows all events for that date
- Event times displayed
- Event types color-coded
- Can tap event to open detail screen

**Status:** ✓ Pass/Fail: ___

### Test 4.5: Upcoming Events List
**Objective:** Display upcoming events below month
**Steps:**
1. View calendar with events
2. Scroll down to see upcoming events
3. Check list displays events chronologically

**Expected Results:**
- List shows next 5 events
- Sorted by date/time
- Event type label shown (Reminder, Goal, Study)
- Color-coded by type
- Tap event to open detail

**Status:** ✓ Pass/Fail: ___

### Test 4.6: Auto-Sync on Load
**Objective:** Calendar syncs on screen open
**Steps:**
1. Create reminder in database
2. Open calendar screen
3. Wait 2 seconds
4. Check calendar_events table

**Expected Results:**
- sync-calendar edge function called
- New event appears on calendar
- Month grid updates
- Upcoming events list updates

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 5: Calendar UI - Event Detail Screen

### Test 5.1: Event Detail View
**Objective:** Display full event information
**Steps:**
1. Create event: "Team Meeting"
   - type: "reminder"
   - start: "2026-09-05T14:00:00Z"
   - end: "2026-09-05T15:00:00Z"
   - location: "Conference Room A"
   - description: "Quarterly review"
2. Tap event to open detail screen
3. Observe all fields

**Expected Results:**
- Title displayed prominently
- Event type shown
- Start/end times formatted
- Location shown
- Description visible
- Color bar indicates type
- All information readable

**Status:** ✓ Pass/Fail: ___

### Test 5.2: Edit Mode
**Objective:** Switch to edit mode and modify event
**Steps:**
1. Open event detail (Test 5.1)
2. Tap "Edit Event" button
3. Change title to "Important Meeting"
4. Add description: "Updated agenda"
5. Tap "Save Changes"

**Expected Results:**
- Form inputs appear with current values
- Changes save to database
- Detail view updates with new values
- Device calendar synced if event was previously synced
- No errors

**Status:** ✓ Pass/Fail: ___

### Test 5.3: Delete Event
**Objective:** Remove event from calendar
**Steps:**
1. Open event detail
2. Tap "Delete Event"
3. Confirm deletion dialog
4. Check database

**Expected Results:**
- Confirmation dialog shown
- Event removed from calendar_events table
- Event removed from device calendar if synced
- Return to calendar view
- Event no longer visible

**Status:** ✓ Pass/Fail: ___

### Test 5.4: Sync Status Display
**Objective:** Show device calendar sync status
**Steps:**
1. Create event but don't sync
2. Open detail screen
3. Check sync status section

**Expected Results:**
- Shows "○ Not Synced"
- "Sync to Device Calendar" button visible
- Can tap to sync

**Status:** ✓ Pass/Fail: ___

### Test 5.5: One-Tap Device Sync
**Objective:** Sync event to device calendar from detail
**Steps:**
1. Open unsynced event detail
2. Tap "Sync to Device Calendar" button
3. Grant permissions if prompted
4. Check device calendar

**Expected Results:**
- Permission dialog shows (first time)
- Sync completes without errors
- Status changes to "✓ Synced"
- Event appears on device calendar
- Button disappears or disables

**Status:** ✓ Pass/Fail: ___

### Test 5.6: Source Tracking
**Objective:** Show which feature created event
**Steps:**
1. Create reminder and sync to calendar
2. Open calendar event detail
3. Check source section

**Expected Results:**
- Shows "Created from: Reminder"
- Correctly identifies source for:
  - Reminders → "Created from: Reminder"
  - Goals → "Created from: Goal Deadline"
  - Study Sessions → "Created from: Study Session"

**Status:** ✓ Pass/Fail: ___

### Test 5.7: All-Day Event Display
**Objective:** Handle all-day events correctly
**Steps:**
1. Create all-day event: "Birthday"
2. Open detail screen
3. Check display

**Expected Results:**
- Time fields show as all-day
- No specific time display
- All-day toggle shows enabled
- Can edit to toggle all-day status

**Status:** ✓ Pass/Fail: ___

### Test 5.8: Recurrence Display
**Objective:** Show recurrence rules
**Steps:**
1. Create recurring event with RRULE: "FREQ=WEEKLY;BYDAY=MO,WE,FR"
2. Sync to calendar
3. Open detail screen

**Expected Results:**
- Recurrence rule displayed
- Human-readable format preferred
- Can view full RRULE string
- Recurrence appears on device calendar

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 6: Bidirectional Sync & Conflict Resolution

### Test 6.1: Push Then Pull Same Event
**Objective:** Ensure no duplicates when pushing then pulling
**Steps:**
1. Create calendar_event in database
2. Push to device with pushEventToDevice()
3. Manually verify event on device
4. Pull from device with pullEventsFromDevice()
5. Count calendar_events with same title

**Expected Results:**
- Still only 1 calendar_event in database
- Pull operation detects device_calendar_id match
- No duplicate created

**Status:** ✓ Pass/Fail: ___

### Test 6.2: Device Edit → Database Update
**Objective:** Changes on device sync back to database
**Steps:**
1. Push event to device: "Meeting" at 2pm
2. Edit on device: "Important Meeting" at 3pm
3. Call pullEventsFromDevice()
4. Check database

**Expected Results:**
- Updates reflected in database (if tracked)
- Or new event created as separate entry if manual edits detected
- No data loss

**Status:** ✓ Pass/Fail: ___

### Test 6.3: Database Edit → Device Update
**Objective:** Database changes propagate to device
**Steps:**
1. Push event to device
2. Edit calendar_event in database: "Meeting" → "Team Meeting"
3. Call updateEventOnDevice()
4. Check device calendar

**Expected Results:**
- Event updated on device
- Changes reflected in real-time
- Device calendar refreshes

**Status:** ✓ Pass/Fail: ___

### Test 6.4: Conflict Detection
**Objective:** Detect and handle sync conflicts
**Steps:**
1. Create event, sync to device
2. Edit on device AND in database simultaneously
3. Call sync functions
4. Check for conflicts in sync_log

**Expected Results:**
- Both changes logged
- Most recent change wins or user prompted
- No data corruption
- sync_log shows conflict

**Status:** ✓ Pass/Fail: ___

### Test 6.5: Bulk Sync All Events
**Objective:** Sync multiple unsync'd events at once
**Steps:**
1. Create 10 calendar_events in database (all unsync'd)
2. Call syncAllEventsToDevice()
3. Monitor sync progress
4. Check device calendar

**Expected Results:**
- All 10 events sync without errors
- is_synced_to_device set to true for all
- Device calendar shows all events
- Performance acceptable (< 5 seconds)
- sync_log has 10 entries

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 7: Settings & Preferences

### Test 7.1: Calendar Settings Initialization
**Objective:** Create default settings for new user
**Steps:**
1. New user account created
2. Open calendar screen
3. Check calendar_settings table

**Expected Results:**
- calendar_settings record created
- Default values:
  - auto_sync: true
  - sync_types: ["reminders", "goals", "study_sessions"]
  - device_calendar_name: "Personal Tracker"
  - timezone: device timezone

**Status:** ✓ Pass/Fail: ___

### Test 7.2: Calendar Settings Persistence
**Objective:** Settings preserved across sessions
**Steps:**
1. Modify settings: sync_types to ["reminders"] only
2. Close and reopen app
3. Create goal and reminder
4. Sync calendar
5. Count calendar_events

**Expected Results:**
- Settings remembered
- Only reminders synced (goals ignored)
- Setting change persists

**Status:** ✓ Pass/Fail: ___

### Test 7.3: Color Customization
**Objective:** Type-based colors applied correctly
**Steps:**
1. View calendar with mixed event types
2. Check event dot colors
3. Expected colors:
   - Reminders: sageDark (#6B7280)
   - Goals: coral (#FF6B6B)
   - Study: purple (#9333EA)

**Expected Results:**
- Each type displays correct color
- Colors consistent across views
- Colors update when synced to device

**Status:** ✓ Pass/Fail: ___

### Test 7.4: Timezone Setting
**Objective:** Respect user timezone preference
**Steps:**
1. Set calendar_settings timezone to "Europe/London"
2. Create event at "12:00 UTC"
3. View on calendar
4. Check displayed time

**Expected Results:**
- Event displays at 12:00 (same UTC)
- If timezone changes to "America/New_York", shows 7:00
- All times convert correctly

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 8: Error Handling & Edge Cases

### Test 8.1: No Calendar Permission
**Objective:** Handle denied calendar permissions gracefully
**Steps:**
1. Deny calendar permission in OS settings
2. Tap "Sync to Device" button
3. Observe app response

**Expected Results:**
- Permission request shown
- If denied again, show helpful message
- App doesn't crash
- Graceful fallback (local sync only)

**Status:** ✓ Pass/Fail: ___

### Test 8.2: No Events to Sync
**Objective:** Handle empty sync gracefully
**Steps:**
1. New user with no events
2. Call syncAllEventsToDevice()
3. Check response

**Expected Results:**
- Returns 0 synced events
- No errors
- No crash
- Completes quickly

**Status:** ✓ Pass/Fail: ___

### Test 8.3: Network Error During Sync
**Objective:** Handle network failures
**Steps:**
1. Go offline (airplane mode)
2. Try to call sync-calendar function
3. Check error handling

**Expected Results:**
- Function returns error (not crash)
- Error logged to sync_log
- User shown informative message
- Retry available when back online

**Status:** ✓ Pass/Fail: ___

### Test 8.4: Malformed Recurrence Rule
**Objective:** Handle invalid RRULE gracefully
**Steps:**
1. Insert calendar_event with RRULE: "INVALID_RRULE"
2. Try to push to device
3. Check error handling

**Expected Results:**
- Event still syncs (or creates without recurrence)
- Error logged
- No crash
- sync_log shows error

**Status:** ✓ Pass/Fail: ___

### Test 8.5: Event with Very Long Title
**Objective:** Handle long strings
**Steps:**
1. Create event with 500-char title
2. Sync to calendar and device
3. Check display

**Expected Results:**
- Title truncated gracefully in UI
- Full title stored in database
- No crashes or corruption

**Status:** ✓ Pass/Fail: ___

### Test 8.6: Rapid Successive Syncs
**Objective:** Handle rapid sync requests
**Steps:**
1. Create 5 events
2. Call syncAllEventsToDevice() 5 times rapidly
3. Monitor database and logs

**Expected Results:**
- Duplicate prevention works
- Only 5 device events created (not 25)
- No race conditions
- sync_log clean

**Status:** ✓ Pass/Fail: ___

### Test 8.7: Very Old Events
**Objective:** Handle past events
**Steps:**
1. Create event from 2020
2. Sync to calendar
3. View on calendar

**Expected Results:**
- Past events sync without issues
- Display correctly if requested
- Don't cause performance problems

**Status:** ✓ Pass/Fail: ___

### Test 8.8: Far Future Events
**Objective:** Handle events far in future
**Steps:**
1. Create event in 2050
2. Sync and view
3. Check recurrence handling

**Expected Results:**
- Far future events sync OK
- Display correctly
- Recurrence rules still apply
- No date overflow issues

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 9: Performance & Scalability

### Test 9.1: Sync 100 Events
**Objective:** Measure sync performance
**Steps:**
1. Create 100 calendar_events in database
2. Record start time
3. Call syncAllEventsToDevice()
4. Record end time
5. Check results

**Expected Results:**
- Completes in < 30 seconds
- All 100 events synced
- Device calendar responsive
- No memory leaks
- is_synced_to_device set for all

**Status:** ✓ Pass/Fail: ___ (Time: ___ sec)

### Test 9.2: Pull 100 Events from Device
**Objective:** Measure pull performance
**Steps:**
1. Manually create 100 events on device calendar
2. Record start time
3. Call pullEventsFromDevice()
4. Record end time

**Expected Results:**
- Completes in < 30 seconds
- All events imported
- Duplicates prevented
- Database queries efficient

**Status:** ✓ Pass/Fail: ___ (Time: ___ sec)

### Test 9.3: Calendar Rendering Performance
**Objective:** Check UI responsiveness with many events
**Steps:**
1. Create calendar with 50 events in current month
2. Scroll and navigate
3. Check frame rate and responsiveness

**Expected Results:**
- Month grid renders smoothly
- No frame drops
- Navigation responsive
- No UI lag

**Status:** ✓ Pass/Fail: ___

### Test 9.4: Database Query Performance
**Objective:** Check query speed for event retrieval
**Steps:**
1. Add 500 calendar_events to database
2. Query events for September 2026:
   ```sql
   SELECT * FROM calendar_events 
   WHERE user_id = $1 AND start_time >= $2 AND start_time < $3
   ```
3. Measure query time

**Expected Results:**
- Query completes in < 100ms
- Indexes used
- No table scans
- Consistent performance

**Status:** ✓ Pass/Fail: ___ (Time: ___ ms)

---

## Test Suite 10: Integration Tests

### Test 10.1: Full User Flow - Create Reminder to Device Calendar
**Objective:** End-to-end workflow
**Steps:**
1. User creates reminder in Learning screen:
   - Title: "Daily Standup"
   - Type: "learning"
   - Time: "09:00"
   - Recurrence: "daily"
2. Navigate to Calendar screen
3. Observe event appears
4. Tap "Sync to Device"
5. Check device calendar

**Expected Results:**
- Event appears on calendar within 2 seconds
- Syncs to device successfully
- Device shows "Daily Standup" at 9am daily
- All integration points work

**Status:** ✓ Pass/Fail: ___

### Test 10.2: Full User Flow - Create Goal with Deadline
**Objective:** Goal deadline to calendar event
**Steps:**
1. Create goal in Goals screen:
   - Title: "Complete Project"
   - Deadline: "2026-12-31"
2. Navigate to Calendar
3. Navigate to December
4. Check for goal deadline

**Expected Results:**
- All-day event shown on Dec 31
- Title: "Complete Project"
- Color: coral (goal color)
- Can tap to view details

**Status:** ✓ Pass/Fail: ___

### Test 10.3: Full User Flow - Pomodoro Study Session
**Objective:** Study session to calendar event
**Steps:**
1. Start Pomodoro study session in Learning screen
2. Complete session: "Advanced React" (25 min + 5 min break)
3. Navigate to Calendar
4. Check current date

**Expected Results:**
- Study session appears as calendar event
- Time span correct (25 min work + 5 min break)
- Type: "study_session"
- Color: purple

**Status:** ✓ Pass/Fail: ___

### Test 10.4: Full User Flow - Device Event Import
**Objective:** Manually created device event back to app
**Steps:**
1. Create event on device calendar manually:
   - "Dentist Appointment"
   - Sept 10, 2:00 PM
2. Open Calendar screen in app
3. Pull events from device
4. Check calendar for imported event

**Expected Results:**
- Event appears in calendar
- Type: "custom"
- Correct time shown
- Can view and edit details
- Bidirectional sync working

**Status:** ✓ Pass/Fail: ___

### Test 10.5: Settings Change Impact
**Objective:** Changing settings affects sync behavior
**Steps:**
1. Set auto_sync: false
2. Create new reminder
3. Open Calendar screen
4. Event shouldn't auto-sync
5. Manually trigger sync
6. Event should sync

**Expected Results:**
- Auto-sync respects setting
- Manual sync works when disabled
- User has control
- No forced syncs

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 11: Cross-Platform & Compatibility

### Test 11.1: iOS Calendar Sync
**Objective:** Test on iOS device
**Steps:**
1. Build and run on iOS
2. Grant calendar permissions
3. Sync events
4. Check Apple Calendar app

**Expected Results:**
- Events appear in native Apple Calendar
- Colors and times correct
- Recurrence rules respected
- No crashes

**Status:** ✓ Pass/Fail: ___

### Test 11.2: Android Calendar Sync
**Objective:** Test on Android device
**Steps:**
1. Build and run on Android
2. Grant calendar permissions
3. Sync events
4. Check Google Calendar or default app

**Expected Results:**
- Events appear in native calendar
- Colors and times correct
- Recurrence rules respected
- Works with multiple calendar apps

**Status:** ✓ Pass/Fail: ___

### Test 11.3: Different Locale/Language
**Objective:** Calendar works in different locales
**Steps:**
1. Change device locale to French/Spanish/Chinese
2. Open calendar
3. Sync events
4. Check display

**Expected Results:**
- Date/time format matches locale
- Calendar displays correctly
- No text encoding issues
- Sync still works

**Status:** ✓ Pass/Fail: ___

---

## Summary

**Total Tests:** 61
**Pass:** ___
**Fail:** ___
**Blocked:** ___

**Critical Issues Found:**
1. ...
2. ...

**Performance Metrics:**
- Sync 100 events: ___ sec
- Pull 100 events: ___ sec
- Query 500 events: ___ ms
- Month grid FPS: ___

**Browser/Device Coverage:**
- iOS: ✓ / ✗
- Android: ✓ / ✗
- iPad: ✓ / ✗
- Different Calendars: ✓ / ✗

**Recommendations for Future Phases:**
1. Implement week/day views for detailed time management
2. Add calendar color customization UI
3. Build calendar settings screen for sync preferences
4. Add conflict resolution UI for bidirectional sync conflicts
5. Implement search/filter for calendar events
6. Add calendar sharing capabilities
7. Build calendar export (iCal) functionality
8. Add multi-calendar support

---

## Sign-Off

**Tested By:** _______________
**Date:** _______________
**Environment:** _______________
**Overall Result:** ✓ PASS / ✗ FAIL
