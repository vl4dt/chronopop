# Expo Build & Play Store Publishing Guide

This guide documents how to build APKs for testing and AABs for Play Store distribution using Expo Application Services (EAS).

---

## Prerequisites

Install EAS CLI globally:

```bash
npm install -g eas-cli
```

Login to your Expo account:

```bash
eas login
```

Initialize EAS for the project (one-time setup):

```bash
eas build:configure
```

---

## Build Configuration

The `eas.json` file defines build profiles:

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Profile Descriptions

| Profile | Purpose | Output |
|---------|---------|--------|
| `development` | Local development with hot reload | Development client APK |
| `preview` | Testing on physical devices | Release APK (installable) |
| `production` | Play Store distribution | Release AAB (Play Store format) |

---

## Building APK for Physical Device Testing

Use the `preview` profile to generate an installable APK:

```bash
eas build --platform android --profile preview
```

### What happens:
- Builds a release APK signed with your credentials
- Provides a download URL and QR code
- Distribution is `internal` (not Play Store)

### Installation:
1. Scan the QR code with your Android device, or
2. Download the APK and transfer to device
3. Enable "Install from unknown sources" if prompted
4. Install and test

---

## Building AAB for Play Store

Use the `production` profile for Play Store uploads:

```bash
eas build --platform android --profile production
```

### What happens:
- Builds a release AAB (Android App Bundle)
- Signs with your production keystore
- Auto-increments version code

### Download and Upload:
1. Download the AAB from the provided link
2. Go to [Google Play Console](https://play.google.com/console)
3. Navigate to your app → Release → Testing → Internal testing
4. Create release → Upload AAB
5. Save and publish

---

## Common Issues

### Error: "Signed in debug mode"

**Error message:**
> You uploaded an APK or Android App Bundle that was signed in debug mode. You need to sign your APK or Android App Bundle in release mode.

**Cause:** Building locally with `expo run:android` or using non-EAS builds.

**Solution:** Always use EAS Build for production:

```bash
# Don't use this for Play Store:
expo run:android --variant release

# Use this instead:
eas build --platform android --profile production
```

---

### Warning: "No deobfuscation file"

**Warning message:**
> There is no deobfuscation file associated with this App Bundle. If you use obfuscated code (R8/proguard), uploading a deobfuscation file will make crashes and ANRs easier to analyze and debug.

**What it means:**
- This is optional - your app works fine without it
- Crash stack traces in Play Console may be harder to read (obfuscated)
- Most apps can safely ignore this warning

**How to fix (optional):**

Enable ProGuard in `app.json`:

```json
{
  "expo": {
    "android": {
      "enableProguardInReleaseBuilds": true
    }
  }
}
```

Then rebuild and upload the `mapping.txt` file from build artifacts to Play Console.

⚠️ **Caution:** ProGuard can cause runtime crashes with some native modules. Only enable if you need crash debugging and are willing to test thoroughly.

---

## Quick Reference

| Task | Command |
|------|---------|
| Test on device (APK) | `eas build --platform android --profile preview` |
| Play Store upload (AAB) | `eas build --platform android --profile production` |
| Development with hot reload | `npx expo start` |
| iOS build | `eas build --platform ios --profile preview` |

---

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Google Play Console](https://play.google.com/console)
- [Expo Documentation](https://docs.expo.dev/)
