# Release Notes - v2.0.0 PWA-Only

> **History.** This was the note for the February 2026 cleanup that removed the old React Native app; "v2.0.0-pwa-only" was a git tag for that cleanup, not an app release (app releases are v0.x, see [RELEASING.md](../RELEASING.md)).

**Release Date:** February 21, 2026  
**Tag:** v2.0.0-pwa-only

## Overview

OpenSail v2.0.0 marks the completion of the migration from React Native to a Progressive Web App (PWA) architecture. This release removes all legacy React Native code, dependencies, and configuration, resulting in a cleaner, more maintainable codebase focused entirely on the PWA implementation.

## Major Changes

### Removed React Native Components
- Deleted all React Native dependencies (react-native, react-native-windows, etc.)
- Removed React Native configuration files (babel.config.js, metro.config.js, etc.)
- Deleted android/ and ios/ platform directories
- Removed React Native source code from src/ directory
- Cleaned up React Native documentation files

### Updated Project Structure
- Simplified root package.json with PWA-focused scripts
- Updated README.md to reflect PWA-only architecture
- Consolidated all active development in pwa/ directory
- Removed 254 files, reducing codebase by ~47,000 lines

### Package Changes
- **Version:** Updated to 2.0.0 (major version bump)
- **Dependencies:** Removed all React Native packages
- **Scripts:** Added convenience scripts that delegate to pwa/ directory
  - `npm run dev` - Start development server
  - `npm run build` - Build for production
  - `npm run preview` - Preview production build
  - `npm run test` - Run tests
  - `npm run lint` - Run linter

## Benefits

1. **Cleaner Codebase:** Removed ~47,000 lines of unused code
2. **Simpler Development:** No more React Native toolchain complexity
3. **Faster Builds:** Reduced dependencies and build time
4. **Better Documentation:** Clear, PWA-focused documentation
5. **Easier Onboarding:** New developers see only relevant code

## Breaking Changes

This is a major version bump because the project structure has fundamentally changed:
- React Native code is no longer available
- Root directory scripts have changed
- Development workflow is now PWA-focused

## Migration Guide

If you were working with the React Native version:
1. All development now happens in the `pwa/` directory
2. Use `cd pwa && npm install` to install dependencies
3. Use `npm run dev` from root or `cd pwa && npm run dev` to start development
4. See [pwa/DEVELOPER_GUIDE.md](../../pwa/DEVELOPER_GUIDE.md) for complete setup

## Verification

All PWA functionality has been verified:
- ✅ PWA builds successfully
- ✅ All tests pass
- ✅ No React Native references remain (except in git history)
- ✅ Documentation updated
- ✅ Package.json cleaned

## Git History

The React Native code is preserved in git history and can be recovered if needed:
- Tag `pre-cleanup` marks the last commit before cleanup
- All deleted files are available in git history

## Next Steps

With the cleanup complete, future development will focus on:
- PWA feature enhancements
- Performance optimizations
- Additional marine protocol support
- UI/UX improvements

---

**Full Changelog:** See git log from pre-cleanup to v2.0.0-pwa-only
