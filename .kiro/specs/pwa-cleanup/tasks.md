# Implementation Plan

## Overview

This implementation plan provides a step-by-step guide for cleaning up the OpenSail project after completing the PWA migration. Each task builds incrementally and includes verification steps to ensure the PWA remains functional throughout the cleanup process.

## Tasks

- [x] 1. Prepare for cleanup




  - Create git safety tag and branch
  - Document current state
  - Run baseline tests
  - _Requirements: All requirements (safety measure)_




- [x] 1.1 Create git safety checkpoint


  - Create git tag `pre-cleanup` on current commit
  - Create cleanup branch `cleanup/remove-react-native`
  - Verify git status is clean
  - _Requirements: 9.4_

- [x] 1.2 Document current project state


  - List all root directory files to file inventory
  - List all dependencies from package.json
  - Take note of current bundle sizes
  - _Requirements: 9.4_

- [x] 1.3 Run baseline PWA tests


  - Run `cd pwa && npm run build` and verify success
  - Run `cd pwa && npm run test` and verify all pass
  - Run `cd pwa && npm run preview` and verify app loads
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 2. Remove React Native dependencies from package.json
  - Remove all React Native packages from dependencies and devDependencies
  - Update package.json scripts to remove React Native commands
  - Run npm install to update lock file
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.5, 5.6, 5.7, 5.8, 5.9, 8.4_

- [ ] 2.1 Remove React Native dependencies
  - Remove react-native, react-native-windows from dependencies
  - Remove @react-native-async-storage/async-storage, @rnmapbox/maps, react-native-fs, react-native-sqlite-storage
  - Remove serialport (Node.js only, not browser-compatible)
  - _Requirements: 1.4_

- [ ] 2.2 Remove React Native devDependencies
  - Remove @react-native/babel-preset, @react-native/metro-config
  - Remove react-native-cli, react-native-windows (duplicate in devDeps)
  - Remove eslint-plugin-react-native
  - _Requirements: 1.4_

- [ ] 2.3 Remove React Native scripts from package.json
  - Remove "android", "ios", "start" scripts
  - Remove "setup-native", "windows-check" scripts
  - Remove "dev" script if it references React Native
  - _Requirements: 5.5, 5.6, 5.7, 5.8, 5.9_

- [ ] 2.4 Add PWA convenience scripts to root package.json
  - Add "dev": "cd pwa && npm run dev"
  - Add "build": "cd pwa && npm run build"
  - Add "preview": "cd pwa && npm run preview"
  - Add "test": "cd pwa && npm run test"
  - Add "lint": "cd pwa && npm run lint"
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 2.5 Update package.json metadata
  - Update version to 2.0.0 (major version for architecture change)
  - Update description to mention PWA
  - Remove or update "main" field (not needed for PWA)
  - _Requirements: 8.5, 10.1_

- [ ] 2.6 Install updated dependencies
  - Run `npm install` in root directory
  - Verify no errors during installation
  - Verify pwa/package.json still has all needed dependencies
  - _Requirements: 1.3_

- [ ] 2.7 Verify PWA still builds after dependency removal
  - Run `cd pwa && npm run build`
  - Verify build succeeds with no errors
  - Check that no React Native imports are attempted
  - _Requirements: 9.1, 9.2_

- [ ] 3. Remove React Native configuration files
  - Delete all React Native config files from root directory
  - Update .gitignore if needed
  - Verify PWA configuration is unaffected
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 3.1 Delete React Native entry and config files
  - Delete index.js (React Native entry point)
  - Delete app.json (React Native app config)
  - Delete babel.config.js (React Native Babel config)
  - Delete metro.config.js (Metro bundler config)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 3.2 Delete React Native tooling config files
  - Delete .watchmanconfig (Watchman file watcher)
  - Delete tsconfig.react-native.json (React Native TypeScript config)
  - Delete jest.config.js if it's React Native-specific
  - _Requirements: 2.5, 2.6, 2.7_

- [ ] 3.3 Update or remove .eslintrc.js
  - Remove eslint-plugin-react-native from plugins
  - Remove React Native-specific rules
  - Keep React and TypeScript rules
  - _Requirements: 7.1, 7.2, 7.4_

- [ ] 3.4 Update .gitignore
  - Remove React Native-specific ignore patterns (android/, ios/, metro cache)
  - Ensure pwa/ build outputs are properly ignored
  - Commit updated .gitignore
  - _Requirements: 2.8_

