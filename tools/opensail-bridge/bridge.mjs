#!/usr/bin/env node
/**
 * OpenSail bridge: relays a TCP (or UDP) NMEA 0183 stream to WebSocket.
 *
 * A browser can't open TCP or UDP sockets, so OpenSail can't talk to most
 * Wi-Fi instrument gateways directly. Run this on the same laptop as the
 * browser, join the boat's Wi-Fi, and connect OpenSail to ws://localhost:10110.
 *
 * Default target: a Pcnautic / pypilot autopilot, 192.168.14.1:20220 (TCP).
 * No dependencies: Node.js 18 or newer is enough.
 *
 *   node tools/opensail-bridge/bridge.mjs
 *   node tools/opensail-bridge/bridge.mjs --target 192.168.4.1:10110
 *   node tools/opensail-bridge/bridge.mjs --udp 10110
 *
 * Read-only by default: what the app sends is dropped, because any website
 * open in the browser can reach ws://localhost too. --allow-write forwards
 * the app's sentences to the target (for example a route for the autopilot).
 */
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createSocket } from 'node:dgram';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export const DEFAULTS = {
  target: '192.168.14.1:20220',
  listenHost: '127.0.0.1',
  listenPort: 10110,
  udpPort: null,
  allowWrite: false,
};

export function parseArgs(argv) {
  const options = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      return value;
    };
    if (arg === '--target') options.target = next();
    else if (arg === '--udp') options.udpPort = Number(next());
    else if (arg === '--port') options.listenPort = Number(next());
    else if (arg === '--listen') options.listenHost = next();
    else if (arg === '--allow-write') options.allowWrite = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`Unknown option ${arg}`);
  }
  return options;
}

export function parseTarget(target) {
  const match = /^\[?([^\]]+?)\]?:(\d+)$/.exec(target);
  if (!match) throw new Error(`--target must be host:port, got "${target}"`);
  return { host: match[1], port: Number(match[2]) };
}

/** A server-to-client WebSocket text frame (RFC 6455: FIN, opcode, unmasked) */
export function encodeFrame(text, opcode = 0x1) {
  const payload = Buffer.from(text, 'utf8');
  const length = payload.length;
  let header;
  if (length < 126) {
    header = Buffer.from([0x80 | opcode, length]);
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  return Buffer.concat([header, payload]);
}

/**
 * Read client frames (always masked) from a buffer. Returns the complete
 * frames and the bytes left over for the next chunk.
 */
export function decodeFrames(buffer) {
  const frames = [];
  let offset = 0;
  while (buffer.length - offset >= 2) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
    let headerLength = 2;
    if (length === 126) {
      if (buffer.length - offset < 4) break;
      length = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (buffer.length - offset < 10) break;
      length = Number(buffer.readBigUInt64BE(offset + 2));
      headerLength = 10;
    }
    const maskLength = masked ? 4 : 0;
    const total = headerLength + maskLength + length;
    if (buffer.length - offset < total) break;
    const payload = Buffer.from(buffer.subarray(offset + headerLength + maskLength, offset + total));
    if (masked) {
      const mask = buffer.subarray(offset + headerLength, offset + headerLength + 4);
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    }
    frames.push({ fin: (first & 0x80) !== 0, opcode: first & 0x0f, payload });
    offset += total;
  }
  return { frames, rest: buffer.subarray(offset) };
}

/** Splits a byte stream into NMEA lines, keeping a partial line for the next chunk */
export class LineSplitter {
  constructor() {
    this.partial = '';
  }
  push(chunk) {
    const lines = (this.partial + chunk.toString('latin1')).split(/\r?\n/);
    this.partial = lines.pop() ?? '';
    if (this.partial.length > 4096) this.partial = ''; // not NMEA: drop runaway data
    return lines.map((line) => line.trim()).filter(Boolean);
  }
}

/**
 * Start the bridge. Returns { close(), port } so tests can run it in-process.
 * `log` receives status lines.
 */
