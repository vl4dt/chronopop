# Post-Publication Development Workflow

## Overview

This guide explains how to continue developing, debugging, and testing Chronopop after publishing to the Google Play Store.

---

## Development Options

### Option 1: Expo Go (Fastest for JS-only changes)

**Use for:** UI changes, logic updates, theme tweaks, any JavaScript-only modifications

```bash
# Start Metro bundler
cd /Users/ricardo/antigravity/chronopop
npx expo start

# Then press 'a' for Android emulator or scan QR with Expo Go app
```

**Pros:**
- Fast iteration (no native compilation)
- Hot reload for instant updates
- Perfect for React Native component changes

**Cons:**
- Cannot test native modules
- Limited to Expo Go supported APIs
- Cannot test production build behavior

---

### Option 2: Development Build (For native code changes)

**Use for:** Testing native modules, notification behavior, deep linking, production-like environment

```bash
# Install dev client for development only
npm install expo-dev-client

# Create development build
npx expo prebuild --clean
cd android && ./gradlew assembleDebug

# Run on device/emulator
npx expo run:android
```

**Pros:**
- Full native functionality
- Production-like testing environment
- Can test native modules (notifications, haptics, etc.)

**Cons:**
- Slower build times
- More complex setup
- Requires device/emulator

---

### Option 3: Internal Testing Track (Pre-release validation)

**Use for:** Validating changes before public release

**Steps:**

1. **Update version in app.json:**
```json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 2
    }
  }
}
```

2. **Build release AAB:**
```bash
cd android
./gradlew bundleRelease
```

3. **Upload to Play Console:**
- Go to Play Console → **Testing** → **Internal testing**
- Upload new AAB
- Add internal testers
- Test thoroughly before promoting to production

**Pros:**
- Real Play Store environment
- Full production validation
- Safe testing before public release

**Cons:**
- Requires Play Console access
- Slower iteration (Play Store review)
- More formal process

---

## Version Management

### Semantic Versioning
- **1.0.1** - Bug fixes and minor improvements
- **1.1.0** - New features
- **2.0.0** - Breaking changes

### Required Updates for Each Release
Always update both version fields in `app.json`:

```json
{
  "expo": {
    "version": "1.0.1",     // User-visible version
    "android": {
      "versionCode": 2      // Play Store version (must increment)
    }
  }
}
```

**Important:** `versionCode` must always increment (1, 2, 3, 4...) - Play Store rejects duplicate or lower numbers.

---

## Development vs Production Configuration

| Configuration | Development | Production |
|---------------|-------------|------------|
| **Start command** | `npx expo start` | `./gradlew bundleRelease` |
| **Dev client** | `expo-dev-client` installed | Must remove |
| **Convex** | Can enable for testing | Currently disabled |
| **RevenueCat** | Can enable for testing | Currently disabled |
| **Debug logging** | Full console logs | Minimal production logs |
| **Build type** | Debug/Development | Release/Production |

---

## Quick Debug Workflow

### For JavaScript Changes:
```bash
# 1. Make code changes
# 2. Test in Expo Go (fast iteration)
npx expo start

# 3. When satisfied, move to production build
```

### For Native Changes:
```bash
# 1. Install dev client
npm install expo-dev-client

# 2. Build development APK for testing
npx expo prebuild --clean
cd android && ./gradlew assembleDebug

# 3. Test on device/emulator
npx expo run:android
```

### For Production Release:
```bash
# 1. Remove expo-dev-client from package.json
npm uninstall expo-dev-client

# 2. Update versionCode in app.json
# 3. Build release AAB
cd android && ./gradlew bundleRelease

# 4. Upload to Play Console
```

---

## Git Workflow Strategy

### Recommended Branch Structure:
```
main          ← Production-ready code
├── develop    ← Active development
├── feature/*  ← Specific features
└── hotfix/*   ← Critical bug fixes
```

### Workflow:
1. **Development:** Work on `develop` branch
2. **Features:** Create `feature/feature-name` branches
3. **Testing:** Merge to `develop` → Internal testing track
4. **Release:** Merge `develop` to `main` → Production

