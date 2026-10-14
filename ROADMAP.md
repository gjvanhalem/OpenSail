# OpenSail Roadmap: from v2.0 to a complete app

This roadmap goes from where the code is today (October 2026) to an app that meets all 15 requirements in [`.kiro/specs/marine-navigation-system/requirements.md`](.kiro/specs/marine-navigation-system/requirements.md).

Effort is in **developer-weeks for one developer**. These are rough estimates, not commitments. The total is **about 20–26 weeks**.

---

## Where we are today

What works:
- Chart display (but with a street-map style, not a nautical chart)
- GPS position from the browser, plus a simulator
- Track recording and GPX export
- Route planning and saving routes
- Settings that persist

What exists only partly, or not at all:
- Offline map reading
- Active route navigation
- Instrument position and heading
- AIS
- Safety features
- Logbook
- Weather
- Tides

Basic project setup is also still incomplete: there is no git remote, and the CI pipeline has never run.

### Requirement coverage

| # | Requirement | Status | Phase |
|---|---|---|---|
| R1 | Chart display & navigation | 🟡 Map renders. No nautical layers, and it doesn't follow the vessel or rotate | 1, 3 |
| R2 | Route planning | 🟡 Planning and saving work. No ETA, course changes or hazard warnings | 2, 3 |
| R3 | Instrument integration | 🟡 Parsers fixed in a separate worktree. Position and heading don't reach navigation | 0, 1 |
| R4 | AIS | 🔴 Layer only. No decoder, no data, no CPA | 5 |
| R5 | Offline operation | 🔴 Tiles download, but the map never uses them | 3, 7 |
| R6 | Tablet compatibility | 🟡 Responsive layout. Not tested on devices | 8 |
| R7 | Weather | ⚪ Not started | 7 |
| R8 | Anchor watch | 🔴 Button with no logic | 4 |
| R9 | Track recording | 🟢 Mostly done. Missing per-track colours and track → route | 2 |
| R10 | Protocol stubs | 🟡 GPS simulator only. No NMEA, NMEA 2000 or SeaTalk stubs | 1 |
| R11 | Tides & currents | ⚪ Not started | 7 |
| R12 | Man overboard | 🔴 Button with no logic | 4 |
| R13 | Logbook | 🔴 Placeholder page. Repository and CSV export exist | 6 |
| R14 | Instrument display | 🟡 Gauges exist. No unit switching, alerts or custom layout | 1 |
| R15 | Chart management | 🔴 Region download only | 3 |

---

## Phase 0: Stabilise the foundation (about 1 week)

**Goal:** green CI on `main`, and every change after this one is reviewable.

- [ ] Merge the parser-fix worktree (NMEA0183 talker-ID bug, NMEA2000 rewrite, 147/147 tests passing). Also merge the follow-up branch that normalises instrument values.
- [ ] Commit the GPS work (GeolocationService, GPSSimulator, GPSControl). Remove the debug `console.log` in `Layout.tsx` first.
- [ ] Rename `master` to `main`, add a GitHub remote, and push the `pre-cleanup` and `v2.0.0-pwa-only` tags.
- [ ] Fix the 86 lint errors, mostly `no-explicit-any`, so CI's lint step passes.
- [ ] Add `pwa/dev-dist/` to `.gitignore` and remove it from git tracking.
- [ ] Add a `LICENSE` file. The README links to one that doesn't exist.
- [ ] Fix outdated docs: React 18 → 19, Vite 5 → 7.
- [ ] Add Playwright end-to-end tests to CI (Chromium only, to start).
- [ ] Delete code that nothing uses, or put it on the backlog: `useChartCache`, `useTrackProcessor` with its worker, and `NavigationStatus` (which Phase 2 will wire up).

**Done when:** CI passes on `main` for lint, typecheck, unit tests, end-to-end tests and the build.

---

## Phase 1: Core navigation loop (about 2–3 weeks)

**Goal:** the boat icon, the gauges and the map all show the same, trustworthy picture.
Spec tasks 23 and 29. Requirements R1.2, R1.5, R3, R10, R14.

- [x] **Make the map follow the vessel:** switch `ChartView` to controlled `viewState`, so auto-center and Recenter actually move the map.
- [ ] **North-up / heading-up toggle (R1.5):** the `ChartOrientation` enum already exists. Connect it to the map's bearing.
- [ ] **Instrument position and heading:** route NMEA GGA, RMC, GLL and HDG (and the matching NMEA 2000 messages) into `navigationSlice`. Choose a source per value: GPS, instrument, or automatic.
- [ ] **Protocol stub (R10):** a configurable simulator that generates NMEA0183, NMEA 2000 and SeaTalk data. It must go through the same connection interface as real hardware (fill in the `'stub'` `ConnectionType`). Makes development and end-to-end tests possible without a boat.
- [ ] **Units (R14.4):** apply the `units` setting (nautical, metric or imperial) in every gauge and readout.
- [ ] **Threshold alerts (R14.5):** user-set minimum and maximum per value (for example a shallow-depth alarm), with visual alerts.
- [ ] **Configurable panels (R14.2):** let users choose, order and resize gauges. Save the layout in settings.
- [ ] **Spike, time-boxed to 3 days: chart source decision.** Feeds Phase 3; see the decision list at the end.

