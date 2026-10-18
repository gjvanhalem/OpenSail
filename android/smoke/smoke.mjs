// Smoke test of the Android app on an emulator, run in CI (see .github/workflows/android.yml):
// installs the debug APK, drives its WebView with Playwright (WebView debugging is on in
// debug builds) and
//   - connects Instruments > Wi-Fi to an NMEA TCP server on the runner (like the Pcnautic
//     autopilot), reached at 10.0.2.2 over the emulator's Wi-Fi, checks the heading arrives
//     and that it reconnects after the server drops the link;
//   - reads the chart catalog and a byte range of the archive through native HTTP;
//   - reads the emulator's GPS position through @capacitor/geolocation;
//   - checks the chart draws tiles, and that IndexedDB and the Wi-Fi address survive a restart.
// Usage: node smoke/smoke.mjs <path to the debug APK> [output folder]
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { _android as android } from 'playwright-core';

const apk = process.argv[2];
const out = process.argv[3] ?? 'smoke-output';
const PKG = 'nl.gzeven.opensail.debug';
const CATALOG = 'https://github.com/gjvanhalem/opensail-charts/releases/latest/download/index.json';
// Stavoren, the emulator's GPS fix
const GPS = { latitude: 52.8846, longitude: 5.3597 };
mkdirSync(out, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];
let failed = false;
function report(name, value, ok = true, hard = false) {
  if (!ok && hard) failed = true;
  results.push({ name, value: typeof value === 'string' ? value : JSON.stringify(value), mark: ok ? '✅' : hard ? '❌' : '⚠️' });
  console.log(`${ok ? 'ok  ' : hard ? 'FAIL' : 'note'} ${name}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
}

function nmea(body) {
  let sum = 0;
  for (const c of body) sum ^= c.charCodeAt(0);
  return `$${body}*${sum.toString(16).toUpperCase().padStart(2, '0')}\r\n`;
}

// A TCP NMEA server like the autopilot's: heading, rudder and attitude five times a second
const sockets = new Set();
let accepted = 0;
const server = net.createServer((socket) => {
  accepted++;
  sockets.add(socket);
  const timer = setInterval(() => {
    socket.write(nmea('APHDM,100.0,M') + nmea('APRSA,-5.0,A,,V') + nmea('APXDR,A,-1.0,D,PTCH,A,8.0,D,ROLL'));
  }, 200);
  socket.on('close', () => {
    clearInterval(timer);
    sockets.delete(socket);
  });
  socket.on('error', () => {});
});
await new Promise((resolve) => server.listen(0, '0.0.0.0', resolve));
const tcpPort = server.address().port;
// The emulator's address for the machine it runs on
const TCP_HOST = '10.0.2.2';

const [device] = await android.devices();
if (!device) throw new Error('No Android device or emulator found (adb devices)');
console.log(`Device: ${device.model()} ${device.serial()}`);
const shell = async (command) => (await device.shell(command)).toString().trim();

await device.installApk(apk);
// The permission dialog can't be clicked through the WebView: grant it beforehand
await shell(`pm grant ${PKG} android.permission.ACCESS_FINE_LOCATION`);
await shell(`pm grant ${PKG} android.permission.ACCESS_COARSE_LOCATION`);
report('Android', `${await shell('getprop ro.build.version.release')} (API ${await shell('getprop ro.build.version.sdk')})`);
report('Network', await shell('dumpsys connectivity | grep -m1 -o "NetworkAgentInfo{[^}]*}" || true'));

async function launch() {
  await shell(`am force-stop ${PKG}`);
  await shell(`am start -W -n ${PKG}/nl.gzeven.opensail.MainActivity`);
  const webView = await device.webView({ pkg: PKG }, { timeout: 60000 });
  const page = await webView.page();
  await page.waitForSelector('a[href="/instruments"]', { timeout: 60000 });
  return page;
}

async function screenshot(page, name) {
  // The WebView's own picture, and the whole screen (status bar, dialogs)
  await page.screenshot({ path: `${out}/${name}.png` }).catch(() => {});
  await device.screenshot({ path: `${out}/${name}-screen.png` }).catch(() => {});
}

let page;
try {
  page = await launch();

  const probe = await page.evaluate(async () => {
    const r = {};
    const attempt = async (fn) => {
      try {
        return await fn();
      } catch (error) {
        return `error: ${error?.name ?? ''} ${error?.message ?? error}`;
      }
    };
    r.origin = location.origin;
    r.secureContext = isSecureContext;
    r.capacitor = window.Capacitor?.isNativePlatform?.() === true ? window.Capacitor.getPlatform() : false;
    r.userAgent = navigator.userAgent.replace(/^.*(Chrome\/[\d.]+).*$/, '$1');
    r.serviceWorkers = await attempt(async () => (navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0));
    r.webSerial = 'serial' in navigator;
    r.webBluetooth = 'bluetooth' in navigator;
    r.audio = await attempt(async () => {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
      await ctx.resume();
      const state = ctx.state;
      await ctx.close();
      return state;
    });
    r.wakeLock = 'wakeLock' in navigator;
    r.wakeLockRequest = r.wakeLock
      ? await attempt(async () => {
          const lock = await navigator.wakeLock.request('screen');
          await lock.release();
          return 'granted';
        })
      : 'n/a';
    r.storagePersist = await attempt(() => navigator.storage.persist());
    r.storageQuotaGB = await attempt(async () => Math.round((await navigator.storage.estimate()).quota / 1e8) / 10);
    r.webgl2 = !!document.createElement('canvas').getContext('webgl2');
    r.idbWrite = await attempt(
      () =>
        new Promise((resolve, reject) => {
          const open = indexedDB.open('opensail-smoke', 1);
          open.onupgradeneeded = () => open.result.createObjectStore('s');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const tx = open.result.transaction('s', 'readwrite');
            tx.objectStore('s').put('kept', 'restart');
            tx.oncomplete = () => {
              open.result.close();
              resolve('written');
            };
          };
        })
    );
    return r;
  });

  report('Origin', probe.origin, probe.origin === 'https://localhost', true);
  report('Secure context', probe.secureContext, probe.secureContext === true, true);
  report('Capacitor', probe.capacitor, probe.capacitor === 'android', true);
  report('WebView', probe.userAgent);
  report('Service workers registered', probe.serviceWorkers, probe.serviceWorkers === 0, true);
  report('IndexedDB write', probe.idbWrite, probe.idbWrite === 'written', true);
  report('WebGL2 (MapLibre)', probe.webgl2, probe.webgl2);
  report('Web Serial / Web Bluetooth', `${probe.webSerial} / ${probe.webBluetooth}`);
  report('Web Audio', probe.audio, probe.audio === 'running');
  report('Wake lock', `${probe.wakeLock}, request: ${probe.wakeLockRequest}`, probe.wakeLockRequest === 'granted');
  report('Persistent storage', `${probe.storagePersist}, quota ${probe.storageQuotaGB} GB`, probe.storagePersist === true);

  // Charts through native HTTP: GitHub release downloads have no CORS headers
  const charts = await page.evaluate(async (catalogUrl) => {
    const fetchNative = window.__OPENSAIL_PLATFORM_FETCH__;
    if (!fetchNative) return { error: 'no platform fetch hook' };
    try {
      const catalog = await fetchNative(catalogUrl, { cache: 'no-cache' });
      if (!catalog.ok) return { error: `catalog HTTP ${catalog.status}` };
      const { regions } = await catalog.json();
      const file = new URL(regions[0].file, catalogUrl).href;
      const range = await fetchNative(file, { headers: { Range: 'bytes=0-126' } });
      const bytes = new Uint8Array(await range.arrayBuffer());
      const magic = String.fromCharCode(...bytes.slice(0, 7));
      let browserFetch = 'allowed';
      await fetch(catalogUrl).catch(() => (browserFetch = 'blocked (CORS), as expected'));
      return { regions: regions.map((r) => r.id), status: range.status, length: bytes.length, magic, browserFetch };
    } catch (error) {
      return { error: String(error) };
    }
  }, CATALOG);
  report(
    'Chart catalog + byte range (native HTTP)',
    charts,
    charts.status === 206 && charts.length === 127 && charts.magic === 'PMTiles',
    true
  );

  // GPS through @capacitor/geolocation (the emulator's fix is set in the workflow)
  const position = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const geo = window.__OPENSAIL_GEOLOCATION__?.();
        if (!geo) return resolve({ error: 'no geolocation hook' });
        geo.getCurrentPosition(
          (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
          (e) => resolve({ error: `${e.code} ${e.message}` }),
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
        );
      })
  );
  report(
    'GPS (@capacitor/geolocation)',
    position,
    Math.abs(position.latitude - GPS.latitude) < 0.01 && Math.abs(position.longitude - GPS.longitude) < 0.01,
    true
  );

  // Instruments over Wi-Fi: plain TCP from Kotlin, no bridge
  await page.click('a[href="/instruments"]');
  await page.getByRole('button', { name: 'Wi-Fi', exact: true }).click();
  const defaults = [await page.inputValue('#wifi-host'), await page.inputValue('#wifi-port')];
  report('Wi-Fi defaults', defaults.join(':'), defaults.join(':') === '192.168.14.1:20220', true);
  await page.fill('#wifi-host', TCP_HOST);
  await page.fill('#wifi-port', String(tcpPort));
  await page.getByRole('button', { name: 'Connect over Wi-Fi' }).click();
  try {
    await page.getByText(`Wi-Fi NMEA0183 (${TCP_HOST}:${tcpPort})`).waitFor({ timeout: 20000 });
    await page.getByText('rudder', { exact: true }).waitFor({ timeout: 15000 });
    report('TCP instruments: data arrives', `rudder and heading received from ${TCP_HOST}`, true, true);
  } finally {
    await screenshot(page, 'instruments');
  }

  // The boat's Wi-Fi drops: the app reconnects by itself
  for (const socket of sockets) socket.destroy();
  const before = accepted;
  for (let i = 0; i < 30 && accepted === before; i++) await sleep(500);
  report('TCP instruments: reconnects after a drop', `${accepted - before} new connection(s)`, accepted > before, true);

  await page.click('a[href="/chart"]');
  await sleep(10000);
  await screenshot(page, 'chart');
  // Base map, seamarks and the ENC from the GitHub release, through the opensail:// protocol
  const tiles = await page.evaluate(() => window.__OPENSAIL_TILE_STATS__);
  report('Chart tiles loaded', tiles, tiles?.fromNetwork > 0, true);

  page = await launch();
  const kept = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('opensail-smoke', 1);
        open.onsuccess = () => {
          const get = open.result.transaction('s').objectStore('s').get('restart');
          get.onsuccess = () => resolve(get.result ?? 'missing');
          get.onerror = () => resolve(String(get.error));
        };
        open.onerror = () => resolve(String(open.error));
      })
  );
  report('IndexedDB survives a restart', kept, kept === 'kept', true);
  await page.click('a[href="/instruments"]');
  await page.getByRole('button', { name: 'Wi-Fi', exact: true }).click();
  const tcpHostKept = `${await page.inputValue('#wifi-host')}:${await page.inputValue('#wifi-port')}`;
  report('Wi-Fi address remembered', tcpHostKept, tcpHostKept === `${TCP_HOST}:${tcpPort}`, true);
} catch (error) {
  report('Smoke test', String(error?.stack ?? error), false, true);
  if (page) await screenshot(page, 'failure');
  else await device.screenshot({ path: `${out}/failure-screen.png` }).catch(() => {});
} finally {
  await device.close().catch(() => {});
  server.close();
}

const table = ['| | Check | Result |', '|---|---|---|', ...results.map((r) => `| ${r.mark} | ${r.name} | \`${r.value.replaceAll('|', '/')}\` |`)].join('\n');
writeFileSync(`${out}/results.md`, `${table}\n`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Android smoke test (emulator)\n\n${table}\n`);
process.exit(failed ? 1 : 0);
