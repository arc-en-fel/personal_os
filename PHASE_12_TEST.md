# Phase 12: Advanced Calendar Features - Test Plan

## Overview
End-to-end testing of advanced calendar features including week/day views, settings UI, search/filter, and smart scheduling suggestions.

## Test Environment Setup
- Database: Supabase with calendar tables from Phase 11
- App: Expo React Native with all Phase 12 components
- Device: iOS/Android with calendar capabilities
- Functions: sync-calendar edge function deployed

---

## Test Suite 1: Week View

### Test 1.1: Week View Renders Correctly
**Objective:** Verify week view displays proper layout
**Steps:**
1. Navigate to calendar screen
2. Tap "Week" button in view mode selector
3. Observe 7-day grid with time slots

**Expected Results:**
- 7 columns for each day of week
- Day headers show day name and date
- Time column on left (6am-10pm)
- Hourly time labels visible
- Date range header shows week dates
- Horizontal scroll enabled for week navigation

**Status:** ✓ Pass/Fail: ___

### Test 1.2: Events Display with Correct Positioning
**Objective:** Events positioned accurately by time
**Steps:**
1. Create event: "Team Meeting" from 2pm-3pm Monday
2. View week view containing Monday
3. Check event position and height

**Expected Results:**
- Event positioned at 2pm (8 hours from 6am start)
- Event height represents 1 hour duration
- Event title visible
- Event color matches type
- Event is tappable

**Status:** ✓ Pass/Fail: ___

### Test 1.3: Multiple Events on Same Day
**Objective:** Handle overlapping/stacked events
**Steps:**
1. Create 3 events on Monday:
   - 9am-10am: "Standup"
   - 9:30am-10:30am: "Chat with team"
   - 2pm-3pm: "Review session"
2. View week view
3. Check event display

**Expected Results:**
- All 3 events visible
- No overlap issues
- Event heights correct
- All events tappable
- Color coding preserved

**Status:** ✓ Pass/Fail: ___

### Test 1.4: Week Navigation
**Objective:** Navigate between weeks
**Steps:**
1. View current week
2. Tap right arrow to go to next week
3. Tap left arrow to go to previous week
4. Check date range updates

**Expected Results:**
- Date range header updates correctly
- Events load for new week
- Week boundaries correct
- Navigation smooth
- No crashes on edge cases

**Status:** ✓ Pass/Fail: ___

### Test 1.5: All-Day Events in Week View
**Objective:** Display all-day events separately
**Steps:**
1. Create all-day event: "Holiday" on Wednesday
2. Create timed event: "Meeting" at 3pm Wednesday
3. View week

**Expected Results:**
- Both events visible
- All-day event doesn't take time slot
- Timed event in correct time slot
- Visual distinction between all-day and timed

**Status:** ✓ Pass/Fail: ___

### Test 1.6: Current Day Highlighting
**Objective:** Highlight today's date in week view
**Steps:**
1. View current week in week view
2. Check day header for today

**Expected Results:**
- Today's date has different background color
- Clearly distinguishable from other days
- Day name and date both highlighted

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 2: Day View

### Test 2.1: Day View Renders Correctly
**Objective:** Verify day view displays proper layout
**Steps:**
1. Navigate to calendar screen
2. Tap "Day" button in view mode selector
3. Observe single day with hourly slots

**Expected Results:**
- Single day header with full date
- Time slots from 6am-10pm visible
- Hourly time labels
- Vertical scroll enabled
- Navigation arrows (prev/next day)

**Status:** ✓ Pass/Fail: ___

### Test 2.2: Events Display with Correct Times
**Objective:** Events positioned accurately
**Steps:**
1. Create events:
   - 8am-9am: "Morning standup"
   - 2pm-3:30pm: "Project work"
   - All day: "Birthday"
2. View day containing these events
3. Check positioning

**Expected Results:**
- Standup at top (8am slot)
- Project work in middle (2pm-3:30pm)
- Correct relative heights (project = 1.5x standup)
- All-day event in separate section
- All events tappable
- Full event details visible

**Status:** ✓ Pass/Fail: ___

### Test 2.3: Day Navigation
**Objective:** Navigate between days
**Steps:**
1. View current day
2. Tap right arrow to go to tomorrow
3. Tap left arrow to go back
4. Repeat 5 times

**Expected Results:**
- Date header updates correctly
- Events load for new day
- Navigation smooth
- No crashes
- All-day events persist

**Status:** ✓ Pass/Fail: ___

### Test 2.4: Empty Day Display
**Objective:** Handle day with no events
**Steps:**
1. Navigate to a day with no scheduled events
2. Observe display

