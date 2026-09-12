# Quick Deploy Checklist

## Do this NOW (5 min):

### 1. Create Railway account
```bash
# https://railway.app
# Sign up with GitHub
```

### 2. Deploy from GitHub
```
Dashboard → New Project → Deploy from GitHub
Select: personal-tracker repo
Click Deploy
```

### 3. Add Railway variables
```
In Railway → Variables → Add:

EXPO_PUBLIC_SUPABASE_URL
sb_publishable_wovCH3mun2sskE6V2upBxw_HcpyhmYJ
```

Copy variables from your `.env` file

### 4. Get Railway URL
```
Dashboard → Deployments → Domain

Example: https://personal-tracker-production.railway.app
```

### 5. Create EAS token
```bash
eas login

# Go to: https://expo.dev/accounts/[username]/access-tokens
# Create new token → copy it
```

### 6. Add GitHub secrets
```
GitHub → Settings → Secrets and variables → Actions

EAS_TOKEN = (your token from step 5)
EXPO_PUBLIC_API_URL = (your Railway URL from step 4)
EXPO_PUBLIC_SUPABASE_URL = https://qluxovfszsvdhmgkbvmp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_wovCH3mun2sskE6V2upBxw_HcpyhmYJ
```

### 7. Create first release
```bash
git tag v1.0.0
git push --tags

# Wait 15-20 min for build...
# Check: GitHub → Actions
```

### 8. Download APK
```
GitHub → Releases → v1.0.0 → Download app.apk
```

### 9. Install on phone
```
Transfer APK to Android phone
Settings → Install from Unknown Sources → ON
Open APK → Install
```

---

## Done! 🎉

Your app now:
- ✓ Runs on your phone
- ✓ Backend stays on Railway (24/7)
- ✓ Laptop can be off
- ✓ Auto-deploys when you push tags

Next updates: `git tag v1.0.1 && git push --tags` (repeat)

---

See `RAILWAY_GITHUB_SETUP.md` for detailed guide.