- [ ] 3.5 Verify PWA still builds after config removal
  - Run `cd pwa && npm run build`
  - Run `cd pwa && npm run lint`
  - Verify no configuration errors
  - _Requirements: 9.1, 9.2_

- [ ] 4. Remove React Native platform folders
  - Delete android and ios directories
  - Delete React Native mock directories
  - Verify repository size reduction
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4.1 Delete android directory
  - Delete entire android/ directory and all contents
  - Verify deletion with `ls -la` (should not show android/)
  - _Requirements: 3.1_

- [ ] 4.2 Delete ios directory
  - Delete entire ios/ directory and all contents
  - Verify deletion with `ls -la` (should not show ios/)
  - _Requirements: 3.2_

- [ ] 4.3 Delete React Native mocks
  - Delete __mocks__/ directory if it exists
  - Delete any React Native-specific mock files
  - _Requirements: 3.3_

- [ ] 4.4 Verify PWA directory is preserved
  - Verify pwa/ directory still exists with all contents
  - Run `cd pwa && npm run build` to ensure PWA unaffected
  - _Requirements: 3.4, 9.1_

- [ ] 5. Remove React Native source code from src/
  - Identify and remove React Native-specific source files
  - Preserve platform-agnostic TypeScript code
  - Update imports if needed
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] 5.1 Delete React Native screens
  - Delete src/screens/MainNavigationScreen.tsx
  - Delete src/screens/SplashScreen.tsx
  - Delete src/screens/index.ts
  - Delete src/screens/ directory if empty
  - _Requirements: 6.3_

- [ ] 5.2 Delete React Native services
  - Delete src/services/AppInitializer.ts (React Native initialization)
  - Delete src/services/AppLifecycleManager.ts (React Native lifecycle)
  - Preserve platform-agnostic services
  - _Requirements: 6.4, 6.5_

- [ ] 5.3 Delete React Native components
  - Review src/components/ for React Native imports
  - Delete components that import from 'react-native'
  - Delete src/components/ directory if all components are React Native-specific
  - _Requirements: 6.2_

- [ ] 5.4 Delete React Native database code
  - Delete src/database/index.ts if it uses react-native-sqlite-storage
  - Delete repository files that use SQLite
  - Delete src/database/ directory if all code is React Native-specific
  - _Requirements: 6.6_

- [ ] 5.5 Delete React Native hooks
  - Review src/hooks/ for React Native API usage
  - Delete hooks that use React Native APIs
  - Preserve platform-agnostic hooks
  - _Requirements: 6.7_

- [ ] 5.6 Delete React Native App.tsx
  - Delete src/App.tsx if it's React Native-specific
  - Verify PWA has its own App.tsx in pwa/src/
  - _Requirements: 6.1_

- [ ] 5.7 Clean up src/types/
  - Delete src/types/react-native-sqlite-storage.d.ts
  - Keep platform-agnostic type definitions
  - _Requirements: 6.6_

- [ ] 5.8 Evaluate src/ subdirectories
  - Check if src/protocols/, src/models/, src/utils/ are used by PWA
  - If used, consider moving to pwa/src/ or keep as shared code
  - If not used, delete the directories
  - _Requirements: 9.5_

- [ ] 5.9 Verify PWA still builds after source removal
  - Run `cd pwa && npm run build`
  - Run `cd pwa && npm run test`
  - Verify no broken imports
  - _Requirements: 9.1, 9.2_

- [ ] 6. Remove React Native documentation files
  - Delete all React Native setup and status documentation
  - Preserve PWA documentation
  - Update root README.md
  - _Requirements: 4.1-4.11, 10.1-10.5_

- [ ] 6.1 Delete React Native setup documentation
  - Delete README_WINDOWS.md
  - Delete RUNNING_THE_APP.md
  - Delete SETUP_COMPLETE.md
  - Delete WINDOWS_SETUP.md
  - Delete WINDOWS_CONFIGURATION_COMPLETE.md
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 6.2 Delete React Native status documentation
  - Delete CRITICAL_TASKS_COMPLETED.md
  - Delete CRITICAL_TASKS_FINAL_STATUS.md
  - Delete HARDWARE_CONNECTION_VERIFICATION.md
  - Delete IMPLEMENTATION_STATUS.md
  - Delete INTEGRATION_COMPLETE.md
  - _Requirements: 4.6, 4.7, 4.8, 4.9, 4.10_

