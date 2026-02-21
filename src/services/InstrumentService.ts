import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import * as net from 'net';
import { Store } from '@reduxjs/toolkit';
import {
  InstrumentService,
  InstrumentConfig,
  InstrumentData,
  InstrumentDataType,
  Subscription,
  DataCallback,
  ConnectionConfig
} from '../types';
import { NMEA0183Parser } from '../protocols/NMEA0183Parser';
import { NMEA2000Parser } from '../protocols/NMEA2000Parser';
import { SeaTalkParser } from '../protocols/SeaTalkParser';
import { ProtocolStubSimulator, createProtocolStub } from '../protocols/ProtocolStub';
import {
  setConnectionStatus,
  setStubMode as setStubModeAction,
  updateInstrumentData,
  setError,
  disconnect as disconnectAction,
} from '../store/slices/instrumentSlice';

interface Subscriber {
  id: string;
  dataType: InstrumentDataType | null;
  callback: DataCallback;
}

export class InstrumentServiceImpl implements InstrumentService {
  private config: InstrumentConfig | null = null;
  private isConnected = false;
  private useStub = false;
  private store: Store | null = null;

  private readonly nmea0183Parser = new NMEA0183Parser();
  private readonly nmea2000Parser = new NMEA2000Parser();
  private readonly seatalkParser = new SeaTalkParser();
  private stub: ProtocolStubSimulator | null = null;

  // Physical connection objects
  private serialPort: SerialPort | null = null;
  private networkSocket: net.Socket | null = null;
  private serialParser: ReadlineParser | null = null;

  private readonly subscribers: Subscriber[] = [];
  private readonly dataSubject = new BehaviorSubject<InstrumentData | null>(null);

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  setStore(store: Store): void {
    this.store = store;
  }

