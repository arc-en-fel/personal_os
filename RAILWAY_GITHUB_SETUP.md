# Railway + GitHub Actions Setup Guide

This guide walks you through deploying Personal Tracker backend to Railway and auto-building APKs via GitHub Actions.

## What will happen:

```
Your code on GitHub
       ↓
Push a tag (v1.0.0)
       ↓
GitHub Actions:
  ✓ Builds APK using EAS
  ✓ Creates GitHub Release
  ✓ Uploads APK as downloadable asset
       ↓
You download APK from GitHub Release
       ↓
Install on Android phone
       ↓
App connects to Railway backend (always running)
```

---

## Prerequisites

- [Railway account](https://railway.app) (free)
- [GitHub Actions enabled](https://github.com/settings/actions)
- [EAS account](https://expo.dev) (free)
- [EAS CLI installed](https://docs.expo.dev/build/setup/)
- Android phone or emulator

---

## Part 1: Set up Railway (Backend)

### 1.1 Create Railway account
```bash
# Go to https://railway.app
# Sign up with GitHub
```

### 1.2 Deploy from GitHub repo
```bash
# In Railway dashboard:
# 1. Click "New Project"
# 2. Select "Deploy from GitHub repo"
# 3. Select your personal-tracker repo
# 4. Railway auto-detects Dockerfile
# 5. Deploy starts automatically
```

### 1.3 Add environment variables in Railway
```
In Railway Dashboard → Variables:

EXPO_PUBLIC_SUPABASE_URL = https://qluxovfszsvdhmgkbvmp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_wovCH3mun2sskE6V2upBxw_HcpyhmYJ
```

### 1.4 Get your Railway URL
```
In Railway Dashboard → Deployments → Domain

Your public URL will be something like:
https://personal-tracker-production.railway.app
```

**Keep this URL handy!**

---

## Part 2: Set up GitHub Actions (APK Builder)

### 2.1 Create GitHub secrets
```
Go to: GitHub → Settings → Secrets and variables → Actions

Add these secrets:

EXPO_PUBLIC_SUPABASE_URL
  Value: https://qluxovfszsvdhmgkbvmp.supabase.co

EXPO_PUBLIC_SUPABASE_ANON_KEY
  Value: sb_publishable_wovCH3mun2sskE6V2upBxw_HcpyhmYJ

EXPO_PUBLIC_API_URL
  Value: https://personal-tracker-production.railway.app  (from Step 1.4)

EAS_TOKEN
  Value: (from https://expo.dev/accounts/[username]/access-tokens)
```

### 2.2 Create EAS token
```bash
# Run locally:
eas login

# In https://expo.dev/accounts/[your-username]/access-tokens
# Create a new token
# Copy the token to GitHub secret EAS_TOKEN
```

### 2.3 Verify workflow file exists
```bash
# This should exist (already created):
.github/workflows/build-release.yml
```

---

## Part 3: Build and release APK

### 3.1 Make a test release
```bash
# Local repo:
git tag v1.0.0
git push --tags

# This triggers GitHub Actions automatically
# Check: GitHub → Actions → Watch the build
```

### 3.2 Download APK
```bash
# Once build completes:
# GitHub → Releases → v1.0.0
# Download app.apk
```

### 3.3 Install on phone
```bash
# Transfer APK to Android phone
# Enable "Install from Unknown Sources"
# Open APK and tap Install
```

### 3.4 Use the app
```bash
# App connects to:
# https://personal-tracker-production.railway.app (backend on Railway)
# https://qluxovfszsvdhmgkbvmp.supabase.co (database in Supabase)

# Everything works without your laptop!
```

---

## Ongoing workflow

### To update the app:
```bash
# 1. Make code changes locally
git add .
git commit -m "Add new feature"

# 2. Tag a release
git tag v1.0.1
git push --tags

# 3. GitHub Actions auto-builds APK
# Wait ~15-20 minutes

# 4. Download from GitHub Release
# Install on phone
```

### To update backend on Railway:
```bash
# Railway auto-deploys when you push to main
git add .
git commit -m "Backend change"
git push origin main

# Railway watches your repo and redeploys automatically
```

---

## Troubleshooting

### Build fails: "EAS token invalid"
→ Check EAS_TOKEN in GitHub secrets is correct
→ Generate new token at https://expo.dev/accounts/[username]/access-tokens

### Build fails: "Cannot find Dockerfile"
→ Make sure `Dockerfile` exists in repo root
→ It should be there (already created)

### App can't connect to backend
→ Check EXPO_PUBLIC_API_URL is correct
→ Check Railway deployment is running
→ Check Railway Domain URL in dashboard

### Railway deployment fails
→ Check Railway logs: Dashboard → Deployments → Logs
→ Common issue: Missing environment variables
→ Add them in Railway → Variables

---

## Next steps

1. ✓ Create Railway account
2. ✓ Deploy repo to Railway
3. ✓ Set Railway environment variables
4. ✓ Get Railway public URL
5. ✓ Add GitHub secrets (EAS_TOKEN, API URLs)
6. ✓ Push a tag to trigger first build
7. ✓ Download and install APK on phone
8. ✓ Test the app!

---

## Files created for this setup:

- `Dockerfile` - Tells Railway how to run your app
- `railway.toml` - Railway configuration
- `.env.production` - Production environment variables
- `.github/workflows/build-release.yml` - GitHub Actions workflow

All done! Happy coding! 🚀
