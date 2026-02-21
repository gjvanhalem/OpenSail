@echo off
echo.
echo === OpenSail Windows Setup Checker ===
echo.

echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] Node.js installed
    node --version
) else (
    echo   [ERROR] Node.js not found
    echo   Install from: https://nodejs.org/
)

echo.
echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] npm installed
    npm --version
) else (
    echo   [ERROR] npm not found
)

echo.
echo Checking Java...
java -version >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] Java installed
    java -version 2>&1 | findstr "version"
) else (
    echo   [ERROR] Java not found
    echo   Install JDK 17 from: https://adoptium.net/
)

echo.
echo Checking ANDROID_HOME...
if defined ANDROID_HOME (
    echo   [OK] ANDROID_HOME is set
    echo   Path: %ANDROID_HOME%
) else (
    echo   [ERROR] ANDROID_HOME not set
    echo   Set it to your Android SDK location
)

echo.
echo Checking adb...
adb version >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] adb installed
    echo.
    echo Checking for connected devices...
    adb devices
) else (
    echo   [ERROR] adb not found
    echo   Make sure Android SDK platform-tools is in PATH
)

echo.
echo === Next Steps ===
echo 1. Install any missing requirements
echo 2. Run: npm install
echo 3. Run: npm run setup-native
echo 4. Start Android emulator
echo 5. Run: npm start
echo 6. Run: npm run android
echo.
echo See WINDOWS_SETUP.md for detailed instructions
echo.
pause
