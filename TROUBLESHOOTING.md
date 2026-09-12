# Troubleshooting: "The Assistant Could Not Respond"

## What This Error Means

The mobile app tried to call the Edge Function but:
1. Function is not deployed
2. Function is not receiving requests (network issue)
3. OpenAI API key not configured
4. Function crashed/errored out

---

## Step-by-Step Diagnosis

### Step 1: Check Edge Functions in Dashboard

1. Go to **Supabase Dashboard**
2. Select your project
3. Navigate to **Edge Functions** (left sidebar)
4. You should see:
   - `parse-log` ✅ Deployed
   - `ai-assistant` ✅ Deployed
   - `index-note` ✅ Deployed

**If they're missing or show "failed":**
- Skip to "Deploy Functions" section below

---

### Step 2: Check OpenAI API Key

1. In **Supabase Dashboard**, go to **Project Settings** → **Secrets**
2. Look for `OPENAI_API_KEY`
3. If missing, add it:
   - Get key from https://platform.openai.com/api/keys
   - Copy your secret key (starts with `sk-proj-`)
   - Add as new secret named `OPENAI_API_KEY`

**If secret exists but still doesn't work:**
- Check the key is valid (not expired)
- Check your OpenAI account has billing enabled
- Try creating a new key

---

### Step 3: Check Function Logs

1. In **Supabase Dashboard**, go to **Edge Functions**
2. Click on `ai-assistant`
3. Go to **Logs** tab
4. Make a request from the app and check for errors

**Common log errors:**
- `OPENAI_API_KEY not found` → Add secret (Step 2)
- `Invalid API key` → Get new key from OpenAI
- `Token not found` → Mobile app not authenticated
- `Could not reach OpenAI` → Check internet/API status

---

## Solution Paths

### Path A: Deploy Functions (Most Common Fix)

**Prerequisites:**
- Have Supabase CLI installed locally
- Have access to project credentials

**Steps:**
```bash
# 1. Install Supabase CLI (if not already installed)
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link to your project
supabase link --project-ref qluxovfszsvdhmgkbvmp

# 4. Add OpenAI API key as secret
supabase secrets set OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# 5. Deploy Edge Functions
supabase functions deploy ai-assistant
supabase functions deploy parse-log

# 6. Verify deployment
supabase functions list
# Should show: ai-assistant (Deployed), parse-log (Deployed)
```

**Expected output from `supabase functions list`:**
```
Name               Status    Created At
ai-assistant       Deployed  2025-01-XX
parse-log          Deployed  2025-01-XX
index-note         Deployed  2025-01-XX
```

### Path B: Deploy via Supabase Dashboard (No CLI Needed)

**Step 1: Add OpenAI Secret**
1. Go to Supabase Dashboard
2. Project Settings → Secrets
3. Click "New Secret"
4. Name: `OPENAI_API_KEY`
5. Value: Your OpenAI secret key (sk-proj-...)
6. Click "Add"

**Step 2: Trigger Redeployment** 
1. Go to Edge Functions
2. Click `ai-assistant`
3. There's a "Redeploy" button or option
4. Or make a small edit to the function code and save

**Step 3: Check Status**
1. Functions tab should show "Deployed"
2. Wait 30 seconds for deployment to complete
3. Try the app again

### Path C: Check Mobile App Configuration

Make sure app has correct environment variables:

1. Check `.env` file in project root:
```
EXPO_PUBLIC_SUPABASE_URL=https://qluxovfszsvdhmgkbvmp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

2. Should match your Supabase project
3. If changed, rebuild app:
```bash
npm start
# Press Shift+C to clear cache if needed
```

### Path D: Check Internet Connectivity

1. Is the device/emulator connected to internet?
2. Can it reach other APIs? Try making another request
3. Is there a firewall blocking Supabase?
4. Try on different network (mobile hotspot vs WiFi)

---

## Quick Fixes (Try These First)

### Fix 1: Restart Everything
```bash
# 1. Stop the app
# 2. Kill the dev server (Ctrl+C)
# 3. Clear cache
npm start
# Press Shift+C when prompted

