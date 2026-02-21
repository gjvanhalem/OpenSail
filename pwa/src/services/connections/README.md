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
