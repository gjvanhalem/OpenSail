# Chart source decision (Phase 1 spike, input for Phase 3)

**Status:** decided by the project owner on 2026-10-15; see [Decision](#decision). The options and recommendation below are the input that decision was based on.
**Date:** October 2026. **Time box:** about 1 day of research. Nothing here was prototyped, so the effort figures are estimates.

## The question

The chart is a Mapbox streets style with water drawn blue. It's not a nautical chart. Phase 3 needs a source that gives us:

- navigation aids: buoys, beacons and lights (R1.4)
- depth contours, soundings and hazards, both on the chart and for route hazard warnings (R2.5)
- offline use of downloaded regions (R5.1, R5.2), plus edition dates and update checks (R15)
- a licence that allows a free, open-source PWA to cache tiles on the device

## What the current stack allows

Two facts about the map library limit the choice. Both need checking before Phase 3 starts:

1. **mapbox-gl v3 is proprietary.** It needs a Mapbox token, and map loads are counted for billing. Mapbox's terms limit caching and offline use of Mapbox-hosted data. Our own tiles (ENC-derived, OpenSeaMap) don't fall under those terms, but the Mapbox base map does.
2. **mapbox-gl has no custom tile protocol** like MapLibre's `addProtocol`. To serve tiles from IndexedDB, the only routes are a service worker or `transformRequest` to a URL that the service worker answers. **MapLibre GL JS** (a BSD-licensed fork of mapbox-gl v1) has `addProtocol` and works directly with PMTiles archives. `react-map-gl` supports it through `react-map-gl/maplibre` with almost the same API. Switching would also remove the Mapbox token from CI (see the placeholder-token problem in the e2e tests).

## Options

### A. OpenSeaMap seamark overlay on a free base map

OpenSeaMap renders seamarks (buoys, beacons, lights, harbours) from OpenStreetMap data as transparent raster tiles. We would draw them over a base map.

| | |
|---|---|
| **Cost** | Free. Hosting our own tile cache or renderer costs a little. |
| **Licence** | Data is ODbL (attribute OpenStreetMap and OpenSeaMap; share-alike applies to derived *data*). The OpenSeaMap FAQ says the tiles are CC BY-SA 2.0. Either way, a free PWA can use it with attribution. |
| **Coverage and quality** | Crowd-sourced. Seamarks are good in busy European waters and patchy elsewhere. **No depth contours or soundings** in the seamark layer. A separate depth layer exists, but its coverage is thin. Not an official chart. |
| **Offline** | Raster PNG tiles are easy to cache: the existing `TileCache` and a service worker are enough. The OpenSeaMap tile server is run by volunteers. Bulk downloads of regions should go through our own cache or mirror, after asking the OpenSeaMap team, not straight to their server. |
| **Fit with mapbox-gl** | Good. Add a `raster` source over the base style. Works with mapbox-gl or MapLibre. |
| **Effort** | About 1 week, including attribution and offline caching. |

### B. Official ENC data converted to vector tiles

Hydrographic offices publish S-57 ENCs. Some are free:

- **NOAA (US):** all US ENCs free to download, updated weekly. NOAA also has ready-made services: WMS/WMTS/Esri REST in paper-chart or S-52 style, and **MBTiles raster packages for offline use**, also updated weekly.
- **Rijkswaterstaat (NL):** inland ENCs ("ENC van Nederlandse binnenwateren") on data.overheid.nl under **CC-0**, with a ZIP download and a WMS. Port ENCs too. **Dutch coastal and sea charts** come from the Dienst der Hydrografie and are **not free**. They're sold through chart distributors.
- Other European inland waterways (Germany's WSV and others) publish free inland ENCs. Most sea ENCs outside the US are commercial (through IC-ENC/Primar distributors) and their licences forbid redistribution.

Pipeline: S-57 → GDAL/ogr2ogr (reads S-57) → GeoJSON → tippecanoe → PMTiles or MBTiles per region, with a mapbox-gl/MapLibre style that approximates S-52 symbols. Run in CI or as a scheduled job; publish per-region archives with their edition date.

| | |
|---|---|
| **Cost** | Free data for the US and Dutch inland waters. Hosting a few GB of static archives costs little (object storage or a CDN). The real cost is **build effort and upkeep**. |
| **Licence** | NOAA: US government data, free. Rijkswaterstaat inland: CC-0. Commercial ENCs elsewhere: **not usable** this way. |
| **Coverage and quality** | Authoritative, with depth areas, contours, soundings, hazards and wrecks: what R2.5 needs. Coverage is limited to where free ENCs exist. |
| **Offline** | Best of all the options: one PMTiles or MBTiles file per region, easy to download and store. Each file has an edition date, which covers R15.4 and update checks. A shortcut for the US: NOAA's offline MBTiles (raster) can be used as is. |
| **Fit with mapbox-gl** | Vector tiles render fine in mapbox-gl. Reading PMTiles from IndexedDB is far easier with MapLibre's `addProtocol` (see above). |
| **Effort** | 3–5 weeks: pipeline, a usable S-52-like style (symbols, lights, depth shading), and per-region packaging. This fills most of Phase 3. |

### C. Commercial nautical chart provider

The main one with a web API is **Navionics (Garmin)**. Its Web API has a free *Standard* tier: a chart window on a website, no overlays allowed, and the service must be free to users. The paid *Enhanced* tier allows full-page charts with your own overlays (vessel, tracks, AIS) for an annual fee by region. Prices aren't published. C-MAP and others license data to app makers under individual contracts.

| | |
|---|---|
| **Cost** | Annual licence fee, quoted on request. Likely also per-user or per-region fees. |
| **Licence** | Contract terms. These usually forbid caching outside the vendor's SDK, and need a developer key. The free tier forbids overlays, so it can't show our boat or route. |
| **Coverage and quality** | Global, good, regularly updated. |
| **Offline** | Depends on the vendor's SDK. The Navionics developer page says nothing about offline caching. This is the main risk for R5. |
| **Fit with mapbox-gl** | Unknown. Vendor SDKs usually come with their own map component, which would replace or sit beside mapbox-gl. Our layers (route, track, AIS, vessel) would have to be ported to it. |
| **Effort** | 1–2 weeks of integration once a contract exists. Lead time for the contract is unknown. |

## Comparison

| | A. OpenSeaMap | B. ENC → vector tiles | C. Commercial |
|---|---|---|---|
| Navigation aids (R1.4) | ✅ crowd-sourced | ✅ official | ✅ |
| Depth and hazards (R2.5) | ❌ hardly any | ✅ | ✅ (if the API exposes them; overlay use needs Enhanced) |
| Coverage | Global, uneven | US and NL inland (plus other free ENC areas) | Global |
| Offline (R5) | ✅ easy | ✅ best | ⚠️ depends on vendor |
| Licence for a free open-source PWA | ✅ attribution | ✅ for free ENCs | ⚠️ contract and fees |
| Running cost | ~0 | Low (static hosting) | Annual fee |
| Effort | ~1 week | 3–5 weeks | 1–2 weeks + contract |
| Fits mapbox-gl | ✅ | ✅ (better with MapLibre) | ❓ |

## Recommendation

**Go with A + B, in that order, and switch the map to MapLibre GL JS at the start of Phase 3.**

1. **First (about 1 week): OpenSeaMap seamarks** over a free base map. This gives navigation aids everywhere right away, and gets the offline cache path working on simple raster tiles. Ask the OpenSeaMap team before downloading regions in bulk, or mirror the tiles ourselves.
2. **Then (3–5 weeks): ENC-derived vector tiles** for the waters with free ENCs: Dutch inland (CC-0) and the US (NOAA). These bring the depth contours, soundings and hazards that R2.5 needs, plus edition dates for R15. For the US, NOAA's offline MBTiles can be a quick stopgap before our own vector pipeline exists.
3. **MapLibre** instead of mapbox-gl. It removes the Mapbox token and its terms on offline caching, and makes reading PMTiles from IndexedDB straightforward. `react-map-gl/maplibre` keeps most of our code the same. This is a smaller job than any of the chart options, but it should be its own PR at the start of Phase 3.

Keep **C (commercial)** as the fallback if the project needs official sea charts outside the US, such as Dutch coastal waters. Those aren't free anywhere, and this would be a business decision because of the fees.

### Why not just one option?

- A alone has no depth data, so route hazard warnings (R2.5) can't be built.
- B alone leaves everything outside the free-ENC areas without navigation aids.
- C alone costs money every year, its offline use is uncertain, and it probably forces a different map component.

## What R15 should say

R15.1 (S-57 ENC support) and R15.5 (50 GB storage) don't fit a browser app as written. This recommendation meets R15.1 by converting S-57 to tiles on the server, not by reading S-57 files in the browser. The ROADMAP already suggests rewording R15 this way. The 50 GB limit depends on the browser's storage quota.

## Decision

The owner answered the four open questions on 2026-10-15:

| # | Question | Answer |
|---|---|---|
| 1 | Which waters matter first? | **Dutch inland waters and the Dutch coast** |
| 2 | Crowd-sourced seamarks (A) with a "not for navigation" disclaimer? | **Yes** |
| 3 | Switch from mapbox-gl to MapLibre GL JS? | **Yes** |
| 4 | Budget for a commercial licence? | **No** |

### What this means for Phase 3

1. **MapLibre GL JS first.** Replace mapbox-gl with MapLibre through `react-map-gl/maplibre`, on a free base map (OpenStreetMap-based vector tiles, such as OpenFreeMap or self-hosted Protomaps PMTiles). This removes the Mapbox token from the app and from CI. It's the first Phase 3 PR.
2. **OpenSeaMap seamarks (A) everywhere**, with attribution and a visible "not for navigation" disclaimer. This covers navigation aids (R1.4) on the Dutch coast as well as inland.
3. **Rijkswaterstaat inland ENCs (B), CC-0**, converted to vector tiles (S-57 → GDAL → tippecanoe → PMTiles). These give official depth areas, contours and hazards for Dutch inland waters, which R2.5 needs, plus edition dates for R15.4.
4. **Option C is ruled out (no budget).** The official Dutch coastal and sea ENCs (Dienst der Hydrografie) are commercial, so the app **won't have official depth data for the Dutch coast**.

### Gap: depth data for the Dutch coast

With no budget, coastal depth contours have to come from free bathymetry instead of ENCs. Candidates, **not yet researched**. Check each one's licence, resolution and how often it's updated before committing:

- **EMODnet Bathymetry**: a free, open European digital terrain model of the seabed that covers the North Sea. It can be turned into depth contours with GDAL (`gdal_contour`) and then into vector tiles.
- **Rijkswaterstaat open bathymetry data** for the coastal zone, Wadden Sea and Zeeland (for example the "vaklodingen" surveys). It's more detailed near the coast, but may be updated less often.

**Spike result (2026-10-15):** see [`coastal-depth-spike.md`](coastal-depth-spike.md). The Waddenzee and Zeeland have free official RWS ENCs with depths; for the rest of the coast the recommendation is the RWS 20 m coastal grid.

Both are survey or model data, not official charts. The coastal hazard warnings (R2.5) built on them must carry the same "not for navigation" disclaimer and should be described as advisory. Spend a short spike on this at the start of the Phase 3 depth work.

### Effects on the requirements

- **R1.4 (navigation aids):** met by OpenSeaMap, inland and coastal.
- **R2.5 (hazard warnings):** official data for inland waters; advisory only on the coast, from free bathymetry.
- **R15.1 (S-57 ENC):** met for Rijkswaterstaat inland ENCs by converting them on the server, not in the browser.

## Sources

- [OpenSeaMap FAQ](https://www.openseamap.org/index.php?L=1&id=faq): ODbL data, CC BY-SA 2.0 tiles, offline charts
- [OSM tile usage policy](https://wiki.openstreetmap.org/wiki/Tile_usage_policy): background on volunteer-run tile servers (OSMF's servers, not OpenSeaMap's)
- [NOAA GIS data and services](https://nauticalcharts.noaa.gov/data/gis-data-and-services.html): ENC Direct, Chart Display Service (WMS/WMTS/REST), MBTiles
- [NOAA Chart Display Service MBTiles downloads](https://distribution.charts.noaa.gov/ncds/index.html)
- [ENC van Nederlandse binnenwateren on data.overheid.nl](https://data.overheid.nl/dataset/55088-enc-van-nederlandse-binnenwateren): CC-0, ZIP and WMS
- [Rijkswaterstaat: elektronische vaarwegkaarten](https://www.rijkswaterstaat.nl/zakelijk/zakendoen-met-rijkswaterstaat/werkwijzen/werkwijze-in-gww/data-eisen-rijkswaterstaatcontracten/elektronische-vaarwegkaarten): inland and port ENCs
- [Garmin / Navionics Web API](https://developer.garmin.com/marine-charts/web/): Standard (free, no overlays) and Enhanced (paid) tiers
