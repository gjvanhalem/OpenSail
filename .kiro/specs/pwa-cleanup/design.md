# Design Document

## Overview

This document outlines the technical approach for cleaning up the OpenSail project after completing the migration from React Native to Progressive Web App (PWA). The cleanup will be performed in a systematic, safe manner to remove all React Native artifacts while preserving the working PWA implementation and reusable TypeScript code.

## Architecture

### Current State
The project currently contains:
- **Root directory**: Mixed React Native and PWA files
- **src directory**: React Native components and services alongside platform-agnostic code
- **pwa directory**: Complete PWA implementation
- **package.json**: Both React Native and PWA dependencies
- **Documentation**: Multiple React Native setup guides

### Target State
After cleanup, the project will contain:
- **Root directory**: Clean structure with only PWA-related configuration
- **src directory**: Only platform-agnostic TypeScript code (protocols, models, utils)
- **pwa directory**: Complete PWA implementation (unchanged)
- **package.json**: Only PWA dependencies and scripts
- **Documentation**: PWA-focused documentation only

### Cleanup Strategy

The cleanup will follow a **safe deletion approach**:
1. **Identify**: Catalog all React Native artifacts
2. **Verify**: Confirm files are not used by PWA
3. **Backup**: Ensure git history preserves deleted files
4. **Delete**: Remove files in logical groups
5. **Test**: Verify PWA still works after each group deletion
6. **Document**: Update remaining documentation

## Components and Interfaces

### File Categories

#### Category 1: React Native Dependencies (package.json)
**Files to Remove:**
- Dependencies:
  - `react-native` (^0.74.0)
  - `react-native-windows` (0.74.0)
  - `@react-native-async-storage/async-storage` (^1.21.0)
  - `@rnmapbox/maps` (^10.1.0)
  - `react-native-fs` (^2.20.0)
  - `react-native-sqlite-storage` (^6.0.1)
  - `serialport` (^12.0.0) - Node.js only, not for browser

- DevDependencies:
  - `@react-native/babel-preset` (^0.74.89)
  - `@react-native/metro-config` (^0.74.89)
  - `react-native-cli` (^2.0.1)
  - `react-native-windows` (^0.74.0)
  - `eslint-plugin-react-native` (^4.1.0)

**Dependencies to Keep:**
- `react` (^18.2.0)
- `@reduxjs/toolkit` (^2.2.0)
- `react-redux` (^9.1.0)
- `redux` (^5.0.1)
- `rxjs` (^7.8.1)
- `uuid` (^9.0.1)
- All TypeScript and testing dependencies

#### Category 2: React Native Configuration Files
**Files to Remove:**
- `index.js` - React Native entry point
- `app.json` - React Native app configuration
- `babel.config.js` - React Native Babel config
- `metro.config.js` - Metro bundler config
- `.watchmanconfig` - Watchman file watcher config
- `tsconfig.react-native.json` - React Native TypeScript config
- `jest.config.js` - React Native Jest config (if RN-specific)
- `.eslintrc.js` - If contains React Native rules

**Files to Keep:**
- `tsconfig.json` - Main TypeScript config
- `package.json` - After cleanup
- `.gitignore` - After cleanup
- `README.md` - After update

#### Category 3: React Native Platform Folders
**Directories to Remove:**
- `android/` - Android native code
- `ios/` - iOS native code
- `__mocks__/` - React Native mocks (if exists)

**Directories to Keep:**
- `pwa/` - Complete PWA implementation
- `src/` - After cleanup (see Category 4)
- `.kiro/` - Kiro specs
- `node_modules/` - After npm install

#### Category 4: React Native Source Code
**Files to Remove from src/:**

**Components (src/components/):**
- All components that import from 'react-native'
- Components using React Native-specific APIs
- Keep: Platform-agnostic UI logic if any

**Screens (src/screens/):**
- `MainNavigationScreen.tsx` - React Native navigation
- `SplashScreen.tsx` - React Native splash screen
- `index.ts` - Screen exports

