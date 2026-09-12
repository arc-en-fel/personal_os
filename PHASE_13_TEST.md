# Phase 13: Calendar Events Management - Test Plan

## Overview
End-to-end testing of calendar event management features including drag-and-drop, recurring events, reminders, sharing, and bulk operations.

## Test Environment Setup
- Database: Supabase with all Phase 13 migrations
- App: Expo React Native with event management features
- Device: iOS/Android with notification support
- Libraries: rrule (recurrence), expo-notifications

---

## Test Suite 1: Drag-and-Drop Event Rescheduling

### Test 1.1: Drag Event Within Same Day
**Objective:** Reschedule event by dragging
**Steps:**
1. Create event: "Team Meeting" 2pm-3pm
2. Switch to week view
3. Drag event down 2 hours (to 4pm-5pm)
4. Verify new time in database

**Expected Results:**
- Event moves to 4pm-5pm
- Start and end times updated
- Event appears at new position on calendar
- Undo available

**Status:** ✓ Pass/Fail: ___

### Test 1.2: Detect Time Conflict During Drag
**Objective:** Warn about conflicts
**Steps:**
1. Create events: 2pm-3pm "Meeting A", 4pm-5pm "Meeting B"
2. Drag "Meeting B" to 2:30pm
3. Observe conflict detection

**Expected Results:**
- Conflict dialog shown
- Suggests alternative time
- User can accept alternative or cancel
- Original event unchanged if cancelled

**Status:** ✓ Pass/Fail: ___

### Test 1.3: Drag Event to Device Calendar
**Objective:** Sync changes to device
**Steps:**
1. Create event synced to device
2. Drag to new time
3. Check device calendar

**Expected Results:**
- Device calendar updated
- Time matches new dragged time
- Notification log records change

**Status:** ✓ Pass/Fail: ___

### Test 1.4: Undo Drag Operation
**Objective:** Revert drag action
**Steps:**
1. Drag event from 2pm to 4pm
2. Click "Undo Last Move" button
3. Verify event returns to 2pm

**Expected Results:**
- Event time reverts
- Calendar view updates
- Multiple undos work sequentially

**Status:** ✓ Pass/Fail: ___

### Test 1.5: Validation: Business Hours
**Objective:** Prevent events outside 6am-10pm
**Steps:**
1. Try dragging event to 11pm-12am
2. Try dragging event to 4am-5am

**Expected Results:**
- Both rejected
- Error message shown
- Event stays at original time

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 2: Recurring Event Instance Editing

### Test 2.1: Edit Single Instance
**Objective:** Modify one occurrence
**Steps:**
1. Create recurring event: "Daily Standup" 9am daily
2. Find next Monday's occurrence
3. Edit title to "Monday Standup Special"
4. Select "Edit this event only"

**Expected Results:**
- Only Monday event modified
- Future occurrences unchanged
- Exception record created in database
- Other instances show original title

**Status:** ✓ Pass/Fail: ___

### Test 2.2: Edit This and Following
**Objective:** Modify series from point forward
**Steps:**
1. Recurring event with 10 future occurrences
2. Edit 5th occurrence
3. Change title to "New Series"
4. Select "This and following events"

**Expected Results:**
- Event 5-10 have new title
- Events 1-4 have original title
- New recurring entry created
- Original series ended at event 4

**Status:** ✓ Pass/Fail: ___

### Test 2.3: Edit All Instances
**Objective:** Modify entire series
**Steps:**
1. Recurring event with past, present, future occurrences
2. Change title to new title
3. Select "All events"

**Expected Results:**
- All occurrences updated
- No new series created
- Single update operation
- Exceptions cleared

**Status:** ✓ Pass/Fail: ___

### Test 2.4: Cancel Single Instance
**Objective:** Remove one occurrence
**Steps:**
1. Recurring event "Weekly Review" every Monday
2. Cancel next Monday
3. Check following Monday

**Expected Results:**
- Next Monday event gone
4. Following Monday still present
- Exception record marks as cancelled

**Status:** ✓ Pass/Fail: ___

### Test 2.5: RRULE Parsing
**Objective:** Verify RFC 5545 parsing
**Steps:**
1. Create event with complex RRULE:
   - "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261231"
2. Expand instances for 3 months
3. Verify pattern

**Expected Results:**
- Only Mon, Wed, Fri occurrences
- Ends on Dec 31, 2026
- Correct date sequence

**Status:** ✓ Pass/Fail: ___

### Test 2.6: Save Recurring Template
**Objective:** Save pattern for reuse
**Steps:**
1. Create template: "Weekly Team Standup"
   - Weekly, Mon-Fri, 9am-9:30am
2. Save template
3. Create new event from template

