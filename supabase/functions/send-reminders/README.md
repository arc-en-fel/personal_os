# Send Reminders Function

Processes active reminders and creates notifications based on schedules.

## Endpoint
`POST /functions/v1/send-reminders`

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
  "reminders_triggered": 3,
  "notifications_created": 3
}
```

## How It Works

1. **Fetches reminders**: Gets all active reminders where `next_trigger_at <= now`
2. **Creates notifications**: For each triggered reminder, creates a notification record
3. **Calculates next trigger**: Based on repeat settings (daily, weekly, custom intervals)
4. **Updates reminders**: Sets `last_triggered_at` and `next_trigger_at`

## Reminder Scheduling

### Repeat Units
- **minutes**: Repeat every N minutes
- **hours**: Repeat every N hours
- **days**: Repeat every N days, optionally at `scheduled_time`
- **weeks**: Repeat every N weeks, optionally on `scheduled_day_of_week` at `scheduled_time`

### Examples
```
Daily at 9 AM:
- repeat_interval: 1
- repeat_unit: "days"
- scheduled_time: "09:00"

Weekly on Monday at 10 AM:
- repeat_interval: 1
- repeat_unit: "weeks"
- scheduled_day_of_week: 1 (Monday)
- scheduled_time: "10:00"

Every 25 minutes (Pomodoro):
- repeat_interval: 25
- repeat_unit: "minutes"
```

## Reminder Types
- `goal` - Goal-related reminders
- `learning` - Study and learning sessions
- `fitness` - Workout reminders
- `finance` - Financial checkups
- `custom` - User-defined reminders

## Trigger Types
- `time` - Time-based triggers
- `goal_progress` - When goal reaches milestone
- `daily` - Daily recurring
- `weekly` - Weekly recurring
- `custom` - Custom schedule

## Integration

### Usage Flow
1. User creates reminder via reminders screen
2. `next_trigger_at` set to next scheduled time
3. Call `send-reminders` periodically (via cron job or on-demand)
4. Notifications created and stored
5. App displays notifications to user

### For Pomodoro
```
1. User starts Pomodoro session
2. Creates reminders:
   - Work interval: 25 min
   - Break interval: 5 min
   - 4 cycles then 15 min break
3. Notifications trigger at each interval
```

## Performance
- Optimized with indexes on `next_trigger_at`
- Batch processing of reminders
- Efficient trigger time calculation

## Error Handling
- Logs failed reminder processing
- Continues with other reminders if one fails
- Safe to call multiple times without duplicates