**Expected Results:**
- Time slots visible but empty
- No events shown
- UI doesn't crash
- Can still create events

**Status:** ✓ Pass/Fail: ___

### Test 2.5: Event Details from Day View
**Objective:** Access event details from day view
**Steps:**
1. View day with events
2. Tap on specific event
3. Navigate to event detail screen

**Expected Results:**
- Event detail screen opens
- All event info displayed
- Can edit/delete from detail
- Can sync to device
- Back button returns to day view

**Status:** ✓ Pass/Fail: ___

### Test 2.6: Very Full Day
**Objective:** Handle day with many events
**Steps:**
1. Create 8+ events on one day (hourly from 6am)
2. View day view
3. Scroll and interact

**Expected Results:**
- All events visible
- Scrollable without losing content
- Events don't overlap
- Performance acceptable
- No layout issues

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 3: Calendar Settings UI

### Test 3.1: Settings Screen Loads
**Objective:** Settings screen opens correctly
**Steps:**
1. From calendar, tap settings button (⚙)
2. Observe settings screen

**Expected Results:**
- Screen loads without error
- All sections visible: calendar name, sync preferences, timezone, colors, device info
- Form fields populated with current values
- Save and Cancel buttons present

**Status:** ✓ Pass/Fail: ___

### Test 3.2: Modify Calendar Name
**Objective:** Change device calendar name
**Steps:**
1. Open settings
2. Clear calendar name field
3. Type "My Schedule"
4. Tap Save
5. Reopen settings

**Expected Results:**
- Name saved to database
- Persists on reopen
- Success alert shown
- No errors

**Status:** ✓ Pass/Fail: ___

### Test 3.3: Toggle Auto-Sync
**Objective:** Enable/disable automatic sync
**Steps:**
1. Open settings
2. Toggle "Auto Sync" switch
3. Save
4. Verify in calendar_settings table

**Expected Results:**
- Setting changes in UI
- Saved to database
- Toggle state persists on reopen
- Change affects calendar behavior on load

**Status:** ✓ Pass/Fail: ___

### Test 3.4: Select Sync Types
**Objective:** Choose which event types to sync
**Steps:**
1. Open settings
2. Uncheck "Reminders"
3. Keep "Goals" and "Study Sessions" checked
4. Save
5. Create reminder, goal, study session
6. Sync calendar

**Expected Results:**
- Only Goals and Study Sessions synced
- Reminders ignored
- Setting persists across sessions
- Sync respects settings

**Status:** ✓ Pass/Fail: ___

### Test 3.5: Change Timezone
**Objective:** Update timezone setting
**Steps:**
1. Open settings
2. Tap timezone dropdown
3. Select "America/Los_Angeles"
4. Save
5. Check events display time

**Expected Results:**
- Timezone selected successfully
- Saved to database
- Event times convert to timezone
- Persists on reopen

**Status:** ✓ Pass/Fail: ___

### Test 3.6: View Device Calendar Info
**Objective:** Display device calendar information
**Steps:**
1. Sync events to device
2. Open settings
3. Check device calendar section

**Expected Results:**
- Device Calendar ID displayed
- Shows sync status
- Correct calendar name shown
- Info refreshes if calendar changes

**Status:** ✓ Pass/Fail: ___

### Test 3.7: Default Settings Creation
**Objective:** Auto-create settings for new users
**Steps:**
1. New user account
2. Open calendar
3. Navigate to settings

**Expected Results:**
- Settings loaded
- Default values applied:
  - auto_sync: true
  - sync_types: all 3 types
  - timezone: device timezone
  - calendar_name: "Personal Tracker"
- No errors

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 4: Search and Filter

### Test 4.1: Search Screen Opens
**Objective:** Search UI accessible
**Steps:**
1. From calendar, tap search button (🔍)
2. Observe search screen

**Expected Results:**
- Search screen loads
- Search box visible
- Filter options shown
- Results area ready

**Status:** ✓ Pass/Fail: ___

### Test 4.2: Text Search
**Objective:** Search by event title/description
**Steps:**
1. Create events: "Team Meeting", "Project Review"
2. Open search
3. Type "Team" in search box
4. Observe results

**Expected Results:**
- "Team Meeting" appears in results
- "Project Review" hidden
- Real-time filtering
- Event count updates

**Status:** ✓ Pass/Fail: ___

### Test 4.3: Filter by Event Type
**Objective:** Filter events by type
**Steps:**
1. Create mixed events: 2 reminders, 2 goals, 2 study sessions
2. Open search
3. Uncheck "Goals"
4. Observe results