**Services (src/services/):**
- `AppInitializer.ts` - React Native initialization
- `AppLifecycleManager.ts` - React Native lifecycle
- Keep: Platform-agnostic services (protocols, calculations)

**Database (src/database/):**
- `index.ts` - If uses react-native-sqlite-storage
- All repository files using SQLite
- Keep: Repository interfaces if platform-agnostic

**Hooks (src/hooks/):**
- Any hooks using React Native APIs
- Keep: Platform-agnostic hooks

**Store (src/store/):**
- Review for React Native-specific middleware
- Keep: Redux slices and reducers

**App Entry:**
- `src/App.tsx` - If React Native-specific

#### Category 5: React Native Documentation
**Files to Remove:**
- `README_WINDOWS.md`
- `RUNNING_THE_APP.md`
- `SETUP_COMPLETE.md`
- `WINDOWS_SETUP.md`
- `WINDOWS_CONFIGURATION_COMPLETE.md`
- `CRITICAL_TASKS_COMPLETED.md`
- `CRITICAL_TASKS_FINAL_STATUS.md`
- `HARDWARE_CONNECTION_VERIFICATION.md`
- `IMPLEMENTATION_STATUS.md`
- `INTEGRATION_COMPLETE.md`
- `QUICKSTART.md` - If React Native-specific

**Files to Keep:**
- `README.md` - After update
- `pwa/README.md`
- `pwa/DEVELOPER_GUIDE.md`
- `pwa/USER_GUIDE.md`
- All PWA documentation in pwa/

#### Category 6: React Native Scripts
**Files to Remove:**
- `setup-native.js`
- `run-android.bat` (if exists)
- `windows-check.bat` (if exists)
- `windows-quickstart.ps1` (if exists)

**Scripts to Remove from package.json:**
- `"android": "react-native run-android"`
- `"ios": "react-native run-ios"`
- `"start": "react-native start"`
- `"setup-native": "node setup-native.js"`
- `"windows-check": "..."`

**Scripts to Keep/Add in package.json:**
- `"dev": "cd pwa && npm run dev"`
- `"build": "cd pwa && npm run build"`
- `"preview": "cd pwa && npm run preview"`
- `"test": "cd pwa && npm run test"`
- `"test:e2e": "cd pwa && npm run test:e2e"`
- `"lint": "cd pwa && npm run lint"`
- `"format": "cd pwa && npm run format"`

### Platform-Agnostic Code to Preserve

**Keep in src/ (move to pwa/src if needed):**

1. **Protocols (src/protocols/):**
   - `NMEA0183Parser.ts` - Pure TypeScript
   - `NMEA2000Parser.ts` - Pure TypeScript
   - `SeaTalkParser.ts` - Pure TypeScript
   - `ProtocolStub.ts` - Pure TypeScript
   - All test files

2. **Models (src/models/):**
   - All TypeScript interfaces and types
   - No platform-specific code

3. **Utils (src/utils/):**
   - `unitConversion.ts` - Pure calculations
   - `performance.ts` - If platform-agnostic
   - `responsive.ts` - If platform-agnostic

4. **Types (src/types/):**
   - `index.ts` - Type definitions
   - Remove: `react-native-sqlite-storage.d.ts`

## Data Models

### File Inventory Structure

```typescript
interface FileInventory {
  category: 'dependencies' | 'config' | 'folders' | 'source' | 'docs' | 'scripts';
  path: string;
  action: 'delete' | 'keep' | 'update' | 'move';
  reason: string;
  dependencies?: string[]; // Files that depend on this
}
```

### Cleanup Checklist

```typescript
interface CleanupTask {
  id: string;
  category: string;
  description: string;
  files: string[];
  verificationCommand?: string;
  completed: boolean;
}
```

## Error Handling

### Safety Measures

1. **Git Safety:**
   - Ensure all changes are committed before cleanup
   - Create a cleanup branch: `git checkout -b cleanup/remove-react-native`
   - Commit after each category deletion
   - Tag before cleanup: `git tag pre-cleanup`

2. **Verification Steps:**
   - After each deletion group, verify PWA still builds
   - Run: `cd pwa && npm run build`
   - Run: `cd pwa && npm run test`
   - Check for broken imports or references

