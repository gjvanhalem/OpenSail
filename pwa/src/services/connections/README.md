# Instrument Connections

This directory contains the connections to marine instruments: USB serial, Bluetooth, Wi-Fi (WebSocket in the browser, plain TCP in the Windows and Android apps) and a simulator. Every connection implements `InstrumentDataConnection` (`types.ts`): `connect()`, `disconnect()`, `onData()` (one line of protocol data per call) and `onStatusChange()`.

In the Redux store (`instrumentsSlice`) a connection's `type` is `'serial'`, `'bluetooth'`, `'network'` (Wi-Fi, both kinds) or `'stub'`.

| Connection | Browser | Windows app (WebView2) | Android app (WebView) |
|---|---|---|---|
| SerialConnection (USB) | Chromium browsers | API present, port picker not yet tested | no |
| BluetoothConnection | Chromium browsers | API present, device picker not yet tested | no |
| WebSocketConnection (Wi-Fi) | yes | yes | yes |
| NativeTcpConnection (Wi-Fi) | no | yes | yes |
| StubConnection (simulator) | yes | yes | yes |

## SerialConnection

Connects to USB marine instruments using the Web Serial API.

**Browser Support:** Chromium browsers (Chrome, Edge). Not in the Android app; in the Windows app see `desktop/README.md`.

**Features:**
- NMEA0183, NMEA2000, and SeaTalk protocol support
- Configurable baud rate (default 4800)
- Data buffering and line splitting
- Errors reported through the ErrorHandler

**Usage:**
```typescript
const connection = new SerialConnection({
  id: 'serial-1',
  protocol: 'NMEA0183',
  config: { baudRate: 4800 }
});

connection.onData((data) => {
  console.log('Received:', data);
});

await connection.connect();
```

## BluetoothConnection

Connects to Bluetooth marine instruments using the Web Bluetooth API.

**Browser Support:** Chromium browsers (Chrome, Edge). Not Safari or Firefox, not in the Android app.

**Features:**
- NMEA0183, NMEA2000, and SeaTalk protocol support
- Automatic device discovery and pairing
- GATT service and characteristic management
- Automatic reconnection on disconnect
- Data buffering and line parsing

**Usage:**
```typescript
const connection = new BluetoothConnection({
  id: 'bluetooth-1',
  protocol: 'NMEA0183'
});

connection.onData((data) => {
  console.log('Received:', data);
});

await connection.connect(); // Shows device picker
```

## Standard UUIDs

The BluetoothConnection uses standard GATT service UUIDs for marine instruments:

- Service UUID: `0000fff0-0000-1000-8000-00805f9b34fb`
- Characteristic UUID: `0000fff1-0000-1000-8000-00805f9b34fb`

These can be overridden in the constructor options (`serviceUuid`, `characteristicUuid`) if your device uses different UUIDs.

## WebSocketConnection

Instruments over Wi-Fi in the browser. Browsers can't open TCP or UDP sockets, so this talks WebSocket: to a gateway that offers it, or to the OpenSail bridge (`tools/opensail-bridge`), which relays a TCP NMEA server or UDP broadcasts to `ws://localhost:10110` (read-only by default).

**Features:**
- Lines split from the message stream (`lineStream.ts`, shared with NativeTcpConnection)
- Keeps reconnecting when the link drops, waiting 1 s, doubling up to 15 s, until `disconnect()`
- `blockedWebSocketReason()` explains addresses the browser will refuse: a page loaded over HTTPS may only open an unencrypted `ws://` link to localhost (mixed content)

**Usage:**
```typescript
const connection = new WebSocketConnection({
  id: 'network-1',
  protocol: 'NMEA0183',
  url: 'ws://localhost:10110',
});

instrumentDataService.wireConnection(connection, 'NMEA0183');
await connection.connect();
```

The address is saved in the setting `instrumentWebSocketUrl` (default `ws://localhost:10110`).

## NativeTcpConnection

Instruments over Wi-Fi in the Windows and Android apps: a plain TCP connection opened by the app (`platform/nativeTcp.ts`: Rust in `desktop/src-tauri/src/tcp.rs`, Kotlin in `android/native/app/src/main/java/nl/gzeven/opensail/tcp/`). No bridge needed. `NativeTcpConnection.isSupported()` is true only in the native apps; the Instruments page then asks for host and port instead of a WebSocket address.

**Features:**
- Same line splitting and reconnect behaviour as WebSocketConnection
- Read-only unless `allowWrites` is set; the Instruments page opens it read-only

**Usage:**
```typescript
const connection = new NativeTcpConnection({
  id: 'network-1',
  protocol: 'NMEA0183',
  host: '192.168.14.1',  // Pcnautic / pypilot autopilot on Wi-Fi pcnautic_AP
  port: 20220,
});

instrumentDataService.wireConnection(connection, 'NMEA0183');
await connection.connect();
```

Host and port are saved in the settings `instrumentTcpHost` and `instrumentTcpPort` (defaults `192.168.14.1` and `20220`).

## Integration with Protocol Parsers

Every connection is wired to the InstrumentDataService, which hands its lines to the protocol parser (NMEA0183Parser, NMEA2000Parser, SeaTalkParser in `src/protocols`).

```typescript
const dataService = new InstrumentDataService(dispatch);

dataService.wireConnection(connection, 'NMEA0183');
```

`wireBluetoothConnection()` does the same for a BluetoothConnection.

The parsed data is automatically dispatched to the Redux store for use throughout the application.

## Error Handling

Every connection provides status callbacks:

```typescript
connection.onStatusChange((status, error) => {
  console.log('Status:', status); // 'connecting' | 'connected' | 'disconnected' | 'error'
  if (error) {
    console.error('Error:', error);
  }
});
```

## Browser Compatibility Detection

Check if APIs are supported before attempting to connect:

```typescript
if (SerialConnection.isSupported()) {
  // USB Serial is available
}

if (BluetoothConnection.isSupported()) {
  // Bluetooth is available
}

if (NativeTcpConnection.isSupported()) {
  // Running in the Windows or Android app: plain TCP is available
}
```

## StubConnection

Simulates an instrument bus (requirement R10), so the app can be developed and
tested without a boat. It works in every browser.

A `VesselSimulation` dead-reckons a boat from heading and speed, with optional
realistic wander on heading, speed, depth and wind. Every interval (500 ms by
default) the stub encodes the state as the protocol's real wire format and hands
it over line by line through `onData`, exactly like the hardware connections:

- **NMEA 0183:** RMC, GGA, VTG, HDG, VHW, DPT, DBT, MWV sentences
- **NMEA 2000:** single CAN frames in candump format (`CANID#data`) for PGNs
  129025, 129026, 127250, 128259, 128267, 130306 and 130310
- **SeaTalk:** datagrams 00, 10, 11, 20, 23, 50, 51, 52, 53, 89 and 99, wrapped
  as `$STALK,...*hh` the way SeaTalk-to-NMEA gateways forward them

**Usage:**
```typescript
const connection = new StubConnection({
  id: 'stub-1',
  protocol: 'SeaTalk',
  intervalMs: 500,
  simulation: { heading: 270, speed: 6, depth: 8 },
});

instrumentDataService.wireConnection(connection, 'SeaTalk');
await connection.connect();

// Change what is simulated while it runs
connection.updateSimulation({ depth: 2.5 });
```

On the Instruments page, choose **Simulator** as the connection type. The
connection card then shows controls for position, heading, speed, depth and
wind.

## connectionRegistry

Live connection objects by id. Redux holds only their status, so the objects
are kept here: a connection keeps running, and can still be disconnected,
after the page that opened it unmounts.