**Done when:** with the stub running, position, heading, SOG, depth and wind all update within 1 second (R1.2, R14.3), and the map tracks the vessel in both orientations.

---

## Phase 2: Routes & tracks completion (about 2 weeks)

**Goal:** you can actually navigate a route, not just draw one.
Spec tasks 24 and 25. Requirements R2, R9.

- [ ] **Activating a route:** calculate bearing and distance to the next waypoint, cross-track error, and ETA from current speed. Advance to the next waypoint automatically when within the arrival radius.
- [ ] Wire `NavigationStatus` into the chart page as the route-guidance panel.
- [ ] Route summary (R2.4): total distance, ETA and a list of course changes.
- [ ] Track colours (R9.3) and converting a track into a route (R9.5).
- [ ] Stress tests: a route with 50+ waypoints (R2.1), 100 hours of track data (R9.2), and 10+ routes stored offline (R5.3).
- [ ] *Depends on Phase 3:* hazard and shallow-water warnings (R2.5) need depth data from the chart source. For now `routeValidation.ts` only has TODO placeholders.

**Done when:** a simulated passage over a 5-waypoint route shows correct cross-track error and ETA and switches waypoints automatically.

---

## Phase 3: Nautical charts & real offline mode (about 4–5 weeks) ⚠️ highest risk

**Goal:** a real nautical chart that works with no internet connection.
Requirements R1.1, R1.3, R1.4, R2.5, R5.1–5.2, R15.

- [ ] **Pick a nautical chart source** (from the Phase 1 spike) and add navigation aids: buoys, beacons and lights (R1.4).
- [ ] **Serve downloaded tiles to the map:** a custom mapbox-gl protocol, or a service-worker handler that answers from `TileCache` in IndexedDB. Today the downloaded tiles are never read.
- [ ] Fix the service-worker caching rules so they match the URLs the map really requests (`.vector.pbf`, URLs with `?access_token`).
- [ ] Download glyphs, sprites and the style document as well, so an offline map has labels and icons.
- [ ] Chart management (R15): a list of downloaded regions, storage use and quota, deletion, edition dates, and checking for updates when online.
- [ ] Use depth contours and hazards for route hazard warnings (R2.5).
- [ ] End-to-end test: download a region, go offline, reload, and pan and zoom within that region.
- [ ] Online/offline status indicator in the app (the e2e test in `offline.spec.ts` is `test.fixme` until this exists).

**Done when:** in aeroplane mode, a downloaded region shows the full nautical chart and every navigation feature still works.

---

## Phase 4: Safety (about 2 weeks)

**Goal:** man overboard and anchor watch you can trust.
Spec task 28. Requirements R8, R12.

- [ ] **Shared alarm system:** a sound through Web Audio, a full-screen visual alert, and a Screen Wake Lock so the device doesn't sleep. Reused by Phases 1, 5 and 6.
- [ ] **Man overboard (R12):** a large, always-visible button. Saves the position within 1 second, places a high-visibility marker, shows live bearing and distance, starts guidance back to the spot and sounds an alarm.
- [ ] **Anchor watch (R8):** set the radius (10–500 m), draw the circle on the chart, check position every 10 s or more often, sound an alarm when the boat leaves the circle, and log events with timestamps.
- [ ] Connect the existing alarm settings (`enableCollisionAlarm`, `anchorWatchRadius`).
- [ ] Document what a browser can't guarantee: background tabs and a locked iPad limit GPS and alarms.

**Done when:** the simulator triggers both alarms correctly, and the alarm still sounds after 30 minutes with the screen on.

---

## Phase 5: AIS (about 2–3 weeks)

Spec task 26. Requirement R4.

- [ ] An AIS message decoder for `!AIVDM` and `!AIVDO`: position reports (types 1–3, 18, 19), static and voyage data (5, 24), and multi-part messages.
- [ ] NMEA 2000 AIS messages: PGNs 129038, 129039, 129794 and 129809/810.
- [ ] Target store with expiry, plus 24-hour history through `AISRepository` (R4.5).
- [ ] CPA and TCPA using the existing but unused `calculateCPA`. Highlight targets within 2 NM (R4.4) and connect to the collision alarm.
- [ ] Target details panel: name, MMSI, course, speed, CPA and TCPA (R4.3). Replace the `console.log` on click.
- [ ] Add AIS traffic to the protocol stub.

