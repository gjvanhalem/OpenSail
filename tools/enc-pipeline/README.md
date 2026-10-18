# ENC pipeline: Rijkswaterstaat inland ENC → PMTiles

Turns Rijkswaterstaat's free (CC-0) inland ENCs, in S-57 format, into one [PMTiles](https://docs.protomaps.com/pmtiles/) vector-tile archive per region. The PWA draws them with its S-52-like style (`pwa/src/components/chart/encStyle.ts`).

```
S-57 cells (*.000 + updates) ──ogr2ogr──► GeoJSONSeq per object class ──tippecanoe──► <region>.pmtiles
                     DSID edition dates ──────────────────────────────────────────► <region>.json, index.json
```

It runs in Docker (GDAL 3.10 and tippecanoe 2.79), so nothing needs to be installed on the host. It doesn't run in CI.

## Use

```bash
docker build -t opensail-enc-pipeline tools/enc-pipeline
```

```bash
docker run --rm -v "$PWD/tools/enc-pipeline/out:/work/out" opensail-enc-pipeline nl-inland 4789373346 "Nederland (excl. Zeeland, Waddenzee)"
```

Arguments: `<region-id> <source> [name]`. `<source>` is either a download file id from the Rijkswaterstaat portal (it's fetched for you), or the path inside the container to a `.zip` or a folder of S-57 cells (mount it with `-v`). With a `.zip` or folder, pass the file id as `-e RWS_FILE_ID=…` so the app can check for updates. `-e MIN_ZOOM=8 -e MAX_ZOOM=15` are the defaults.

The output folder (`out/`, git-ignored) gets:

| File | What |
|---|---|
| `<region-id>.pmtiles` | Vector tiles, z8–15. One layer per S-57 object class, in lower case (`depare`, `depcnt`, `soundg`, `bridge`, …) |
| `<region-id>.json` | Manifest: bounds, zooms, size, sha256, the region's edition date, and every cell's edition, update number, issue date and update date (from `DSID`) |
| `index.json` | Catalog of every region in the folder (manifests without the cell list). The app reads this. |

## Sources

The current downloads are listed as JSON at <https://www.vaarweginformatie.nl/frp/api/webcontent/downloads?pageId=infra/enc> (the "ENC" page on vaarweginformatie.nl). On 2026-10-15:

| Download | File id | Updated | Size (zip → PMTiles) | Depth data |
|---|---|---|---|---|
| Nederland (excl. Zeeland, Waddenzee) | 4789373346 | about monthly | 42 MB → 19 MB | Depth areas, mostly without a surveyed depth (`DRVAL1` 0); bridge clearances |
| Waddenzee met diepte | 4801379797 | weekly | 25 MB → 76 MB | Full: depth areas, contours, about 430,000 soundings |
| Zeeland met diepte | 4795409564 | weekly | 47 MB → 100 MB | Full, like the Waddenzee |

File ids change with every new edition, so read them from the list. A later PR will make the app's update check compare `editionDate` against this list.

## What's in the tiles

Object classes (see `LAYERS` in `build-region.sh`): coverage (`M_COVR`), depths (`DEPARE`, `DRGARE`, `DEPCNT`, `SOUNDG`), hazards (`OBSTRN`, `WRECKS`, `UWTROC`, `HULKES`, `PILPNT`), vertical clearance (`bridge`, `cblohd`, `PIPSOL`), routes (`FAIRWY`, `wtwaxs`, `NAVLNE`, `RECTRC`), structures (`lokbsn`, `SLCONS`, `DAMCON`, `FLODOC`, `PONTON`) and areas (`resare`, `CTNARE`, `hrbare`, `berths`). Lower-case names are Inland ENC (IENC) extensions.

Buoys, beacons and lights are left out on purpose: the chart shows them from OpenSeaMap.

Only the attributes in `ATTRIBUTES` are kept: names, depths (`DRVAL1/2`, `VALDCO`, `VALSOU`, `DEPTH`), clearances (`VERCLR`, `HORCLR`), categories and `SCAMIN`.

Depths are in metres. In the Waddenzee data, negative depths are drying heights.

## Hosting

The archives are too big for git, so they're attached to a GitHub release and copied into the Pages site when it deploys:

1. Build every region into `tools/enc-pipeline/out/`.
2. Upload the archives and `index.json` to the release tagged `charts` (create it once):
   ```bash
   gh release upload charts tools/enc-pipeline/out/*.pmtiles tools/enc-pipeline/out/index.json --clobber
   ```
3. The deploy workflow (`pwa-deploy.yml`, "Add chart archives") downloads them into `dist/charts/`, so the app gets them from its own origin (`/charts/index.json`). That means no CORS, and GitHub Pages serves the byte ranges PMTiles needs.

To host them somewhere else (a CDN, S3 or R2 bucket), build the app with `VITE_CHART_CATALOG_URL=https://…/index.json`. Archives are looked up next to the catalog. The host has to allow CORS and `Range` requests.

The desktop app (`desktop/`) reads the charts from the public repository [gjvanhalem/opensail-charts](https://github.com/gjvanhalem/opensail-charts) instead: its workflow runs this image for `nl-inland` (looking up the current file id), publishes `nl-inland.pmtiles`, `nl-inland.json` and `index.json` as a release, and the app reads `releases/latest/download/index.json`. GitHub sends no CORS headers there, so only the native apps can use it.

For local development, copy the output to `pwa/public/charts/` (git-ignored).

GitHub Pages limits a site to 1 GB. With the three Dutch regions at about 195 MB that's fine. If it grows, move to a bucket.
