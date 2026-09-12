# Quick Start Guide - Personal OS

## Setup (5 minutes)

### 1. Get API Keys
- OpenAI: https://platform.openai.com/api/keys
- Already have Supabase project configured

### 2. Deploy Functions
```bash
# Authenticate
supabase login

# Link to project
supabase link --project-ref qluxovfszsvdhmgkbvmp

# Set OpenAI key
supabase secrets set OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Deploy
supabase functions deploy parse-log
supabase functions deploy ai-assistant

# Verify in dashboard: Functions → Edge Functions (should show "Deployed")
```

### 3. Run App
```bash
npm start
```

## Test Features

### Analytics (3 minutes)
1. Create some activities first
2. Open Insights tab
3. Click "Fitness analytics →"
4. Should see workouts, top exercises, consistency

### Natural Language Capture (2 minutes)
1. Home → "Describe several things at once"
2. Type: `Studied ML for 90 minutes and went to the gym`
3. Click "Preview activities"
4. Should see 2 activities extracted
5. Click "Confirm and save"
6. Check Timeline - activities appear

### AI Assistant (3 minutes)
1. Open Assistant tab (?)
2. Ask: `How much did I spend this week?`
3. Should answer with actual spending data
4. Ask: `What should I focus on?`
5. Should give comprehensive analysis

## Common Questions

**Q: Where are API keys stored?**  
A: In Supabase secrets. Never exposed to mobile app.

**Q: Can the app work offline?**  
A: Partially. Dashboard and timeline work with local data. AI features need connection.

**Q: How do I update the AI prompts?**  
A: Edit the system prompt in `supabase/functions/ai-assistant/index.ts`, then redeploy.

**Q: Can I use a different AI model?**  
A: Yes, set `OPENAI_MODEL` secret. Defaults to gpt-4o-mini.

**Q: How much does this cost?**  
A: Depends on OpenAI usage. ~$0.01 per query with gpt-4o-mini.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "AI service not configured" | Set OPENAI_API_KEY secret |
| "Cannot parse activities" | Check function logs in Supabase dashboard |
| "Assistant not responding" | Verify OpenAI API status, check key has credits |
| "Functions timeout" | Increase timeout or simplify queries |

## Next Steps

- **Phase 5:** Add embeddings and knowledge base search
- **Phase 6:** Add more analytics (charts, trends)
- **Phase 7:** Add automations (reminders, recurring)
- **Phase 8:** Integrate with external services

## Documentation

- `DEPLOYMENT.md` - Full deployment guide
- `COMPLETION_SUMMARY.md` - What was built
- `PHASE_4A_STATUS.md` - AI functions details
- `PHASE_4B_STATUS.md` - Tools details
- `PHASE_4C_STATUS.md` - Workflows details

## Support

See `DEPLOYMENT.md` Troubleshooting section for detailed help.