**Expected Results:**
- Template saved to database
- Can be retrieved in future
- New event uses template settings

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 3: Event Reminders & Notifications

### Test 3.1: Create Event Reminder
**Objective:** Set reminder for event
**Steps:**
1. Create event "Doctor Appointment" Sept 10 2pm
2. Add reminder: 1 hour before
3. Check database

**Expected Results:**
- Reminder scheduled for 1pm
- Reminder record in database
- Type: in_app/push/email options available

**Status:** ✓ Pass/Fail: ___

### Test 3.2: Multiple Reminders Per Event
**Objective:** Multiple reminder times
**Steps:**
1. Event "Important Meeting" Sept 15 2pm
2. Add reminders: 1 day before, 1 hour before, at time
3. Verify all 3 created

**Expected Results:**
- 3 separate reminder records
- Different scheduled times
- All can trigger independently

**Status:** ✓ Pass/Fail: ___

### Test 3.3: In-App Notification
**Objective:** Display in-app alert
**Steps:**
1. Create event with in-app reminder
2. Trigger reminder manually (or wait)
3. Observe alert

**Expected Results:**
- Alert dialog shows
- Event title and time displayed
- Dismiss/Snooze buttons available

**Status:** ✓ Pass/Fail: ___

### Test 3.4: Push Notification
**Objective:** Device notification
**Steps:**
1. Grant notification permissions
2. Create event with push reminder
3. Trigger reminder
4. Check device notification tray

**Expected Results:**
- Notification appears on device
- Title and time shown
- Can open to view event details

**Status:** ✓ Pass/Fail: ___

### Test 3.5: Snooze Reminder
**Objective:** Postpone reminder
**Steps:**
1. Reminder triggers
2. Tap "Snooze 10 minutes"
3. Wait and verify re-trigger

**Expected Results:**
- Reminder hidden
- Re-triggers 10 min later
- Can snooze again or dismiss

**Status:** ✓ Pass/Fail: ___

### Test 3.6: Quiet Hours
**Objective:** Respect quiet hours setting
**Steps:**
1. Set quiet hours 10pm-8am
2. Create reminder during quiet hours
3. Verify no notification

**Expected Results:**
- Reminder recorded but not sent
- Queued for after quiet hours end
- Can be manually triggered

**Status:** ✓ Pass/Fail: ___

### Test 3.7: Notification Preferences
**Objective:** Customize notification behavior
**Steps:**
1. Open notification preferences
2. Disable push, enable email
3. Create event with reminder
4. Check delivery

**Expected Results:**
- Only email sent, no push
- Email delivery logged
- Settings persist

**Status:** ✓ Pass/Fail: ___

### Test 3.8: Overdue Reminders
**Objective:** Handle past event reminders
**Steps:**
1. Create event from past with reminder not yet sent
2. Open calendar
3. Check for overdue reminders

**Expected Results:**
- Overdue reminder detected
- Can trigger manually
- Marked as handled

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 4: Calendar Sharing

### Test 4.1: Share Event With User
**Objective:** Grant access to another user
**Steps:**
1. Create event "Project Review"
2. Share with colleague@company.com with "view" permission
3. Check share record

**Expected Results:**
- Share record created
- Status: accepted (if user exists)
- Colleague can view event

**Status:** ✓ Pass/Fail: ___

### Test 4.2: Share Invitation
**Objective:** Invite via email
**Steps:**
1. Share event with external@example.com
2. User doesn't exist yet
3. Verify invitation created
4. Check expiration (30 days)

**Expected Results:**
- Invitation record created
- Token generated
- Email ready to send
- 30-day expiry set

**Status:** ✓ Pass/Fail: ___

### Test 4.3: Accept Invitation
**Objective:** Accept share invite
**Steps:**
1. User receives invitation token
2. Accept via shared link
3. Check access

**Expected Results:**
- Invitation status: accepted
- User can now view event
- Shared event access record created

**Status:** ✓ Pass/Fail: ___

### Test 4.4: Permission Levels
**Objective:** Test different permission tiers
**Steps:**
1. Share same event with 3 users: view, edit, admin
2. Each user tries to modify event
3. Log attempts

**Expected Results:**
- View user: cannot modify
- Edit user: can modify
- Admin user: can share further and modify

**Status:** ✓ Pass/Fail: ___

### Test 4.5: Revoke Share
**Objective:** Remove access
**Steps:**
1. Share event with user
2. Later revoke access
3. User tries to view event

**Expected Results:**
- Share status: revoked
- User access removed
- Audit log records revocation

**Status:** ✓ Pass/Fail: ___

### Test 4.6: Update Permissions
**Objective:** Change permission level
**Steps:**
1. Share event with "view" permission
2. Change to "edit"
3. User verifies new permissions

