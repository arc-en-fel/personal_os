# Update Patterns Function

Analyzes recent queries to extract and update usage patterns automatically.

## Endpoint
`POST /functions/v1/update-patterns`

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
  "patterns_updated": 12,
  "topics": 7,
  "tools": 3,
  "time_patterns": 2
}
```

## Patterns Extracted

### Topic Patterns
Detects frequently mentioned topics:
- `fitness` - Fitness, workout, exercise related
- `finance` - Money, spending, budget related
- `learning` - Study, education related
- `productivity` - Projects, goals, tasks
- `health` - Nutrition, wellness
- `time` - Temporal queries
- `comparison` - Trend analysis queries

### Tool Patterns
Tracks which tools are used most:
- `activity_summary` - Activity queries
- `finance_summary` - Finance queries
- `search_notes` - Knowledge searches
- `goal_status` - Goal tracking
- etc.

### Time Patterns
Identifies when user queries most:
- Hourly patterns (morning, afternoon, evening, night)
- Day of week patterns
- Peak usage times

## Usage
Call this function after several queries have been logged to analyze patterns.

Can be called:
1. On-demand from client
2. Periodically via scheduled function
3. After each query for real-time updates

## Performance
- Analyzes last 7 days of queries
- Updates patterns in batch
- Should complete in < 2 seconds
- Results used to feed insights generation

## Integration
Used by `generate-insights` to provide pattern-based recommendations.
