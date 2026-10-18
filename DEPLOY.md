# Hosting OpenSail on the Zimablade

```
Phone / tablet / laptop ──https──▶ Cloudflare (Access: only you) ──tunnel──▶ cloudflared ─▶ opensail (nginx)
                                                                                    └── /charts ← ./charts (PMTiles)
```

The same setup as toodoo:
- **The image:** GitHub Actions builds the image `ghcr.io/gjvanhalem/opensail`.
- **The Zimablade** (`192.168.1.178`, ZimaOS) runs it with Docker Compose in `/DATA/AppData/opensail`.
- **The `updater` container** pulls a new image within 15 minutes of a push to `main`.
- **HTTPS** comes through the Cloudflare Tunnel that already runs for toodoo.

The app runs at **https://opensail.g-zeven.nl**.

OpenSail keeps its data (routes, tracks, settings, downloaded chart regions) **in the browser** on each device. The server only serves the app files and the chart archives.

## 1. The images (once)

Every push to `main` that changes the app builds two images (`.github/workflows/image.yml`):

| Image | What |
|---|---|
| `ghcr.io/gjvanhalem/opensail` | The web app, served by nginx on port 8080 |
| `ghcr.io/gjvanhalem/opensail-enc-pipeline` | The chart pipeline (GDAL + tippecanoe), to build charts on the Zimablade |

After the first build, make both packages **public**: GitHub → your profile → **Packages** → package → **Package settings** → **Change visibility**. They contain only code, no data or secrets. The repo stays private. Public images mean the Zimablade needs no `docker login`, which fails on ZimaOS because it can't write `/DATA/.docker`.

## 2. Cloudflare

**Tunnel:** reuse the `zimablade` tunnel. Go to **Zero Trust → Networks → Tunnels → zimablade → Public hostname → Add**:
- Subdomain `opensail`, domain `g-zeven.nl`
- Service **HTTP**, URL `192.168.1.178:9091`

The tunnel's `cloudflared` runs in toodoo's compose project, so it reaches OpenSail through the Zimablade's own address, not a container name.

**Access (only you):** go to **Zero Trust → Access → Applications → Add → Self-hosted**:
- Domain `opensail.g-zeven.nl`
- Policy **Allow**, Include → *Emails* → your email address
- Session duration: e.g. **1 month**. The app works offline from its own cache, but checking for updates and downloading charts needs a valid Access session.

## 3. The Zimablade

Over SSH, or the ZimaOS terminal:

```bash
mkdir -p /DATA/AppData/opensail/charts
```

Copy `deploy/zimablade/docker-compose.yml` from this repo into that folder, with the ZimaOS Files app or from your laptop:

```bash
scp deploy/zimablade/docker-compose.yml <user>@192.168.1.178:/DATA/AppData/opensail/
```

Start it:

```bash
cd /DATA/AppData/opensail
docker compose pull opensail
docker compose up -d
```

Check it: `docker compose ps` shows `opensail` as *healthy*, and `curl http://localhost:9091/healthz` prints `ok`. On your LAN, http://192.168.1.178:9091 opens the app for a quick check. Use the HTTPS address for real use: GPS, installing the app and offline mode need HTTPS.

## 4. Charts

The app reads `charts/index.json` and the `.pmtiles` archives from `/DATA/AppData/opensail/charts`. Build them on the Zimablade with the pipeline image:

```bash
cd /DATA/AppData/opensail
docker compose pull charts
docker compose run --rm charts nl-inland 4789373346 "Nederland (excl. Zeeland, Waddenzee)"
```

That downloads about 42 MB from Rijkswaterstaat and writes `nl-inland.pmtiles` (about 19 MB), `nl-inland.json` and `index.json`. No restart is needed; the app picks them up on its next update check. More regions, such as Waddenzee or Zeeland "met diepte", go into the same folder. File ids change with every new edition: see `tools/enc-pipeline/README.md` for where to find them.

*Alternative:* copy the archives you built on your laptop (`tools/enc-pipeline/out/*`) into `/DATA/AppData/opensail/charts`.

## 5. On your phone, tablet or laptop

Open **https://opensail.g-zeven.nl** in Chrome (on Android or desktop) or Safari (on iPad or iPhone). Sign in to Cloudflare Access, then:
- **Install it:** Chrome **⋮ → Install app**, or Safari **Share → Add to Home Screen**.
- **Before you sail, download a chart region:** on the Chart page, **Offline Charts**. Charts and the app then work without internet.
- **Your Pcnautic autopilot:** run the bridge on the laptop (`node tools/opensail-bridge/bridge.mjs`), then go to **Instruments → Wi-Fi → `ws://localhost:10110`**. An HTTPS page may connect to `ws://localhost`, so this works from the hosted app too.

## Updating

**The app:** nothing to do. A push to `main` builds a new image, and the updater installs it within 15 minutes (`docker compose logs updater` shows what it did). The installed app picks up the new version on its next start. To update right away:

```bash
cd /DATA/AppData/opensail
docker compose pull opensail && docker compose up -d opensail
```

**The charts:** run the `charts` command from step 4 again with the newest file id.

## Troubleshooting

| What you see | Cause and fix |
|---|---|
| Cloudflare error 1033 / 502 | The tunnel can't reach `192.168.1.178:9091`. Check `docker compose ps` and the hostname's service URL. |
| `manifests/latest: unauthorized` | The package is still private: make it public (step 1). |
| The chart shows no depth areas or Rijkswaterstaat data | `charts/index.json` is missing or empty. Check `curl http://localhost:9091/charts/index.json`. |
| An old version keeps showing | The service worker updates on the next start: close every OpenSail tab or the installed app and open it again. |
