# Quick Fix: Add OpenAI API Key to Supabase

This is the most common reason the assistant doesn't work.

## 5-Minute Fix

### 1. Get OpenAI API Key
- Go to: https://platform.openai.com/api/keys
- Sign in (or create free account)
- Click **Create new secret key**
- Copy it (looks like: `sk-proj-...`)
- Don't share this key with anyone

### 2. Add Key to Supabase

1. Go to: https://app.supabase.com
2. Click on your project (`qluxovfszsvdhmgkbvmp`)
3. Left sidebar → **Project Settings**
4. Click **Secrets** tab
5. Click **New Secret**

Enter:
- **Name:** `OPENAI_API_KEY`
- **Value:** Paste your key (sk-proj-...)

6. Click **Add**

### 3. Wait and Test

- Wait 1-2 minutes for key to be available to functions
- Run app: `npm start`
- Go to Assistant tab
- Ask: "Hello"
- Should work now!

---

## If It Still Doesn't Work

### Check 1: Is Key Valid?
- Go to https://platform.openai.com/api/keys
- Make sure your key is listed
- Try regenerating the key

### Check 2: Does Account Have Credits?
- Go to https://platform.openai.com/account/billing/overview
- Check you have credits remaining
- If not, add a payment method

### Check 3: Verify It Was Added
1. Supabase dashboard
2. Project Settings → Secrets
3. Should see `OPENAI_API_KEY` listed
4. (Value is hidden for security)

### Check 4: Check Function Logs
1. Edge Functions
2. Click `ai-assistant`
3. Go to **Logs** tab
4. If you see error like "OPENAI_API_KEY not found"
   - Key wasn't added yet
   - Wait another 1-2 minutes
   - Try again

---

## Done!

The assistant should now respond to questions. Try:
- "How much did I spend this week?"
- "What are my goals?"
- "Log that I studied for 60 minutes"

If any issues, see `TROUBLESHOOTING.md`.
