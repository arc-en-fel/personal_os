# Generate Insights Function

Analyzes assistant query patterns and generates insights about usage.

## Endpoint
`POST /functions/v1/generate-insights`

## Authentication
Required: Bearer token (user session)

## Request
```json
{
  "period_days": 30
}
```

## Response
```json
{
  "insights": {
    "period_days": 30,
    "generated_at": "2026-09-05T12:00:00Z",
    "summary": {
      "total_queries": 42,
      "successful_queries": 38,
      "success_rate": "90%",
      "avg_response_time_ms": 2150
    },
    "top_topics": [
      { "topic": "fitness", "count": 15 },
      { "topic": "activity", "count": 12 },
      { "topic": "finance", "count": 10 }
    ],
    "tool_usage": [
      { "tool": "activity_summary", "count": 25 },
      { "tool": "finance_summary", "count": 18 }
    ],
    "patterns": [
      { "pattern": "weekly_review", "type": "topic", "frequency": 8 }
    ],
    "recommendations": [
      "You ask about fitness frequently. Consider setting up fitness reminders.",
      "Your success rate is 90%. Keep asking specific questions.",
      "Explore the compare_periods tool for trend analysis."
    ]
  },
  "cached": false
}
```

## Caching
- Results are cached for 1 hour
- Cache is invalidated if period_days changes
- Returns `cached: true` if serving from cache

## Query Patterns Analyzed
- **Topics**: Detected from query keywords (fitness, finance, learning, etc.)
- **Tools**: Track which tools are used most frequently
- **Trends**: Identify recurring patterns in questions
- **Performance**: Response times and success rates

## Recommendations Generated
- Success rate analysis
- Tool usage distribution
- Topic concentration
- Query frequency suggestions
