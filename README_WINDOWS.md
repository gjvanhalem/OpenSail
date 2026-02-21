# OpenSail on Windows - Complete Guide

This is your complete guide to running OpenSail on Windows.

## 🎯 Quick Check

Run this command to check if your system is ready:

```powershell
npm run windows-check
```

Or run the PowerShell checker:

```powershell
.\windows-quickstart.ps1
```

## 📋 What You Need

### Required Software

1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Java JDK 17** - [Download](https://adoptium.net/)
3. **Android Studio** - [Download](https://developer.android.com/studio)

### Installation Steps

#### 1. Install Node.js
- Download and install from https://nodejs.org/
- Verify: `node --version` (should be 18+)

#### 2. Install Java JDK 17
- Download from https://adoptium.net/
- Install and note the installation path
- Set `JAVA_HOME` environment variable:
  ```
  JAVA_HOME = C:\Program Files\Eclipse Adoptium\jdk-17.x.x
  ```

#### 3. Install Android Studio
- Download from https://developer.android.com/studio
- During installation, select:
  - Android SDK
  - Android SDK Platform
  - Android Virtual Device

#### 4. Configure Android SDK
Open Android Studio:
- Go to: File → Settings → Appearance & Behavior → System Settings → Android SDK
- **SDK Platforms tab**: Check "Android 13.0 (Tiramisu)" or higher
- **SDK Tools tab**: Check:
  - Android SDK Build-Tools
  - Android Emulator
  - Android SDK Platform-Tools
  - Android SDK Command-line Tools
- Click "Apply" to install

#### 5. Set Environment Variables

Add these to your System Environment Variables:

```
ANDROID_HOME = C:\Users\YourUsername\AppData\Local\Android\Sdk
```

Add to your PATH:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

**To set environment variables:**
1. Press `Win + X` → System
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Add/edit variables under "User variables"
5. **Restart your terminal/IDE** after making changes

## 🚀 Running the App

### First Time Setup

1. **Clone and install dependencies:**
   ```powershell
   cd OpenSail
   npm install
   ```

2. **Setup native folders:**
   ```powershell
   npm run setup-native
   ```
   This creates the `android/` folder needed to run the app.

3. **Create Android Virtual Device (AVD):**
   - Open Android Studio
   - Click "More Actions" → "Virtual Device Manager"
   - Click "Create Device"
   - Select "Tablet" category
   - Choose "Pixel Tablet" or similar
   - Select a system image (API 33+, x86_64 recommended)
   - Click "Finish"

### Every Time You Run

1. **Start Android Emulator:**
   - Open Android Studio → Device Manager
   - Click ▶️ next to your virtual device
   - Wait for it to fully boot (you'll see the home screen)

2. **Verify device connection:**
   ```powershell
   adb devices
   ```
   You should see something like:
   ```
   List of devices attached
   emulator-5554   device
   ```

3. **Start Metro Bundler** (in one terminal):
   ```powershell
   npm start
   ```
   Keep this running.

4. **Run the app** (in a new terminal):
   ```powershell
   npm run android
   ```

The app will build and launch on your emulator!

## 🔧 Troubleshooting

### "ANDROID_HOME is not set"
- Make sure you set the environment variable correctly
- **Restart your terminal** after setting it
- Verify: `echo $env:ANDROID_HOME` (PowerShell) or `echo %ANDROID_HOME%` (CMD)

### "No devices found"
- Make sure the emulator is running
- Run `adb devices` to check
- Try: `adb kill-server` then `adb start-server`

### "SDK location not found"
- Create `android/local.properties` with:
  ```
  sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
  ```
  (Note: use double backslashes)

### Build fails with Gradle errors
```powershell
cd android
.\gradlew clean
cd ..
npm run android
```

### Metro bundler port already in use
```powershell
# Kill the process on port 8081
npx react-native start --port 8082
```

Then in another terminal:
```powershell
npm run android -- --port 8082
```

### Emulator is slow
- Enable Hardware Acceleration:
  - Intel: Install Intel HAXM
  - AMD: Enable AMD Hypervisor in BIOS
- Use x86_64 system image (faster than ARM)
- Allocate more RAM to emulator (4GB+)
- Close other applications

### "Unable to load script"
- Make sure Metro bundler is running (`npm start`)
- Try: `npm start -- --reset-cache`
- In emulator, press `Ctrl+M` → "Reload"

## 📱 Using a Physical Device

You can also run on a physical Android tablet:

1. **Enable Developer Options:**
   - Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back → Developer Options
   - Enable "USB Debugging"

2. **Connect via USB**

3. **Verify connection:**
   ```powershell
   adb devices
   ```

4. **Run the app:**
   ```powershell
   npm start
   npm run android
   ```

## 🎨 Development Workflow

```powershell
# Run tests
npm test

# Build TypeScript
npm run build

# Lint code
npm run lint

# Format code
npm run format

# Clean build
cd android
.\gradlew clean
cd ..
```

## 📚 Useful Commands

### ADB Commands
```powershell
# List devices
adb devices

# Restart ADB
adb kill-server
adb start-server

# Install APK
adb install -r android\app\build\outputs\apk\debug\app-debug.apk

# View logs
adb logcat

# Clear app data
adb shell pm clear com.opensail

# Reverse port (for Metro)
adb reverse tcp:8081 tcp:8081
```

### Gradle Commands
```powershell
cd android

# Clean build
.\gradlew clean

# Build debug APK
.\gradlew assembleDebug

# Build release APK
.\gradlew assembleRelease

# List tasks
.\gradlew tasks

cd ..
```

### React Native Commands
```powershell
# Start Metro
npm start

# Start with cache reset
npm start -- --reset-cache

# Run on Android
npm run android

# Run on specific device
npm run android -- --deviceId=emulator-5554

# Build release
npm run android -- --variant=release
```

## 🎯 Next Steps

Once you have the app running:

1. **Configure Mapbox** (for charts):
   - Sign up at https://www.mapbox.com/
   - Get your access token
   - Add to `android/gradle.properties`:
     ```
     MAPBOX_DOWNLOADS_TOKEN=your_token_here
     ```

2. **Explore the app**:
   - Chart view with route planner
   - Waypoint management
   - Simulated instrument data

3. **Connect real instruments** (requires physical device):
   - USB serial adapters
   - Network connections (WiFi/Ethernet)

## 📖 Additional Resources

- [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) - Detailed Windows setup
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [RUNNING_THE_APP.md](./RUNNING_THE_APP.md) - General running instructions
- [React Native Docs](https://reactnative.dev/docs/environment-setup) - Official RN docs

## 💡 Tips

1. **Use PowerShell** instead of CMD for better experience
2. **Install Windows Terminal** for better terminal experience
3. **Use VS Code** with React Native Tools extension
4. **Keep Android Studio updated** for latest features
5. **Use Git Bash** if you prefer Unix-like commands

## ❓ Still Having Issues?

1. Run the setup checker: `npm run windows-check`
2. Check the detailed guide: [WINDOWS_SETUP.md](./WINDOWS_SETUP.md)
3. Verify all environment variables are set correctly
4. Make sure you restarted your terminal after setting variables
5. Try creating a fresh Android emulator

---

**Happy Sailing! ⛵**
