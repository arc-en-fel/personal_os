# orbi Logo & Icons

## 📍 Logo Files Location

Your app logo and icons are located in: `assets/`

### Files Created:
- `icon.svg` - Vector icon (scalable)
- `icon-192x192.png` - Small icon (home screen)
- `icon-512x512.png` - Medium icon (store listings)
- `icon-1024x1024.png` - Large icon (App Store/Play Store)
- `logo.svg` - Full logo with "orbi" text
- `logo-1024x1024.png` - Logo PNG (splash screens)

## 🎨 Logo Design

**Concept:** Orbital theme with sage green and coral accents  
**Colors:**
- Sage Green (Background): #607A62
- Coral (Accents): #D8755B
- Light Neutral (Interior): #FFFDF9

## 🚀 How to View the Logo

### ❌ NOT visible in:
- Expo Go app (development mode)
- Web preview

### ✅ VISIBLE in:
1. **Native Build (EAS)**
   ```bash
   eas build --platform android
   # or
   eas build --platform ios
   ```
   After building, the icon will appear on your device's home screen and in app stores.

2. **Local Native Build**
   ```bash
   expo prebuild
   npm run android  # or npm run ios
   ```

3. **App Store / Play Store**
   - When you publish the app, this logo will be used for the app listing

## 🔧 Configuration

The logo is configured in `app.json`:
- **General icon**: `./assets/icon-1024x1024.png`
- **iOS icon**: `./assets/icon-1024x1024.png`
- **Android adaptive icon**: `./assets/icon-1024x1024.png` with sage green background

## 📝 Next Steps

To see the logo on your device:
1. Run `eas build --platform android` (or iOS)
2. Install the built APK/IPA on your device
3. The orbi logo will appear on your home screen and when you open the app

## 💡 Tips

- The logo is automatically used for:
  - Home screen icon
  - App switcher thumbnail
  - App Store listing (when published)
  - System settings
  - Notification icons

- If you want to change the logo later, just replace the PNG files in the `assets/` folder and rebuild.
