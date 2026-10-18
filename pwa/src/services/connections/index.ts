export { SerialConnection } from './SerialConnection';
export type { SerialConnectionConfig, SerialConnectionOptions, SerialConnectionStatus } from './SerialConnection';

export { BluetoothConnection } from './BluetoothConnection';
export type { BluetoothConnectionOptions, BluetoothConnectionStatus } from './BluetoothConnection';

export { StubConnection } from './StubConnection';
export { WebSocketConnection, blockedWebSocketReason } from './WebSocketConnection';
export type { WebSocketConnectionOptions } from './WebSocketConnection';
export { NativeTcpConnection } from './NativeTcpConnection';
export type { NativeTcpConnectionOptions } from './NativeTcpConnection';
export type { StubConnectionOptions } from './StubConnection';

export type { InstrumentDataConnection, DataConnectionStatus } from './types';
export { connectionRegistry } from './connectionRegistry';
