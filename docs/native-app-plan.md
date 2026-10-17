# Plan: OpenSail as a phone app with direct TCP (Capacitor)

**Status:** proposal, October 2026. Nothing is built yet. The owner decides whether, and in which order.
**Builds on:** PR #31 (Wi-Fi instruments: `WebSocketConnection`, `tools/opensail-bridge`, HDM/RSA/XDR).

## Why

The Pcnautic Easy Tiller Pilot (pypilot) serves NMEA 0183 over **TCP** on `192.168.14.1:20220`, on its own Wi-Fi network `pcnautic_AP`. A browser can't open TCP, so today OpenSail reaches it only through the bridge on a laptop. A phone can't run the bridge.

A native app can open TCP itself. [Capacitor](https://capacitorjs.com) wraps the existing web app (the same React and MapLibre code) in an Android and iOS app and adds native plugins where the web has no API. The PWA keeps working as it is.

There's a second reason to go native, possibly more important than TCP: **background behaviour**. A phone browser stops a PWA when the screen locks. A native app can keep GPS, the anchor watch and the man-overboard guidance running with the screen off (see [5](#5-background-alarms-and-the-locked-screen)).

## 1. The TCP plugin: write a small one of our own

What exists (checked October 2026):

| Plugin | State | Problem |
|---|---|---|
| [`capacitor-tcp-socket`](https://github.com/gee1k/capacitor-tcp-socket) (gee1k) | MIT, ~14 stars, iOS via SwiftSocket, Android via `java.net.Socket` | Only `read(expectLen, timeout)`: the app has to poll. No data events. |
| [`@deedarb/capacitor-tcp-socket`](https://github.com/deedarb/capacitor-tcp-socket) | Fork of the above, versions for Capacitor 7 and 8, adds a server mode | Same polling `read`; one maintainer, no users to speak of |
| [`capacitor-tcp-socket-plugin`](https://www.npmjs.com/package/capacitor-tcp-socket-plugin), `tcp-capacitor-plugin`, `@yesprasoon/…` | Last published years ago, or Android only | Not maintained |

**Recommendation: a small in-repo plugin, `opensail-tcp`.** It needs four calls and two events, about 150–250 lines per platform:

```ts
connect({ host, port, timeoutMs }) → { id }
write({ id, data })                  // text, \r\n added by the caller
disconnect({ id })
addListener('data',  ({ id, text }) => …)   // pushed as it arrives, no polling
addListener('closed', ({ id, error }) => …)
```

- **Android:** `java.net.Socket` on a background thread with a blocking read loop, calling `notifyListeners('data', …)` per chunk. TCP keep-alive on, read timeout 30 s (a silent autopilot means a dead link, the same rule as the bridge).
- **iOS:** `NWConnection` (Network.framework, no third-party library) with a recursive `receive` loop. Same events.
- **Web:** not implemented; the web build keeps using `WebSocketConnection`.
- **Later:** UDP receive (`DatagramSocket` / `NWConnection` UDP) for gateways that broadcast NMEA. That's a small addition with the same events.

Polling `read` with a short timeout would also work as a stopgap (the gee1k plugin, for a prototype). But it wastes battery, and on Android every timed-out read crosses the JS bridge. Event delivery is the better fit for a stream that sends several sentences per second.

## 2. `NativeTcpConnection` in the app

A new class next to `WebSocketConnection` that implements the existing `InstrumentDataConnection` (`pwa/src/services/connections/types.ts`). Everything downstream (parsers, `InstrumentDataService`, navigation sources, alarms) stays as it is.

- **Same behaviour as `WebSocketConnection`:** line splitting across chunks, a clear error when the first attempt fails ("join the `pcnautic_AP` Wi-Fi first"), and reconnect with backoff (1 s → 15 s) when the link drops. The splitting and backoff code moves into a shared helper both classes use.
- **Choosing at runtime:** with `Capacitor.isNativePlatform()`, the Wi-Fi option on the Instruments page offers **host + port** (default `192.168.14.1` / `20220`) in the app, and the WebSocket address in the browser. Both are saved in settings.
- **Write path:** `write()` sends sentences to the autopilot. Unlike the bridge there's no other website in the app that could misuse it, but sending stays behind a deliberate user action (the planned "steer this route" feature) and is off by default.

## 3. What changes in the web build

Little, and nothing for PWA users:

- **One repo, two build targets.** `pwa/` gets `capacitor.config.ts` and the generated `android/` and `ios/` projects. `npm run build` stays the PWA build; `npx cap sync` copies `dist/` into the native projects.
- **Service worker off in the app.** The app ships its files inside the package, so the service worker adds nothing and its update logic would fight the store updates. Only register it when not native.
- **Routing:** `BrowserRouter` works in Capacitor, which serves the app from `https://localhost` on Android and `capacitor://localhost` on iOS. Keep it.
- **Map tiles and charts:** OpenFreeMap, OpenSeaMap and the `/charts/` archives are fetched over HTTPS with CORS, which works from the app's origin. The chart catalog URL must be absolute in the app, because there's no `/charts/` on `localhost`: set `VITE_CHART_CATALOG_URL` for the native build.
- **Storage:** IndexedDB (Dexie, chart tiles) works in both WebViews and lives in the app's own container. `navigator.storage.persist()` is a browser concept; the app shows "stored on this device" instead. *To check:* whether iOS ever evicts WKWebView storage of an installed app under storage pressure. If so, move large chart archives to the file system (`@capacitor/filesystem`).
- **Not in a WebView:** Web Serial (USB) and Web Bluetooth. The app hides those options at first. A BLE plugin can come later if needed.

## 4. Platform rules

**iOS**
- **Local network permission.** Any connection to `192.168.x.x` needs `NSLocalNetworkUsageDescription` in `Info.plist`, for example "OpenSail connects to your autopilot and instruments on the boat's Wi-Fi." iOS shows a prompt the first time. There's no API to ask beforehand or to read the answer, and a denied permission shows up only as a connection that never opens ([Apple TN3179](https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy)). The app should explain this in its error ("Allow local network access in Settings → Privacy → Local Network"). Developer forums report the prompt sometimes not appearing until a real connection is attempted, so test on a physical iPhone, not only the simulator.
- **The `pcnautic_AP` network has no internet.** iOS may then prefer mobile data for internet traffic, which is fine (tiles keep loading). But the app must connect to `192.168.14.1` explicitly over Wi-Fi: `NWConnection` with `requiredInterfaceType = .wifi`.

**Android**
- **Cleartext HTTP rules don't apply** to raw TCP sockets, so no `network_security_config` change is needed for port 20220.
- **Permissions:** `INTERNET` and `ACCESS_NETWORK_STATE`. On a Wi-Fi without internet, Android 10+ can route traffic to mobile data. Bind the socket to the Wi-Fi network (`ConnectivityManager.bindProcessToNetwork`, or open the socket from the Wi-Fi `Network` object) so `192.168.14.1` is reached over Wi-Fi.

## 5. Background, alarms and the locked screen

This is the biggest functional gain, and also the biggest risk for app-store review.

- **Android:** a **foreground service** (type `location`, plus `connectedDevice` for the instrument link), with a permanent notification such as "OpenSail: anchor watch active". GPS, the TCP link and the anchor check keep running with the screen off. Alarms become a high-priority notification with an alarm sound and a full-screen intent, so they also wake the phone. Building blocks: [Capawesome's Android foreground service plugin](https://capawesome.io/docs/sdks/capacitor/android-foreground-service/) and a background geolocation plugin ([Capawesome](https://capawesome.io/docs/sdks/capacitor/background-geolocation/) or [community](https://github.com/capacitor-community/background-geolocation)).
- **iOS:** the `location` background mode (`UIBackgroundModes`). The app keeps running while it receives location updates, and the TCP socket and the JavaScript anchor check run with it. A navigation app is a legitimate use, but review asks for a clear reason, and the user must grant "Always" location. Alarms use local notifications. A sound that breaks through silent mode needs Apple's **critical alerts** entitlement, which Apple grants on request and only to some apps; plan without it. Background audio is not an acceptable trick here and gets rejected.
- **Battery:** continuous GPS plus Wi-Fi uses noticeably more power. Only keep the background mode on while a watch, a route or an instrument connection is active, and say so in the notification.

## 6. Distribution and costs

| | Android | iOS |
|---|---|---|
| Developer account | Google Play: **$25** once | Apple Developer Program: **$99/year** |
| Without a store | Signed **APK** on a GitHub release, installed by hand ("unknown sources"). Free and enough for your own boat. | Only via TestFlight (needs the paid account, builds expire after 90 days) or a Mac with Xcode on a cable |
| Store review | Background location needs a declaration form and a video | Background location and the local-network reason are reviewed. Expect questions. |

**Suggested order:** Android first as a sideloaded APK. That's free, it lets you test on the boat, and it needs no review. iOS and the stores only after the boat tests.

## 7. CI and tests

- **Plugin unit tests:** Android JVM tests for the read loop and close handling; iOS XCTest for the `NWConnection` loop. Both against a local TCP server that plays the autopilot, like `tools/opensail-bridge/bridge.test.mjs` does.
- **App logic:** `NativeTcpConnection` is tested in Vitest with a mocked plugin, like the `WebSocketConnection` tests.
- **Build in CI:** a `build-android` job on `ubuntu-latest` (JDK 21, `./gradlew assembleDebug`) that uploads the APK as an artifact. Release builds are signed with a keystore from GitHub secrets. iOS needs a **macOS runner**. On a private repo, macOS minutes count 10× against the free allowance, so run iOS builds by hand or on release tags only.
- **On a device:** an end-to-end check on a real phone stays manual: join `pcnautic_AP`, connect, see heading, rudder and heel, lock the screen, and trigger the anchor alarm. Write it down as a checklist in the user guide.

## 8. Effort and risks

| Step | Effort (one developer) |
|---|---|
| Capacitor setup, native build of the existing app, SW off, chart catalog URL | 2–3 days |
| `opensail-tcp` plugin (Android + iOS) with tests | 4–6 days |
| `NativeTcpConnection`, shared line/backoff helper, UI for host/port | 2 days |
| Android foreground service, background GPS, alarm notifications | 4–5 days |
| iOS background location, notifications, local-network handling | 4–5 days |
| CI (Android APK, signing), docs, device checklist | 2–3 days |
| **Android only (first milestone)** | **≈ 2.5–3 weeks** |
| **Android + iOS** | **≈ 4–5 weeks**, plus store review time |

**Risks**
1. **iOS local-network permission** behaves unpredictably and fails silently. Mitigation: test early on a physical iPhone, and give clear error texts.
2. **Store review of background location.** Mitigation: Android sideloaded first; for iOS, write a clear justification ("anchor watch and man-overboard keep running with the screen off").
3. **No internet on `pcnautic_AP`** makes the phone send traffic over mobile data, or drop the Wi-Fi network. Mitigation: bind the socket to Wi-Fi explicitly (see 4); download charts for offline use beforehand.
4. **Two code paths** (WebSocket in the browser, TCP in the app). Mitigation: one shared line/backoff helper and the same `InstrumentDataConnection` interface, so only the transport differs.
5. **Maintaining a native plugin** needs some Kotlin/Java and Swift knowledge. Mitigation: keep it minimal (four calls, two events), with tests.

## Alternatives considered

- **Keep the bridge and run it on a Raspberry Pi on board**, with phones loading OpenSail over plain HTTP from the Pi. No app needed, but the phone loses the secure context (no GPS in the browser, no offline service worker), and it adds a device to power and maintain.
- **A desktop app (Tauri or Electron) for the laptop**, which would make the bridge unnecessary there. Useful later, but it doesn't help phones.
- **A Trusted Web Activity (TWA) on Android.** That's the PWA in a Chrome wrapper, and it has the same browser limits, so no TCP. Not an option.

## Decisions for the owner

1. Go for **Android first** as a sideloaded APK (≈ 2.5–3 weeks), or Android and iOS together?
2. Are store releases wanted at all, or is a sideloaded APK on your own phones enough for now?
3. Should background mode (screen off) be part of the first milestone? It's most of the value, and most of the review risk.