**Expected Results:**
- Only reminders and study sessions shown
- Goals hidden
- Event count decreases
- Can toggle multiple types

**Status:** ✓ Pass/Fail: ___

### Test 4.4: Filter by Date Range
**Objective:** Filter by date range
**Steps:**
1. Create events on various dates
2. Open search
3. Select "Week" range
4. Observe results

**Expected Results:**
- Only events in current week shown
- Past and future events hidden
- Can switch between Today/Week/Month/All
- Results update immediately

**Status:** ✓ Pass/Fail: ___

### Test 4.5: Sort Results
**Objective:** Sort search results
**Steps:**
1. Search for events
2. Change sort from "Date" to "Title"
3. Observe order change

**Expected Results:**
- Results reorder alphabetically by title
- Sort options work: Date, Title, Type
- Results remain visible
- Multiple sorts work smoothly

**Status:** ✓ Pass/Fail: ___

### Test 4.6: Combined Filters
**Objective:** Use multiple filters together
**Steps:**
1. Search for: "Team" + Type: Reminders + Range: Month + Sort: Title
2. Observe results

**Expected Results:**
- All filters applied together
- Results filtered correctly
- Sorted by title
- Count accurate

**Status:** ✓ Pass/Fail: ___

### Test 4.7: Clear Search
**Objective:** Clear search field
**Steps:**
1. Search for "meeting"
2. Tap X button to clear
3. Observe results

**Expected Results:**
- Search field cleared
- All events show again
- Results refresh
- No errors

**Status:** ✓ Pass/Fail: ___

### Test 4.8: Empty Search Results
**Objective:** Handle no matching results
**Steps:**
1. Search for "xyz123"
2. Observe result

**Expected Results:**
- Empty state shown
- "No events found" message
- Helpful prompt to adjust filters
- No crashes

**Status:** ✓ Pass/Fail: ___

### Test 4.9: Tap Search Result
**Objective:** Open event from search results
**Steps:**
1. Search for events
2. Tap one result
3. Navigate to detail screen

**Expected Results:**
- Event detail screen opens
- Full event info displayed
- Can edit/delete
- Back returns to search

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 5: Smart Scheduling Suggestions

### Test 5.1: Suggestions Screen Loads
**Objective:** Smart suggestions accessible
**Steps:**
1. From calendar, tap smart suggestions (✨)
2. Wait for analysis

**Expected Results:**
- Screen loads
- "Analyzing your schedule..." shown during load
- Suggestions appear when complete
- No errors

**Status:** ✓ Pass/Fail: ___

### Test 5.2: Summary Stats Display
**Objective:** Show event statistics
**Steps:**
1. Have 20 events in next 30 days
2. Open suggestions screen
3. Check summary box

**Expected Results:**
- Total Events: 20
- Average per day calculated correctly
- Suggestion count shown
- Stats update with data

**Status:** ✓ Pass/Fail: ___

### Test 5.3: Focus Time Recommendation
**Objective:** Suggest optimal focus time
**Steps:**
1. Create events scattered throughout day
2. Open suggestions
3. Check for "Focus Time" suggestion

**Expected Results:**
- Focus time recommended
- Suggests least busy hour (9am-5pm)
- Shows reason: "Your least busy hour"
- Time and duration shown
- High priority

**Status:** ✓ Pass/Fail: ___

### Test 5.4: Break Time Recommendation
**Objective:** Suggest breaks for busy schedule
**Steps:**
1. Create 8+ events per day
2. Open suggestions
3. Check for "Break Time" suggestion

**Expected Results:**
- Break time recommended
- Shows high event density
- Suggests 30-min breaks every 2 hours
- High priority
- Actionable (can add to calendar)

**Status:** ✓ Pass/Fail: ___

### Test 5.5: Study Session Recommendation
**Objective:** Suggest optimal study time
**Steps:**
1. Create 3+ study sessions
2. Open suggestions
3. Check for "Study Session" suggestion

**Expected Results:**
- Study session recommendation shown
- Suggests average study session time
- Shows reason: study pattern analysis
- Medium priority

**Status:** ✓ Pass/Fail: ___

### Test 5.6: Work-Life Balance Suggestion
**Objective:** Detect and suggest schedule balance
**Steps:**
1. Create all events in morning (6am-12pm)
2. Open suggestions
3. Check for balance suggestion

**Expected Results:**
- Balance suggestion shown
- Identifies morning-heavy schedule
- Suggests evening activities
- Low priority
- Explains imbalance

**Status:** ✓ Pass/Fail: ___

