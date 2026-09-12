# Debug: Assistant Timeout/Error Issues

You can see in the Supabase dashboard that the `ai-assistant` function is timing out. Here's how to fix it.

## Quick Diagnosis

The function shows "Shutdown" and "Booted" errors with very short execution times (23-31ms), which means it's crashing or timing out immediately.

### Likely Causes (in order of probability):

1. **OpenAI API is down or unreachable**
2. **OpenAI API key is invalid/expired**
3. **Network connectivity issue**
4. **Function code has a bug**

---

## Step 1: Check OpenAI Status

1. Visit: https://status.openai.com
2. Look for any red status indicators
3. If OpenAI is down → Wait for it to recover
4. If OpenAI is up → Continue

---

## Step 2: Verify OpenAI API Key

1. Go to https://platform.openai.com/api/keys
2. Check if your key is listed and shows "Active"
3. If expired → Create a new key
4. Update in Supabase:
   - Dashboard → Secrets
   - Delete old `OPENAI_API_KEY`
   - Add new one with fresh key

---

## Step 3: Test OpenAI Connectivity

I created a test function for you. Deploy it:

```bash
supabase functions deploy ai-assistant-test
```

Then test it via the dashboard:
1. Edge Functions → `ai-assistant-test`
2. Go to "Logs" tab
3. Invoke the function (click Test button if available)
4. Check if it connects to OpenAI

**Expected result:** Should show response time and "success: true"

**If error:** You'll see what's wrong

---

## Step 4: Check Function Environment

In the dashboard:

1. Edge Functions → `ai-assistant`
2. Click **Settings** tab
3. Check:
   - Memory: Should be fine at default
   - Timeout: Should be at least 60 seconds
   - Environment: Should have access to secrets

---

## Step 5: Redeploy Function

Sometimes secrets take time to propagate. Force a redeploy:

```bash
supabase functions deploy ai-assistant --force-redeploy
```

Or via dashboard:
1. Edge Functions → `ai-assistant`
2. Go to Code tab
3. Make a tiny comment change or click "Redeploy" button
4. This forces the function to re-boot with new secrets

---

## Step 6: Manual API Test

If you have curl installed, test directly:

```bash
# Get your auth token first (you can generate one in Supabase)
# Or use an existing one from the app

curl -X POST \
  https://qluxovfszsvdhmgkbvmp.supabase.co/functions/v1/ai-assistant \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'

# You should get:
# {"answer":"...","conversation_context":[...],"confidence":"high"}

# If you get error, the error message will tell you what's wrong
```

---

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| Timeout (23-31ms) | OpenAI unreachable or key invalid | Restart function, check key |
| 503 "AI service not configured" | `OPENAI_API_KEY` not set | Add secret to Supabase |
| 401 "Authentication required" | No auth token or token expired | Log back into app |
| 502 "Could not answer" | OpenAI API error | Check OpenAI status, validate key |
| Network error | Internet issue | Check connection |

---

## Advanced: View Detailed Logs

1. Dashboard → Edge Functions → `ai-assistant`
2. Click **Logs** tab
3. Look for error details:
   - "Shutdown" = Function crashed
   - "Booted" = Function restarting
   - Specific errors show in logs

**Copy the error message** and we can debug from there.

---

## Nuclear Option: Start Fresh

If nothing works:

```bash
# 1. Delete the function
supabase functions delete ai-assistant

# 2. Wait 30 seconds

# 3. Redeploy from scratch
supabase functions deploy ai-assistant

# 4. Verify secrets are set
supabase secrets list
# Should show OPENAI_API_KEY

# 5. Test in app
npm start
```

---

## The Most Likely Fix

Based on the errors you're seeing:

1. **Redeploy function:**
   ```bash
   supabase functions deploy ai-assistant
   ```

2. **Restart app:**
   ```bash
   npm start
   ```

3. **Test:**
   - Open Assistant tab
   - Ask: "Hello"
   - Should work

**Try this first. Most of the time it works.**

---

## If Still Not Working

1. Check that `OPENAI_API_KEY` secret exists in Supabase
2. Check OpenAI API status online
3. Try creating a new OpenAI API key and updating the secret
4. Wait 2-3 minutes after updating secret
5. Redeploy the function
6. Test again

---

## Getting Help

When asking for help, provide:
1. Screenshot of dashboard showing function errors
2. Error messages from function logs
3. Your OpenAI account status (check billing)
4. When you last redeployed the function
