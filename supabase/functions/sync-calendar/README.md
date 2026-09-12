# Sync Calendar Function

Syncs reminders, goals, and study sessions to calendar events.

## Endpoint
`POST /functions/v1/sync-calendar`

## Authentication
Required: Bearer token (user session)

## Request
```json
{}
```

## Response
```json
{
  "success": true,
  "events_synced": 12,
  "timestamp": "2026-09-05T15:00:00Z"
}
```

## Sync Logic

### 1. Reminders → Calendar Events
- Converts active reminders to calendar events
- Uses `next_trigger_at` as event start time
- Duration from `calendar_settings.default_event_duration_minutes`
- Includes recurrence rule if reminder has repeat settings
- Skips already synced reminders (checks for existing calendar_event)
- Type: 'reminder'

### 2. Goals → Calendar Events
- Converts goals with target dates to all-day events
- Sets event on target_date with red color (#EF4444)
- Title: "Goal Deadline: {goal title}"
- Type: 'goal_deadline'

### 3. Study Sessions → Calendar Events
- Converts recent study sessions to calendar events
- Uses `started_at` as start time
- Duration from `total_duration_minutes`
- Color: Purple (#8B5CF6) to distinguish study sessions
- Includes technique info in metadata
- Type: 'study_session'

## Recurrence Rules

Uses RFC 5545 RRULE format for calendar standards:

```
FREQ=DAILY;INTERVAL=1
FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR
FREQ=HOURLY;INTERVAL=24
```

Supports:
- Minutes: MINUTELY
- Hours: HOURLY
- Days: DAILY
- Weeks: WEEKLY with day selection

## Calendar Settings

Settings per user:
- `auto_sync_enabled`: Enable/disable sync
- `sync_reminders_to_calendar`: Include reminders
- `sync_goals_to_calendar`: Include goal deadlines
- `sync_study_sessions_to_calendar`: Include study sessions
- `default_event_color`: Color for new events
- `default_event_duration_minutes`: Default duration (60 min)
- `device_calendar_name`: Name for device sync
- `timezone`: User timezone

## Sync Logging

Every successful sync creates entry in `calendar_sync_log`:
- Direction: 'push' (to calendar)
- Status: 'success' or 'failed'
- Source: 'reminder', 'goal', 'activity'
- Timestamp: when sync occurred
- Error message: if failed

## Usage

### Manual Sync
```typescript
const { data } = await supabase.functions.invoke('sync-calendar', {
  headers: { Authorization: `Bearer ${token}` }
});
```

### Automatic Sync
- Call on app launch
- Call when reminders/goals/activities created
- Call on scheduled interval (e.g., every 5 minutes)
- Call when user enables sync feature

## Performance
- Optimized with indexes on (user_id, start_time)
- Checks for existing events before creating
- Batch operations for efficiency
- Typical sync: <1 second for 10-20 events

## Error Handling
- Logs failed syncs with error message
- Continues with other sources if one fails
- Safe to call multiple times (no duplicates)
- Gracefully handles missing data

## Integration

Used by:
1. Calendar screen - loads events for display
2. Calendar settings - control sync behavior
3. Reminder creation - auto-sync new reminders
4. Goal creation - auto-sync goal deadlines
5. Study completion - auto-sync study sessions