### Test 5.7: Add Suggestion to Calendar
**Objective:** Create event from suggestion
**Steps:**
1. Open suggestions
2. Tap "+ Add to Calendar" on focus time suggestion
3. Capture screen opens with suggestion details

**Expected Results:**
- Capture screen navigates successfully
- Suggestion details pre-filled
- Can create reminder/event
- No crashes

**Status:** ✓ Pass/Fail: ___

### Test 5.8: No Suggestions Needed
**Objective:** Handle well-organized schedule
**Steps:**
1. Few events, well-distributed
2. Open suggestions
3. Observe

**Expected Results:**
- "Your schedule looks great!" message shown
- No suggestions needed message
- Helpful messaging
- Tips section still visible

**Status:** ✓ Pass/Fail: ___

### Test 5.9: Suggestions Update After Changes
**Objective:** Suggestions reflect calendar updates
**Steps:**
1. Open suggestions
2. Note recommendations
3. Go back and create 5 new events
4. Reopen suggestions

**Expected Results:**
- Suggestions regenerated
- Reflects new events
- Recommendations may change
- Analysis updated

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 6: Cross-Feature Integration

### Test 6.1: Week View to Event Detail
**Objective:** Navigate from week view to event detail
**Steps:**
1. View week view with events
2. Tap event
3. View detail screen

**Expected Results:**
- Event detail opens
- All info displayed
- Can edit/sync/delete
- Back returns to week view

**Status:** ✓ Pass/Fail: ___

### Test 6.2: Day View to Event Detail
**Objective:** Navigate from day view to event detail
**Steps:**
1. View day view with events
2. Tap event (or all-day event)
3. View detail screen

**Expected Results:**
- Event detail opens
- Correct event displayed
- Back returns to day view
- Changes persist

**Status:** ✓ Pass/Fail: ___

### Test 6.3: Settings to Calendar View
**Objective:** Changes persist when returning to calendar
**Steps:**
1. Open settings
2. Change timezone, sync types
3. Save
4. Return to calendar
5. Create/sync events

**Expected Results:**
- Settings applied
- Events respect settings
- Timezone conversion works
- Sync types honored

**Status:** ✓ Pass/Fail: ___

### Test 6.4: Search Result Edits Persist
**Objective:** Changes from search result stick
**Steps:**
1. Search for event
2. Open and edit title
3. Return to search
4. Search for new title

**Expected Results:**
- Edit saved to database
- Search finds updated title
- Change persists
- Sync to device if applicable

**Status:** ✓ Pass/Fail: ___

### Test 6.5: Suggestion Add Creates Event
**Objective:** Added suggestions appear in calendar
**Steps:**
1. Open suggestions
2. Add focus time to calendar
3. Return to calendar
4. Check for new event

**Expected Results:**
- Event created successfully
- Appears in month/week/day views
- Correct time and duration
- Can edit/delete normally

**Status:** ✓ Pass/Fail: ___

### Test 6.6: All Buttons Accessible from Main Calendar
**Objective:** All Phase 12 screens reachable
**Steps:**
1. From main calendar, check 3 buttons accessible
2. Tap each: Smart Suggestions, Search, Settings
3. Navigate back to calendar

**Expected Results:**
- All 3 screens open successfully
- Back buttons work
- No crashes
- Calendar still functional

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 7: Performance

### Test 7.1: Week View Performance
**Objective:** Week view renders smoothly
**Steps:**
1. Create 50 events in one week
2. Switch to week view
3. Scroll and navigate
4. Monitor FPS

**Expected Results:**
- Week view renders quickly (< 2 sec)
- Scroll smooth (60 FPS)
- Navigation responsive
- No UI lag

**Status:** ✓ Pass/Fail: ___

### Test 7.2: Day View Performance
**Objective:** Day view handles many events
**Steps:**
1. Create 20 events in one day
2. Switch to day view
3. Scroll through day
4. Monitor performance

**Expected Results:**
- Day view loads quickly
- Scroll smooth
- All events visible
- No crashes

**Status:** ✓ Pass/Fail: ___

### Test 7.3: Search Performance
**Objective:** Search through large dataset
**Steps:**
1. 500 events in database
2. Open search screen
3. Type search query
4. Time results

**Expected Results:**
- Results appear quickly (< 1 sec)
- Real-time search responsive
- No freezing
- Memory efficient

**Status:** ✓ Pass/Fail: ___

### Test 7.4: Suggestions Generation Speed
**Objective:** Suggestions generated quickly
**Steps:**
1. 100+ events in next 30 days
2. Open suggestions
3. Time analysis

