# Running OpenSail

This guide explains how to run the OpenSail marine navigation app on your device or emulator.

> **Windows Users**: See [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) for detailed Windows setup instructions.

## Prerequisites

### For All Platforms
- Node.js >= 18.0.0
- npm >= 9.0.0

### For Android Development
- Android Studio
- Android SDK (API level 33 or higher)
- Java Development Kit (JDK) 17
- Android device or emulator

### For iOS Development (macOS only)
- Xcode 14 or higher
- CocoaPods
- iOS device or simulator

## Initial Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Initialize React Native project structure:**
   
   Since this project doesn't have the native folders yet, you need to initialize them:
   
   ```bash
   npx react-native init OpenSailTemp --version 0.74.0
   ```
   
   Then copy the `android/` and `ios/` folders from `OpenSailTemp/` to your project root:
   
   ```bash
   # On Windows (PowerShell)
   Copy-Item -Recurse OpenSailTemp\android .
   Copy-Item -Recurse OpenSailTemp\ios .
   Remove-Item -Recurse OpenSailTemp
   ```

3. **Install iOS dependencies (macOS only):**
   ```bash
   cd ios
   pod install
   cd ..
   ```

## Running the App

### Start Metro Bundler

First, start the Metro bundler (React Native's JavaScript bundler):

```bash
npm start
```

Keep this terminal window open.

### Run on Android

In a new terminal window:

```bash
npm run android
```

This will:
- Build the Android app
- Install it on your connected device or running emulator
- Start the app

**Troubleshooting Android:**
- Make sure you have an Android device connected via USB with USB debugging enabled, OR
- Have an Android emulator running (you can start one from Android Studio)
- Check that `adb devices` shows your device

### Run on iOS (macOS only)

In a new terminal window:

```bash
npm run ios
```

This will:
- Build the iOS app
- Install it on the simulator
- Start the app

**To run on a specific simulator:**
```bash
npm run ios -- --simulator="iPad Pro (12.9-inch)"
```

**To run on a physical device:**
- Open `ios/OpenSail.xcworkspace` in Xcode
- Select your device
- Click Run

## Development Workflow

### Running Tests
```bash
npm test
```

### Running Tests in Watch Mode
```bash
npm run test:watch
```

### Building TypeScript
```bash
npm run build
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Code Formatting
```bash
npm run format
```

## Current App Features

The app currently displays:
- Chart view with Mapbox integration
- Route planner interface
- Waypoint management
- Instrument data display (simulated)

## Known Limitations

1. **No Native Folders Yet**: You need to initialize them as described above
2. **Mapbox Configuration**: You'll need to add your Mapbox access token
3. **Physical Hardware**: Serial port connections won't work on simulators/emulators
4. **Database**: SQLite needs to be initialized on first run

## Mapbox Setup

To use the chart display, you need a Mapbox access token:

1. Sign up at https://www.mapbox.com/
2. Get your access token
3. Add it to your environment:

**For Android:**
Create/edit `android/gradle.properties`:
```
MAPBOX_DOWNLOADS_TOKEN=your_token_here
```

**For iOS:**
Create/edit `ios/.netrc`:
```
machine api.mapbox.com
login mapbox
password your_token_here
```

## Troubleshooting

### Metro Bundler Issues
```bash
npm start -- --reset-cache
```

### Build Issues
```bash
# Clean Android build
cd android
./gradlew clean
cd ..

# Clean iOS build (macOS)
cd ios
xcodebuild clean
pod install
cd ..
```

### Port Already in Use
```bash
# Kill process on port 8081
npx react-native start --port 8082
```

## Next Steps

- Configure Mapbox access token
- Test on physical device for GPS functionality
- Connect real marine instruments via serial/network
- Initialize SQLite database

For more information, see the main README.md file.
