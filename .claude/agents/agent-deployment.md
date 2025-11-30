---
name: agent-expo-deployment
description: Production deployment for Expo apps using EAS Build and EAS Submit
model: inherit
color: blue
---

# Agent: Expo EAS Deployment

Complete guide for deploying Expo React Native apps to production using EAS Build and EAS Submit for App Store and Google Play distribution.

## 🚀 CRITICAL: EAS Build Setup

### Install and Configure EAS CLI

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login

# Initialize EAS in your project
eas build:configure
```

### Configure app.json/app.config.js

```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp",
      "buildNumber": "1",
      "supportsTablet": true
    },
    "android": {
      "package": "com.yourcompany.yourapp",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

## 📱 IMPORTANT: EAS Build Configuration

### eas.json Configuration

```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "resourceClass": "medium"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Environment Variables for Production

```bash
# Create .env.production
API_URL=https://your-production-api.com
SENTRY_DSN=your-sentry-dsn
ANALYTICS_KEY=your-analytics-key

# Never commit sensitive keys - use EAS Secrets instead
eas secret:create --scope project --name API_SECRET --value your-secret-value
```

## 🏗️ CRITICAL: Production Build Process

### Build for iOS

```bash
# Development build with development client
eas build --platform ios --profile development

# Production build for App Store
eas build --platform ios --profile production

# Check build status
eas build:list
```

### Build for Android

```bash
# Development build
eas build --platform android --profile development

# Production build for Google Play
eas build --platform android --profile production

# Build APK for testing
eas build --platform android --profile preview
```

### Build for Both Platforms

```bash
# Build for both iOS and Android
eas build --platform all --profile production

# Auto-submit after successful build
eas build --platform all --profile production --auto-submit
```

## 📋 IMPORTANT: App Store Submission

### iOS App Store (EAS Submit)

```bash
# Submit to App Store Connect
eas submit --platform ios

# Submit specific build
eas submit --platform ios --id your-build-id

# Check submission status
eas submit:list
```

### Required iOS Configuration

```json
// app.json iOS section
"ios": {
  "bundleIdentifier": "com.yourcompany.yourapp",
  "buildNumber": "1",
  "supportsTablet": true,
  "infoPlist": {
    "CFBundleAllowMixedLocalizations": true,
    "ITSAppUsesNonExemptEncryption": false
  },
  "associatedDomains": ["applinks:yourapp.com"],
  "privacyManifests": {
    "NSPrivacyAccessedAPITypes": []
  }
}
```

### Android Google Play (EAS Submit)

```bash
# Submit to Google Play Console
eas submit --platform android

# Submit with specific track
eas submit --platform android --track internal

# Available tracks: internal, alpha, beta, production
```

### Required Android Configuration

```json
// app.json Android section
"android": {
  "package": "com.yourcompany.yourapp",
  "versionCode": 1,
  "permissions": [
    "android.permission.INTERNET",
    "android.permission.CAMERA"
  ],
  "blockedPermissions": [
    "android.permission.RECORD_AUDIO"
  ]
}
```

## 🔧 HELPFUL: Advanced Configuration

### Code Signing (iOS)

```bash
# Create distribution certificate and provisioning profile
eas credentials

# Configure automatic code signing
eas build:configure
```

### Android Signing

```bash
# Generate upload keystore
eas credentials

# Manual keystore configuration in eas.json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "credentialsSource": "local"
      }
    }
  }
}
```

### Build Optimization

```json
// eas.json optimization
{
  "build": {
    "production": {
      "env": {
        "NODE_ENV": "production"
      },
      "ios": {
        "resourceClass": "m-medium",
        "cache": {
          "disabled": false
        },
        "image": "latest"
      },
      "android": {
        "resourceClass": "medium",
        "withoutCredentials": false,
        "cache": {
          "disabled": false
        }
      }
    }
  }
}
```

## 🔍 HELPFUL: Monitoring and Updates

### OTA Updates with EAS Update

```bash
# Install EAS Update
npx expo install expo-updates

# Configure updates in app.json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/your-project-id"
    },
    "runtimeVersion": "1.0.0"
  }
}

# Publish update
eas update --branch production --message "Bug fixes"

# Preview update
eas update --branch preview
```

### Build Analytics

```bash
# View build history
eas build:list --limit 10

# View specific build details
eas build:view your-build-id

# Download build artifacts
eas build:artifacts --build-id your-build-id
```

## 🛠️ HELPFUL: Common Commands Reference

| Command | Description |
|---------|------------|
| `eas build --platform ios` | Build for iOS |
| `eas build --platform android` | Build for Android |
| `eas build --platform all` | Build for both platforms |
| `eas submit --platform ios` | Submit to App Store |
| `eas submit --platform android` | Submit to Google Play |
| `eas build:list` | View build history |
| `eas build:cancel` | Cancel running build |
| `eas credentials` | Manage certificates |
| `eas update` | Publish OTA update |
| `eas project:info` | View project details |
| `eas whoami` | Show current user |
| `eas logout` | Logout from EAS |

## 🚨 Quick Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| Build fails with "No bundle identifier" | Missing bundleIdentifier in iOS config | Add bundleIdentifier to app.json |
| Android build fails | Missing package name | Add package to android section |
| Code signing error | Invalid certificates | Run `eas credentials` to regenerate |
| Build timeout | Insufficient resources | Increase resourceClass in eas.json |
| Submit fails | Missing app in store | Create app in App Store Connect/Google Play |
| Version conflict | Version already exists | Increment buildNumber/versionCode |

## 📋 Deployment Checklist

### Pre-Build Checklist
- [ ] App icon (1024x1024) and splash screen created
- [ ] Bundle identifier/package name configured
- [ ] Version and build numbers set
- [ ] Environment variables configured
- [ ] EAS project initialized

### iOS App Store Checklist
- [ ] Apple Developer account active
- [ ] App created in App Store Connect
- [ ] Distribution certificate valid
- [ ] Provisioning profile configured
- [ ] App privacy policy URL added
- [ ] App Store screenshots and metadata ready

### Google Play Checklist
- [ ] Google Play Console account active
- [ ] App created in Google Play Console
- [ ] Upload keystore configured
- [ ] App signing by Google Play enabled
- [ ] Store listing complete with screenshots

### Post-Deployment Checklist
- [ ] App successfully builds for all platforms
- [ ] Test builds distributed to internal testers
- [ ] Production builds submitted to stores
- [ ] OTA update mechanism tested
- [ ] Analytics and crash reporting configured

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [App Store Connect Guide](https://developer.apple.com/app-store-connect/)
- [Google Play Console Guide](https://support.google.com/googleplay/android-developer/)