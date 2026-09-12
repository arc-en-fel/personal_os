# Deploy Edge Functions via Supabase Dashboard (No CLI Needed)

If you don't have the Supabase CLI installed, you can deploy via the web dashboard.

## Step 1: Add OpenAI API Key

1. Go to **Supabase Dashboard**: https://app.supabase.com
2. Select your project: `qluxovfszsvdhmgkbvmp`
3. Left sidebar → **Project Settings** → **Secrets**
4. Click **New Secret**
   - Name: `OPENAI_API_KEY`
   - Value: `sk-proj-YOUR_KEY_HERE` (from https://platform.openai.com/api/keys)
5. Click **Add**
6. Wait 1 minute for secret to propagate

---

## Step 2: Deploy ai-assistant Function

1. Left sidebar → **Functions** (or **Edge Functions**)
2. You should see `ai-assistant` listed
3. Click on it
4. Go to the **Code** tab
5. The code should be there from the repository
6. Look for a "Deploy" or "Redeploy" button
7. Click it

**OR if no deploy button:**
- The function is already deployed
- Go to **Logs** tab to check for errors

---

## Step 3: Deploy parse-log Function

Repeat Step 2 for `parse-log`:
1. Edge Functions list
2. Click `parse-log`
3. Go to **Code** tab
4. Click **Deploy** (if available)

---

## Step 4: Verify Functions Are Running

1. Edge Functions list
2. Both should show:
   - `ai-assistant` ✅ (green checkmark)
   - `parse-log` ✅ (green checkmark)

3. Click each one → **Logs** tab
4. Should be empty or show successful invocations

---

## Step 5: Test in App

1. Run app: `npm start`
2. Log in
3. Open **Assistant** tab
4. Type: `Hello`
5. Should get response

**If error:** Check logs in dashboard for error message

---

## What if Functions Don't Show in Dashboard?

They might already be deployed from the repository.

**Check:** 
1. Go to Edge Functions
2. Do you see `ai-assistant` and `parse-log`?
3. If yes → Skip to "Test in App" above
4. If no → They need to be created first

**To create them manually:**
1. Click **Create New Function**
2. Name it: `ai-assistant`
3. Paste code from `supabase/functions/ai-assistant/index.ts`
4. Click **Deploy**
5. Repeat for `parse-log`

---

## Common Issues

### "I don't see a Deploy button"
→ Function might already be deployed. Try testing in app.

### "Deploy button is greyed out"
→ No code changes. Just test in app.

### "I see 'Error' status in logs"
→ Check error message. Usually it's:
- `OPENAI_API_KEY not found` → Add secret (Step 1)
- `Invalid OpenAI key` → Get new key

### "Function exists but not working"
→ The code might be outdated. 
- Get latest code from `supabase/functions/ai-assistant/index.ts`
- Paste into Code tab
- Deploy again

---

## Quick Test

Once deployed, test without the app:

1. Go to Edge Functions → `ai-assistant`
2. Click **Code** tab
3. Look for test URL: `https://qluxovfszsvdhmgkbvmp.supabase.co/functions/v1/ai-assistant`
4. This URL should be available

---

## Fallback: Use Supabase CLI

If you have Node.js installed:

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref qluxovfszsvdhmgkbvmp

# Set OpenAI key
supabase secrets set OPENAI_API_KEY=sk-proj-YOUR_KEY

# Deploy
supabase functions deploy ai-assistant
supabase functions deploy parse-log
```

Then verify in dashboard.

---

## That's It!

Your functions should now be deployed. Test in the app:
1. Assistant tab
2. Ask: "What have I done?"
3. Should get response

If not, see `TROUBLESHOOTING.md`.
