# Railway + GitHub Actions: Step-by-Step Setup

## Overview

After completing this setup, you'll have:
- ✓ App deployed on Railway (backend always on)
- ✓ GitHub Actions auto-building APKs when you push tags
- ✓ APK downloads available on GitHub Releases
- ✓ No laptop needed to use the app

---

## STEP 1: Create Railway Account (2 min)

1. Go to **https://railway.app**
2. Click **"Start Now"**
3. Sign up with **GitHub** (recommended)
4. Authorize Railway to access your repos

---

## STEP 2: Deploy to Railway (5 min)

1. In Railway dashboard, click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. Select your **personal-tracker** repo
4. Railway auto-detects the `Dockerfile`
5. Click **"Deploy"** → starts building (takes 2-5 min)

**While Railway builds**, continue to Step 3.

---

## STEP 3: Get EAS Account & Token (5 min)

EAS (Expo Application Services) builds your Android APK in the cloud.

### 3.1 Create free EAS account
```bash
# In terminal:
eas login

# Browser will open → Sign up / Login with email
# Or use existing Expo account
```

### 3.2 Generate EAS token
1. Go to **https://expo.dev**
2. Click your profile → **"Settings"** → **"Access Tokens"**
3. Click **"Create Token"**
4. Name it: `github-actions`
5. Copy the token (looks like: `ey...`)

**Keep this token safe** — you'll add it to GitHub in Step 5.

---

## STEP 4: Configure GitHub Secrets (5 min)

These secrets let GitHub Actions build your APK.

1. Go to **GitHub.com** → your repo
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** and add each:

### Secret 1: `EAS_TOKEN`
- **Value:** Paste your EAS token from Step 3.2

### Secret 2: `EXPO_PUBLIC_SUPABASE_URL`
- **Value:** `https://qluxovfszsvdhmgkbvmp.supabase.co`

### Secret 3: `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** `sb_publishable_wovCH3mun2sskE6V2upBxw_HcpyhmYJ`

### Secret 4: `EXPO_PUBLIC_API_URL` (Optional for now)
- **Value:** Leave empty or use your Railway URL when ready

---

## STEP 5: Verify Railway is running

Check if Railway deployment finished:

1. Go to Railway dashboard
2. Click your **personal-tracker** project
3. Click **"Deployments"** tab
4. Status should be **"Success"** (green checkmark)

If still building (orange), wait a few more minutes.

**Once successful**, copy your Railway URL:
- Click **"Environment"** tab
- Under **"Domain"**, copy the full URL (example: `https://personal-tracker-production.railway.app`)

Then go back to GitHub Secrets and update `EXPO_PUBLIC_API_URL` with this URL.

---

## STEP 6: Create First Release (20 min)

Now test the entire pipeline.

### 6.1 Create and push a tag
```bash
# In your local repo:
git tag v1.0.0
git push --tags

# This triggers GitHub Actions automatically
```

### 6.2 Monitor the build
1. Go to **GitHub.com** → your repo
2. Click **"Actions"** tab
3. Watch the **"Build & Release APK"** workflow
4. It will show:
   - ✓ Setup Node.js
   - ✓ Install dependencies
   - ✓ Build APK (takes 10-15 min)
   - ✓ Create GitHub Release

---

## STEP 7: Download APK (1 min)

Once the GitHub Actions workflow completes (green checkmark):

1. Go to **GitHub.com** → your repo
2. Click **"Releases"** (right sidebar)
3. Click your release **v1.0.0**
4. Under **"Assets"**, download **app.apk**

---

## STEP 8: Install on Android Phone (5 min)

### 8.1 Transfer APK to phone
- Email yourself the APK, or
- Use ADB (Android Debug Bridge), or
- Use any file transfer method

### 8.2 Enable "Unknown Sources"
1. Phone Settings → **Apps & notifications** → **Advanced**
2. Click **"Install unknown apps"**
3. Select your file manager → **Allow**

### 8.3 Install APK
1. Open file manager on phone
2. Navigate to the APK file
3. Tap it → **Install**
4. Wait for installation (~30 sec)

---

## STEP 9: Launch & Test (2 min)

1. Home screen → find **"Personal OS"** app
2. Tap to open
3. Sign in with your account
4. Test features:
   - ✓ Calendar loads
   - ✓ Create event
   - ✓ Add transaction
   - ✓ View projects

If all works → **Success!** 🎉

---

## Ongoing Workflow (Future Updates)

### To release new version:
```bash
# Make code changes
git add .
git commit -m "Add new feature"

# Create new release
git tag v1.0.1
git push --tags

# GitHub Actions auto-builds
# Download new APK from GitHub Releases
```

### To update backend:
```bash
# Make changes to backend services
git add .
git commit -m "Fix API endpoint"
git push origin main

# Railway auto-deploys on push to main
# Changes live in ~2-5 min
```

---

## Troubleshooting

### GitHub Actions build fails with "EAS_TOKEN invalid"
- Go to **https://expo.dev** → Settings → Access Tokens
- Check your token is still valid (hasn't expired)
- Generate a new token if needed
- Update `EAS_TOKEN` secret in GitHub

### Build fails: "Cannot find Dockerfile"
- Make sure `Dockerfile` exists in repo root
- Run: `ls -la Dockerfile`
- It should be there (already created in setup)

### APK fails to download on GitHub Actions
- Check **Actions** tab → Build logs
- Look for error messages
- Try re-running the workflow

### App can't connect to backend
- Check phone is connected to internet (WiFi or data)
- Check Railway deployment is still running (Railway dashboard)
- Verify `EXPO_PUBLIC_SUPABASE_URL` is correct

### Railway deployment fails
- Check Railway dashboard → Deployments → Logs
- Common issue: Missing environment variables
- Go to Railway → Variables → add all required env vars

---

## Checklist: You're Done When...

- [ ] Railway account created
- [ ] Repo deployed to Railway
- [ ] Railway deployment status = "Success"
- [ ] EAS account created + token generated
- [ ] GitHub Secrets added (4 secrets)
- [ ] First tag pushed (v1.0.0)
- [ ] GitHub Actions build completed
- [ ] APK downloaded from Releases
- [ ] APK installed on Android phone
- [ ] App opens and works

**Once all are checked** → You're ready to build & release! 🚀

---

## Next: Development Workflow

Now that everything is set up:

1. **Work locally** (code changes, test on Expo Go)
2. **Push to main** when ready (Railway auto-deploys backend)
3. **Create release tag** (e.g., `git tag v1.0.1 && git push --tags`)
4. **Wait for APK** (GitHub Actions builds ~15-20 min)
5. **Download & install** on phone
6. **Done!** New version live

---

## Support

- **Railway docs:** https://railway.app/docs
- **Expo/EAS docs:** https://docs.expo.dev
- **GitHub Actions:** https://docs.github.com/en/actions

Feel free to ask for help if any step fails!
