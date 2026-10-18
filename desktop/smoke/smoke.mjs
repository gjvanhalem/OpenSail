// Smoke test of the built desktop app, run in CI on Windows (see .github/workflows/desktop.yml):
// starts the app with WebView2's DevTools port open, drives it with Playwright over CDP, and
//   - connects Instruments > Wi-Fi to a local NMEA TCP server (like the Pcnautic autopilot),
//     checks the heading arrives and that it reconnects after the server drops the link;
//   - reads the chart catalog and a byte range of the archive through native HTTP;
//   - reports what WebView2 offers: geolocation, Web Serial, Web Bluetooth, Web Audio,
//     wake lock, storage persistence, and whether IndexedDB survives a restart.
// Usage: node smoke/smoke.mjs <path to opensail-desktop.exe> [output folder]
import { execSync, spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { chromium } from 'playwright-core';

const exe = process.argv[2];
const out = process.argv[3] ?? 'smoke-output';
const CDP_PORT = 9222;
const CATALOG = 'https://github.com/gjvanhalem/opensail-charts/releases/latest/download/index.json';
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
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const tcpPort = server.address().port;

async function launch() {
  const app = spawn(exe, [], {
    env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${CDP_PORT}` },
    stdio: 'inherit',
  });
  let browser;
  for (let i = 0; i < 60 && !browser; i++) {
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
    } catch {
      await sleep(1000);
    }
  }
  if (!browser) {
    const state = app.exitCode === null ? 'still running' : `exited with ${app.exitCode}`;
    const lines = (command, match) => {
      try {
        return execSync(command, { encoding: 'utf8' })
          .split(/\r?\n/)
          .filter((line) => match.test(line))
          .join('\n');
      } catch (error) {
        return String(error);
      }
    };
    console.log(`App ${state}`);
    console.log(lines('tasklist', /msedgewebview2|opensail/i));
    console.log(lines('netstat -ano -p tcp', /LISTENING/));
    app.kill();
    throw new Error(`The app did not open a WebView2 DevTools port within 60 s (app ${state})`);
  }
  const context = browser.contexts()[0];
  const page = context.pages()[0] ?? (await context.waitForEvent('page'));
  await page.waitForSelector('a[href="/instruments"]', { timeout: 60000 });
  return { app, browser, page };
}

async function close({ app, browser }) {
  await browser.close().catch(() => {});
  app.kill();
  await new Promise((resolve) => (app.exitCode !== null ? resolve() : app.once('exit', resolve)));
  await sleep(2000); // let WebView2 flush its storage and let go of the port
}

let session;
try {
  session = await launch();
  const { page } = session;

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
    r.tauri = '__TAURI_INTERNALS__' in window;
    r.serviceWorkers = await attempt(async () => (await navigator.serviceWorker.getRegistrations()).length);
    r.geolocation = 'geolocation' in navigator;
    r.geolocationPermission = await attempt(async () => (await navigator.permissions.query({ name: 'geolocation' })).state);
    r.webSerial = 'serial' in navigator;
    r.serialGetPorts = r.webSerial ? await attempt(async () => (await navigator.serial.getPorts()).length) : 'n/a';
    r.webBluetooth = 'bluetooth' in navigator;
    r.bluetoothAvailable = r.webBluetooth ? await attempt(() => navigator.bluetooth.getAvailability()) : 'n/a';
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
    r.databases = await attempt(async () => (await indexedDB.databases()).map((db) => db.name));
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

  report('Origin', probe.origin, probe.origin === 'https://tauri.localhost', true);
  report('Secure context', probe.secureContext, probe.secureContext === true, true);
  report('Tauri API', probe.tauri, probe.tauri === true, true);
  report('Service workers registered', probe.serviceWorkers, probe.serviceWorkers === 0, true);
  report('IndexedDB write', probe.idbWrite, probe.idbWrite === 'written', true);
  report('IndexedDB databases', probe.databases);
  report('WebGL2 (MapLibre)', probe.webgl2, probe.webgl2);
  report('Geolocation API', `${probe.geolocation}, permission ${probe.geolocationPermission}`, probe.geolocation);
  report('Web Serial', `${probe.webSerial}, getPorts: ${probe.serialGetPorts}`, probe.webSerial);
  report('Web Bluetooth', `${probe.webBluetooth}, available: ${probe.bluetoothAvailable}`, probe.webBluetooth);
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
    charts.status === 206 && charts.length === 127 && charts.magic === 'PMTiles'
  );

  // Instruments over Wi-Fi: plain TCP, no bridge
  await page.click('a[href="/instruments"]');
  await page.getByRole('button', { name: 'Wi-Fi', exact: true }).click();
  const defaults = [await page.inputValue('#wifi-host'), await page.inputValue('#wifi-port')];
  report('Wi-Fi defaults', defaults.join(':'), defaults.join(':') === '192.168.14.1:20220', true);
  await page.fill('#wifi-host', '127.0.0.1');
  await page.fill('#wifi-port', String(tcpPort));
  await page.getByRole('button', { name: 'Connect over Wi-Fi' }).click();
  await page.getByText(`Wi-Fi NMEA0183 (127.0.0.1:${tcpPort})`).waitFor({ timeout: 15000 });
  await page.getByText('rudder', { exact: true }).waitFor({ timeout: 15000 });
  report('TCP instruments: data arrives', 'rudder and heading received');
  await page.screenshot({ path: `${out}/instruments.png` });

  // The boat's Wi-Fi drops: the app reconnects by itself
  for (const socket of sockets) socket.destroy();
  const before = accepted;
  for (let i = 0; i < 30 && accepted === before; i++) await sleep(500);
  report('TCP instruments: reconnects after a drop', `${accepted - before} new connection(s)`, accepted > before, true);

  await page.click('a[href="/chart"]');
  await sleep(5000);
  await page.screenshot({ path: `${out}/chart.png` });

  await close(session);
  session = await launch();
  const kept = await session.page.evaluate(
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
  const tcpHostKept = await (async () => {
    await session.page.click('a[href="/instruments"]');
    await session.page.getByRole('button', { name: 'Wi-Fi', exact: true }).click();
    return `${await session.page.inputValue('#wifi-host')}:${await session.page.inputValue('#wifi-port')}`;
  })();
  report('Wi-Fi address remembered', tcpHostKept, tcpHostKept === `127.0.0.1:${tcpPort}`, true);
} catch (error) {
  report('Smoke test', String(error?.stack ?? error), false, true);
  await session?.page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
} finally {
  if (session) await close(session);
  server.close();
}

const table = ['| | Check | Result |', '|---|---|---|', ...results.map((r) => `| ${r.mark} | ${r.name} | \`${r.value.replaceAll('|', '/')}\` |`)].join('\n');
writeFileSync(`${out}/results.md`, `${table}\n`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Desktop smoke test (WebView2)\n\n${table}\n`);
process.exit(failed ? 1 : 0);
