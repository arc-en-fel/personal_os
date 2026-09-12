# AI Assistant Edge Function

Deploy with `supabase functions deploy ai-assistant`.

## Environment Setup

Set the server-side secret with:
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

Optionally set `OPENAI_MODEL` (defaults to `gpt-4o-mini`):
```bash
supabase secrets set OPENAI_MODEL=gpt-4o
```

## How It Works

The mobile app never receives the OpenAI key. The function:
1. Verifies the Supabase user from the authorization token
2. Uses tool calling to retrieve bounded recent records (activities, transactions, notes)
3. Sends context to OpenAI with strict tool schemas
4. Returns answers grounded in actual personal data

## Available Tools

- `activity_summary(days)` - Get workouts, learning sessions, and other activities
- `finance_summary(days)` - Get income, spending, and spending by category  
- `search_notes(query)` - Search personal knowledge base (requires embeddings)
- `create_activity(type, title, description)` - Create an activity (requires user confirmation)

## Testing

1. Deploy the function
2. Set OPENAI_API_KEY secret in Supabase dashboard
3. In the app, open the Assistant tab and ask a question like:
   - "How much did I spend this week?"
   - "What have I been learning?"
   - "Log that I worked out for 30 minutes"

