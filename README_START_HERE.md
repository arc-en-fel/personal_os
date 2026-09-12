# Personal OS - Start Here

If you're seeing "The assistant could not respond", **start here**.

## 🚨 Most Common Issue (95% of cases)

### Missing OpenAI API Key

The assistant needs an OpenAI API key to work. It's not set up yet.

**Fix in 3 minutes:**

1. Get key from https://platform.openai.com/api/keys
   - Click **Create new secret key**
   - Copy it

2. Add to Supabase:
   - Go to https://app.supabase.com
   - Your project → **Project Settings** → **Secrets**
   - **New Secret**
   - Name: `OPENAI_API_KEY`
   - Value: Paste your key
   - Click **Add**

3. Wait 1-2 minutes, then test:
   - Run `npm start`
   - Open **Assistant** tab
   - Ask: "Hello"

**Done!**

---

## If That Doesn't Work

Read these in order:

1. **`ERROR_EXPLANATION.md`** - Explains what the error means
2. **`FIX_API_KEY.md`** - Just the API key setup
3. **`DEPLOY_VIA_DASHBOARD.md`** - Deploy functions via dashboard
4. **`TROUBLESHOOTING.md`** - Deep troubleshooting

---

## What Was Built

### Phase 3: Analytics
- ✅ Fitness analytics (workouts, exercises, consistency)
- ✅ Learning analytics (study time, skills)
- ✅ Finance analytics (spending, merchants)
- ✅ Natural language capture ("Studied 90 min, went to gym")

### Phase 4: AI Assistant
- ✅ Chat interface with AI
- ✅ Tool calling (queries your actual data)
- ✅ Multi-turn conversations
- ✅ Intelligent workflows

---

## Quick Features Guide

### Analytics Screens
**Home → Insights → Click any "analytics →" link**
- Fitness Analytics: See workouts, exercises, consistency
- Learning Analytics: Study time by skill, sessions
- Finance Analytics: Spending trends, merchant breakdown

### Natural Language Capture
**Home → "Describe several things at once"**
- Type: "Studied React 90 min, ran 5km, spent ₹500"
- AI extracts 3 activities
- Review then save

### AI Assistant
**Open Assistant tab (?) → Ask a question**
- "What have I done this week?"
- "How much did I spend?"
- "What should I focus on?"
- "Compare my spending to last month"

---

## Deployment Checklist

- [ ] Get OpenAI API key (https://platform.openai.com/api/keys)
- [ ] Add to Supabase Secrets (`OPENAI_API_KEY`)
- [ ] Wait 1-2 minutes
- [ ] Run `npm start`
- [ ] Test Assistant tab

**That's it.**

---

## Documentation

| Document | Purpose |
|----------|---------|
| `ERROR_EXPLANATION.md` | What the error means |
| `FIX_API_KEY.md` | Just add the API key |
| `DEPLOY_VIA_DASHBOARD.md` | Deploy functions via web |
| `QUICK_START.md` | 5-minute setup |
| `TROUBLESHOOTING.md` | Deep troubleshooting |
| `COMPLETION_SUMMARY.md` | Full summary of what was built |

---

## Common Questions

**Q: Do I need the Supabase CLI?**
A: No. Use the dashboard instead (see `DEPLOY_VIA_DASHBOARD.md`).

**Q: Is my data secure?**
A: Yes. No API keys in the app. Everything server-side.

**Q: Does it cost money?**
A: Yes, OpenAI charges per API call (~$0.01-0.10 per question).

**Q: Can I use a different AI model?**
A: Yes, set `OPENAI_MODEL` secret in Supabase (defaults to gpt-4o-mini).

**Q: How do I update the AI prompts?**
A: Edit `supabase/functions/ai-assistant/index.ts`, redeploy.

---

## Next Steps

1. **Get working:** Follow the 3-minute fix above
2. **Test all features:** Try analytics, capture, assistant
3. **Customize:** Edit AI prompts, settings in Supabase
4. **Expand:** Phase 5 adds embeddings & knowledge search

---

## Still Having Issues?

1. Check `ERROR_EXPLANATION.md`
2. Check function logs in Supabase dashboard
3. Verify OpenAI key is valid
4. Try the "Nuclear Option" in `TROUBLESHOOTING.md`

---

**The most likely fix: Add your OpenAI API key to Supabase Secrets.**

Try that first. Then test in the app.

If it works → You're done!

If not → Read the troubleshooting docs above.

Good luck! 🚀