- [ ] 6.3 Delete or update QUICKSTART.md
  - Delete QUICKSTART.md if it contains React Native instructions
  - Or update it to point to PWA quick start
  - _Requirements: 4.11_

- [ ] 6.4 Verify PWA documentation is preserved
  - Verify pwa/README.md exists
  - Verify pwa/DEVELOPER_GUIDE.md exists
  - Verify pwa/USER_GUIDE.md exists
  - _Requirements: 9.3_

- [ ] 7. Remove React Native script files
  - Delete all React Native setup and helper scripts
  - Verify package.json scripts are already updated
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 7.1 Delete React Native setup scripts
  - Delete setup-native.js
  - Delete run-android.bat if exists
  - Delete windows-check.bat if exists
  - Delete windows-quickstart.ps1 if exists
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 7.2 Verify package.json scripts are clean
  - Verify no React Native scripts remain in package.json
  - Verify PWA scripts are present
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 8. Update root README.md
  - Rewrite README to describe PWA architecture
  - Remove React Native setup instructions
  - Add PWA quick start and documentation links
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 8.1 Write new README.md introduction
  - Describe OpenSail as a Progressive Web App
  - Mention key features and technology stack
  - Remove any React Native references
  - _Requirements: 10.1_

- [ ] 8.2 Add PWA quick start section
  - Add instructions for running PWA locally (cd pwa && npm run dev)
  - Add instructions for building PWA (cd pwa && npm run build)
  - Add instructions for running tests
  - _Requirements: 10.3, 10.4_

- [ ] 8.3 Add documentation links section
  - Link to pwa/DEVELOPER_GUIDE.md
  - Link to pwa/USER_GUIDE.md
  - Link to pwa/README.md for architecture details
  - _Requirements: 10.5_

- [ ] 8.4 Remove React Native setup instructions
  - Remove all Android Studio setup instructions
  - Remove all iOS/Xcode setup instructions
  - Remove all emulator setup instructions
  - _Requirements: 10.2_

- [ ] 9. Final verification and cleanup
  - Run comprehensive tests
  - Verify no React Native references remain
  - Check repository size reduction
  - _Requirements: All requirements_

- [ ] 9.1 Search for remaining React Native references
  - Run `grep -r "react-native" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=pwa/node_modules`
  - Verify no matches found (except in git history)
  - _Requirements: All requirements_

- [ ] 9.2 Run full PWA test suite
  - Run `cd pwa && npm run build` and verify success
  - Run `cd pwa && npm run test` and verify all tests pass
  - Run `cd pwa && npm run test:e2e` and verify E2E tests pass
  - Run `cd pwa && npm run lint` and verify no errors
  - _Requirements: 9.1, 9.2_

- [ ] 9.3 Test PWA functionality manually
  - Run `cd pwa && npm run preview`
  - Verify PWA installs correctly
  - Verify offline functionality works
  - Verify chart display renders
  - Verify route planning works
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 9.4 Verify repository improvements
  - Check repository size (should be smaller)
  - Verify cleaner directory structure
  - Verify package.json is simpler
  - _Requirements: All requirements_

- [ ] 9.5 Review and clean up empty directories
  - Check if src/ directory is empty or has unused code
  - Delete src/ if completely empty
  - Keep src/ if it has shared code used by PWA
  - _Requirements: 9.5_

- [ ] 10. Commit and merge cleanup
  - Commit all cleanup changes
  - Create pull request
  - Merge to main branch
  - _Requirements: All requirements_

- [ ] 10.1 Commit cleanup changes
  - Review all changes with `git status`
  - Commit with message: "chore: remove React Native code and dependencies"
  - Push cleanup branch to remote
  - _Requirements: All requirements_

- [ ] 10.2 Create pull request
  - Create PR from cleanup/remove-react-native to main
  - Add description of changes
  - Reference this spec document
  - _Requirements: All requirements_

- [ ] 10.3 Final review before merge
  - Review all deleted files
  - Verify PWA still works
  - Verify documentation is updated
  - _Requirements: All requirements_

- [ ] 10.4 Merge cleanup branch
  - Merge PR to main branch
  - Delete cleanup branch
  - Verify main branch builds successfully
  - _Requirements: All requirements_

- [ ] 10.5 Tag the cleaned version
  - Create git tag `v2.0.0-pwa-only`
  - Push tag to remote
  - Update release notes
  - _Requirements: All requirements_