  async connect(config: InstrumentConfig): Promise<void> {
    if (this.isConnected) {
      await this.disconnect();
    }

    this.config = config;
    this.useStub = config.useStub ?? false;

    if (this.store) {
      this.store.dispatch(setConnectionStatus('connecting'));
    }

    try {
      if (this.useStub) {
        await this.connectStub(config);
      } else {
        await this.connectPhysical(config);
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;

      if (this.store) {
        this.store.dispatch(setConnectionStatus('connected'));
      }
    } catch (error) {
      if (this.store) {
        this.store.dispatch(setConnectionStatus('error'));
        this.store.dispatch(setError(error instanceof Error ? error.message : 'Connection failed'));
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Close serial port
    if (this.serialPort && this.serialPort.isOpen) {
      await new Promise<void>((resolve, reject) => {
        this.serialPort!.close(err => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.serialPort = null;
      this.serialParser = null;
    }

    // Close network socket
    if (this.networkSocket) {
      this.networkSocket.destroy();
      this.networkSocket = null;
    }

    // Stop stub
    if (this.stub) {
      this.stub.stop();
      this.stub = null;
    }

    this.isConnected = false;
    this.config = null;

    if (this.store) {
      this.store.dispatch(disconnectAction());
    }
  }

  subscribe(dataType: InstrumentDataType | null, callback: DataCallback): Subscription {
    const id = uuidv4();
    const subscriber: Subscriber = { id, dataType, callback };
    this.subscribers.push(subscriber);

    return {
      unsubscribe: () => {
        const index = this.subscribers.findIndex(s => s.id === id);
        if (index !== -1) {
          this.subscribers.splice(index, 1);
        }
      }
    };
  }

  getLatestData(dataType: InstrumentDataType): InstrumentData | null {
    const latest = this.dataSubject.getValue();
    if (latest && latest.type === dataType) {
      return latest;
    }
    return null;
  }

  setStubMode(enabled: boolean): void {
    this.useStub = enabled;

    if (this.store) {
      this.store.dispatch(setStubModeAction(enabled));
    }

    if (enabled && !this.stub) {
      this.stub = createProtocolStub() as ProtocolStubSimulator;
      this.connectStubToData();
    }

    if (enabled && this.stub && this.config) {
      // Set a default scenario for testing
      import('../protocols/ProtocolStub').then(({ testScenarios }) => {
        if (this.stub) {
          this.stub.setScenario(testScenarios.coastalNavigation);
        }
      });

      this.stub.start({
        protocols: ['nmea0183', 'nmea2000', 'seatalk'],
        updateRate: 1,
        outputMode: 'callback'
      });
    }
  }

  isStubEnabled(): boolean {
    return this.useStub;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  private async connectStub(config: InstrumentConfig): Promise<void> {
    this.stub = createProtocolStub() as ProtocolStubSimulator;
    this.connectStubToData();

    // Set a default scenario for testing
    const { testScenarios } = await import('../protocols/ProtocolStub');
    this.stub.setScenario(testScenarios.coastalNavigation);

    this.stub.start({
      protocols:
        config.protocol === 'seatalk'
          ? ['seatalk']
          : config.protocol === 'nmea2000'
            ? ['nmea2000']
            : ['nmea0183'],
      updateRate: 1,
      outputMode: 'callback'
    });
  }

  private connectStubToData(): void {
    if (!this.stub) return;

    this.stub.getDataStream().subscribe(data => {
      this.distributeData(data);
    });
  }

  private async connectPhysical(config: InstrumentConfig): Promise<void> {
    console.log(`Connecting to instrument via ${config.connection.type}`);

    if (config.connection.type === 'serial') {
      await this.connectSerial(config);
    } else if (config.connection.type === 'network') {
      await this.connectNetwork(config);
    }
  }

  private async connectSerial(config: InstrumentConfig): Promise<void> {
    if (config.connection.type !== 'serial') {
      throw new Error('Invalid connection type for serial connection');
    }

    const { port } = config.connection;
    const baudRate = config.baudRate || 4800;

    try {
      console.log(`Opening serial port: ${port} at ${baudRate} baud`);

      this.serialPort = new SerialPort({
        path: port,
        baudRate: baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        autoOpen: false,
      });

      // Open the port
      await new Promise<void>((resolve, reject) => {
        this.serialPort!.open(err => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log(`Serial port ${port} opened successfully`);

      // Set up parser for NMEA0183 (line-based)
      if (config.protocol === 'nmea0183') {
        this.serialParser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));
        this.serialParser.on('data', (line: string) => {
          this.processNMEA0183(line);
        });
      } else {
        // For NMEA2000 and SeaTalk, read raw binary data
        this.serialPort.on('data', (data: Buffer) => {
          if (config.protocol === 'nmea2000') {
            this.processNMEA2000(data);
          } else if (config.protocol === 'seatalk') {
            this.processSeaTalk(data);
          }
        });
      }

      // Handle errors
      this.serialPort.on('error', err => {
        console.error('Serial port error:', err);
        this.handleConnectionError(err);
      });

      // Handle close
      this.serialPort.on('close', () => {
        console.log('Serial port closed');
        this.isConnected = false;
        this.scheduleReconnect();
      });
    } catch (error) {
      console.error('Failed to open serial port:', error);
      throw new Error(`Serial connection failed: ${error}`);
    }
  }

  private async connectNetwork(config: InstrumentConfig): Promise<void> {
    if (config.connection.type !== 'network') {
      throw new Error('Invalid connection type for network connection');
    }

    const { host, port } = config.connection;

    try {
      console.log(`Connecting to ${host}:${port}`);

      this.networkSocket = new net.Socket();

      // Set up data handler
      let buffer = '';
      this.networkSocket.on('data', (data: Buffer) => {
        if (config.protocol === 'nmea0183') {
          // NMEA0183 is text-based, accumulate lines
          buffer += data.toString();
          const lines = buffer.split('\r\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim()) {
              this.processNMEA0183(line.trim());
            }
          }
        } else if (config.protocol === 'nmea2000') {
          this.processNMEA2000(data);
        } else if (config.protocol === 'seatalk') {
          this.processSeaTalk(data);
        }
      });

      // Handle connection
      this.networkSocket.on('connect', () => {
        console.log(`Connected to ${host}:${port}`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      // Handle errors
      this.networkSocket.on('error', err => {
        console.error('Network socket error:', err);
        this.handleConnectionError(err);
      });

      // Handle close
      this.networkSocket.on('close', () => {
        console.log('Network socket closed');
        this.isConnected = false;
        this.scheduleReconnect();
      });

      // Connect
      await new Promise<void>((resolve, reject) => {
        this.networkSocket!.connect(port, host, () => {
          resolve();
        });
        this.networkSocket!.once('error', reject);
      });
    } catch (error) {
      console.error('Failed to connect to network:', error);
      throw new Error(`Network connection failed: ${error}`);
    }
  }

  private handleConnectionError(error: Error): void {
    console.error('Connection error:', error);
    this.isConnected = false;

    if (this.store) {
      this.store.dispatch(setConnectionStatus('error'));
      this.store.dispatch(setError(error.message));
    }

    // Notify subscribers of connection loss
    // Could emit a special error event here
  }

  processData(data: string | Buffer, protocol: 'nmea0183' | 'nmea2000' | 'seatalk'): void {
    if (!this.isConnected) return;

    if (protocol === 'nmea0183' && typeof data === 'string') {
      this.processNMEA0183(data);
    } else if (protocol === 'nmea2000' && Buffer.isBuffer(data)) {
      this.processNMEA2000(data);
    } else if (protocol === 'seatalk' && Buffer.isBuffer(data)) {
      this.processSeaTalk(data);
    }
  }

  private processNMEA0183(sentence: string): void {
    const message = this.nmea0183Parser.parse(sentence);
    if (!message) return;

    const instrumentData = this.nmea0183Parser.parseToInstrumentData(message);
    if (instrumentData) {
      this.distributeData(instrumentData);
    }
  }

  private processNMEA2000(data: Buffer): void {
    const message = this.nmea2000Parser.parse(data);
    if (!message) return;

    const instrumentData = this.nmea2000Parser.parseToInstrumentData(message);
    if (instrumentData) {
      this.distributeData(instrumentData);
    }
  }

  private processSeaTalk(data: Buffer): void {
    const message = this.seatalkParser.parse(data);
    if (!message) return;

    const instrumentData = this.seatalkParser.parseToInstrumentData(message);
    if (instrumentData) {
      this.distributeData(instrumentData);
    }
  }

  private distributeData(data: InstrumentData): void {
    this.dataSubject.next(data);

    // Dispatch to Redux store
    if (this.store) {
      this.store.dispatch(updateInstrumentData(data));
    }

    for (const subscriber of this.subscribers) {
      if (subscriber.dataType === null || subscriber.dataType === data.type) {
        try {
          subscriber.callback(data);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

      if (this.config) {
        try {
          await this.connect(this.config);
        } catch (error) {
          console.error('Reconnection failed:', error);
          this.scheduleReconnect();
        }
      }
    }, this.reconnectInterval);
  }
}

export const createInstrumentService = (): InstrumentService => {
  return new InstrumentServiceImpl();
};
