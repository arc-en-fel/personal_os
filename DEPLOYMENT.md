# Personal OS Deployment Guide

## Prerequisites

- Supabase CLI: `npm install -g supabase`
- OpenAI API key: Get from https://platform.openai.com/api/keys

## Initial Setup

### 1. Supabase Project Setup

```bash
# Link to Supabase project
supabase link --project-ref qluxovfszsvdhmgkbvmp

# Run database migrations
supabase db push

# Verify local database (optional)
supabase start  # starts local Postgres
```

### 2. Deploy Edge Functions

```bash
# Deploy parse-log (natural language parser)
supabase functions deploy parse-log

# Deploy ai-assistant (agent with tool calling)
supabase functions deploy ai-assistant

# Deploy index-note (future: embeddings for knowledge base)
supabase functions deploy index-note
```

### 3. Set Edge Function Secrets

```bash
# Set OpenAI API key (required for both functions)
supabase secrets set OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Optional: Set model (defaults to gpt-4o-mini)
supabase secrets set OPENAI_MODEL=gpt-4o
```

### 4. Verify Deployment

Check the Supabase dashboard:
- Navigate to Functions → Edge Functions
- You should see `parse-log`, `ai-assistant`, `index-note`
- Each should show "Deployed" status

## Environment Variables

### Mobile App (.env)

Already configured:
```
EXPO_PUBLIC_SUPABASE_URL=https://qluxovfszsvdhmgkbvmp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

### Supabase Secrets

Set via CLI:
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
supabase secrets set OPENAI_MODEL=gpt-4o-mini  # optional
```

View all secrets:
```bash
supabase secrets list
```

## Testing the System

### Phase 3b: Natural Language Capture

1. Run the app: `npm start`
2. Log in or sign up
3. Tap "Describe several things at once" (bottom of home)
4. Try typing:
   ```
   Studied React for 90 minutes. Hit the gym for upper body.
   Did 10km run. Spent ₹500 on groceries.
   ```
5. Tap "Preview activities"
6. Review the extracted data
7. Tap "Confirm and save"
8. Check the Timeline — activities should appear

**Expected behavior:**
- 4 activities extracted (learning, workout, general, finance)
- Each with appropriate type, title, and metadata
- User always reviews before saving

### Phase 4a: AI Assistant

1. From home, tap the Assistant tab (?)
2. Ask a question:
   ```
   How much did I spend this week?
   ```
3. The assistant should:
   - Call `finance_summary` tool
   - Return actual spending data from your records
   - Answer naturally based on real data

**Try these questions:**
- "What have I focused on recently?"
- "How consistent have I been with workouts?"
- "What are my active goals?"
- "Log that I studied for 60 minutes"

## Troubleshooting

### Functions return "The AI service is not configured"

- Check that OPENAI_API_KEY is set: `supabase secrets list`
- Verify the key is valid and has billing enabled
- Check Supabase dashboard → Functions → Logs

### Functions return 401 Unauthorized

- Ensure you're logged into the app with a valid Supabase user
- Check that the session is valid
- Clear app cache and re-login

### "The AI service could not answer right now" (502)

- Check OpenAI API status: https://status.openai.com
- Verify your API key has credits
- Check function logs in Supabase dashboard

### Parse function returns empty activities

- Check OPENAI_API_KEY is set
- Try simpler input: "I studied for 60 minutes"
- Check Supabase function logs for detailed error

## Local Testing

### Run Supabase Locally

```bash
supabase start

# This starts:
# - PostgreSQL (localhost:5432)
# - Supabase functions locally
# - PostgREST API (localhost:54321)
```

### Deploy Function Locally

```bash
supabase functions deploy ai-assistant --local
```

### Run Tests

```bash
npm run typecheck
```

## Production Deployment

### Deploy to Supabase Hosting

Functions are automatically deployed when you run:
```bash
supabase functions deploy FUNCTION_NAME
```

They deploy to your Supabase project and are live immediately.

### Monitor Production

Check Supabase dashboard:
- Functions → Logs (see all invocations)
- Functions → Metrics (see performance)
- Database → Backups (verify regular backups)

## Common Issues

### High API Costs

The AI assistant uses OpenAI's API. To reduce costs:
- Use `gpt-4o-mini` instead of `gpt-4o` (3x cheaper)
- Implement result caching
- Limit tool calls to 4 turns max (already implemented)

### Rate Limiting

If you hit OpenAI rate limits:
- Implement exponential backoff
- Use batch processing for embeddings
- Consider Claude or Llama models as alternatives

## Next Steps

1. **Phase 5: RAG & Embeddings**
   - Deploy `index-note` function
   - Create embeddings when notes are saved
   - Integrate `search_notes` tool in assistant

2. **Phase 6: Advanced Analytics**
   - Add trend analysis (comparing periods)
   - Add goal tracking visualizations
   - Add spending forecasts

3. **Monitoring & Analytics**
   - Add error tracking (Sentry)
   - Add usage analytics
   - Set up alerts for API failures
