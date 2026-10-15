# Spike: free depth data for the Dutch coast

**Status: decided by the owner on 2026-10-16; see [Owner decision](#owner-decision).** Nothing has been built on it yet. Written 2026-10-15.

**Question.** The official Dutch coastal and sea ENCs (Dienst der Hydrografie) are commercial, and there's no budget (see [`chart-source-decision.md`](chart-source-decision.md#decision)). Which free depth data should give the chart depth contours along the coast, and the route planner its hazard warnings (R2.5)? Coastal depths are advisory only.

## Short answer

The coast falls into three areas, and each has a different best source:

| Area | Best free source | Official? | What we'd show |
|---|---|---|---|
| **Waddenzee** and **Zeeland** (Westerschelde, Oosterschelde, Veerse Meer, the Delta) | Rijkswaterstaat Inland ENC **"Waddenzee met diepte"** and **"Zeeland met diepte"** | Yes: RWS ENC | Depth areas, contours and soundings in the S-52 style. Already supported by `tools/enc-pipeline`. |
| **Holland and Wadden-island North Sea coast**, about 0–15 km offshore (Den Helder – IJmuiden – Hoek van Holland, plus the island coasts) | Rijkswaterstaat **"Bathymetrie Nederland – kust en vaklodingen 20 m"** (`bodemhoogte_20mtr`) | No: survey data | Advisory contours and depth areas made with `gdal_contour` |
| Further offshore | **EMODnet Bathymetry DTM** | No: model or compilation | Coarse advisory contours (optional, later) |

**Recommendation: build the Rijkswaterstaat 20 m coastal grid as an advisory "coastal depth" region, and treat the two "met diepte" ENCs as official.** Leave EMODnet for later. More detail is under [Recommendation](#recommendation).

## The sources

### 1. Rijkswaterstaat Inland ENC "met diepte" (Waddenzee, Zeeland)

This is the most important finding of the spike. Besides the inland waterways, Rijkswaterstaat publishes ENCs for the Waddenzee and Zeeland **with full depth data**, updated **every week**. They're on the same download list as the inland ENCs: <https://www.vaarweginformatie.nl/frp/api/webcontent/downloads?pageId=infra/enc>.

| | Waddenzee met diepte | Zeeland met diepte |
|---|---|---|
| Download | 25 MB zip, 20 cells | 47 MB zip |
| PMTiles from `tools/enc-pipeline` | 78 MB | 100 MB |
| Coverage (`M_COVR` bounds) | 4.67–7.22° E, 52.88–53.58° N | 3.13–4.53° E, 51.18–51.83° N |
| Edition on 2026-10-15 | 2026-10-15 | 2026-10-12 |
| Content | 18,600 depth areas, 18,600 contours, about 430,000 soundings, plus hazards, fairways and structures | the same kinds of objects |

- **Licence:** the data.overheid.nl record ["ENC van Nederlandse binnenwateren"](https://data.overheid.nl/dataset/55088-enc-van-nederlandse-binnenwateren) is **CC-0** and its download link is this ENC page. Neither the record nor the list names the "met diepte" files, so CC-0 for them is a strong inference, not a stated fact. **To do: ask Rijkswaterstaat to confirm** before publishing them.
- **Coverage:** the Wadden basin (including the tidal inlets) and the Zeeland waters. It doesn't cover the open North Sea coast between Den Helder and Hoek van Holland, or the IJmuiden approaches. The Maasmond is covered separately by a "Port of Rotterdam" IENC, which I haven't checked.
- **Datum:** depths are relative to the chart datum of the ENC, and negative values are drying heights.

### 2. Rijkswaterstaat coastal bathymetry: "kust en vaklodingen 20 m"

[data.overheid.nl/dataset/61446](https://data.overheid.nl/dataset/61446-bathymetrie-nederland---kust-en-vaklodingen-20-mtr). For each 20 m cell it gives the most recent surveyed bed level, from the coastal surveys (JARKUS) and the *vaklodingen* (survey boxes).

| | |
|---|---|
| Licence | **CC-0** (checked on the record) |
| Resolution | **20 m** grid, EPSG:28992 (RD New), Float32, with overviews |
| Vertical datum | **NAP** (bed level, so depths are negative) |
| Coverage | All Dutch coastal waters. On the Holland coast, spot checks find values out to about 15–20 km (e.g. −17 m at 52.465 N 4.52 E off IJmuiden, −18 m at 52.25 N 4.35 E off Noordwijk, −21 m at 51.98 N 3.95 E off Hoek van Holland), with gaps in harbour mouths and further out |
| Up to date | Surveys up to and including 2025, record updated 2026-08-05, file dated 2026-04-28 |
| How often | Per area, every year (JARKUS coast profiles) to every 6 years (Wadden vaklodingen). There's no official schedule per area |
| Download | one GeoTIFF, 102 MB, with range requests: <https://downloads.rijkswaterstaatdata.nl/bodemhoogte_20mtr/bodemhoogte_20mtr.tif>. WCS: `https://geo.rijkswaterstaat.nl/services/ogc/gdr/bodemhoogte_20mtr/ows` |

Related: "Hoogte – Water 20 m – DTM (LOL)" is a yearly harmonised grid of JARKUS, vaklodingen and land heights (CC-0, 20 m, NAP). "Bathymetrie versie 2019" covers the whole Dutch continental shelf (CC-0), but it's interpolated and Rijkswaterstaat says to use it only as a background.

### 3. EMODnet Bathymetry DTM

| | |
|---|---|
| Licence | **CC BY 4.0**: credit "EMODnet Bathymetry Consortium". The catalogue record also says "DO NOT USE FOR NAVIGATION" |
| Resolution | 1/16 arc-minute, **about 115 m** |
| Vertical datum | **LAT** (the ESRI ASCII tiles also come in MSL) |
| Release | DTM 2024 (published 2024-12-31). A new release comes about every 2 years; I didn't check whether a 2026 release is out |
| Download | tiles in GeoTIFF, NetCDF, ESRI ASCII and others. Also WMS, WMTS and WCS (`ows.emodnet-bathymetry.eu`) |

Coverage is good offshore. At 115 m it's too coarse for channels and gullies near the coast, where the RWS grid is about 6× finer.

### 4. Ruled out

- **GEBCO 2025**: about 460 m, and its terms say it isn't for navigation. Too coarse.
- **Dienst der Hydrografie**: charts and ENCs are licensed through the UKHO. No free download of soundings.
- **OpenSeaMap crowdsourced depths**: sparse tracks, and ODbL share-alike would apply to the contours we derive.

## Recommendation

1. **Waddenzee and Zeeland: use the "met diepte" ENCs as they are.** The pipeline already handles them, and they're official and weekly. They can be marked `official: true`, the same as the inland ENC, once Rijkswaterstaat confirms the licence (see above). Hazard warnings there can be "official", not "advisory".
2. **The rest of the coast: build an advisory "coastal depth" region from the RWS 20 m grid:**
   - Clip the grid to the coastal strip outside the ENC coverage (west of the Wadden and Zeeland cells, up to the edge of the data).
   - **Convert NAP to chart datum (LAT).** Bed level in NAP isn't a charted depth: LAT is roughly 1 m below NAP on the Holland coast, and more in the Wadden. Use the official **NLLAT** separation model (Rijkswaterstaat / Dienst der Hydrografie). *To check: its licence and how to download it.* If it isn't available, use a conservative constant: subtract the separation, so the chart shows *less* water than the survey did.
   - `gdal_contour -p` at 2, 3, 5, 10 and 20 m for depth areas (`DRVAL1`/`DRVAL2`), and `gdal_contour` lines for contours (`VALDCO`). Write them into the same layer names as the ENC (`depare`, `depcnt`), so `encStyle.ts` draws them without changes. Then tippecanoe to PMTiles, with `kind: "coastal-depth"` and `official: false` in the manifest (the catalog types already have both).
   - The app shows these depths with the "not for navigation" note, and the route hazard check (R2.5) labels warnings there **advisory**.
   - It adds one step (`build-coastal.sh`) to `tools/enc-pipeline`; GDAL is already in the image. Rebuild once a year, after the yearly survey update.
3. **EMODnet later, if needed** for passages further offshore: the same contour steps, CC BY attribution in the source, and also advisory.

## Owner decision

The owner answered on 2026-10-16:

| # | Question | Answer |
|---|---|---|
| 1 | Go or no-go on the RWS 20 m coastal grid as advisory contours? | **Go** |
| 2 | Waddenzee and Zeeland ENC depths: official or advisory? | **Advisory**, to be safe: `official: false`, so route warnings there say "advisory" |
| 3 | Who contacts Rijkswaterstaat and OpenSeaMap? | **The owner** |

Questions for Rijkswaterstaat: does CC-0 also cover the "met diepte" ENC files and the 20 m grid when we redistribute them as derived tiles and contours; is a weekly automated download OK; where to get the NLLAT model and under what licence; and the preferred attribution. Questions for OpenSeaMap: may the app load live seamark tiles and let users download regions for offline use from `tiles.openseamap.org`, with what limits, or should we mirror the tiles; and the preferred attribution.

The decision text above ("What the owner needs to decide") is kept below for reference.

## What the owner needs to decide

1. **Go or no-go on the recommendation:** RWS 20 m coastal grid → advisory contours, with EMODnet left for later.
2. **Treat "Waddenzee/Zeeland met diepte" as official** (warnings without "advisory") once Rijkswaterstaat confirms CC-0? Or treat them as advisory like the rest of the coast, to be safe?
3. Who asks Rijkswaterstaat to confirm the licence (and whether bulk use is fine), and who asks OpenSeaMap about bulk tile downloads (see [`chart-sources.md`](chart-sources.md))?

## Sources

- RWS ENC download list: <https://www.vaarweginformatie.nl/frp/api/webcontent/downloads?pageId=infra/enc> (checked 2026-10-15)
- ENC van Nederlandse binnenwateren (CC-0): <https://data.overheid.nl/dataset/55088-enc-van-nederlandse-binnenwateren>
- Bathymetrie Nederland – kust en vaklodingen 20 m (CC-0): <https://data.overheid.nl/dataset/61446-bathymetrie-nederland---kust-en-vaklodingen-20-mtr>
- Bathymetrie versie 2019: <https://data.overheid.nl/dataset/46523-bathymetrie-versie-2019>
- Vaklodingen survey frequency (EDMED): <https://edmed.seadatanet.org/report/1023/>
- EMODnet Bathymetry: <https://emodnet.ec.europa.eu/en/bathymetry>, record <https://emodnet.ec.europa.eu/geonetwork/srv/api/records/034e7908-31a2-4f51-8a90-b40593930551>, DOI 10.12770/cf51df64-56f9-4a99-b1aa-36b8d7b743a1
- GEBCO 2025: <https://www.gebco.net/data-products-gridded-bathymetry-data/gebco2025-grid>
- OpenSeaMap depth data: <https://wiki.openseamap.org/wiki/OpenSeaMap-dev:En:Depth_Data>
