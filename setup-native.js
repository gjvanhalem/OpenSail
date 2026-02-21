#!/usr/bin/env node

/**
 * Setup script to initialize React Native native folders
 * This creates the android/ and ios/ folders needed to run the app
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up React Native native folders...\n');

// Check if folders already exist
const androidExists = fs.existsSync(path.join(__dirname, 'android'));
const iosExists = fs.existsSync(path.join(__dirname, 'ios'));

if (androidExists && iosExists) {
  console.log('✅ Native folders already exist!');
  console.log('   - android/');
  console.log('   - ios/');
  console.log('\nYou can now run:');
  console.log('  npm run android  (for Android)');
  console.log('  npm run ios      (for iOS on macOS)');
  process.exit(0);
}

console.log('📦 Creating temporary React Native project...');
console.log('   This may take a few minutes...\n');

try {
  // Create temp project
  execSync('npx react-native init OpenSailTemp --version 0.74.0', {
    stdio: 'inherit',
  });

  console.log('\n📁 Copying native folders...');

  // Copy android folder if it doesn't exist
  if (!androidExists) {
    const androidSrc = path.join(__dirname, 'OpenSailTemp', 'android');
    const androidDest = path.join(__dirname, 'android');
    fs.cpSync(androidSrc, androidDest, { recursive: true });
    console.log('   ✓ Copied android/');
  }

  // Copy ios folder if it doesn't exist
  if (!iosExists) {
    const iosSrc = path.join(__dirname, 'OpenSailTemp', 'ios');
    const iosDest = path.join(__dirname, 'ios');
    fs.cpSync(iosSrc, iosDest, { recursive: true });
    console.log('   ✓ Copied ios/');
  }

  // Clean up temp project
  console.log('\n🧹 Cleaning up...');
  fs.rmSync(path.join(__dirname, 'OpenSailTemp'), { recursive: true, force: true });

  console.log('\n✅ Setup complete!\n');
  console.log('Next steps:');
  console.log('  1. For iOS (macOS only): cd ios && pod install && cd ..');
  console.log('  2. Start Metro: npm start');
  console.log('  3. Run app: npm run android  OR  npm run ios\n');
  console.log('See RUNNING_THE_APP.md for detailed instructions.');

} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  console.error('\nPlease follow the manual setup instructions in RUNNING_THE_APP.md');
  process.exit(1);
}
