# Pre-Cleanup Project Inventory

**Date:** February 21, 2026
**Branch:** cleanup/remove-react-native
**Git Tag:** pre-cleanup

## Root Directory Files

### React Native Configuration Files (To Remove)
- `index.js` - React Native entry point (200 bytes)
- `app.json` - React Native app configuration (58 bytes)
- `babel.config.js` - React Native Babel config (75 bytes)
- `metro.config.js` - Metro bundler config (315 bytes)
- `.watchmanconfig` - Watchman file watcher (4 bytes)
- `tsconfig.react-native.json` - React Native TypeScript config (440 bytes)
- `jest.config.js` - React Native Jest config (1,193 bytes)

### React Native Documentation Files (To Remove)
- `README_WINDOWS.md` (7,647 bytes)
- `RUNNING_THE_APP.md` (4,110 bytes)
- `SETUP_COMPLETE.md` (3,144 bytes)
- `WINDOWS_SETUP.md` (6,030 bytes)
- `WINDOWS_CONFIGURATION_COMPLETE.md` (5,323 bytes)
- `CRITICAL_TASKS_COMPLETED.md` (10,659 bytes)
- `CRITICAL_TASKS_FINAL_STATUS.md` (10,591 bytes)
- `HARDWARE_CONNECTION_VERIFICATION.md` (6,805 bytes)
- `IMPLEMENTATION_STATUS.md` (10,143 bytes)
- `INTEGRATION_COMPLETE.md` (7,938 bytes)
- `QUICKSTART.md` (1,361 bytes)

### React Native Script Files (To Remove)
- `setup-native.js` (2,415 bytes)
- `run-android.bat` (316 bytes)
- `windows-check.bat` (1,565 bytes)
- `windows-quickstart.ps1` (4,337 bytes)

### Configuration Files (To Update)
- `.eslintrc.js` (1,014 bytes) - Remove React Native rules
- `.eslintrc.json` (558 bytes) - Remove React Native rules
- `.gitignore` (799 bytes) - Update ignore patterns
- `package.json` (2,203 bytes) - Remove RN deps and scripts

### Files to Keep
- `.prettierrc` (133 bytes)
- `tsconfig.json` (1,129 bytes)
- `lighthouserc.json` (1,658 bytes)
- `package-lock.json` (555,962 bytes)

## Directories

### React Native Platform Folders (To Remove)
- `android/` - Android native code
- `ios/` - iOS native code
- `__mocks__/` - React Native mocks

### Directories to Keep
- `pwa/` - Complete PWA implementation
- `src/` - To be evaluated (may contain reusable code)
- `.kiro/` - Kiro specs
- `.github/` - GitHub workflows
- `.idea/` - IDE settings
- `.vscode/` - VS Code settings
- `node_modules/` - Dependencies
- `dist/` - Build output

## Dependencies (package.json)

### React Native Dependencies (To Remove)
```json
{
  "react-native": "^0.74.0",
  "react-native-windows": "0.74.0",
  "@react-native-async-storage/async-storage": "^1.21.0",
  "@rnmapbox/maps": "^10.1.0",
  "react-native-fs": "^2.20.0",
  "react-native-sqlite-storage": "^6.0.1",
  "serialport": "^12.0.0"
}
```

### React Native DevDependencies (To Remove)
```json
{
  "@react-native/babel-preset": "^0.74.89",
  "@react-native/metro-config": "^0.74.89",
  "react-native-cli": "^2.0.1",
  "react-native-windows": "^0.74.0",
  "eslint-plugin-react-native": "^4.1.0"
}
```

### Dependencies to Keep
```json
{
  "react": "^18.2.0",
  "@reduxjs/toolkit": "^2.2.0",
  "react-redux": "^9.1.0",
  "redux": "^5.0.1",
  "rxjs": "^7.8.1",
  "uuid": "^9.0.1"
}
```

