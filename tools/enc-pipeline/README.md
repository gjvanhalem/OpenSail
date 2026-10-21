# ENC pipeline: Rijkswaterstaat inland ENC → PMTiles

Turns Rijkswaterstaat's free (CC-0) inland ENCs, in S-57 format, into one [PMTiles](https://docs.protomaps.com/pmtiles/) vector-tile archive per region. The PWA draws them with its S-52-like style (`pwa/src/components/chart/encStyle.ts`).

```
S-57 cells (*.000 + updates) ──ogr2ogr──► GeoJSONSeq per object class ──tippecanoe──► <region>.pmtiles
                     DSID edition dates ──────────────────────────────────────────► <region>.json, index.json
```

It runs in Docker (GDAL 3.10 and tippecanoe 2.79), so nothing needs to be installed on the host. When this folder changes on main, [`pipeline-image.yml`](../../.github/workflows/pipeline-image.yml) publishes the image as `ghcr.io/gjvanhalem/opensail-enc-pipeline`.

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

File ids change with every new edition, so read them from the list. A rebuild with the new file id gives the region a newer `editionDate`; the app's update check compares that with the downloaded regions and offers an **Update**.

## What's in the tiles

Object classes (see `LAYERS` in `build-region.sh`): coverage (`M_COVR`), depths (`DEPARE`, `DRGARE`, `DEPCNT`, `SOUNDG`), hazards (`OBSTRN`, `WRECKS`, `UWTROC`, `HULKES`, `PILPNT`), vertical clearance (`bridge`, `cblohd`, `PIPSOL`), routes (`FAIRWY`, `wtwaxs`, `NAVLNE`, `RECTRC`), structures (`lokbsn`, `SLCONS`, `DAMCON`, `FLODOC`, `PONTON`) and areas (`resare`, `CTNARE`, `hrbare`, `berths`). Lower-case names are Inland ENC (IENC) extensions.

Buoys, beacons and lights are left out on purpose: the chart shows them from OpenSeaMap.

Only the attributes in `ATTRIBUTES` are kept: names, depths (`DRVAL1/2`, `VALDCO`, `VALSOU`, `DEPTH`), clearances (`VERCLR`, `HORCLR`), categories and `SCAMIN`.

Depths are in metres. In the Waddenzee data, negative depths are drying heights.

## Hosting

The archives are too big for git. There are two places that serve them:

- **The Windows and Android apps** read the public repository [gjvanhalem/opensail-charts](https://github.com/gjvanhalem/opensail-charts). Its workflow runs this image for `nl-inland` (looking up the current file id) and publishes `nl-inland.pmtiles`, `nl-inland.json` and `index.json` as a GitHub release. The apps read `releases/latest/download/index.json` (`VITE_CHART_CATALOG_URL` in `pwa/.env.native`). GitHub sends no CORS headers there, so the apps fetch it natively; a browser can't.
- **The browser version** on the Zimablade reads `/charts/index.json` from its own server, so there's no CORS. The `charts` service in its Docker Compose file runs this image into the `charts/` folder: see [DEPLOY.md](../../DEPLOY.md#4-charts).

To host them somewhere else (a CDN, S3 or R2 bucket), build the app with `VITE_CHART_CATALOG_URL=https://…/index.json`. Archives are looked up next to the catalog. The host has to allow CORS and `Range` requests.

For local development, copy the output to `pwa/public/charts/` (git-ignored).
