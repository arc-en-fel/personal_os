# OTA Update System - Personal Tracker

This document explains how the automatic app update system works for Personal Tracker.

## Overview

Personal Tracker now has two deployment paths:

### 1. **OTA Updates (JavaScript/Assets only)**
- **Trigger:** Push to `main` branch
- **Workflow:** `.github/workflows/eas-update.yml`
- **Speed:** ~2-5 minutes
- **Impact:** App receives update on next startup
- **Rollback:** Previous version still available in EAS Update
- **Use for:** UI changes, bug fixes, logic changes, new features (no native changes)

### 2. **APK Builds (Native changes)**
- **Trigger:** Tag push (`git tag v1.0.1 && git push --tags`)
- **Workflow:** `.github/workflows/build-release.yml`
- **Speed:** ~15-20 minutes
- **Impact:** New APK must be manually installed on phone
- **Use for:** Native module changes, permissions, Expo SDK upgrades

---

## Architecture

```
JavaScript Changes:
  git push main
    → GitHub Actions: eas-update.yml
    → eas update --channel production
    → EAS Update Service
    → Installed app fetches on startup
    → App reloads automatically

Native Changes:
  git tag vX.Y.Z
    → GitHub Actions: build-release.yml
    → eas build --platform android
    → EAS Build Service
    → APK download
    → GitHub Release
    → Manual phone installation
```

---

## Configuration

### app.json
- `runtimeVersion`: `{ "policy": "appVersion" }`
  - Ensures OTA updates only go to compatible native versions
  - Tied to `version` field (1.0.0)

- `updates`:
  - `checkAutomatically`: "ON_LOAD" - check for updates when app starts
  - `fallbackToCacheTimeout`: 30000ms - wait 30s for update server, then use cached version

### eas.json
- `channels`:
  - `production`: OTA updates published here for the production APK
  - `preview`: Optional testing channel

- `build.production.android`:
  - Configured to receive OTA updates from the production channel

### src/lib/updateService.ts
- `checkForUpdates()`: Checks for available updates (called automatically at startup)
- `getUpdateInfo()`: Returns update diagnostics (app version, update ID, channel)
- `checkAndApplyUpdateIfAvailable()`: Manual refresh (for testing)
- `getCurrentUpdateChannel()`: Returns current update channel name

---

## How Updates Work

### App Startup
1. AuthProvider initializes
2. `checkForUpdates()` is called
3. App connects to EAS Update service (with 30-second timeout)
4. If update available:
   - Downloads update silently
   - Logs "Update downloaded, will be applied on next restart"
5. If no server/error:
   - Logs warning
   - Continues startup normally
6. On next startup, downloaded update is applied

### User Experience
- ✓ App opens normally (no interruption)
- ✓ Update downloads in background if available
- ✓ Update applied on NEXT app restart (not current session)
- ✓ If update server is down, app still works (uses last known version)
- ✓ App won't crash if update check fails

### Logging
Enable Chrome DevTools or Android Logcat to see update logs:
```
[App] Update info: { appVersion: '1.0.0', runtimeVersion: '1.0.0', ... }
[UpdateService] Checking for updates...
[UpdateService] Update available, downloading...
[UpdateService] Update downloaded successfully
```

---

## Testing OTA Updates

### Prerequisites
1. Existing production APK already installed on Android phone
2. EAS Update configured (already done)
3. Publish rights in EAS (you do - owner account)

### Test Process

**Step 1: Make a visible change**

Edit `app/(tabs)/home.tsx`:

```tsx
// Change from:
'Personal Tracker'

// Change to:
'Personal Tracker - OTA Test'
```

**Step 2: Commit and push to main**

```bash
git add app/(tabs)/home.tsx
git commit -m "test: OTA update test"
git push origin main
```

**Step 3: Wait for GitHub Actions**

- Go to GitHub → Actions
- Watch `eas-update.yml` workflow
- Should complete in 2-5 minutes
- Status should be ✓ (green checkmark)

**Step 4: Check for update on phone**

- Close the Personal Tracker app completely
- Force close from Android settings (App Info → Force Stop)
- Reopen the app
- App will check for update on startup

**Step 5: Verify update was applied**

You should see:
1. Logcat shows: `[UpdateService] Checking for updates...`
2. After ~2-5 seconds: `[UpdateService] Update downloaded successfully`
3. App shows the new text: "Personal Tracker - OTA Test"

