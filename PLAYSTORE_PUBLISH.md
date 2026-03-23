# Google Play Store Publication Guide - Chronopop

## ✅ Pre-Publication Checklist

### 1. App Configuration (COMPLETED)
- [x] Removed `expo-dev-client` from dependencies (production only)
- [x] Privacy policy created at `PRIVACY_POLICY.md`
- [x] Android `versionCode` set to 1 in app.json
- [x] Package name: `com.chronopop.app`
- [x] Release signing configured in `android/app/build.gradle`

### 2. Required Assets Check
Verify these exist in `/assets/` folder:
- [ ] `icon.png` - 1024x1024 app icon (required for Play Store)
- [ ] `splash-icon.png` - App splash screen
- [ ] `android-icon-foreground.png` - Adaptive icon foreground
- [ ] `android-icon-background.png` - Adaptive icon background
- [ ] `favicon.png` - Web favicon

### 3. Store Listing Requirements

**App Information:**
- **Title**: Chronopop (30 characters max)
- **Short Description**: Precision alarm, timer & stopwatch app (80 characters max)
- **Full Description**: Example below

**Full Description Template:**
```
Chronopop - The Ultimate Precision Timekeeping Experience

Chronopop is a beautiful, feature-rich alarm, timer, and stopwatch app designed for users who demand precision and elegance.

KEY FEATURES:
⏰ Multiple Alarms with customizable sounds
⏱️ Unlimited Timers with Pomodoro focus mode
⏲️ Multi-stopwatch with lap tracking
🎨 Beautiful Catppuccin themes (Latte, Frappe, Macchiato, Mocha)
📳 Haptic feedback for precise interactions
🔔 Reliable notifications even when app is closed
📊 Track your focus time and completed routines

PERFECT FOR:
• Managing daily routines and reminders
• Pomodoro focus sessions
• Cooking and baking timers
• Workout intervals
• Professional time tracking
• Studying and productivity

PRIVACY-FOCUSED:
All your data stays on your device. No accounts required, no cloud syncing, complete privacy.

Try Chronopop free for 30 days with full access to all Pro features!
```

**Graphic Assets Needed:**
- [ ] Feature Graphic: 1024x500px (required)
- [ ] Phone Screenshots: 2-8 screenshots (1080x1920 or similar)
- [ ] 7-inch Tablet Screenshot: Optional
- [ ] 10-inch Tablet Screenshot: Optional

### 4. Content Rating
You'll need to complete the content rating questionnaire in Play Console:
- Category: Utilities/Tool
- Content rating: Everyone (no violence, no sensitive content)

### 5. Build & Upload Steps

#### Step 1: Install Dependencies
```bash
cd /Users/ricardo/antigravity/chronopop
npm install
```

#### Step 2: Clean Build (Important!)
```bash
cd android
./gradlew clean
cd ..
```

#### Step 3: Generate Upload Key (First Time Only)
```bash
cd android/app
keytool -genkey -v -keystore chronopop-upload-key.keystore -alias chronopop-key -keyalg RSA -keysize 2048 -validity 10000
```
**⚠️ CRITICAL**: Back up `chronopop-upload-key.keystore` and remember the password. You cannot update the app without this key.

#### Step 4: Configure Signing (Local.properties)
Create/edit `android/local.properties`:
```
sdk.dir=/Users/$USER/Library/Android/sdk
```

Create signing configuration by editing `android/app/build.gradle` signingConfigs section:
```gradle
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        storeFile file('chronopop-upload-key.keystore')
        storePassword 'YOUR_KEYSTORE_PASSWORD'
        keyAlias 'chronopop-key'
        keyPassword 'YOUR_KEY_PASSWORD'
    }
}
```

#### Step 5: Build Release AAB
```bash
cd android
./gradlew bundleRelease
```

The AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

#### Alternative: Build APK for Testing
```bash
cd android
./gradlew assembleRelease
```
APK location: `android/app/build/outputs/apk/release/app-release.apk`

### 6. Play Console Setup

**1. Create Developer Account**
- Go to https://play.google.com/console
- Pay $25 one-time registration fee
- Complete account verification

**2. Create New App**
- Click "Create app"
- App name: Chronopop
- Default language: English (United States)
- App or game: App
- Free or paid: Free (you have 30-day trial, not paid)

**3. Complete Dashboard Sections:**

**Store Presence:**
- Upload app icon (512x512px from your icon.png)
- Upload feature graphic (1024x500px)
- Add screenshots (phone - minimum 2)
- Fill in title, short description, full description

**App Content:**
- Privacy Policy URL: Upload PRIVACY_POLICY.md to your website/GitHub and link it
  - Option: Host on GitHub Pages or any free hosting
  - Or use: https://www.freeprivacypolicy.com/live/
- App Access: All functionality available without special access
- Content Rating: Complete questionnaire (will be "Everyone")
- Target Audience: Suitable for all ages
- News Apps: No
- COVID-19: Not a COVID-19 app

**App Releases:**
- Production tab → Create new release
- Upload your AAB file
- Release name: 1.0.0
- Release notes:
```
Initial release of Chronopop!

Features:
- Multiple alarms with custom sounds
- Timers with Pomodoro focus mode
- Multi-stopwatch with lap tracking
- Beautiful themes (Catppuccin palette)
- Local data storage - complete privacy
- 30-day free trial with full Pro access
```

### 7. Testing Before Release

**Internal Testing (Recommended):**
- Upload to "Internal testing" track first
- Add your email as a tester
- Download and test the app via Play Store link
- Check all features work correctly

**Test Checklist:**
- [ ] App launches without crashes
- [ ] Create and test an alarm
- [ ] Create and test a timer
- [ ] Create and test a stopwatch with laps
- [ ] Verify notifications work
- [ ] Test theme switching
- [ ] Verify trial status shows correctly

### 8. Post-Publication

**After approval (24-48 hours typically):**
- Monitor crash reports in Play Console
- Respond to user reviews
- Check analytics for download trends

**Future Updates:**
- Increment `versionCode` in app.json for each release
- Update `versionName` (e.g., "1.0.1", "1.1.0")
- Use same signing keystore

## ⚠️ Important Notes

### About RevenueCat (Currently Disabled)
The app has RevenueCat SDK but purchases are disabled with placeholders. Before enabling real purchases:
1. Set up RevenueCat account at https://www.revenuecat.com
2. Configure products in Google Play Console
3. Update `EXPO_PUBLIC_RC_ANDROID_KEY` in environment
4. Test with sandbox purchases first

### About Convex (Currently Disabled)
Cloud sync is disabled - all data is local-only. This saves on operational costs. To re-enable later:
1. Deploy Convex backend
2. Update sync logic in SyncContext.tsx
3. Re-enable cloud mutations

### App Signing by Google Play
When you upload your first AAB, Google Play will:
1. Sign it with Google's key (App Signing)
2. You keep your upload key for future updates
3. This is more secure and recommended

## 📋 Summary of Required Actions

**Immediate (Before Upload):**
1. Ensure all assets exist in /assets/
2. Create/upload privacy policy to a public URL
3. Create 1024x500 feature graphic for Play Store
4. Build release AAB

**In Play Console:**
1. Create app listing
2. Upload AAB
3. Fill all required fields
4. Set privacy policy URL
5. Submit for review

**Timeline:**
- Initial review: 24-48 hours
- Updates: Usually 2-4 hours

---

**Need Help?**
- Expo Android docs: https://docs.expo.dev/build-reference/apk/
- React Native Android signing: https://reactnative.dev/docs/signed-apk-android
- Play Console help: https://support.google.com/googleplay/android-developer