**Expected Results:**
- Analysis completes within 3 seconds
- UI responsive during analysis
- Results accurate
- Loading state shown

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 8: Error Handling

### Test 8.1: Network Error in Settings
**Objective:** Handle save failure gracefully
**Steps:**
1. Go offline
2. Open settings
3. Change value
4. Tap save

**Expected Results:**
- Error alert shown
- Message explains issue
- Can retry when online
- Data not corrupted

**Status:** ✓ Pass/Fail: ___

### Test 8.2: Empty Search Results
**Objective:** Handle no matching events
**Steps:**
1. Search for very specific text
2. Get no results

**Expected Results:**
- Empty state shown
- Helpful message
- Can adjust filters
- No crashes

**Status:** ✓ Pass/Fail: ___

### Test 8.3: Missing Event in Detail
**Objective:** Handle event deleted while viewing
**Steps:**
1. Open search
2. Tap event to detail
3. Event deleted by sync
4. Navigate back

**Expected Results:**
- No crash when deleted
- Graceful handling
- Can close detail view
- Calendar still works

**Status:** ✓ Pass/Fail: ___

### Test 8.4: Timezone Conversion Error
**Objective:** Handle invalid timezone
**Steps:**
1. Somehow set invalid timezone (manual DB edit)
2. Open calendar/settings

**Expected Results:**
- Falls back to UTC
- No crashes
- Can fix in settings
- Events still display

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 9: Accessibility

### Test 9.1: Dark Mode Support
**Objective:** UI readable in dark mode
**Steps:**
1. Enable device dark mode
2. Navigate through all screens
3. Check contrast and readability

**Expected Results:**
- All text readable
- Good contrast
- Colors adapted
- No illegible elements

**Status:** ✓ Pass/Fail: ___

### Test 9.2: Text Size Scaling
**Objective:** Respect system text size settings
**Steps:**
1. Increase system text size to max
2. Open calendar screens
3. Check layout

**Expected Results:**
- Text scales appropriately
- No overflow issues
- Layout adjusts
- Still navigable

**Status:** ✓ Pass/Fail: ___

### Test 9.3: Touch Target Sizes
**Objective:** Buttons/interactive elements large enough
**Steps:**
1. Check all buttons, tappable areas
2. Measure minimum 44x44 pt

**Expected Results:**
- All touch targets >= 44x44 pt
- Easy to tap
- No accidentally triggered actions
- Accessible spacing

**Status:** ✓ Pass/Fail: ___

---

## Test Suite 10: Data Integrity

### Test 10.1: Settings Persists Across Sessions
**Objective:** Settings survive app close/reopen
**Steps:**
1. Change settings: timezone, sync types, calendar name
2. Close app
3. Reopen
4. Check settings

**Expected Results:**
- All changes persisted
- Correct values loaded
- Settings applied
- No resets

**Status:** ✓ Pass/Fail: ___

### Test 10.2: Search History Not Logged
**Objective:** Search privacy
**Steps:**
1. Search for sensitive data
2. Check database
3. Verify privacy

**Expected Results:**
- Search queries not stored
- Only events returned
- Privacy maintained
- No tracking logs

**Status:** ✓ Pass/Fail: ___

### Test 10.3: Multi-Device Sync
**Objective:** Calendar changes sync across devices
**Steps:**
1. Create event on Device A
2. Open calendar on Device B
3. Check if event appears

**Expected Results:**
- Event synced to Device B
- Real-time or near-real-time
- No conflicts
- Data consistent

**Status:** ✓ Pass/Fail: ___

---

## Summary

**Total Tests:** 79
**Pass:** ___
**Fail:** ___
**Blocked:** ___

**Critical Issues Found:**
1. ...
2. ...

**Performance Metrics:**
- Week view load: ___ ms
- Day view load: ___ ms
- Search response: ___ ms
- Suggestions generation: ___ ms

**Feature Coverage:**
- Week view: ✓ / ✗
- Day view: ✓ / ✗
- Settings UI: ✓ / ✗
- Search/filter: ✓ / ✗
- Smart suggestions: ✓ / ✗
- Cross-feature integration: ✓ / ✗

**Recommendations for Future Work:**
1. Add month-view mini calendar navigation
2. Implement event drag-and-drop to reschedule
3. Add calendar sharing and collaboration
4. Build export functionality (iCal, PDF)
5. Add event reminders/notifications
6. Implement recurring event editing
7. Add time blocking templates
8. Build analytics dashboard

---

## Sign-Off

**Tested By:** _______________
**Date:** _______________
**Environment:** _______________
**Overall Result:** ✓ PASS / ✗ FAIL