### View Logcat Output

**Option A: Android Studio**
- Open Android Studio
- Tools → Device Manager → Select phone
- Double-click device
- Logcat panel appears at bottom

**Option B: adb command**
```bash
adb logcat | grep UpdateService
```

**Option C: View update history in EAS**
```bash
eas update:list --channel production
```

---

## Which Changes Require Which Method?

### ✓ Use OTA Update (push to main)
- React component changes
- Screen/UI changes
- Styling changes (colors, spacing, fonts)
- JavaScript logic changes
- Business logic improvements
- API endpoint changes
- Bug fixes (that don't involve native code)
- New features (no new native modules)
- Text/strings changes
- Navigation changes
- Error handling improvements

### ⚠️ Use APK Build (tag + push)
- Expo native module version changes (e.g., expo-calendar)
- React Native dependency updates
- New Android permissions
- Android manifest changes
- Expo SDK upgrades
- Changes to native plugins
- Java/Kotlin code changes
- Android configuration changes
- Changes to build settings
- New native functionality

---

## Troubleshooting

### App doesn't receive update

**Check 1: Verify runtimeVersion matches**
```bash
# In app.json, runtimeVersion should match the native build
# Current: { "policy": "appVersion" } (uses version field)
# APK version: 1.0.0
# So runtimeVersion is effectively: 1.0.0

# If you update to app version 1.1.0, existing APK v1.0.0 won't receive updates
# (because runtimeVersion changed)
```

**Check 2: Verify update was published**
```bash
eas update:list --channel production

# Should show recent updates
# If empty, update didn't publish
# Check GitHub Actions workflow logs
```

**Check 3: Check EAS project link**
```bash
eas project:info

# Should show your project ID: 7714932c-6dfa-4bcc-87f4-bc0b0b6ae2ce
# If different/empty, repo isn't linked correctly
```

**Check 4: Verify channel configuration**
```bash
eas channel:list

# Should show "production" channel
# If not, run: eas channel:create production
```

### Update available but not applied

**Check:** App might be checking but not downloading (if update server times out after 30s)

**Solution:** Force check manually:
1. Close app
2. Force stop from Settings
3. Reopen app

### "Update not available" but changes were pushed

**Check:** Possible reasons:
1. GitHub Actions workflow still running (check Actions tab)
2. Update hasn't finished publishing yet (takes 2-5 min)
3. Change was in ignored paths (.md, .gitignore, docs/**)
4. Runtime version mismatch (APK is different native version)

---

## Commands Reference

### Publish OTA update manually
```bash
eas update --platform android --channel production
```

### List all updates on production channel
```bash
eas update:list --channel production
```

### Get project information
```bash
eas project:info
```

### Get update information (from running app)
```bash
eas update:view <UPDATE_ID>
```

### Create a channel
```bash
eas channel:create production
```

---

## Files Changed

Files added/modified for OTA update system:

1. **app.json**
   - Added `runtimeVersion` configuration
   - Added `updates` configuration

2. **eas.json**
   - Added `update` section
   - Added `channels` configuration

3. **src/lib/updateService.ts** (NEW)
   - Update checking logic
   - Download logic
   - Diagnostics functions

4. **.github/workflows/eas-update.yml** (NEW)
   - GitHub Actions workflow for OTA updates
   - Triggers on push to main

5. **src/providers/AuthProvider.tsx**
   - Integrated update check at app startup
   - Non-blocking update initialization

---

## Version Information

- **Expo SDK:** 54.0.0
- **EAS Update:** Enabled (built into Expo ~54)
- **EAS Project ID:** 7714932c-6dfa-4bcc-87f4-bc0b0b6ae2ce
- **Android Package:** com.deepak_bhaskaran.personalos
- **Current App Version:** 1.0.0
- **Current Runtime Version:** 1.0.0 (via appVersion policy)

---

## Notes

- Existing APK build workflow is **NOT** changed
- Existing APK builds still work exactly the same
- OTA updates only work for the installed APK (must be built with this config)
- If you upgrade Expo SDK, you must rebuild APK (new runtime version)
- OTA updates are tied to the APK's native runtime version (runtimeVersion)
- Logs show update status but don't interfere with app operation
