# Running OpenSail on Windows

This guide explains how to run the OpenSail app on Windows. There are two main approaches:

## Option 1: Android Emulator (Recommended)

This is the standard way to run React Native apps on Windows. You'll run the app in an Android emulator.

### Prerequisites

1. **Node.js** (>= 18.0.0)
   - Download from https://nodejs.org/

2. **Java Development Kit (JDK) 17**
   - Download from https://adoptium.net/
   - Set `JAVA_HOME` environment variable

3. **Android Studio**
   - Download from https://developer.android.com/studio
   - During installation, make sure to install:
     - Android SDK
     - Android SDK Platform
     - Android Virtual Device (AVD)

### Android Studio Setup

1. **Open Android Studio**
2. **Configure SDK**:
   - Go to: Settings → Appearance & Behavior → System Settings → Android SDK
   - Select "SDK Platforms" tab
   - Check "Android 13.0 (Tiramisu)" or higher
   - Select "SDK Tools" tab
   - Check:
     - Android SDK Build-Tools
     - Android Emulator
     - Android SDK Platform-Tools
   - Click "Apply" to install

3. **Set Environment Variables**:
   ```powershell
   # Add to System Environment Variables
   ANDROID_HOME = C:\Users\YourUsername\AppData\Local\Android\Sdk
   
   # Add to Path:
   %ANDROID_HOME%\platform-tools
   %ANDROID_HOME%\emulator
   %ANDROID_HOME%\tools
   %ANDROID_HOME%\tools\bin
   ```

4. **Create Virtual Device**:
   - Open Android Studio
   - Tools → Device Manager
   - Click "Create Device"
   - Select a tablet (e.g., "Pixel Tablet")
   - Select a system image (API 33 or higher)
   - Click "Finish"

### Running the App

1. **Install dependencies**:
   ```powershell
   npm install
   ```

2. **Setup native folders** (one-time):
   ```powershell
   npm run setup-native
   ```

3. **Start Android Emulator**:
   - Open Android Studio → Device Manager
   - Click the play button next to your virtual device
   - Wait for the emulator to fully boot

4. **Verify device is connected**:
   ```powershell
   adb devices
   ```
   You should see your emulator listed.

5. **Start Metro Bundler**:
   ```powershell
   npm start
   ```
   Keep this terminal open.

6. **Run the app** (in a new terminal):
   ```powershell
   npm run android
   ```

The app will build and install on your emulator!

### Troubleshooting Android on Windows

**"SDK location not found"**
- Make sure `ANDROID_HOME` is set correctly
- Restart your terminal/IDE after setting environment variables

**"No devices found"**
- Make sure the emulator is running
- Run `adb devices` to verify connection
- Try `adb kill-server` then `adb start-server`

**Build fails**
- Clean the build: `cd android && gradlew clean && cd ..`
- Delete `android/app/build` folder
- Try again

**Metro bundler port in use**
- Kill the process: `npx react-native start --port 8082`
- Or find and kill the process on port 8081

---

## Option 2: Physical Android Device

You can also run on a physical Android tablet connected via USB.

### Setup

1. **Enable Developer Options** on your device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings → Developer Options
   - Enable "USB Debugging"

2. **Connect device via USB**

3. **Verify connection**:
   ```powershell
   adb devices
   ```
   You should see your device listed.

4. **Run the app**:
   ```powershell
   npm start
   npm run android
   ```

---

## Option 3: Expo (Alternative - Easier Setup)

If you're having trouble with the native setup, you can use Expo which is easier to set up on Windows.

### Convert to Expo (Optional)

```powershell
# Install Expo CLI
npm install -g expo-cli

# Install Expo in your project
npx expo install

# Run with Expo
npx expo start
```

Then scan the QR code with the Expo Go app on your phone/tablet.

**Note**: Some native features (like serial port access) won't work with Expo.

---

## Windows Desktop App (Advanced)

React Native for Windows allows running as a native Windows desktop app, but it requires:
- Visual Studio 2022 with C++ development tools
- Windows 10 SDK
- Additional configuration

This is more complex and not recommended for marine tablet use. Stick with Android emulator for development.

---

## Quick Reference

### Common Commands

```powershell
# Install dependencies
npm install

# Setup native folders (one-time)
npm run setup-native

# Start Metro bundler
npm start

# Run on Android
npm run android

# Run tests
npm test

# Build TypeScript
npm run build

# Clean build
cd android
.\gradlew clean
cd ..
```

### Useful ADB Commands

```powershell
# List connected devices
adb devices

# Restart ADB server
adb kill-server
adb start-server

# Install APK manually
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# View logs
adb logcat

# Reverse port (for Metro)
adb reverse tcp:8081 tcp:8081
```

---

## Performance Tips

1. **Use Hardware Acceleration**:
   - Enable Intel HAXM or AMD Hypervisor in BIOS
   - This makes the emulator much faster

2. **Allocate More RAM to Emulator**:
   - Edit AVD settings in Android Studio
   - Increase RAM to 4GB or more

3. **Use x86_64 System Image**:
   - Faster than ARM images on Windows
   - Select x86_64 when creating AVD

4. **Close Unnecessary Apps**:
   - Android emulator is resource-intensive
   - Close other apps while developing

---

## Next Steps

Once you have the app running:

1. Configure Mapbox access token (see RUNNING_THE_APP.md)
2. Test the route planner interface
3. Try the simulated instrument data
4. Connect to real marine instruments (requires physical device)

For more detailed information, see:
- `QUICKSTART.md` - Quick start guide
- `RUNNING_THE_APP.md` - Detailed running instructions
- `SETUP_COMPLETE.md` - Configuration details
