# Chart sources

What the chart in the app (browser, Windows and Android) is made of, where each layer comes from, its licence and what we owe the people who host it. The choice behind it is in [`chart-source-decision.md`](chart-source-decision.md#decision).

> **Not for navigation.** None of these sources is an official chart for the Dutch coast. The chart shows a "Not for navigation" notice at all times (`ChartDisclaimer`).

| Layer | Source | Licence | Attribution shown | Hosted by |
|---|---|---|---|---|
| Base map (land, water, places) | OpenStreetMap vector tiles in the OpenMapTiles schema | ODbL (data) | "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" | [OpenFreeMap](https://openfreemap.org), free, no key, no limits |
| Seamarks (buoys, beacons, lights) | [OpenSeaMap](https://www.openseamap.org) seamark raster tiles, `tiles.openseamap.org/seamark/{z}/{x}/{y}.png` | ODbL (data), CC BY-SA 2.0 (tiles) | "Seamarks © OpenSeaMap contributors" | OpenSeaMap volunteers |
| Depth areas, contours, soundings, hazards, bridges, fairways, locks | Rijkswaterstaat inland ENCs (S-57), converted by [`tools/enc-pipeline`](../tools/enc-pipeline/README.md) to PMTiles | CC-0 | "Rijkswaterstaat ENC, CC0-1.0, edition <date>" | Our own: GitHub releases of the public repo [gjvanhalem/opensail-charts](https://github.com/gjvanhalem/opensail-charts) (the Windows and Android apps), and `/charts/` on the server of the browser version |

The URLs live in [`pwa/src/components/chart/chartSources.ts`](../pwa/src/components/chart/chartSources.ts) and the style in [`baseMapStyle.ts`](../pwa/src/components/chart/baseMapStyle.ts). MapLibre shows the attribution of every source in the map's attribution control.

## Base map: OpenFreeMap

- The style is built in code rather than fetched, so the chart keeps its colours and overlays when the tile server can't be reached.
- Tiles come from the URL in the TileJSON `https://tiles.openfreemap.org/planet`. It contains the weekly build (`/planet/<build>/{z}/{x}/{y}.pbf`), so it's read from the TileJSON once per session instead of hard-coded.
- Labels use OpenFreeMap's fonts (`/fonts/{fontstack}/{range}.pbf`): Noto Sans Regular and Italic.
- Tiles exist up to zoom 14; MapLibre overzooms beyond that.

## Seamarks: OpenSeaMap

- A raster overlay drawn above everything else in the base style, from zoom 9 (lower zooms are unreadable and OpenSeaMap draws few seamarks there) up to 18.
- It can be turned off in the chart's Layers panel (setting `showNavigationAids`, passed to `ChartView` as `showSeamarks`).
- The tile server is run by volunteers. The app only fetches tiles for what is on screen and, for offline use, for regions the user picks. Before offering bulk downloads to many users, either agree it with the OpenSeaMap team (contact via [openseamap.org](https://www.openseamap.org/index.php?id=kontakt)) or mirror the tiles on our own host and point `SEAMARK_TILES_URL` at the mirror.

## Inland ENC: Rijkswaterstaat

- Official Inland ENCs for the Dutch waterways, CC-0. Rijkswaterstaat also publishes Waddenzee and Zeeland sets **with full depth data**, updated weekly; those are not published yet, pending Rijkswaterstaat's confirmation of the licence. The pipeline, the file ids and the sizes are in [`tools/enc-pipeline/README.md`](../tools/enc-pipeline/README.md).
- The app reads `charts/index.json` (or `VITE_CHART_CATALOG_URL`; the native apps read `releases/latest/download/index.json` of opensail-charts) and adds every region as a vector source. The native apps fetch the catalog and archives with native HTTP, because GitHub sends no CORS headers.
- The layer can be turned off in the Layers panel (setting `showDepthContours`, passed to `ChartView` as `showEnc`). Tiles are read from each PMTiles archive with HTTP range requests (the `pmtiles` library), so nothing is downloaded up front.
- The style ([`encStyle.ts`](../pwa/src/components/chart/encStyle.ts)) follows S-52 day colours. Depth areas are shaded against a shallow, safety and deep contour (default 2, 3 and 10 m). The safety contour line is drawn heavier. Hazards are magenta-ringed isolated dangers, and bridges show their vertical clearance from zoom 13. An inland depth area with `DRVAL1` 0 and no `DRVAL2` has no surveyed depth, so it's drawn in a neutral water colour, not as shallow water.
- ENC layers sit under the base map's names and the seamarks, and above the base map's water.

## Offline

- Every tile and glyph range goes through one MapLibre protocol, `opensail://<source>/{z}/{x}/{y}` and `opensail://glyphs/{fontstack}/{range}` ([`tileProtocol.ts`](../pwa/src/components/chart/tileProtocol.ts)). A downloaded tile comes from IndexedDB, anything else from the network while online. Offline, a missing tile is an empty tile, so the map draws what it has without errors.
- "Download region" stores, for the chosen zoom levels: base map tiles (up to z14), seamark tiles (one zoom level up, because they're 256-pixel rasters), ENC tiles of every catalog region that overlaps (cut out of the PMTiles archive with range requests), and the glyph ranges the style uses (Noto Sans Regular and Italic, Latin plus the punctuation and arrow ranges). The style is built in code and uses no sprites, so nothing else is needed.
- Overlapping regions share tiles. A tile is deleted with the last region that holds it. Downloaded tiles are never evicted, and the app asks the browser for persistent storage.
- Each downloaded region keeps the manifests of its ENC regions in IndexedDB (`chartRegions`), so the ENC layers draw offline without the catalog.
- The service worker (browser version only; the native apps have none) doesn't cache tiles (IndexedDB holds them). It precaches the app, caches the chart catalog and TileJSON (network first), and leaves `/charts/` alone.
- `ConnectionStatus` shows "Offline: downloaded charts only" on the chart without a connection.

## Chart management (R15)

The Offline Charts panel lists every downloaded region with its size, tile count, zoom levels, download date and **edition date**: the newest edition of the ENC data it contains, and how many days old that is. Regions without ENC data say so. Deleting a region asks for confirmation inline, and tiles that an overlapping region still needs are kept.

**Updates (R15.2).** When the app starts or comes back online, it compares the ENC editions in each downloaded region with the chart catalog (`charts/index.json`). If the catalog has a newer edition, the chart shows a notice and the region shows "Update available" with the old and new edition. "Update" downloads that region's ENC tiles again; base map and seamark tiles are kept. The catalog is the "chart provider" here. When Rijkswaterstaat publishes a new edition, rebuild the archives with `tools/enc-pipeline`: the opensail-charts workflow publishes a new release for the native apps, and the browser version's server is rebuilt with the `charts` command in [DEPLOY.md](../DEPLOY.md#4-charts).

**Storage (R15.5).** The panel shows the size of the downloaded charts, how much storage is used of the quota, and whether the browser granted persistent storage (the app asks for it on every download; WebView2 in the Windows app says no, but the storage belongs to the app there). The spec's minimum of 50 GB isn't something a web app can promise. The quota belongs to the browser: Chromium allows up to about 60% of free disk space, while Safari on iPad allows much less and may ask the user. One Dutch region at z8–14 takes tens of MB, so this isn't a practical limit for the Dutch waters.

## Testing

End-to-end tests never reach these servers: [`pwa/e2e/fixtures/test.ts`](../pwa/e2e/fixtures/test.ts) answers every request to `tiles.openfreemap.org` and `tiles.openseamap.org` with an empty tile (with CORS headers, because the app fetches tiles itself), so the chart renders its background and overlays. Every spec imports `test` from that file. `serveChartFixtures` serves a 36 KB inland ENC fixture (the Stavoren cell, built by the pipeline) from `e2e/fixtures/charts/`, with byte-range responses.

## Content Security Policy

The deployed browser version (`server/`) and the Windows app (`csp: null` in `desktop/src-tauri/tauri.conf.json`) set no Content Security Policy. `netlify.toml` and `vercel.json` still allow `https://tiles.openfreemap.org` and `https://tiles.openseamap.org` in `img-src` and `connect-src`, but they aren't used for deployment any more. If a CSP is added, every tile host must be in it.
