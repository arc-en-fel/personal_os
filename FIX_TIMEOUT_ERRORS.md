# Quick Fix: Timeout Errors in ai-assistant Function

You can see in the dashboard that the function is timing out. **This is usually fixed by redeploying the function after adding secrets.**

## 🚀 One-Command Fix

```bash
supabase functions deploy ai-assistant
```

Then:
1. Wait 30 seconds
2. Run `npm start`
3. Go to Assistant tab
4. Try asking a question

---

## If That Doesn't Work

Try these in order:

### Fix 1: Redeploy with Force
```bash
supabase functions deploy ai-assistant --force
```

### Fix 2: Clear and Redeploy
```bash
# Stop the app first (Ctrl+C if running)

# Redeploy function
supabase functions deploy ai-assistant

# Restart app
npm start
```

### Fix 3: Check If Issue is OpenAI

The timeout errors (23-31ms) suggest the function is crashing before it even reaches OpenAI. This could be:
- Missing secret (but you added it)
- Secret not yet propagated (wait 2 minutes, redeploy)
- Network issue

Try:
1. Wait 2 minutes after adding secret
2. Redeploy function
3. Clear app cache: `npm start` → Press `Shift+C` when prompted
4. Test

### Fix 4: Nuclear Option

```bash
# Delete function
supabase functions delete ai-assistant

# Wait 30 seconds

# Redeploy
supabase functions deploy ai-assistant

# Test
npm start
```

---

## Testing

After redeploying, test with:

1. Open app
2. Go to Assistant tab
3. Ask: "Hello"
4. Should get response like "Hello! How can I help?"

If still error, check:
- Supabase dashboard → Functions → `ai-assistant` → Logs
- Look for error message
- That will tell you what's wrong

---

## Most Likely Solution

The function code is correct but it needs secrets to be "injected" into it. When you added the secret, the function didn't automatically reload.

**Redeploy to inject the secret:**

```bash
supabase functions deploy ai-assistant
```

That should fix it 90% of the time.

Let me know if that works!
