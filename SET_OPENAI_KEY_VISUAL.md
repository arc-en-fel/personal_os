# Step-by-Step: Add OpenAI API Key (With Visuals)

## Step 1: Get Your OpenAI API Key

1. Go to: **https://platform.openai.com/api/keys**
2. Sign in (or create account - free tier available)
3. Click **Create new secret key**
4. A key appears: `sk-proj-xxxxx...`
5. Click **Copy** to copy it
6. **Keep this secret** - don't share it

Now you have your key. ✅

---

## Step 2: Add to Supabase

1. Open **Supabase Dashboard**: https://app.supabase.com
2. Click on your project: `qluxovfszsvdhmgkbvmp`
3. In left sidebar, click **Project Settings**

   ```
   Sidebar looks like:
   - Dashboard
   - Editor
   - SQL Editor
   - Functions
   → Project Settings
   ```

4. In Settings, click **Secrets** tab

   ```
   Tabs look like:
   - General
   - Team & Roles
   → Secrets
   - Storage
   ```

5. Click **New Secret** button

6. Fill in:
   - **Name:** `OPENAI_API_KEY` (exactly as written)
   - **Value:** Paste your key from Step 1 (sk-proj-...)

7. Click **Add** button

---

## Step 3: Verify It's Added

In the Secrets tab, you should now see:
```
OPENAI_API_KEY     ••••••••••     Just now
```

(The value is hidden for security)

✅ Key is added!

---

## Step 4: Wait

Wait **1-2 minutes** for the secret to be available to your Edge Functions.

⏱️ Waiting...

---

## Step 5: Test

1. Run app: `npm start`
2. Restart if already running:
   - Press `Ctrl+C` to stop
   - Run `npm start` again
3. Log in (if not already)
4. Go to **Assistant** tab (click the `?` icon at bottom)
5. Type: `Hello`
6. Hit **Send**

**Expected:** Assistant responds with something like "Hello! I'm here to help..."

**If error:** Check troubleshooting below

---

## Troubleshooting

### Problem: Still getting "Could not respond"

**Check 1:** Did you wait 1-2 minutes after adding secret?
- Yes? Continue
- No? Wait and try again

**Check 2:** Did you restart the app?
- Yes? Continue
- No? Stop (`Ctrl+C`) and run `npm start` again

**Check 3:** Check the function logs:

1. Supabase Dashboard
2. Left sidebar → **Functions**
3. Click `ai-assistant`
4. Click **Logs** tab
5. Look for any error messages

**If you see "OPENAI_API_KEY not found":**
- Secret was added but not yet active
- Wait 2-3 minutes more
- Try again

**If you see "Invalid API key":**
- Your key is wrong or expired
- Get a new key from OpenAI
- Delete the secret in Supabase
- Add it again with the new key

### Problem: "Cannot reach OpenAI"

1. Check: https://status.openai.com
2. Make sure OpenAI isn't down
3. Check you have credits: https://platform.openai.com/account/billing/overview

---

## Visual Reference

### Where to Find Secrets

```
Supabase Dashboard
    ↓
Project Settings (left sidebar)
    ↓
Secrets (tab)
    ↓
New Secret (button)
    ↓
Name: OPENAI_API_KEY
Value: sk-proj-...
    ↓
Add (button)
```

### What You Should See

```
OPENAI_API_KEY        ••••••••••        Just now    ✓
(encrypted for security)
```

---

## If It Works

You should now be able to:

1. **Use Analytics**
   - Home → Insights → "Fitness analytics →"
   - See your workout data

2. **Log Naturally**
   - Home → "Describe several things"
   - Type: "Studied for 90 minutes"
   - AI extracts it

3. **Ask AI**
   - Assistant tab
   - Ask: "How much did I spend?"
   - Get real answer from your data

---

## Quick Summary

```
1. Get key: platform.openai.com/api/keys → Create key
2. Add to Supabase: Project Settings → Secrets → New Secret
3. Name: OPENAI_API_KEY
4. Value: Your key (sk-proj-...)
5. Click Add
6. Wait 1-2 minutes
7. Run: npm start
8. Test: Assistant tab → Ask "Hello"
```

**Done!** 🎉

---

If you're still stuck, see `TROUBLESHOOTING.md` for detailed help.
