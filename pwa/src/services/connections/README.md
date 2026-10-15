# Instrument Connections

This directory contains connection implementations for marine instruments using Web APIs.

## SerialConnection

Connects to USB marine instruments using the Web Serial API.

**Browser Support:**
- Chrome 89+
- Edge 89+

**Features:**
- NMEA0183, NMEA2000, and SeaTalk protocol support
- Configurable baud rates (4800 for NMEA0183, 250000 for NMEA2000)
- Automatic data buffering and line parsing
- Error handling and reconnection

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

**Browser Support:**
- Chrome 89+
- Edge 89+
- Safari 15.4+ (limited support)

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

These can be overridden in the constructor options if your device uses different UUIDs.

## Integration with Protocol Parsers

Both connection types integrate with the InstrumentDataService, which wires them to the appropriate protocol parsers (NMEA0183Parser, NMEA2000Parser, SeaTalkParser).

```typescript
const dataService = new InstrumentDataService(dispatch);

// For Serial
dataService.wireConnection(serialConnection, 'NMEA0183');

// For Bluetooth
dataService.wireBluetoothConnection(bluetoothConnection, 'NMEA0183');
```

The parsed data is automatically dispatched to the Redux store for use throughout the application.

## Error Handling

Both connection types provide status callbacks:

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
