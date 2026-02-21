# Requirements Document

## Introduction

This specification defines the requirements for cleaning up the OpenSail project after completing the migration from React Native to Progressive Web App (PWA). The project currently contains legacy React Native code, dependencies, configuration files, and documentation that are no longer needed. This cleanup will streamline the codebase, reduce confusion, and ensure the project structure reflects its current PWA-only architecture.

## Glossary

- **PWA**: Progressive Web App - A web application that uses modern web capabilities to deliver an app-like experience
- **React Native**: A framework for building native mobile applications using React (no longer used in this project)
- **Legacy Code**: Code, files, or dependencies from the React Native implementation that are no longer needed
- **Dead Code**: Code that exists in the codebase but is never executed or referenced
- **npm**: Node Package Manager - Used for managing JavaScript dependencies
- **Root Directory**: The top-level directory of the project workspace

## Requirements

### Requirement 1: Remove React Native Dependencies

**User Story:** As a developer, I want all React Native dependencies removed from package.json, so that the project only includes PWA-related dependencies and reduces installation time and disk space.

#### Acceptance Criteria

1. WHEN the developer reviews package.json, THE System SHALL contain only PWA-related dependencies in the dependencies section
2. WHEN the developer reviews package.json, THE System SHALL contain only PWA-related dependencies in the devDependencies section
3. WHEN the developer runs npm install, THE System SHALL install only packages required for PWA functionality
4. WHERE React Native dependencies exist, THE System SHALL remove the following packages: react-native, @react-native/babel-preset, @react-native/metro-config, react-native-cli, react-native-windows, @react-native-async-storage/async-storage, @rnmapbox/maps, react-native-fs, react-native-sqlite-storage
5. WHEN React Native dependencies are removed, THE System SHALL preserve all PWA dependencies including React, Redux Toolkit, TypeScript, Vite, Workbox, Mapbox GL JS, Dexie.js, Tailwind CSS, and testing libraries

### Requirement 2: Remove React Native Configuration Files

**User Story:** As a developer, I want all React Native configuration files removed from the root directory, so that the project structure is clean and only contains PWA-related configuration.

#### Acceptance Criteria

1. WHEN the developer lists root directory files, THE System SHALL not contain index.js (React Native entry point)
2. WHEN the developer lists root directory files, THE System SHALL not contain app.json (React Native configuration)
3. WHEN the developer lists root directory files, THE System SHALL not contain babel.config.js (React Native Babel configuration)
4. WHEN the developer lists root directory files, THE System SHALL not contain metro.config.js (React Native Metro bundler configuration)
5. WHEN the developer lists root directory files, THE System SHALL not contain .watchmanconfig (React Native file watching configuration)
6. WHEN the developer lists root directory files, THE System SHALL not contain tsconfig.react-native.json (React Native TypeScript configuration)
7. WHEN the developer lists root directory files, THE System SHALL not contain jest.config.js (React Native Jest configuration)

### Requirement 3: Remove React Native Platform Folders

**User Story:** As a developer, I want the android and ios platform folders removed from the project, so that the repository only contains PWA code and reduces repository size.

#### Acceptance Criteria

1. WHEN the developer lists project directories, THE System SHALL not contain an android directory
2. WHEN the developer lists project directories, THE System SHALL not contain an ios directory
3. WHEN the developer lists project directories, THE System SHALL not contain a __mocks__ directory with React Native mocks
4. WHEN platform folders are removed, THE System SHALL preserve the pwa directory and all its contents

### Requirement 4: Remove React Native Documentation

**User Story:** As a developer, I want all React Native-specific documentation removed, so that developers are not confused by outdated setup instructions and only see PWA-relevant documentation.

#### Acceptance Criteria

1. WHEN the developer lists root directory files, THE System SHALL not contain README_WINDOWS.md (React Native Windows setup)
2. WHEN the developer lists root directory files, THE System SHALL not contain RUNNING_THE_APP.md (React Native running instructions)
3. WHEN the developer lists root directory files, THE System SHALL not contain SETUP_COMPLETE.md (React Native setup completion)
4. WHEN the developer lists root directory files, THE System SHALL not contain WINDOWS_SETUP.md (React Native Windows setup)
5. WHEN the developer lists root directory files, THE System SHALL not contain WINDOWS_CONFIGURATION_COMPLETE.md (React Native Windows configuration)
6. WHEN the developer lists root directory files, THE System SHALL not contain CRITICAL_TASKS_COMPLETED.md (React Native implementation status)
7. WHEN the developer lists root directory files, THE System SHALL not contain CRITICAL_TASKS_FINAL_STATUS.md (React Native task status)
8. WHEN the developer lists root directory files, THE System SHALL not contain HARDWARE_CONNECTION_VERIFICATION.md (React Native hardware verification)
9. WHEN the developer lists root directory files, THE System SHALL not contain IMPLEMENTATION_STATUS.md (React Native implementation status)
10. WHEN the developer lists root directory files, THE System SHALL not contain INTEGRATION_COMPLETE.md (React Native integration status)
11. WHEN the developer lists root directory files, THE System SHALL not contain QUICKSTART.md IF it contains React Native instructions