**Expected Results:**
- Share record updated
- Shared event access updated
- User can now modify event
- Audit log shows change

**Status:** ✓ Pass/Fail: ___

### Test 4.7: Share Audit Log
**Objective:** Track all share actions
**Steps:**
1. Share, update permission, revoke on same event
2. Check audit log

**Expected Results:**
- 3 entries logged
- Action, old permission, new permission recorded
- Chronological order

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 5: Bulk Event Operations

### Test 5.1: Select Multiple Events
**Objective:** Multi-select functionality
**Steps:**
1. View calendar with 10 events
2. Tap event 1 (checkbox)
3. Tap event 3 (checkbox)
4. Tap event 5 (checkbox)

**Expected Results:**
- Selection mode activated
- 3 events highlighted
- Count shows "3 selected"

**Status:** ✓ Pass/Fail: ___

### Test 5.2: Select All Events
**Objective:** Quick select all
**Steps:**
1. View calendar with 10 events
2. Tap "Select All" button
3. Verify all selected

**Expected Results:**
- All 10 events highlighted
- Count shows "10 selected"
- "Deselect All" button shown

**Status:** ✓ Pass/Fail: ___

### Test 5.3: Bulk Delete
**Objective:** Delete multiple events
**Steps:**
1. Select 5 events
2. Tap Delete button
3. Confirm deletion
4. Check calendar

**Expected Results:**
- Confirmation dialog shown
- 5 events deleted
- Calendar updated
- Database clean

**Status:** ✓ Pass/Fail: ___

### Test 5.4: Bulk Copy
**Objective:** Duplicate events
**Steps:**
1. Select 3 events
2. Tap Copy button
3. Check calendar

**Expected Results:**
- 3 new events created as copies
- Same title, description
- Different IDs
- Same time or adjustable

**Status:** ✓ Pass/Fail: ___

### Test 5.5: Bulk Move
**Objective:** Reschedule multiple events
**Steps:**
1. Select 4 events from different times
2. Move 1 hour later
3. Verify all moved

**Expected Results:**
- All 4 events moved 1 hour later
- Time deltas applied
- Relative times preserved

**Status:** ✓ Pass/Fail: ___

### Test 5.6: Bulk Change Type
**Objective:** Change category
**Steps:**
1. Select 3 "reminder" type events
2. Change to "study_session"
3. Verify change

**Expected Results:**
- All 3 updated to study_session
- Event colors may update
- Database type field changed

**Status:** ✓ Pass/Fail: ___

### Test 5.7: Bulk Sync to Device
**Objective:** Sync multiple to device
**Steps:**
1. Select 5 unsync'd events
2. Tap Sync button
3. Check device calendar

**Expected Results:**
- All 5 synced
- Appear on device calendar
- is_synced_to_device set to true

**Status:** ✓ Pass/Fail: ___

### Test 5.8: Bulk Add Tag
**Objective:** Label multiple events
**Steps:**
1. Select 4 events
2. Add tag "important"
3. Search or filter by tag

**Expected Results:**
- Tag added to all 4
- Stored in metadata
- Can filter/search by tag

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 6: Integration Tests

### Test 6.1: Full Workflow: Create → Remind → Drag → Share
**Objective:** End-to-end user journey
**Steps:**
1. Create event "Team Meeting"
2. Add 1-hour reminder
3. Create recurring pattern (weekly)
4. Drag to new time (conflict detected)
5. Resolve conflict
6. Share with colleague
7. Colleague accepts
8. Verify access

**Expected Results:**
- All operations succeed
- No data loss
- Database consistent

**Status:** ✓ Pass/Fail: ___

### Test 6.2: Bulk + Sharing Combination
**Objective:** Share multiple events
**Steps:**
1. Select 3 events
2. Share all with same user
3. Verify all accessible

**Expected Results:**
- 3 share records created
- User can view all 3
- Permissions consistent

**Status:** ✓ Pass/Fail: ___

### Test 6.3: Recurring + Reminders
**Objective:** Reminders work with recurring
**Steps:**
1. Create recurring event (daily for 10 days)
2. Add reminder 1 hour before
3. Skip 3rd occurrence
4. Verify reminder pattern

**Expected Results:**
- 9 reminders (skip 3rd)
- Correct times for each
- Skipped event has no reminder

**Status:** ✓ Pass/Fail: ___

### Test 6.4: Device Sync Chain
**Objective:** Drag → Device → Pull
**Steps:**
1. Create event synced to device
2. Drag to new time
3. Device calendar updates
4. Manually change on device
5. Pull from device
6. Verify change synced back

**Expected Results:**
- Bidirectional sync works
- No duplicates
- Latest change preserved

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 7: Performance & Scalability