3. **Rollback Plan:**
   - If issues occur: `git reset --hard HEAD~1`
   - If major issues: `git checkout main && git branch -D cleanup/remove-react-native`
   - Restore from tag: `git checkout pre-cleanup`

### Common Issues and Solutions

**Issue 1: Broken imports after deletion**
- **Solution**: Search codebase for references before deleting
- **Command**: `grep -r "import.*from.*react-native" pwa/`

**Issue 2: Missing dependencies**
- **Solution**: Check pwa/package.json has all needed dependencies
- **Command**: `cd pwa && npm install`

**Issue 3: TypeScript errors**
- **Solution**: Update tsconfig.json paths
- **Command**: `cd pwa && npm run build`

## Testing Strategy

### Pre-Cleanup Tests

1. **Verify PWA works:**
   ```bash
   cd pwa
   npm install
   npm run build
   npm run preview
   ```

2. **Run PWA tests:**
   ```bash
   cd pwa
   npm run test
   npm run test:e2e
   ```

3. **Document current state:**
   - List all files in root: `ls -la`
   - List dependencies: `cat package.json`
   - Take screenshots of working PWA

### Post-Cleanup Tests

1. **Verify no React Native references:**
   ```bash
   grep -r "react-native" . --exclude-dir=node_modules --exclude-dir=.git
   ```

2. **Verify PWA still works:**
   ```bash
   cd pwa
   npm run build
   npm run preview
   ```

3. **Run all tests:**
   ```bash
   cd pwa
   npm run test
   npm run test:e2e
   npm run lint
   ```

4. **Check bundle size:**
   - Compare before/after bundle sizes
   - Ensure no unexpected increases

### Regression Testing

**Test Scenarios:**
1. PWA installs correctly
2. Offline functionality works
3. Chart display renders
4. Route planning functions
5. Instrument data displays
6. All navigation works

## Implementation Phases

### Phase 1: Preparation
1. Create git tag: `pre-cleanup`
2. Create cleanup branch
3. Document current state
4. Run pre-cleanup tests
5. Create file inventory

### Phase 2: Remove Dependencies
1. Update package.json (remove RN deps)
2. Run `npm install`
3. Verify pwa/package.json is complete
4. Commit changes
5. Test PWA builds

### Phase 3: Remove Configuration Files
1. Delete React Native config files
2. Update .gitignore if needed
3. Commit changes
4. Test PWA builds

### Phase 4: Remove Platform Folders
1. Delete android/ directory
2. Delete ios/ directory
3. Delete __mocks__/ if exists
4. Commit changes
5. Test PWA builds

### Phase 5: Remove Source Code
1. Delete src/screens/
2. Delete React Native services
3. Delete React Native components
4. Delete React Native database code
5. Commit changes
6. Test PWA builds

### Phase 6: Remove Documentation
1. Delete React Native docs
2. Update README.md
3. Commit changes

### Phase 7: Remove Scripts
1. Delete script files
2. Update package.json scripts
3. Commit changes
4. Test all new scripts work

### Phase 8: Final Cleanup
1. Update ESLint config
2. Remove unused src/ directories
3. Update root README.md
4. Run final tests
5. Merge cleanup branch

## Updated Project Structure

### After Cleanup

```
opensail/
├── .kiro/                          # Kiro specs (preserved)
│   └── specs/
│       ├── pwa-migration/          # PWA migration spec
│       └── pwa-cleanup/            # This cleanup spec
├── pwa/                            # PWA implementation (preserved)
│   ├── src/                        # PWA source code
│   ├── public/                     # PWA public assets
│   ├── e2e/                        # E2E tests
│   ├── package.json                # PWA dependencies
│   ├── vite.config.ts              # Vite configuration
│   ├── tsconfig.json               # PWA TypeScript config
│   └── README.md                   # PWA documentation
├── src/                            # Shared TypeScript code (optional)
│   ├── protocols/                  # Protocol parsers (if kept)
│   ├── models/                     # Data models (if kept)
│   └── utils/                      # Utilities (if kept)
├── package.json                    # Root package.json (cleaned)
├── tsconfig.json                   # Root TypeScript config
├── .gitignore                      # Git ignore (updated)
└── README.md                       # Root README (updated)
```

