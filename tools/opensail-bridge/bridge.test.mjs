// node --test tools/opensail-bridge (Node 22+: uses the built-in WebSocket client)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { decodeFrames, encodeFrame, LineSplitter, parseArgs, parseTarget, startBridge } from './bridge.mjs';

/** A fake autopilot NMEA server, like pypilot on port 20220 */
async function fakeAutopilot() {
  const sockets = new Set();
  const received = [];
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('data', (chunk) => received.push(chunk.toString()));
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    port: server.address().port,
    received,
    send: (text) => sockets.forEach((s) => s.write(text)),
    connected: () => sockets.size,
    close: () => {
      sockets.forEach((s) => s.destroy());
      return new Promise((resolve) => server.close(resolve));
    },
  };
}

async function until(check, timeout = 3000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw new Error('timed out');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

function openClient(port) {
  const lines = [];
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  ws.onmessage = (event) => lines.push(...String(event.data).split(/\r?\n/).filter(Boolean));
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve({ ws, lines });
    ws.onerror = reject;
  });
}

test('relays NMEA lines from the TCP target to WebSocket clients, also split across packets', async () => {
  const pilot = await fakeAutopilot();
  const bridge = await startBridge({ target: `127.0.0.1:${pilot.port}`, listenPort: 0 }, () => {});
  try {
    await until(() => pilot.connected() === 1);
    const { ws, lines } = await openClient(bridge.port);
    pilot.send('$APHDM,123.4,M*3A\r\n$APRSA,-5.0,A,,V');
    pilot.send('*7B\r\n');
    await until(() => lines.length === 2);
    assert.deepEqual(lines, ['$APHDM,123.4,M*3A', '$APRSA,-5.0,A,,V*7B']);
    ws.close();
  } finally {
    await bridge.close();
    await pilot.close();
  }
});

test('is read-only by default and forwards app sentences with --allow-write', async () => {
  for (const allowWrite of [false, true]) {
    const pilot = await fakeAutopilot();
    const bridge = await startBridge(
      { target: `127.0.0.1:${pilot.port}`, listenPort: 0, allowWrite },
      () => {}
    );
    try {
      await until(() => pilot.connected() === 1);
      const { ws } = await openClient(bridge.port);
      ws.send('$GPRMC,120000,A,5253.1,N,00521.3,E,5.0,270.0,171026,,,A*6B');
      ws.send('not nmea');
      await new Promise((resolve) => setTimeout(resolve, 200));
      const text = pilot.received.join('');
      if (allowWrite) assert.equal(text, '$GPRMC,120000,A,5253.1,N,00521.3,E,5.0,270.0,171026,,,A*6B\r\n');
      else assert.equal(text, '');
      ws.close();
    } finally {
      await bridge.close();
      await pilot.close();
    }
  }
});

test('reconnects when the target restarts', async () => {
  const pilot = await fakeAutopilot();
  const port = pilot.port;
  const bridge = await startBridge({ target: `127.0.0.1:${port}`, listenPort: 0 }, () => {});
  try {
    await until(() => pilot.connected() === 1);
    await pilot.close();
    // The autopilot comes back on the same port
    const sockets = new Set();
    const server = net.createServer((s) => sockets.add(s));
    await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
    await until(() => sockets.size === 1, 5000);
    sockets.forEach((s) => s.destroy());
    await new Promise((resolve) => server.close(resolve));
  } finally {
    await bridge.close();
  }
});

test('frames and lines', () => {
  const long = 'x'.repeat(300);
  // Client frames are masked: mask our own unmasked frame to decode it
  const frame = encodeFrame(long);
  const mask = Buffer.from([1, 2, 3, 4]);
  const payload = frame.subarray(4);
  const masked = Buffer.concat([
    Buffer.from([frame[0], frame[1] | 0x80, frame[2], frame[3]]),
    mask,
    Buffer.from(payload.map((b, i) => b ^ mask[i % 4])),
  ]);
  const { frames, rest } = decodeFrames(Buffer.concat([masked, masked.subarray(0, 3)]));
  assert.equal(frames.length, 1);
  assert.equal(frames[0].payload.toString(), long);
  assert.equal(rest.length, 3);

  const splitter = new LineSplitter();
  assert.deepEqual(splitter.push(Buffer.from('$A*00\r\n$B')), ['$A*00']);
  assert.deepEqual(splitter.push(Buffer.from('*11\n')), ['$B*11']);

  assert.deepEqual(parseTarget('192.168.14.1:20220'), { host: '192.168.14.1', port: 20220 });
  assert.throws(() => parseTarget('192.168.14.1'));
  assert.equal(parseArgs([]).target, '192.168.14.1:20220');
  assert.equal(parseArgs(['--allow-write']).allowWrite, true);
});