### Example Commands:
```bash
# Start new feature
git checkout -b feature/pomodoro-improvements

# After development
git checkout develop
git merge feature/pomodoro-improvements

# When ready for release
git checkout main
git merge develop
```

---

## Testing Checklist Before Release

### Functional Testing:
- [ ] App launches without crashes
- [ ] Create and test an alarm
- [ ] Create and test a timer
- [ ] Create and test a stopwatch with laps
- [ ] Verify notifications work correctly
- [ ] Test theme switching
- [ ] Verify trial status displays correctly

### Technical Testing:
- [ ] Build completes without errors
- [ ] APK/AAB installs on test device
- [ ] No memory leaks or performance issues
- [ ] Permissions work as expected
- [ ] Background functionality works

### Store Testing:
- [ ] Internal testing track works
- [ ] Store listing displays correctly
- [ ] Screenshots and graphics look good
- [ ] Privacy policy link works

---

## Common Issues and Solutions

### Issue: Build fails after expo-dev-client removal
**Solution:** Clean build completely:
```bash
rm -rf android/app/.cxx android/build node_modules
npm install
cd android && ./gradlew clean && ./gradlew bundleRelease
```

### Issue: VersionCode conflict
**Solution:** Always increment versionCode, never reuse numbers

### Issue: Native module not working in Expo Go
**Solution:** Use development build for native module testing

### Issue: Play Store rejects update
**Solution:** Check versionCode increment and ensure no lower versions

---

## Environment-Specific Configuration

### Development Environment:
```json
// package.json (development)
{
  "dependencies": {
    "expo-dev-client": "~55.0.18"
  }
}
```

### Production Environment:
```json
// package.json (production)
{
  "dependencies": {
    // expo-dev-client removed
  }
}
```

### SyncContext Development Mode:
```typescript
// For development testing, you can temporarily enable:
const isSyncActive = __DEV__ ? true : false; // Enable in debug builds only
```

---

## Debugging Tools

### Expo Go Debugging:
- **Shake device** → Debug menu
- **Remote debugging** in browser
- **React DevTools** for component inspection
- **Network inspector** for API calls

### Development Build Debugging:
- **Flipper** for advanced debugging
- **Android Studio Logcat** for native logs
- **React Native Debugger** for state inspection

### Production Debugging:
- **Play Console crash reports**
- **Firebase Crashlytics** (if added)
- **User feedback and reviews**

---

## Automation Scripts

### Development Setup Script:
```bash
#!/bin/bash
# setup-dev.sh
echo "Setting up development environment..."
npm install expo-dev-client
npx expo prebuild --clean
echo "Development environment ready!"
```

### Production Build Script:
```bash
#!/bin/bash
# build-production.sh
echo "Building for production..."
npm uninstall expo-dev-client
rm -rf android/app/.cxx android/build
npm install
cd android && ./gradlew clean && ./gradlew bundleRelease
echo "Production AAB built successfully!"
```

---

## Release Process Summary

1. **Develop** on `develop` branch using Expo Go
2. **Test** native features with development build
3. **Validate** on Internal Testing track
4. **Prepare** production build (remove dev client)
5. **Release** to Production track
6. **Monitor** crash reports and user feedback

---

## Tips for Efficient Development

1. **Use Expo Go** for 90% of development (UI, logic, themes)
2. **Only use development builds** for native module testing
3. **Test on real devices** before release
4. **Keep versionCode incrementing** consistently
5. **Document breaking changes** for each release
6. **Monitor Play Console** after each release
7. **Keep backups** of signing keystore and code

---

## Future Considerations

### When Re-enabling Features:
- **RevenueCat:** Update `EXPO_PUBLIC_RC_ANDROID_KEY` and test purchases
- **Convex:** Deploy backend and update sync logic
- **Cloud Sync:** Add user authentication and data migration

### Scaling Development:
- **CI/CD pipeline** for automated builds
- **Automated testing** suite
- **Feature flags** for gradual rollouts
- **Beta testing** program with external users

---

**Remember:** The key is maintaining a clear separation between development and production builds while ensuring smooth iteration and reliable releases.