### Alternative: Fully Consolidated Structure

If src/ code is moved into pwa/:

```
opensail/
├── .kiro/                          # Kiro specs
├── pwa/                            # Complete PWA application
│   ├── src/
│   │   ├── components/             # PWA components
│   │   ├── services/               # PWA services
│   │   ├── protocols/              # Protocol parsers (moved)
│   │   ├── models/                 # Data models (moved)
│   │   └── utils/                  # Utilities (moved)
│   ├── public/
│   ├── e2e/
│   └── package.json
├── package.json                    # Minimal root package.json
└── README.md                       # Points to pwa/
```

## Root README.md Update

### New Content Structure

```markdown
# OpenSail - Marine Navigation PWA

Open-source marine navigation system built as a Progressive Web App.

## Quick Start

```bash
cd pwa
npm install
npm run dev
```

Visit http://localhost:5173

## Documentation

- [PWA Developer Guide](pwa/DEVELOPER_GUIDE.md)
- [PWA User Guide](pwa/USER_GUIDE.md)
- [Architecture Overview](pwa/README.md)

## Technology Stack

- React 18 + TypeScript
- Vite 5
- Mapbox GL JS
- IndexedDB (Dexie.js)
- Workbox (Service Worker)

## Development

See [pwa/DEVELOPER_GUIDE.md](pwa/DEVELOPER_GUIDE.md) for detailed development instructions.

## License

MIT
```

## Package.json Update

### Root package.json (Minimal)

```json
{
  "name": "opensail",
  "version": "2.0.0",
  "description": "Open-source marine navigation PWA",
  "private": true,
  "scripts": {
    "dev": "cd pwa && npm run dev",
    "build": "cd pwa && npm run build",
    "preview": "cd pwa && npm run preview",
    "test": "cd pwa && npm run test",
    "test:e2e": "cd pwa && npm run test:e2e",
    "lint": "cd pwa && npm run lint",
    "format": "cd pwa && npm run format"
  },
  "keywords": [
    "marine",
    "navigation",
    "pwa",
    "nmea",
    "gps",
    "chart"
  ],
  "author": "",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

## Validation Checklist

### Pre-Merge Validation

- [ ] No references to "react-native" in codebase (except git history)
- [ ] PWA builds successfully: `cd pwa && npm run build`
- [ ] PWA runs in dev mode: `cd pwa && npm run dev`
- [ ] All PWA tests pass: `cd pwa && npm run test`
- [ ] E2E tests pass: `cd pwa && npm run test:e2e`
- [ ] Linting passes: `cd pwa && npm run lint`
- [ ] No broken imports or missing dependencies
- [ ] README.md reflects PWA-only architecture
- [ ] Package.json contains only PWA-related scripts
- [ ] Git history preserved (can recover deleted files if needed)

### Documentation Validation

- [ ] Root README.md updated
- [ ] No React Native setup instructions remain
- [ ] PWA documentation is complete
- [ ] Developer guide is accurate
- [ ] User guide is accurate

## Rollback Procedure

If issues are discovered after cleanup:

1. **Immediate rollback:**
   ```bash
   git checkout pre-cleanup
   git checkout -b recovery
   ```

2. **Selective recovery:**
   ```bash
   git checkout pre-cleanup -- path/to/file
   ```

3. **Full reset:**
   ```bash
   git reset --hard pre-cleanup
   git branch -D cleanup/remove-react-native
   ```

## Success Criteria

The cleanup is successful when:

1. ✅ No React Native dependencies in package.json
2. ✅ No React Native configuration files in root
3. ✅ No android/ or ios/ directories
4. ✅ No React Native documentation files
5. ✅ No React Native scripts
6. ✅ PWA builds and runs correctly
7. ✅ All PWA tests pass
8. ✅ Documentation reflects PWA-only architecture
9. ✅ Repository size reduced
10. ✅ Developer experience improved (clearer structure)
