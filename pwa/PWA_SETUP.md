# PWA Setup

How the browser version works offline and installs as an app. The Windows and Android apps don't use any of this: they are built with `npm run build:native` (`--mode native`, see `.env.native`), which turns the service worker and the web manifest off, because their files come with the installer or APK.

## Service worker

**Files:**
- `vite.config.ts` - `vite-plugin-pwa` (Workbox), `registerType: 'autoUpdate'`
- `src/main.tsx` - registers the service worker (not in the native build) and asks to reload when a new version is ready
- `public/offline.html` - a static offline page. It's precached but not wired up as a fallback: the precached app itself starts offline.

**What it caches:**
- **App shell**: every built JS, CSS, HTML, icon and font file is precached, so the app starts without a connection.
- **Chart catalog** (`charts/index.json`): network first, 5 s timeout, so the download panel still lists the ENC regions offline.
- **Base map TileJSON** (`tiles.openfreemap.org/planet`): network first, so a new weekly build is picked up.

**What it doesn't cache:**
- **Chart tiles and fonts.** The map loads them through the `opensail://` protocol (`src/components/chart/tileProtocol.ts`), which serves downloaded regions from IndexedDB. Caching them in the service worker too would store every tile twice.
- **PMTiles archives** under `/charts/`: they are read with range requests, which the Cache API can't store.
- **The account pages and the API** (`/login`, `/setup`, `/invite`, `/api`): they always come from the OpenSail server (`server/`), never from the cached app.

On the hosted version, the server sends the app and the service worker only to signed-in users (see [DEPLOY.md](../DEPLOY.md)).

## Web app manifest

Set in `vite.config.ts`: name "OpenSail Navigation", short name "OpenSail", display `standalone`, orientation `any`, icons `public/pwa-192x192.png` and `public/pwa-512x512.png` (also maskable). `index.html` has the meta tags and `public/apple-touch-icon.png` is the iOS icon.

## Installing

The browser offers it: Chrome or Edge **⋮ → Install app** (or the install icon in the address bar), Safari **Share → Add to Home Screen**. It needs HTTPS (or `localhost`).

## Testing

```bash
npm run build
npm run preview
```

Open `http://localhost:4173` in Chrome or Edge. DevTools → **Application** shows the manifest and the service worker; tick **Offline** under Network and reload to check that the app starts from the cache. `npm run dev` also registers the service worker (`devOptions.enabled`).

The Playwright tests `e2e/pwa-installation.spec.ts` and `e2e/offline.spec.ts` check this in CI.