# 4. Try again
# Go to Assistant tab
# Ask a simple question
```

### Fix 2: Check OpenAI API Status
Visit: https://status.openai.com/
- Look for any red status indicators
- If down, wait for it to recover

### Fix 3: Regenerate OpenAI Key
1. Go to https://platform.openai.com/api/keys
2. Click "Regenerate secret key"
3. Copy new key
4. Update `OPENAI_API_KEY` secret in Supabase
5. Try app again

### Fix 4: Check OpenAI Account Status
1. Go to https://platform.openai.com/account/billing/overview
2. Verify you have credits
3. Check no usage limits have been hit
4. If depleted, add payment method

---

## Detailed Error Messages

### "Authentication is required"
**Cause:** User not logged in or token expired
**Fix:** 
- Log out and log back in
- Check auth is working in other screens

### "The AI service is not configured"
**Cause:** `OPENAI_API_KEY` secret not set
**Fix:**
- Go to Supabase Secrets
- Add `OPENAI_API_KEY=sk-proj-...`
- Wait 30 seconds
- Try again

### "The AI service could not answer right now" (502)
**Cause:** OpenAI API error or timeout
**Fix:**
- Check OpenAI status page
- Reduce query complexity
- Increase timeout in function settings

### "Invalid tool arguments"
**Cause:** Tool was called with wrong parameters
**Fix:**
- This is a code bug
- Check function logs for details
- File issue if persists

---

## Advanced: Manual Testing

### Test Function via cURL

```bash
# Get your auth token first (from mobile app or create one)

# Test ai-assistant
curl -X POST https://qluxovfszsvdhmgkbvmp.supabase.co/functions/v1/ai-assistant \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'

# Expected response:
# {"answer":"...","conversation_context":[...]}
```

### Check Function Code

1. Supabase Dashboard → Edge Functions
2. Click `ai-assistant`
3. Go to Code tab
4. Should see the TypeScript code
5. Check for syntax errors

---

## If All Else Fails

### Complete Reset Process

```bash
# 1. Stop everything
# Press Ctrl+C in terminal

# 2. Clear all caches
rm -rf node_modules
rm package-lock.json
npm install

# 3. Clear app cache
# Delete app from device/emulator
# or
# In Expo Go: Settings → Clear Cache

# 4. Redeploy functions with explicit key
supabase functions deploy ai-assistant --project-ref qluxovfszsvdhmgkbvmp

# 5. Regenerate all secrets
supabase secrets set OPENAI_API_KEY=sk-proj-NEW_KEY

# 6. Start fresh
npm start

# 7. Test
# Open app → Assistant tab → Ask simple question
```

---

## Verification Checklist

Before declaring "working":

- [ ] OpenAI API key is set in Supabase secrets
- [ ] Both Edge Functions show "Deployed" in dashboard
- [ ] Function logs show no errors
- [ ] App is logged in (can see other screens)
- [ ] Can make simple API calls (check Activities tab)
- [ ] Assistant responds to "Hello"
- [ ] Assistant responds to "What have I done?"
- [ ] Multi-turn conversation works
- [ ] No 500/502 errors in logs

---

## Getting Help

If still stuck:

1. **Check logs:**
   - Supabase Dashboard → Edge Functions → ai-assistant → Logs
   - Copy full error message

2. **Check function code:**
   - Make sure both functions are deployed
   - Code should match repository

3. **Verify configuration:**
   - OpenAI key exists and is valid
   - Supabase URL and keys correct in `.env`
   - User is authenticated

4. **Test OpenAI directly:**
   - Can you create a key and use it?
   - Does your account have billing?
   - Has API been rate limited?

5. **Nuclear option:**
   - Delete function, redeploy from scratch
   - Or check if new version was pushed to functions

---

## Function Deployment Commands Reference

```bash
# List all functions
supabase functions list

# Deploy specific function
supabase functions deploy ai-assistant
supabase functions deploy parse-log

# Redeploy everything
supabase functions deploy

# Delete and redeploy
supabase functions delete ai-assistant
supabase functions deploy ai-assistant

# View function details
supabase functions describe ai-assistant

# View logs in real-time
supabase functions logs ai-assistant
```

---

## Still Not Working?

The most common reasons:

1. **OpenAI key not set** (50% of cases)
   - Solution: Add secret in Supabase dashboard

2. **Function not deployed** (30%)
   - Solution: Run `supabase functions deploy ai-assistant`

3. **App not authenticated** (10%)
   - Solution: Log in/sign up

4. **OpenAI API down or no credits** (5%)
   - Solution: Check status.openai.com or add credits

5. **Network/firewall issue** (5%)
   - Solution: Try different network

---

**Start with "Deploy Functions" section above and work through methodically.**