**Done when:** 50 simulated targets appear within 2 seconds, and a collision course raises the alarm.

---

## Phase 6: Logbook (about 1–2 weeks)

Spec task 27. Requirement R13.

- [ ] Detect voyage start and end automatically from speed and movement (R13.1).
- [ ] Voyage statistics: distance, average speed and maximum speed (R13.2). Link each voyage to its track.
- [ ] Logbook UI: a list and a detail view, free-text notes, and manual entries (R13.3).
- [ ] CSV export using the existing `LogbookRepository.exportToCSV` (R13.5). Keep data for at least 365 days (R13.4).
- [ ] Also log anchor-watch and man-overboard events here.

---

## Phase 7: Weather, tides & sync (about 3–4 weeks)

Requirements R5.4–5.5, R7, R11.

- [ ] Choose weather and tide providers (see the decisions at the end).
- [ ] Weather: a 5-day forecast for the current area (R7.3), and wind, wave and rain overlays on the chart (R7.2). Weather warnings (R7.5).
- [ ] Tides and currents: nearby tide stations on the chart, predictions to 0.1 m precision, and current arrows (R11).
- [ ] Cache weather and tides for at least 48 hours offline (R5.4, R7.4, R11.4).
- [ ] Refresh everything when the connection comes back (R5.5).
- [ ] Queue changes made offline and show their sync status (the e2e test in `offline.spec.ts` is `test.fixme` until this exists).

---

## Phase 8: Hardening & v3.0 release (about 2 weeks)

Requirement R6 and the non-functional requirements.

- [ ] Test on real 7"–13" tablets (Android and iPad): touch gestures, portrait and landscape, and touch response under 100 ms (R6).
- [ ] Battery profiling. Replace the "500 mA" requirement with a measurable target (see decisions).
- [ ] Performance: split up or reduce the 1.68 MB map bundle, set a Lighthouse budget in CI, and keep 60 fps while panning with AIS and a track displayed.
- [ ] Run end-to-end tests in all browsers on CI. Run the full offline passage scenario.
- [ ] Update the user guide, developer guide and support matrix.
- [ ] Deploy to a hosting provider (Netlify or Vercel configs already exist) and tag **v3.0.0**.

---

## Order and dependencies

```
Phase 0 ─► Phase 1 ─┬─► Phase 2 ──────────────┐
                    ├─► Phase 4 (needs only GPS + alarms)
                    ├─► Phase 5 (needs the stub + alarms)
                    └─► Phase 3 ─► R2.5 hazard warnings
                                  └─► Phase 7 (overlays need the offline map)
Phase 2 + 4 ─► Phase 6 (logbook uses tracks + events)
All ─► Phase 8
```

Phase 4 (safety) is cheap and high value. It can start right after Phase 1, alongside Phase 3 (charts).

## Milestones

| Milestone | After phase | What you can do |
|---|---|---|
| **M1: Usable alpha** | 0 + 1 + 2 | Navigate a planned route with live GPS or instruments (online) |
| **M2: Safe offline beta** | 3 + 4 | Sail offline on a nautical chart, with man overboard and anchor watch |
| **M3: Feature-complete** | 5 + 6 + 7 | Every spec requirement is in place |
| **M4: v3.0 release** | 8 | Tested on tablets, deployed, documented |

---

## Decisions needed before or during the work

1. **Chart source (blocks Phase 3).** The current Mapbox streets style isn't nautical. Options:
   - OpenSeaMap seamark overlay on a base map (free, raster)
   - Official ENC data such as NOAA or Dutch Rijkswaterstaat, converted to vector tiles (best quality; needs a conversion pipeline)
   - A commercial nautical tile provider (fastest; costs money and has licensing limits)
2. **Weather and tide providers.** Open-Meteo Marine is free and global for weather. Tide sources depend on the region: NOAA CO-OPS for the US, Rijkswaterstaat for NL, WorldTides as a paid global option.
3. **Realistic spec changes.** Some requirements don't fit a browser app:
   - *S-57 ENC support and 50 GB storage (R15):* a browser can't read S-57 files directly, and storage quotas vary. Suggestion: convert S-57 on a server into vector tiles, and say the storage limit depends on the browser.
   - *NMEA 2000 over CAN bus (R3.2):* a browser can't talk to CAN directly. It needs a USB, Wi-Fi or WebSocket gateway (for example Actisense or Yacht Devices). Suggestion: also support a WebSocket connection, which covers SignalK servers too.
   - *"500 mA per hour" (R6.4):* not a measurable unit. Rewrite it as a target such as % battery per hour on a reference tablet.
4. **Keep the Kiro tasks file up to date.** Add Phases 0–8 to `tasks.md` (tasks 23–30 already cover Phases 1, 2, 4, 5 and 6) so the spec stays the single source of truth.