export async function startBridge(options = {}, log = console.log) {
  const config = { ...DEFAULTS, ...options };
  const clients = new Set();
  let upstream = null;
  let upstreamStatus = 'not connected';
  let closed = false;
  let reconnectTimer = null;
  let reconnectDelay = 1000;
  let udpSocket = null;

  const broadcast = (lines) => {
    if (lines.length === 0 || clients.size === 0) return;
    const frame = encodeFrame(lines.join('\r\n') + '\r\n');
    for (const client of clients) client.write(frame);
  };

  const fromApp = (text) => {
    if (!config.allowWrite) return;
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^[$!]/.test(l));
    if (lines.length === 0) return;
    if (upstream && !upstream.destroyed) upstream.write(lines.join('\r\n') + '\r\n');
  };

  // --- Upstream: TCP client to the gateway, or a UDP listener ---
  const connectTcp = () => {
    const { host, port } = parseTarget(config.target);
    const splitter = new LineSplitter();
    const socket = net.connect({ host, port });
    upstream = socket;
    upstreamStatus = `connecting to ${host}:${port}`;
    socket.setKeepAlive(true, 10000);
    socket.setTimeout(30000); // a silent gateway is a dead gateway
    socket.on('connect', () => {
      reconnectDelay = 1000;
      upstreamStatus = `connected to ${host}:${port}`;
      log(`Connected to ${host}:${port}`);
    });
    socket.on('data', (chunk) => broadcast(splitter.push(chunk)));
    socket.on('timeout', () => socket.destroy(new Error('no data for 30 s')));
    socket.on('error', (error) => {
      upstreamStatus = `${host}:${port}: ${error.message}`;
    });
    socket.on('close', () => {
      if (upstream === socket) upstream = null;
      if (closed) return;
      log(`No connection to ${host}:${port} (${upstreamStatus}); retrying in ${reconnectDelay / 1000} s`);
      reconnectTimer = setTimeout(connectTcp, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 10000);
    });
  };

  if (config.udpPort) {
    const splitter = new LineSplitter();
    udpSocket = createSocket({ type: 'udp4', reuseAddr: true });
    udpSocket.on('message', (message) => broadcast(splitter.push(Buffer.concat([message, Buffer.from('\n')]))));
    await new Promise((resolve, reject) => {
      udpSocket.once('error', reject);
      udpSocket.bind(config.udpPort, () => resolve());
    });
    upstreamStatus = `listening for UDP on port ${config.udpPort}`;
    log(`Listening for NMEA over UDP on port ${config.udpPort}`);
  } else {
    connectTcp();
  }

  // --- Downstream: WebSocket server for OpenSail ---
  const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(
      `OpenSail bridge\nUpstream: ${upstreamStatus}\nApps connected: ${clients.size}\n` +
        `Writing to the target: ${config.allowWrite ? 'allowed' : 'off (read-only)'}\n`
    );
  });

  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (req.headers.upgrade?.toLowerCase() !== 'websocket' || typeof key !== 'string') {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    const accept = createHash('sha1').update(key + WS_GUID).digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );
    socket.setNoDelay(true);
    clients.add(socket);
    log(`App connected (${req.headers.origin ?? 'no origin'}), ${clients.size} in total`);

    let pending = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      const { frames, rest } = decodeFrames(Buffer.concat([pending, chunk]));
      pending = rest;
      for (const frame of frames) {
        if (frame.opcode === 0x1) fromApp(frame.payload.toString('utf8'));
        else if (frame.opcode === 0x8) {
          socket.end(encodeFrame('', 0x8));
        } else if (frame.opcode === 0x9) {
          socket.write(Buffer.concat([Buffer.from([0x8a, frame.payload.length]), frame.payload]));
        }
      }
    });
    const drop = () => {
      if (clients.delete(socket)) log(`App disconnected, ${clients.size} left`);
    };
    socket.on('close', drop);
    socket.on('error', drop);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.listenPort, config.listenHost, () => resolve());
  });
  const port = server.address().port;
  log(`OpenSail bridge: connect OpenSail to ws://localhost:${port}` + (config.allowWrite ? ' (write allowed)' : ''));

  return {
    port,
    async close() {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      upstream?.destroy();
      udpSocket?.close();
      for (const client of clients) client.destroy();
      await new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

const HELP = `OpenSail bridge: relay a TCP or UDP NMEA 0183 stream to WebSocket for OpenSail.

Usage: node tools/opensail-bridge/bridge.mjs [options]

  --target host:port  NMEA TCP server to connect to (default ${DEFAULTS.target},
                      the Pcnautic / pypilot autopilot)
  --udp port          listen for NMEA over UDP on this port instead of TCP
  --port port         WebSocket port for OpenSail (default ${DEFAULTS.listenPort})
  --listen address    address to listen on (default ${DEFAULTS.listenHost}: this device only)
  --allow-write       forward sentences from OpenSail to the target (default: read-only)

Then join the boat's Wi-Fi and, in OpenSail: Instruments > Wi-Fi > ws://localhost:${DEFAULTS.listenPort}
`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message + '\n\n' + HELP);
    process.exit(2);
  }
  if (options.help) {
    console.log(HELP);
    process.exit(0);
  }
  startBridge(options).catch((error) => {
    console.error(`Could not start the bridge: ${error.message}`);
    process.exit(1);
  });
}
