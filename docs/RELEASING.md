# Releasing OpenSail

OpenSail is one web app (`pwa/`) in three shells: the browser (PWA, deployed by `pwa-deploy.yml`), Windows (`desktop/`, Tauri) and Android (`android/`, Capacitor). The native apps get **one version** and **one release** with both installers.

## The version

The one version lives in **`pwa/package.json`**. Everything else reads it:

| Where | How |
|---|---|
| The app itself (Settings › About) | `__APP_VERSION__`, set by `pwa/vite.config.ts` |
| Windows | `desktop/src-tauri/tauri.conf.json` has `"version": "../../pwa/package.json"` |
| Android | `android/native/app/build.gradle` reads it: `versionName` 0.2.3, `versionCode` 203 (major × 10000 + minor × 100 + patch) |
| The release tag | `v<version>`, checked by `release.yml` |

Don't put a version anywhere else. (`Cargo.toml` needs one for Rust and has `0.0.0`; it isn't used.) Android only installs an update with a higher `versionCode`, so versions only go up.

## Making a release

1. Bump the version on a branch and merge it:

   ```bash
   npm version 0.3.0 --no-git-tag-version --prefix pwa
   ```

2. Tag the merged main and push the tag:

   ```bash
   git tag v0.3.0 origin/main
   ```

   ```bash
   git push origin v0.3.0
   ```

3. [`release.yml`](../.github/workflows/release.yml) checks that the tag matches `pwa/package.json`, runs the full [Desktop app](../.github/workflows/desktop.yml) and [Android app](../.github/workflows/android.yml) workflows (tests, builds and both smoke tests), and only then creates the GitHub release **OpenSail 0.3.0** with:
   - `OpenSail_0.3.0_x64-setup.exe` (Windows installer)
   - `OpenSail-0.3.0.apk` (Android, signed with the release key)

If a job fails, nothing is published. Fix it, then move the tag: `git tag -f v0.3.0 origin/main` and `git push -f origin v0.3.0`.

Pull requests build the same things without publishing: the artifacts `opensail-desktop-windows` and `opensail-android-debug` (a debug APK that installs next to the released app as "OpenSail (test)").

The old `desktop-v*` tags are gone: `desktop-v0.1.0` stays as the first Windows release, later ones are `v*`.

## The Android release key

Android only installs an update that is signed with the same key as the installed app. **If the key is lost, every user has to uninstall OpenSail (losing their routes, tracks and downloaded charts) to install a newer version.**

- The keystore is on the owner's laptop: `C:\Users\gjvan\.opensail\android\opensail-release.p12` (PKCS12, alias `opensail`, RSA 4096, valid until 2054), its password in `opensail-release.password` next to it. **Keep a backup of both** outside the laptop (password manager, encrypted USB stick).
- Certificate SHA-256: `A5:B0:00:E0:FC:2B:EE:BC:6F:8E:7D:CD:5C:AD:AB:EC:27:E1:0D:64:93:F7:AA:8D:CD:6B:24:CB:AC:8D:E7:83`. `apksigner verify --print-certs` on a release APK shows it.
- CI signs with three repository secrets (set on 2026-10-18). To set them again, in `C:\Users\gjvan\.opensail\android`, in Windows PowerShell:

  ```powershell
  gh secret set ANDROID_KEYSTORE_BASE64 -R gjvanhalem/OpenSail --body ([Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\opensail-release.p12")))
  ```

  ```powershell
  gh secret set ANDROID_KEYSTORE_PASSWORD -R gjvanhalem/OpenSail --body ((Get-Content -Raw "$PWD\opensail-release.password").Trim())
  ```

  ```powershell
  gh secret set ANDROID_KEY_ALIAS -R gjvanhalem/OpenSail --body opensail
  ```

  Or in Git Bash:

  ```bash
  base64 -w0 opensail-release.p12 | gh secret set ANDROID_KEYSTORE_BASE64 -R gjvanhalem/OpenSail
  ```

  ```bash
  gh secret set ANDROID_KEYSTORE_PASSWORD -R gjvanhalem/OpenSail < opensail-release.password
  ```

  ```bash
  gh secret set ANDROID_KEY_ALIAS -R gjvanhalem/OpenSail --body opensail
  ```

Without the secrets, a release tag fails at "Release key" and publishes nothing.

## Not yet

- Windows code signing (the SmartScreen warning) and self-update (`tauri-plugin-updater`).
- Play Store: the APK is sideloaded. A store listing needs a Google Play account ($25) and a review of the background location use.
