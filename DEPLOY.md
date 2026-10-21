# Hosting OpenSail on the Zimablade

```
Phone / tablet / laptop ──https──▶ Cloudflare ──tunnel──▶ cloudflared ─▶ opensail (sign-in, then the app)
                                                                         ├── /charts ← ./charts (PMTiles)
                                                                         └── users  ← ./data
```

The same setup as toodoo:
- **The image:** GitHub Actions builds the image `ghcr.io/gjvanhalem/opensail`.
- **The Zimablade** (`192.168.1.178`, ZimaOS) runs it with Docker Compose in `/DATA/AppData/opensail`.
- **The `updater` container** pulls a new image within 15 minutes of a push to `main`.
- **HTTPS** comes through the Cloudflare Tunnel that already runs for toodoo.

The app runs at **https://opensail.g-zeven.nl**.

**Only people with an account get in.** The OpenSail server serves the app, the chart archives and even the service worker only to signed-in users; everyone else gets the sign-in page. You manage accounts in the app (see [step 5](#5-accounts)).

OpenSail keeps its navigation data (routes, tracks, settings, downloaded chart regions) **in the browser** on each device. The server stores only the user accounts.

## 1. The images (once)

GitHub Actions builds two images on pushes to `main`:

| Image | What | Built by |
|---|---|---|
| `ghcr.io/gjvanhalem/opensail` | The web app and the OpenSail server (accounts) on port 8080 | `.github/workflows/image.yml`, when `pwa/`, `server/` or `deploy/` change |
| `ghcr.io/gjvanhalem/opensail-enc-pipeline` | The chart pipeline (GDAL + tippecanoe), to build charts on the Zimablade | `.github/workflows/pipeline-image.yml`, when `tools/enc-pipeline/` changes |

After the first build, make both packages **public**: GitHub → your profile → **Packages** → package → **Package settings** → **Change visibility**. They contain only code, no data or secrets. Public images mean the Zimablade needs no `docker login`, which fails on ZimaOS because it can't write `/DATA/.docker`.

## 2. Cloudflare

**Tunnel:** reuse the `zimablade` tunnel. Go to **Zero Trust → Networks → Tunnels → zimablade → Public hostname → Add**:
- Subdomain `opensail`, domain `g-zeven.nl`
- Service **HTTP**, URL `192.168.1.178:9091`

The tunnel's `cloudflared` runs in toodoo's compose project, so it reaches OpenSail through the Zimablade's own address, not a container name.

**Cloudflare Access is optional now.** OpenSail has its own accounts, so an Access application for `opensail.g-zeven.nl` would make everyone sign in twice. Remove it (**Zero Trust → Access → Applications**), unless you want Cloudflare as an extra gate in front. In that case, add every crew member's email to its policy as well.

## 3. The Zimablade

Over SSH, or the ZimaOS terminal:

```bash
mkdir -p /DATA/AppData/opensail/charts /DATA/AppData/opensail/data
chown 1000:1000 /DATA/AppData/opensail/data
```

The server runs as uid 1000 and keeps the user accounts in `data/`. If that folder isn't writable, the log says so and the container keeps restarting. **Back up `data/users.json`**: losing it means setting up the accounts again.

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

## 5. Accounts

**The first admin.** On first start, with no users yet, the server writes a one-time **setup code** to its log:

```bash
docker compose logs opensail | grep "setup code"
```

Open https://opensail.g-zeven.nl. You land on **Set up OpenSail**: enter the setup code, your name, email and a password (at least 10 characters). You're now the admin, signed in.

**Adding crew.** Go to **Settings → Users → Invite by email**, choose *Crew* or *Admin*, and click **Create invite link**. Copy the link and send it, for example by WhatsApp. It works once and expires after 7 days. The crew member opens it, picks a name and password, and is in.

| | Admin | Crew |
|---|---|---|
| Use OpenSail (chart, routes, instruments, safety) | ✓ | ✓ |
| Invite people, change roles, remove people, make reset links | ✓ | |

**Forgotten password.** An admin clicks **Reset password** next to the person in **Settings → Users** and sends them the link. Using it sets a new password and signs out their other devices.

**Removing someone** signs them out everywhere straight away: the server refuses the app and the charts from then on. A device that was already signed in keeps whatever it has cached, offline. They can't get updates, new charts or sign in again. There's always at least one admin: the last admin can't be removed or demoted.

**Signing in** lasts 30 days and renews while you use the app, so OpenSail keeps working on board without a connection. **Sign out** (Settings → Account) also removes the app from that device's cache.

## 6. On your phone, tablet or laptop

Open **https://opensail.g-zeven.nl** in Chrome (on Android or desktop) or Safari (on iPad or iPhone) and sign in. Then:
- **Install it:** Chrome **⋮ → Install app**, or Safari **Share → Add to Home Screen**.
- **Before you sail, download a chart region:** on the Chart screen, the **Offline charts** button. Charts and the app then work without internet.
- **Your Pcnautic autopilot:** run the bridge on the laptop (`node tools/opensail-bridge/bridge.mjs`), then go to **Instruments → Wi-Fi → `ws://localhost:10110`**. An HTTPS page may connect to `ws://localhost`, so this works from the hosted app too.

The Windows and Android apps from the [GitHub release](https://github.com/gjvanhalem/OpenSail/releases) don't use this server or its accounts: they get their charts from GitHub and connect to the autopilot without the bridge. See [docs/RELEASING.md](docs/RELEASING.md).

## Updating

**The app:** nothing to do. A push to `main` builds a new image, and the updater installs it within 15 minutes (`docker compose logs updater` shows what it did). The installed app picks up the new version on its next start. To update right away:

```bash
cd /DATA/AppData/opensail
docker compose pull opensail && docker compose up -d opensail
```

**The charts:** run the `charts` command from step 4 again with the newest file id.

**Users:** they're in `data/users.json`, which survives updates and restarts.

## Troubleshooting

| What you see | Cause and fix |
|---|---|
| Cloudflare error 1033 / 502 | The tunnel can't reach `192.168.1.178:9091`. Check `docker compose ps` and the hostname's service URL. |
| `manifests/latest: unauthorized` | The package is still private: make it public (step 1). |
| The chart shows no depth areas or Rijkswaterstaat data | `charts/index.json` is missing or empty. Check `curl http://localhost:9091/charts/index.json`. |
| The log says it can't write the data folder | `chown 1000:1000 /DATA/AppData/opensail/data`, then `docker compose up -d`. |
| No setup page, but nobody has an account | `data/users.json` already has users. Ask the admin for an invite. To start over, stop the container and move `users.json` away. |
| An old version keeps showing | The service worker updates on the next start: close every OpenSail tab or the installed app and open it again. |
