# Error: "The Assistant Could Not Respond"

## What This Error Means

When you see this error in the app, it means one of these happened:

1. ❌ **OpenAI API key is not configured** (Most Common)
2. ❌ **Edge Function crashed or returned error**
3. ❌ **Network connection issue**
4. ❌ **Function not deployed**

## The Most Likely Fix (90% of cases)

**Your OpenAI API key is not set in Supabase.**

### Fix It in 3 Minutes:

1. **Get a key:**
   - Visit: https://platform.openai.com/api/keys
   - Click **Create new secret key**
   - Copy the key (looks like `sk-proj-xxx...`)

2. **Add it to Supabase:**
   - Go to: https://app.supabase.com
   - Select your project
   - Project Settings → Secrets
   - Click **New Secret**
   - Name: `OPENAI_API_KEY`
   - Value: Paste your key
   - Click **Add**

3. **Test:**
   - Wait 1 minute
   - Run `npm start`
   - Go to Assistant tab
   - Ask: "Hello"
   - Should work now

---

## How the Assistant Works

When you ask a question:

```
1. Mobile App sends question
   ↓
2. Supabase Edge Function receives it
   ↓
3. Function needs OPENAI_API_KEY to call OpenAI
   ↓
4. If key missing → Error: "Could not respond"
   ↓
5. If key valid → OpenAI generates answer
   ↓
6. Function returns answer to app
```

**If step 3 fails** = Error message in app

---

## Why This Happens

The code needs to call OpenAI to:
- Parse your question
- Find relevant tools
- Generate a natural language answer

To make this call, the Edge Function needs:
- `OPENAI_API_KEY` secret set in Supabase
- Your OpenAI account must have credits

Without the key → Can't call OpenAI → Error

---

## Verification Checklist

Before and after adding the key:

| Check | Status |
|-------|--------|
| Have OpenAI account? | ✓ Create one |
| Have API key? | ✓ Get from platform.openai.com |
| Key added to Supabase Secrets? | ✓ Add it |
| Waited 1+ minute? | ✓ Yes |
| App restarted? | ✓ Run `npm start` |
| Tried asking a question? | ✓ Test now |

---

## Still Getting Error?

### Check Function Logs

1. Supabase Dashboard
2. Edge Functions
3. Click `ai-assistant`
4. Go to **Logs** tab
5. Look for error message

**Common log errors:**
- `OPENAI_API_KEY not found` → Key not set yet
- `Invalid API key` → Key is wrong/expired
- `Rate limited` → Used too many queries
- `Insufficient credits` → Need to add payment method

### Fix Based on Log Error

| Error | Fix |
|-------|-----|
| Key not found | Add secret to Supabase, wait 1 min |
| Invalid key | Get new key from openai.com |
| Rate limited | Wait a few hours |
| No credits | Add payment to OpenAI account |

---

## Quick Sanity Checks

**Is the function deployed?**
- Edge Functions list should show `ai-assistant` ✅

**Is the key set?**
- Project Settings → Secrets should show `OPENAI_API_KEY` (value hidden)

**Is the app logged in?**
- You should see your email/username
- Can see other screens (home, timeline, etc)

**Does the question make sense?**
- Try simple: "Hello"
- Try specific: "What have I done?"
- Avoid complex or very long questions

---

## The Most Common Mistakes

| Mistake | Fix |
|---------|-----|
| Forgot to add OpenAI API key | Add it to Supabase Secrets |
| Added key but didn't wait | Wait 1-2 minutes, try again |
| Used wrong key | Delete secret, re-add with correct key |
| App not restarted | Run `npm start` again |
| Not logged in | Sign up or log in with email |
| Using free tier with high usage | Upgrade OpenAI account |

---

## The Nuclear Option

If nothing works:

1. Delete the secret:
   - Supabase → Project Settings → Secrets
   - Delete `OPENAI_API_KEY`

2. Create a new OpenAI key:
   - https://platform.openai.com/api/keys
   - Create new secret key

3. Add it fresh:
   - Supabase → Project Settings → Secrets
   - New Secret
   - Name: `OPENAI_API_KEY`
   - Value: New key

4. Wait 2 minutes

5. Test:
   - `npm start`
   - Assistant tab
   - Ask a question

---

## TL;DR

**Get error? Do this:**

1. Go to https://platform.openai.com/api/keys
2. Create a key (copy it)
3. Go to Supabase dashboard
4. Project Settings → Secrets
5. Add secret: `OPENAI_API_KEY` = your key
6. Wait 1 minute
7. Run `npm start`
8. Try Assistant again

**Should work now.**

---

For more help, see:
- `TROUBLESHOOTING.md` - Detailed troubleshooting
- `DEPLOY_VIA_DASHBOARD.md` - How to deploy functions
- `FIX_API_KEY.md` - Just add the API key
