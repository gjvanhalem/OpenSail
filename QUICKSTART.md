# Quick Start Guide

Get OpenSail running in 3 steps:

> **Windows Users**: See [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) for Windows-specific instructions, or run `npm run windows-check` to verify your setup.

## Step 1: Setup Native Folders

Run the automated setup script:

```bash
npm run setup-native
```

This will create the `android/` and `ios/` folders needed to run the app.

**For iOS users (macOS only)**, also run:
```bash
cd ios && pod install && cd ..
```

## Step 2: Start Metro Bundler

```bash
npm start
```

Keep this terminal open.

## Step 3: Run the App

Open a new terminal and run:

**For Android:**
```bash
npm run android
```

**For iOS (macOS only):**
```bash
npm run ios
```

## That's it!

The app should now be running on your device/emulator.

---

## Troubleshooting

**"Command not found: react-native"**
- Make sure you ran `npm install` first

**"No devices found"**
- For Android: Start an emulator from Android Studio or connect a device
- For iOS: The simulator should start automatically

**Metro bundler port in use**
- Kill the process: `npx react-native start --port 8082`

**Need more help?**
- See [RUNNING_THE_APP.md](./RUNNING_THE_APP.md) for detailed instructions
- Check the [React Native documentation](https://reactnative.dev/docs/environment-setup)