### DevDependencies to Keep
```json
{
  "@types/jest": "^29.5.12",
  "@types/react": "^18.2.0",
  "@types/uuid": "^9.0.8",
  "@typescript-eslint/eslint-plugin": "^7.0.0",
  "@typescript-eslint/parser": "^7.0.0",
  "eslint": "^8.57.0",
  "eslint-config-prettier": "^9.1.0",
  "eslint-plugin-react": "^7.34.0",
  "jest": "^29.7.0",
  "prettier": "^3.2.0",
  "ts-jest": "^29.1.2",
  "typescript": "~5.4.0"
}
```

## Package.json Scripts

### React Native Scripts (To Remove)
- `"android": "react-native run-android"`
- `"ios": "react-native run-ios"`
- `"start": "react-native start"`
- `"setup-native": "node setup-native.js"`
- `"windows-check": "..."`

### Scripts to Keep/Update
- `"dev"` - Update to PWA dev command
- `"test"` - Update to PWA test command
- `"lint"` - Update to PWA lint command
- `"format"` - Update to PWA format command
- `"build"` - Update to PWA build command

### Scripts to Add
- `"preview": "cd pwa && npm run preview"`
- `"test:e2e": "cd pwa && npm run test:e2e"`

## PWA Bundle Sizes (Baseline)

**Total Size:** 8.10 MB
**File Count:** 52 files
**Location:** pwa/dist/

## Source Code Inventory (src/)

### To Be Evaluated
- `src/components/` - Check for React Native imports
- `src/screens/` - React Native navigation screens (to remove)
- `src/services/` - Check for platform-agnostic code
- `src/database/` - Check for SQLite usage (to remove)
- `src/hooks/` - Check for React Native APIs
- `src/models/` - Platform-agnostic (likely keep)
- `src/protocols/` - Platform-agnostic (likely keep)
- `src/store/` - Redux code (likely keep)
- `src/types/` - Type definitions (evaluate)
- `src/utils/` - Utility functions (evaluate)
- `src/__tests__/` - Test files (evaluate)
- `src/App.tsx` - React Native entry (to remove)

## Summary

### Files to Remove: ~35 files
- 7 configuration files
- 11 documentation files
- 4 script files
- 3 directories (android/, ios/, __mocks__/)
- Multiple source files in src/

### Dependencies to Remove: 12 packages
- 7 dependencies
- 5 devDependencies

### Expected Benefits
- Cleaner project structure
- Reduced repository size
- Simpler dependency tree
- Clearer documentation
- Faster npm install
- Less confusion for new developers

## Next Steps
1. Run baseline PWA tests (task 1.3)
2. Begin systematic removal starting with dependencies (task 2)
3. Verify PWA functionality after each removal phase


## Baseline PWA Test Results

**Date:** February 21, 2026
**Time:** 22:53

### Build Test
✅ **PASSED** - `npm run build` in pwa/
- Build completed successfully in 7.54s
- Generated 169 modules
- Total bundle size: ~2.2 MB (precache)
- Service Worker generated successfully
- No build errors

### Unit Tests
⚠️ **PARTIAL PASS** - `npm test` in pwa/
- **Total:** 144 tests (130 passed, 14 failed)
- **Test Files:** 10 files (7 passed, 3 failed)
- **Duration:** 10.07s

**Failing Tests (Pre-existing):**
1. NMEA0183Parser tests (8 failures) - Checksum validation and parsing issues
2. NMEA2000Parser tests (5 failures) - Instrument data parsing issues
3. routeCalculations test (1 failure) - Closest waypoint calculation

**Note:** These test failures exist before cleanup and are not related to the React Native removal. They should be addressed separately but do not block the cleanup process.

### Preview Test
✅ **PASSED** - `npm run preview` in pwa/
- Preview server started successfully
- Accessible at http://localhost:4173/
- No startup errors
- App loads correctly

### Summary
The PWA is functional and ready for cleanup:
- ✅ Build system works
- ✅ Preview server works
- ⚠️ Some unit tests failing (pre-existing issues)
- ✅ Core functionality intact

**Recommendation:** Proceed with cleanup. The failing tests are pre-existing and should be fixed in a separate task after cleanup is complete.
