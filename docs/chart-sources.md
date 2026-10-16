# Chart sources

What the chart in the PWA is made of, where each layer comes from, its licence and what we owe the people who host it. The choice behind it is in [`chart-source-decision.md`](chart-source-decision.md#decision).

> **Not for navigation.** None of these sources is an official chart for the Dutch coast. The chart shows a "Not for navigation" notice at all times (`ChartDisclaimer`).

| Layer | Source | Licence | Attribution shown | Hosted by |
|---|---|---|---|---|
| Base map (land, water, places) | OpenStreetMap vector tiles in the OpenMapTiles schema | ODbL (data) | "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" | [OpenFreeMap](https://openfreemap.org), free, no key, no limits |
| Seamarks (buoys, beacons, lights) | [OpenSeaMap](https://www.openseamap.org) seamark raster tiles, `tiles.openseamap.org/seamark/{z}/{x}/{y}.png` | ODbL (data), CC BY-SA 2.0 (tiles) | "Seamarks © OpenSeaMap contributors" | OpenSeaMap volunteers |
| Depth areas, contours, soundings, hazards, bridges, fairways, locks | Rijkswaterstaat inland ENCs (S-57), converted by [`tools/enc-pipeline`](../tools/enc-pipeline/README.md) to PMTiles | CC-0 | "Rijkswaterstaat ENC, CC0-1.0, edition <date>" | Our own: the release tagged `charts`, served from the Pages site at `/charts/` |

The URLs live in [`pwa/src/components/chart/chartSources.ts`](../pwa/src/components/chart/chartSources.ts) and the style in [`baseMapStyle.ts`](../pwa/src/components/chart/baseMapStyle.ts). MapLibre shows the attribution of every source in the map's attribution control.

## Base map: OpenFreeMap

- The style is built in code rather than fetched, so the chart keeps its colours and overlays when the tile server can't be reached.
- The vector source points at the TileJSON `https://tiles.openfreemap.org/planet`. Its tile URL contains the weekly build (`/planet/<build>/{z}/{x}/{y}.pbf`), so the download service reads it from the TileJSON instead of hard-coding it.
- Labels use OpenFreeMap's fonts (`/fonts/{fontstack}/{range}.pbf`): Noto Sans Regular and Italic.
- Tiles exist up to zoom 14; MapLibre overzooms beyond that.

## Seamarks: OpenSeaMap

- A raster overlay drawn above everything else in the base style, from zoom 9 (lower zooms are unreadable and OpenSeaMap draws few seamarks there) up to 18.
- It can be turned off with `ChartView`'s `showSeamarks` prop.
- The tile server is run by volunteers. The app only fetches tiles for what is on screen and, for offline use, for regions the user picks. Before offering bulk downloads to many users, either agree it with the OpenSeaMap team (contact via [openseamap.org](https://www.openseamap.org/index.php?id=kontakt)) or mirror the tiles on our own host and point `SEAMARK_TILES_URL` at the mirror.

## Inland ENC: Rijkswaterstaat

- Official Inland ENCs for the Dutch waterways, plus Waddenzee and Zeeland sets **with full depth data**, updated weekly. All CC-0. The pipeline, the file ids and the sizes are in [`tools/enc-pipeline/README.md`](../tools/enc-pipeline/README.md).
- The app reads `charts/index.json` (or `VITE_CHART_CATALOG_URL`) and adds every region as a `pmtiles://` vector source. The `pmtiles` library reads each archive with HTTP range requests, so nothing is downloaded up front.
- The style ([`encStyle.ts`](../pwa/src/components/chart/encStyle.ts)) follows S-52 day colours. Depth areas are shaded against a shallow, safety and deep contour (default 2, 3 and 10 m). The safety contour line is drawn heavier. Hazards are magenta-ringed isolated dangers, and bridges show their vertical clearance from zoom 13. An inland depth area with `DRVAL1` 0 and no `DRVAL2` has no surveyed depth, so it's drawn in a neutral water colour, not as shallow water.
- ENC layers sit under the base map's names and the seamarks, and above the base map's water.

## Testing

End-to-end tests never reach these servers: [`pwa/e2e/fixtures/test.ts`](../pwa/e2e/fixtures/test.ts) answers every request to `tiles.openfreemap.org` and `tiles.openseamap.org` with an empty tile, so the chart renders its background and overlays. Every spec imports `test` from that file. `serveChartFixtures` serves a 36 KB inland ENC fixture (the Stavoren cell, built by the pipeline) from `e2e/fixtures/charts/`, with byte-range responses.

## Content Security Policy

`netlify.toml` and `vercel.json` allow `https://tiles.openfreemap.org` and `https://tiles.openseamap.org` in `img-src` and `connect-src`. Add any new tile host there too.
