/**
 * SerialConnection - Web Serial API wrapper for USB instrument connections
 * 
 * Provides a clean interface for connecting to marine instruments via USB
 * using the Web Serial API (Chrome/Edge only).
 */

import type { ProtocolType } from '@/store/slices/instrumentsSlice';
import { errorHandler } from '../ErrorHandler';

export interface SerialConnectionConfig {
  baudRate?: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  flowControl?: 'none' | 'hardware';
  bufferSize?: number;
}

export interface SerialConnectionOptions {
  id: string;
  protocol: ProtocolType;
  config?: SerialConnectionConfig;
}

export type SerialConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export class SerialConnection {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private isReading = false;
  private buffer = '';
  
  public readonly id: string;
  public readonly protocol: ProtocolType;
  public status: SerialConnectionStatus = 'disconnected';
  public errorMessage: string | null = null;
  
  private config: Required<SerialConnectionConfig>;
  private dataCallback: ((data: string) => void) | null = null;
  private statusCallback: ((status: SerialConnectionStatus, error?: string) => void) | null = null;

  constructor(options: SerialConnectionOptions) {
    this.id = options.id;
    this.protocol = options.protocol;
    
    // Default configuration for NMEA instruments
    this.config = {
      baudRate: options.config?.baudRate ?? 4800,
      dataBits: options.config?.dataBits ?? 8,
      stopBits: options.config?.stopBits ?? 1,
      parity: options.config?.parity ?? 'none',
      flowControl: options.config?.flowControl ?? 'none',
      bufferSize: options.config?.bufferSize ?? 255
    };
  }

  /**
   * Check if Web Serial API is supported in the current browser
   */
  static isSupported(): boolean {
    return 'serial' in navigator;
  }

  /**
   * Request user to select a serial port
   */
  async requestPort(): Promise<SerialPort> {
    if (!SerialConnection.isSupported()) {
      const error = new Error('Web Serial API is not supported in this browser');
      error.name = 'NotSupportedError';
      throw error;
    }

    try {
      const port = await navigator.serial.requestPort();
      return port;
    } catch (error) {
      if (error instanceof Error) {
        errorHandler.handleDeviceError(error, 'SerialConnection.requestPort', 'serial');
        throw error;
      }
      throw new Error('Failed to request serial port');
    }
  }

  /**
   * Get list of previously authorized ports
   */
  static async getPorts(): Promise<SerialPort[]> {
    if (!SerialConnection.isSupported()) {
      return [];
    }
    return await navigator.serial.getPorts();
  }

  /**
   * Connect to a serial port
   */
  async connect(port?: SerialPort): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      throw new Error('Already connected or connecting');
    }

    this.updateStatus('connecting');

    try {
      // Use provided port or request a new one
      this.port = port ?? await this.requestPort();

      // Open the port with configuration
      await this.port.open({
        baudRate: this.config.baudRate,
        dataBits: this.config.dataBits,
        stopBits: this.config.stopBits,
        parity: this.config.parity,
        flowControl: this.config.flowControl
      });

      // Set up reader and writer
      if (this.port.readable) {
        this.reader = this.port.readable.getReader();
      }
      
      if (this.port.writable) {
        this.writer = this.port.writable.getWriter();
      }

      this.updateStatus('connected');
      
      // Start reading data
      this.startReading();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateStatus('error', errorMsg);
      
      if (error instanceof Error) {
        errorHandler.handleDeviceError(error, 'SerialConnection.connect', 'serial');
      }
      
      throw new Error(`Failed to connect: ${errorMsg}`);
    }
  }

  /**
   * Disconnect from the serial port
   */
  async disconnect(): Promise<void> {
    this.isReading = false;

    try {
      // Release reader
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }

      // Release writer
      if (this.writer) {
        await this.writer.close();
        this.writer.releaseLock();
        this.writer = null;
      }

      // Close port
      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      this.buffer = '';
      this.updateStatus('disconnected');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateStatus('error', errorMsg);
      throw new Error(`Failed to disconnect: ${errorMsg}`);
    }
  }

  /**
   * Register callback for received data
   */
  onData(callback: (data: string) => void): void {
    this.dataCallback = callback;
  }

  /**
   * Register callback for status changes
   */
  onStatusChange(callback: (status: SerialConnectionStatus, error?: string) => void): void {
    this.statusCallback = callback;
  }

  /**
   * Write data to the serial port
   */
  async write(data: string): Promise<void> {
    if (!this.writer) {
      throw new Error('Port is not open for writing');
    }

    try {
      const encoder = new TextEncoder();
      await this.writer.write(encoder.encode(data));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to write data: ${errorMsg}`);
    }
  }

  /**
   * Get port information
   */
  getPortInfo(): SerialPortInfo | null {
    return this.port?.getInfo() ?? null;
  }

  /**
   * Start reading data from the serial port
   */
  private async startReading(): Promise<void> {
    if (!this.reader || this.isReading) {
      return;
    }

    this.isReading = true;
    const decoder = new TextDecoder();

    try {
      while (this.isReading && this.reader) {
        const { value, done } = await this.reader.read();

        if (done) {
          break;
        }

        if (value) {
          // Decode bytes to string
          const chunk = decoder.decode(value, { stream: true });
          this.buffer += chunk;

          // Process complete lines
          this.processBuffer();
        }
      }
    } catch (error) {
      if (this.isReading) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.updateStatus('error', errorMsg);
      }
    } finally {
      this.isReading = false;
    }
  }

  /**
   * Process buffered data and extract complete sentences
   */
  private processBuffer(): void {
    // Split by newline characters
    const lines = this.buffer.split(/\r?\n/);
    
    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() || '';

    // Process complete lines
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && this.dataCallback) {
        this.dataCallback(trimmed);
      }
    }
  }

  /**
   * Update connection status
   */
  private updateStatus(status: SerialConnectionStatus, error?: string): void {
    this.status = status;
    this.errorMessage = error ?? null;
    
    if (this.statusCallback) {
      this.statusCallback(status, error);
    }
  }
}
