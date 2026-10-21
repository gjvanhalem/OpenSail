/**
 * InstrumentManager - UI for managing instrument connections
 * 
 * Provides interface for connecting to marine instruments via USB (Web Serial API),
 * Bluetooth, Wi-Fi (WebSocket, directly or through the OpenSail bridge; plain TCP
 * in the Windows and Android apps) or the built-in instrument simulator, and displays
 * connection status and received data.
 */

import { useState, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  addConnection,
  removeConnection,
  setConnectionStatus,
  setActiveConnection,
  updateConnection,
  type ProtocolType,
  type ConnectionStatus,
  type InstrumentConnection
} from '@/store/slices/instrumentsSlice';
import {
  SerialConnection,
  BluetoothConnection,
  StubConnection,
  WebSocketConnection,
  NativeTcpConnection,
  connectionRegistry,
} from '@/services/connections';
import { updateSetting } from '@/store/slices/settingsSlice';
import { StubControls } from './StubControls';
import { InstrumentDataService } from '@/services/InstrumentDataService';
import { useFeatureSupport } from '@/hooks/useCompatibility';
import type { InstrumentData } from '@/models';

function formatTimestamp(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 1000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(timestamp).toLocaleTimeString();
}

export function InstrumentManager() {
  const dispatch = useAppDispatch();
  const connections = useAppSelector((state) => state.instruments.connections);
  const activeConnectionId = useAppSelector((state) => state.instruments.activeConnectionId);
  const dataStreams = useAppSelector((state) => state.instruments.dataStreams);
  
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolType>('NMEA0183');
  const [error, setError] = useState<string | null>(null);
  const savedWifiUrl = useAppSelector((state) => state.settings.settings.instrumentWebSocketUrl);
  const [wifiUrl, setWifiUrl] = useState<string | null>(null);
  // Follow the saved address until the user types their own
  const wifiAddress = wifiUrl ?? savedWifiUrl;
  // The native apps open TCP themselves: host and port instead of a WebSocket address
  const [nativeTcp] = useState(() => NativeTcpConnection.isSupported());
  const savedTcpHost = useAppSelector((state) => state.settings.settings.instrumentTcpHost);
  const savedTcpPort = useAppSelector((state) => state.settings.settings.instrumentTcpPort);
  const [tcpHostInput, setTcpHostInput] = useState<string | null>(null);
  const [tcpPortInput, setTcpPortInput] = useState<string | null>(null);
  const tcpHost = tcpHostInput ?? savedTcpHost;
  const tcpPort = tcpPortInput ?? String(savedTcpPort);
  
  // Check feature support using compatibility hook
  const isSerialSupported = useFeatureSupport('webSerial');
  const isBluetoothSupported = useFeatureSupport('webBluetooth');
  // The simulator works in every browser, so it is the default without device APIs
  const [connectionType, setConnectionType] = useState<'serial' | 'bluetooth' | 'network' | 'stub'>(
    isSerialSupported ? 'serial' : 'stub'
  );
  
  // Create InstrumentDataService instance
  const dataServiceRef = useRef<InstrumentDataService | null>(null);
  
  if (dataServiceRef.current == null) {
    dataServiceRef.current = new InstrumentDataService(dispatch);
  }

  const handleConnect = async () => {
    setError(null);

    try {
      if (connectionType === 'serial') {
        await handleSerialConnect();
      } else if (connectionType === 'bluetooth') {
        await handleBluetoothConnect();
      } else if (connectionType === 'network') {
        await (nativeTcp ? handleTcpConnect() : handleWifiConnect());
      } else {
        await handleStubConnect();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMsg);
      console.error('Connection error:', err);
    }
  };

  const handleSerialConnect = async () => {
    const connectionId = `serial-${Date.now()}`;
    
    // Create new serial connection
    const serialConnection = new SerialConnection({
      id: connectionId,
      protocol: selectedProtocol,
      config: {
        baudRate: selectedProtocol === 'NMEA2000' ? 250000 : 4800
      }
    });

    // Register status change callback
    serialConnection.onStatusChange((status: ConnectionStatus, errorMsg?: string) => {
      dispatch(setConnectionStatus({
        id: connectionId,
        status,
        errorMessage: errorMsg
      }));
    });

    // Add connection to Redux store
    dispatch(addConnection({
      id: connectionId,
      type: 'serial',
      protocol: selectedProtocol,
      status: 'connecting',
      name: `USB ${selectedProtocol}`,
      lastDataReceived: null,
      errorMessage: null
    }));

    // Connect to the port
    await serialConnection.connect();

    // Wire the connection to the protocol parser
    if (dataServiceRef.current) {
      dataServiceRef.current.wireConnection(serialConnection, selectedProtocol);
    }

    // Store the connection instance
    const portInfo = serialConnection.getPortInfo();
    const connectionName = portInfo 
      ? `USB ${selectedProtocol} (${portInfo.usbVendorId?.toString(16)}:${portInfo.usbProductId?.toString(16)})`
      : `USB ${selectedProtocol}`;

    connectionRegistry.add(serialConnection);
    dispatch(updateConnection({ id: connectionId, updates: { name: connectionName } }));

    // Set as active connection
    dispatch(setActiveConnection(connectionId));
  };

  const handleBluetoothConnect = async () => {
    const connectionId = `bluetooth-${Date.now()}`;
    
    // Create new Bluetooth connection
    const bluetoothConnection = new BluetoothConnection({
      id: connectionId,
      protocol: selectedProtocol
    });

    // Register status change callback
    bluetoothConnection.onStatusChange((status: ConnectionStatus, errorMsg?: string) => {
      dispatch(setConnectionStatus({
        id: connectionId,
        status,
        errorMessage: errorMsg
      }));
    });

    // Add connection to Redux store
    dispatch(addConnection({
      id: connectionId,
      type: 'bluetooth',
      protocol: selectedProtocol,
      status: 'connecting',
      name: `Bluetooth ${selectedProtocol}`,
      lastDataReceived: null,
      errorMessage: null
    }));

    // Connect to the device
    await bluetoothConnection.connect();

    // Wire the connection to the protocol parser
    if (dataServiceRef.current) {
      dataServiceRef.current.wireBluetoothConnection(bluetoothConnection, selectedProtocol);
    }

    // Store the connection instance
    const deviceInfo = bluetoothConnection.getDeviceInfo();
    const connectionName = deviceInfo?.name 
      ? `Bluetooth ${selectedProtocol} (${deviceInfo.name})`
      : `Bluetooth ${selectedProtocol}`;

    connectionRegistry.add(bluetoothConnection);
    dispatch(updateConnection({ id: connectionId, updates: { name: connectionName } }));

    // Set as active connection
    dispatch(setActiveConnection(connectionId));
  };

  const handleWifiConnect = async () => {
    const connectionId = `network-${Date.now()}`;
    const url = wifiAddress.trim();
    const wifiConnection = new WebSocketConnection({ id: connectionId, protocol: selectedProtocol, url });

    wifiConnection.onStatusChange((status: ConnectionStatus, errorMsg?: string) => {
      dispatch(setConnectionStatus({ id: connectionId, status, errorMessage: errorMsg }));
    });

    dispatch(addConnection({
      id: connectionId,
      type: 'network',
      protocol: selectedProtocol,
      status: 'connecting',
      name: `Wi-Fi ${selectedProtocol} (${url})`,
      lastDataReceived: null,
      errorMessage: null
    }));

    dataServiceRef.current?.wireConnection(wifiConnection, selectedProtocol);
    try {
      await wifiConnection.connect();
    } catch (err) {
      // Nothing to keep: the address is wrong or nothing answers there
      dispatch(removeConnection(connectionId));
      throw err;
    }
    connectionRegistry.add(wifiConnection);
    dispatch(setActiveConnection(connectionId));
    // Remember the address that worked
    if (url !== savedWifiUrl) {
      void dispatch(updateSetting({ key: 'instrumentWebSocketUrl', value: url }));
    }
  };

  const handleTcpConnect = async () => {
    const connectionId = `network-${Date.now()}`;
    const host = tcpHost.trim();
    const port = Number(tcpPort);
    // Read-only, like the bridge: nothing is sent to the autopilot
    const tcpConnection = new NativeTcpConnection({ id: connectionId, protocol: selectedProtocol, host, port });

    tcpConnection.onStatusChange((status: ConnectionStatus, errorMsg?: string) => {
      dispatch(setConnectionStatus({ id: connectionId, status, errorMessage: errorMsg }));
    });

    dispatch(addConnection({
      id: connectionId,
      type: 'network',
      protocol: selectedProtocol,
      status: 'connecting',
      name: `Wi-Fi ${selectedProtocol} (${tcpConnection.address})`,
      lastDataReceived: null,
      errorMessage: null
    }));

    dataServiceRef.current?.wireConnection(tcpConnection, selectedProtocol);
    try {
      await tcpConnection.connect();
    } catch (err) {
      dispatch(removeConnection(connectionId));
      throw err;
    }
    connectionRegistry.add(tcpConnection);
    dispatch(setActiveConnection(connectionId));
    // Remember the address that worked
    if (host !== savedTcpHost) void dispatch(updateSetting({ key: 'instrumentTcpHost', value: host }));
    if (port !== savedTcpPort) void dispatch(updateSetting({ key: 'instrumentTcpPort', value: port }));
  };

  const handleStubConnect = async () => {
    const connectionId = `stub-${Date.now()}`;
    const stubConnection = new StubConnection({ id: connectionId, protocol: selectedProtocol });

    stubConnection.onStatusChange((status: ConnectionStatus, errorMsg?: string) => {
      dispatch(setConnectionStatus({ id: connectionId, status, errorMessage: errorMsg }));
    });

    dispatch(addConnection({
      id: connectionId,
      type: 'stub',
      protocol: selectedProtocol,
      status: 'connecting',
      name: `Simulator ${selectedProtocol}`,
      lastDataReceived: null,
      errorMessage: null
    }));

    // Wire before connecting: the stub sends its first data on connect
    dataServiceRef.current?.wireConnection(stubConnection, selectedProtocol);
    connectionRegistry.add(stubConnection);
    dispatch(setActiveConnection(connectionId));
    await stubConnection.connect();
  };

  const handleDisconnect = async (connectionId: string) => {
    const connection = connectionRegistry.get(connectionId);

    try {
      // A connection from an earlier session of the app has no live object left
      await connection?.disconnect();
      connectionRegistry.remove(connectionId);

      // Remove from Redux store
      dispatch(removeConnection(connectionId));

      // Clear active connection if this was it
      if (activeConnectionId === connectionId) {
        dispatch(setActiveConnection(null));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to disconnect';
      setError(errorMsg);
      console.error('Disconnect error:', err);
    }
  };

  const getStatusColor = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50';
      case 'connecting':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected':
        return '●';
      case 'connecting':
        return '◐';
      case 'error':
        return '✕';
      default:
        return '○';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Controls */}
      <div className="bg-surface p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Connect Instrument
        </h3>

        <div className="space-y-4">
          {/* Connection Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Connection Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setConnectionType('serial')}
                disabled={!isSerialSupported}
                className={`flex-1 px-4 py-2 rounded-md border-2 transition-colors ${
                  connectionType === 'serial'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-surface text-gray-700 hover:bg-gray-50'
                } ${!isSerialSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                USB Serial
                {!isSerialSupported && <span className="block text-xs">(Not supported)</span>}
              </button>
              <button
                onClick={() => setConnectionType('bluetooth')}
                disabled={!isBluetoothSupported}
                className={`flex-1 px-4 py-2 rounded-md border-2 transition-colors ${
                  connectionType === 'bluetooth'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-surface text-gray-700 hover:bg-gray-50'
                } ${!isBluetoothSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Bluetooth
                {!isBluetoothSupported && <span className="block text-xs">(Not supported)</span>}
              </button>
              <button
                onClick={() => setConnectionType('network')}
                className={`flex-1 px-4 py-2 rounded-md border-2 transition-colors ${
                  connectionType === 'network'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-surface text-gray-700 hover:bg-gray-50'
                }`}
              >
                Wi-Fi
              </button>
              <button
                onClick={() => setConnectionType('stub')}
                className={`flex-1 px-4 py-2 rounded-md border-2 transition-colors ${
                  connectionType === 'stub'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-surface text-gray-700 hover:bg-gray-50'
                }`}
              >
                Simulator
              </button>
            </div>
          </div>

          {connectionType === 'network' && nativeTcp && (
            <div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label htmlFor="wifi-host" className="block text-sm font-medium text-gray-700 mb-2">
                    Host
                  </label>
                  <input
                    id="wifi-host"
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    value={tcpHost}
                    onChange={(e) => setTcpHostInput(e.target.value)}
                    placeholder="192.168.14.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="w-28">
                  <label htmlFor="wifi-port" className="block text-sm font-medium text-gray-700 mb-2">
                    Port
                  </label>
                  <input
                    id="wifi-port"
                    type="number"
                    min={1}
                    max={65535}
                    value={tcpPort}
                    onChange={(e) => setTcpPortInput(e.target.value)}
                    placeholder="20220"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                The NMEA 0183 server (TCP) of a Wi-Fi gateway or autopilot. For the Pcnautic
                autopilot: join its Wi-Fi (<code>pcnautic_AP</code>) and connect to{' '}
                <code>192.168.14.1</code> port <code>20220</code>. OpenSail only reads; it sends
                nothing to the autopilot.
              </p>
            </div>
          )}

          {connectionType === 'network' && !nativeTcp && (
            <div>
              <label htmlFor="wifi-address" className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <input
                id="wifi-address"
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={wifiAddress}
                onChange={(e) => setWifiUrl(e.target.value)}
                placeholder="ws://localhost:10110"
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Browsers can't open the TCP connection most Wi-Fi gateways use. Join the boat's
                Wi-Fi, start the OpenSail bridge on this device (for a Pcnautic autopilot:{' '}
                <code>node tools/opensail-bridge/bridge.mjs</code>) and connect to{' '}
                <code>ws://localhost:10110</code>. A gateway that offers WebSocket itself can be
                entered directly.
              </p>
            </div>
          )}

          {/* Protocol Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Protocol
            </label>
            <select
              value={selectedProtocol}
              onChange={(e) => setSelectedProtocol(e.target.value as ProtocolType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="NMEA0183">NMEA 0183 (4800 baud)</option>
              <option value="NMEA2000">NMEA 2000 (250k baud)</option>
              <option value="SeaTalk">SeaTalk (Raymarine)</option>
            </select>
          </div>

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={(connectionType === 'serial' && !isSerialSupported) || (connectionType === 'bluetooth' && !isBluetoothSupported)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connectionType === 'serial'
              ? 'Connect to USB Port'
              : connectionType === 'bluetooth'
                ? 'Connect to Bluetooth Device'
                : connectionType === 'network'
                  ? 'Connect over Wi-Fi'
                  : 'Start Simulator'}
          </button>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Connections */}
      {connections.length > 0 && (
        <div className="bg-surface p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Active Connections
          </h3>

          <div className="space-y-3">
            {connections.map((conn: InstrumentConnection) => (
              <div
                key={conn.id}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  conn.id === activeConnectionId
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-lg ${getStatusColor(conn.status)}`}>
                        {getStatusIcon(conn.status)}
                      </span>
                      <h4 className="font-medium text-gray-900">{conn.name}</h4>
                      <span className="text-xs text-gray-500 uppercase">
                        {conn.protocol}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-medium ${getStatusColor(conn.status)}`}>
                          {conn.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Last data:</span>
                        <span className="text-gray-900">
                          {formatTimestamp(conn.lastDataReceived)}
                        </span>
                      </div>

                      {conn.errorMessage && (
                        <div className="text-red-600 mt-2">
                          Error: {conn.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDisconnect(conn.id)}
                    className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
                {conn.type === 'stub' && <StubControls connectionId={conn.id} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Received Data Display */}
      {activeConnectionId && Object.keys(dataStreams).length > 0 && (
        <div className="bg-surface p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Received Data
          </h3>

          <div className="space-y-3">
            {Object.entries(dataStreams).map(([type, data]) => {
              const dataArray = data as InstrumentData[];
              const latest = dataArray[dataArray.length - 1];
              if (!latest) return null;

              return (
                <div key={type} className="p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700 uppercase">
                        {type}
                      </span>
                      <div className="text-lg font-semibold text-gray-900 mt-1">
                        {typeof latest.value === 'object'
                          ? JSON.stringify(latest.value)
                          : `${latest.value} ${latest.unit}`}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(latest.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          Connection Tips
        </h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>USB: Connect your instrument before clicking "Connect to USB Port"</li>
          <li>Bluetooth: Make sure your device is powered on and in pairing mode</li>
          <li>Wi-Fi: join the boat's Wi-Fi network first; the connection comes back by itself when the Wi-Fi drops</li>
          <li>Select the correct protocol for your instrument</li>
          <li>NMEA 0183 is the most common protocol (4800 baud)</li>
          <li>Simulator: generates real NMEA 0183, NMEA 2000 or SeaTalk data for testing without a boat</li>
          <li>You may need to grant permission to access the device</li>
        </ul>
        {(!isSerialSupported || !isBluetoothSupported) && (
          <div className="mt-3 pt-3 border-t border-blue-300">
            <p className="text-sm text-blue-900 font-medium">Browser Compatibility:</p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside mt-1">
              {!isSerialSupported && <li>USB Serial: Not supported in this browser</li>}
              {!isBluetoothSupported && <li>Bluetooth: Not supported in this browser</li>}
              <li>Chrome/Edge 89+ recommended for full support</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