### Test 7.1: Drag with 100 Events
**Objective:** Performance with many events
**Steps:**
1. Load calendar with 100 events
2. Drag one event
3. Measure response time

**Expected Results:**
- Drag smooth (60 FPS)
- Conflict check < 100ms
- Database update < 500ms

**Status:** ✓ Pass/Fail: ___

### Test 7.2: Bulk Operations with 50 Events
**Objective:** Batch performance
**Steps:**
1. Select 50 events
2. Bulk delete
3. Measure operation time

**Expected Results:**
- Completes < 2 seconds
- All deleted from database
- UI responsive

**Status:** ✓ Pass/Fail: ___

### Test 7.3: Recurring Expansion
**Objective:** Generate instances efficiently
**Steps:**
1. Recurring event spanning 2 years
2. Expand to calendar view
3. Measure generation time

**Expected Results:**
- Generated < 1 second
- All 104 instances correct
- Memory efficient

**Status:** ✓ Pass/Fail: ___

### Test 7.4: Notification Delivery Queue
**Objective:** Handle many reminders
**Steps:**
1. Create 100 events with reminders
2. Trigger check
3. Monitor delivery

**Expected Results:**
- All queued properly
- Delivery < 1 second per batch
- No duplicate sends

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 8: Error Handling

### Test 8.1: Network Error During Drag
**Objective:** Handle offline gracefully
**Steps:**
1. Go offline
2. Drag event
3. Observe error handling

**Expected Results:**
- Error message shown
- Event unchanged
- Retry option available

**Status:** ✓ Pass/Fail: ___

### Test 8.2: Invalid RRULE
**Objective:** Malformed recurrence
**Steps:**
1. Insert invalid RRULE manually
2. Try to display event

**Expected Results:**
- No crash
- Event shown without recurrence
- Error logged

**Status:** ✓ Pass/Fail: ___

### Test 8.3: Permission Denied on Share
**Objective:** Handle share failures
**Steps:**
1. Try to share with deleted user
2. Try to share without permission

**Expected Results:**
- Clear error message
- Operation fails gracefully
- No partial shares

**Status:** ✓ Pass/Fail: ___

### Test 8.4: Concurrent Bulk Operations
**Objective:** Handle simultaneous bulk ops
**Steps:**
1. Start bulk delete
2. Start bulk copy (different events)
3. Monitor for conflicts

**Expected Results:**
- Both complete successfully
- No race conditions
- Data integrity maintained

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 9: Data Integrity

### Test 9.1: Drag Operation Logged
**Objective:** Audit trail for drags
**Steps:**
1. Drag event from 2pm to 4pm
2. Check drag_operations table

**Expected Results:**
- Operation recorded
- Original and new times logged
- User and timestamp recorded

**Status:** ✓ Pass/Fail: ___

### Test 9.2: Recurring Exception Consistency
**Objective:** Exceptions don't corrupt series
**Steps:**
1. Create recurring event
2. Skip instance 5
3. Edit instance 3
4. View all instances

**Expected Results:**
- Instance 3 modified, others original
- Instance 5 missing
- No orphaned exceptions

**Status:** ✓ Pass/Fail: ___

### Test 9.3: Share Audit Complete
**Objective:** All share actions logged
**Steps:**
1. Share, update permission, revoke
2. Check audit log

**Expected Results:**
- 3 complete entries
- All metadata captured
- Chronological

**Status:** ✓ Pass/Fail: ___

### Test 9.4: Bulk Operation Atomicity
**Objective:** Bulk delete all-or-nothing
**Steps:**
1. Select 5 events
2. Start delete
3. Simulate mid-operation failure
4. Verify state

**Expected Results:**
- Either all deleted or none deleted
- No partial deletes
- Database consistent

**Status:** ✓ Pass/Fail: ___

---

## Summary

**Total Tests:** 85
**Pass:** ___
**Fail:** ___
**Blocked:** ___

**Critical Issues Found:**
1. ...
2. ...

**Performance Metrics:**
- Drag operation: ___ ms
- Conflict check: ___ ms
- Bulk delete (50 events): ___ ms
- Recurring expansion (2 years): ___ ms
- Reminder delivery: ___ ms/event

**Feature Coverage:**
- Drag-and-drop: ✓ / ✗
- Recurring events: ✓ / ✗
- Reminders: ✓ / ✗
- Sharing: ✓ / ✗
- Bulk operations: ✓ / ✗

**Browser/Device Coverage:**
- iOS: ✓ / ✗
- Android: ✓ / ✗

---

## Sign-Off

**Tested By:** _______________
**Date:** _______________
**Environment:** _______________
**Overall Result:** ✓ PASS / ✗ FAIL