### Requirement 5: Remove React Native Scripts

**User Story:** As a developer, I want all React Native-specific scripts removed from the project, so that only PWA-related scripts are available and developers don't accidentally run React Native commands.

#### Acceptance Criteria

1. WHEN the developer lists root directory files, THE System SHALL not contain setup-native.js (React Native setup script)
2. WHEN the developer lists root directory files, THE System SHALL not contain run-android.bat (Android run script)
3. WHEN the developer lists root directory files, THE System SHALL not contain windows-check.bat (Windows check script)
4. WHEN the developer lists root directory files, THE System SHALL not contain windows-quickstart.ps1 (Windows PowerShell script)
5. WHEN the developer reviews package.json scripts, THE System SHALL not contain the "android" script
6. WHEN the developer reviews package.json scripts, THE System SHALL not contain the "ios" script
7. WHEN the developer reviews package.json scripts, THE System SHALL not contain the "start" script for Metro bundler
8. WHEN the developer reviews package.json scripts, THE System SHALL not contain the "setup-native" script
9. WHEN the developer reviews package.json scripts, THE System SHALL not contain the "windows-check" script

### Requirement 6: Remove React Native Source Code

**User Story:** As a developer, I want all React Native-specific source code removed from the src directory, so that the codebase only contains PWA code and is easier to maintain.

#### Acceptance Criteria

1. WHEN the developer reviews src/App.tsx, THE System SHALL not import from react-native packages
2. WHEN the developer reviews src/components, THE System SHALL not contain components that import from react-native packages
3. WHEN the developer reviews src/screens, THE System SHALL not contain React Native navigation screens
4. WHEN the developer reviews src/services, THE System SHALL not contain AppLifecycleManager.ts (React Native lifecycle)
5. WHEN the developer reviews src/services, THE System SHALL not contain AppInitializer.ts IF it contains React Native initialization
6. WHEN the developer reviews src/database, THE System SHALL not contain code using react-native-sqlite-storage
7. WHEN the developer reviews src/hooks, THE System SHALL not contain hooks that use React Native APIs

### Requirement 7: Update ESLint Configuration

**User Story:** As a developer, I want the ESLint configuration updated to remove React Native rules, so that linting only checks for PWA-relevant issues.

#### Acceptance Criteria

1. WHEN the developer reviews .eslintrc.js, THE System SHALL not contain eslint-plugin-react-native
2. WHEN the developer reviews .eslintrc.json, THE System SHALL not contain React Native-specific rules
3. WHEN the developer runs npm run lint, THE System SHALL only check for web and PWA-related linting issues
4. WHEN ESLint configuration is updated, THE System SHALL preserve React and TypeScript linting rules

### Requirement 8: Clean Package.json Scripts

**User Story:** As a developer, I want package.json to contain only PWA-relevant scripts, so that the available commands are clear and match the current architecture.

#### Acceptance Criteria

1. WHEN the developer reviews package.json scripts, THE System SHALL contain scripts for PWA development (dev, build, preview)
2. WHEN the developer reviews package.json scripts, THE System SHALL contain scripts for testing (test, test:e2e)
3. WHEN the developer reviews package.json scripts, THE System SHALL contain scripts for code quality (lint, format)
4. WHEN the developer reviews package.json scripts, THE System SHALL not contain any React Native-specific scripts
5. WHEN the developer reviews package.json, THE System SHALL have the main field pointing to the PWA entry point or removed if not needed

### Requirement 9: Preserve PWA Code and Configuration

**User Story:** As a developer, I want all PWA code and configuration preserved during cleanup, so that the working PWA application remains functional.

#### Acceptance Criteria

1. WHEN cleanup is performed, THE System SHALL preserve the entire pwa directory and all its contents
2. WHEN cleanup is performed, THE System SHALL preserve all PWA-related dependencies in package.json
3. WHEN cleanup is performed, THE System SHALL preserve PWA documentation files (pwa/README.md, pwa/DEVELOPER_GUIDE.md, pwa/USER_GUIDE.md, etc.)
4. WHEN cleanup is performed, THE System SHALL preserve the .kiro directory with all specs
5. WHEN cleanup is performed, THE System SHALL preserve TypeScript source code that is platform-agnostic (protocols, models, utils)

### Requirement 10: Update Root README

**User Story:** As a developer, I want the root README.md updated to reflect the PWA-only architecture, so that new developers understand the current project structure and setup process.

#### Acceptance Criteria

1. WHEN the developer reads README.md, THE System SHALL describe the project as a Progressive Web App
2. WHEN the developer reads README.md, THE System SHALL not contain React Native setup instructions
3. WHEN the developer reads README.md, THE System SHALL contain instructions for running the PWA locally
4. WHEN the developer reads README.md, THE System SHALL contain instructions for building and deploying the PWA
5. WHEN the developer reads README.md, THE System SHALL reference the pwa directory for detailed documentation
