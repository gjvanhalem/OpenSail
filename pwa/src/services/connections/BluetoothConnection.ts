/**
 * BluetoothConnection - Web Bluetooth API wrapper for Bluetooth instrument connections
 * 
 * Provides a clean interface for connecting to marine instruments via Bluetooth
 * using the Web Bluetooth API (Chrome/Edge/Safari limited).
 */

import type { ProtocolType } from '@/store/slices/instrumentsSlice';
import { errorHandler } from '../ErrorHandler';

export interface BluetoothConnectionOptions {
  id: string;
  protocol: ProtocolType;
  serviceUuid?: string;
  characteristicUuid?: string;
}

export type BluetoothConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Standard Bluetooth GATT service UUIDs for marine instruments
const MARINE_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb'; // Generic marine data service
const MARINE_CHARACTERISTIC_UUID = '0000fff1-0000-1000-8000-00805f9b34fb'; // Generic marine data characteristic

export class BluetoothConnection {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private buffer = '';
  
  public readonly id: string;
  public readonly protocol: ProtocolType;
  public status: BluetoothConnectionStatus = 'disconnected';
  public errorMessage: string | null = null;
  
  private serviceUuid: string;
  private characteristicUuid: string;
  private dataCallback: ((data: string) => void) | null = null;
  private statusCallback: ((status: BluetoothConnectionStatus, error?: string) => void) | null = null;

  constructor(options: BluetoothConnectionOptions) {
    this.id = options.id;
    this.protocol = options.protocol;
    this.serviceUuid = options.serviceUuid ?? MARINE_SERVICE_UUID;
    this.characteristicUuid = options.characteristicUuid ?? MARINE_CHARACTERISTIC_UUID;
  }

  /**
   * Check if Web Bluetooth API is supported in the current browser
   */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Request user to select a Bluetooth device
   */
  async requestDevice(): Promise<BluetoothDevice> {
    if (!BluetoothConnection.isSupported()) {
      const error = new Error('Web Bluetooth API is not supported in this browser');
      error.name = 'NotSupportedError';
      throw error;
    }

    try {
      // Request device with optional services
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [this.serviceUuid] }
        ],
        optionalServices: [this.serviceUuid]
      });

      return device;
    } catch (error) {
      if (error instanceof Error) {
        errorHandler.handleDeviceError(error, 'BluetoothConnection.requestDevice', 'bluetooth');
        throw error;
      }
      throw new Error('Failed to request Bluetooth device');
    }
  }

  /**
   * Get list of previously paired devices
   */
  static async getDevices(): Promise<BluetoothDevice[]> {
    if (!BluetoothConnection.isSupported()) {
      return [];
    }
    
    try {
      // Note: getDevices() requires the Web Bluetooth Scanning API
      // which may not be available in all browsers
      if ('getDevices' in navigator.bluetooth && navigator.bluetooth.getDevices) {
        return await navigator.bluetooth.getDevices();
      }
      return [];
    } catch (error) {
      console.warn('Failed to get Bluetooth devices:', error);
      return [];
    }
  }

  /**
   * Connect to a Bluetooth device
   */
  async connect(device?: BluetoothDevice): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      throw new Error('Already connected or connecting');
    }

    this.updateStatus('connecting');

    try {
      // Use provided device or request a new one
      this.device = device ?? await this.requestDevice();

      // Set up disconnect handler
      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));

      // Connect to GATT server
      this.server = await this.device.gatt!.connect();

      // Get the service
      const service = await this.server.getPrimaryService(this.serviceUuid);

      // Get the characteristic
      this.characteristic = await service.getCharacteristic(this.characteristicUuid);

      // Start notifications
      await this.characteristic.startNotifications();

      // Add event listener for characteristic value changes
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged.bind(this));

      this.updateStatus('connected');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateStatus('error', errorMsg);
      
      if (error instanceof Error) {
        errorHandler.handleDeviceError(error, 'BluetoothConnection.connect', 'bluetooth');
      }
      
      throw new Error(`Failed to connect: ${errorMsg}`);
    }
  }

  /**
   * Disconnect from the Bluetooth device
   */
  async disconnect(): Promise<void> {
    try {
      // Stop notifications
      if (this.characteristic) {
        try {
          await this.characteristic.stopNotifications();
          this.characteristic.removeEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged.bind(this));
        } catch (error) {
          console.warn('Error stopping notifications:', error);
        }
        this.characteristic = null;
      }

      // Disconnect from GATT server
      if (this.server && this.server.connected) {
        this.server.disconnect();
      }
      this.server = null;

      // Remove disconnect handler
      if (this.device) {
        this.device.removeEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));
      }
      this.device = null;

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
  onStatusChange(callback: (status: BluetoothConnectionStatus, error?: string) => void): void {
    this.statusCallback = callback;
  }

  /**
   * Write data to the Bluetooth characteristic
   */
  async write(data: string): Promise<void> {
    if (!this.characteristic) {
      throw new Error('Not connected to a characteristic');
    }

    try {
      const encoder = new TextEncoder();
      await this.characteristic.writeValue(encoder.encode(data));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to write data: ${errorMsg}`);
    }
  }

  /**
   * Get device information
   */
  getDeviceInfo(): { name: string | undefined; id: string | undefined } | null {
    if (!this.device) {
      return null;
    }
    return {
      name: this.device.name,
      id: this.device.id
    };
  }

  /**
   * Handle characteristic value changes (incoming data)
   */
  private handleCharacteristicValueChanged(event: Event): void {
    const target = event.target;
    if (!target) {
      return;
    }
    
    const characteristic = target as unknown as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;
    
    if (!value) {
      return;
    }

    // Decode bytes to string
    const decoder = new TextDecoder();
    const chunk = decoder.decode(value);
    this.buffer += chunk;

    // Process complete lines
    this.processBuffer();
  }

  /**
   * Handle device disconnection
   */
  private handleDisconnect(): void {
    console.log('Bluetooth device disconnected');
    this.updateStatus('disconnected');
    
    // Attempt reconnection after a delay
    setTimeout(() => {
      if (this.status === 'disconnected' && this.device) {
        console.log('Attempting to reconnect...');
        this.reconnect();
      }
    }, 3000);
  }

  /**
   * Attempt to reconnect to the device
   */
  private async reconnect(): Promise<void> {
    if (!this.device) {
      return;
    }

    try {
      await this.connect(this.device);
      console.log('Reconnected successfully');
    } catch (error) {
      console.error('Reconnection failed:', error);
      // Will try again on next disconnect event
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
  private updateStatus(status: BluetoothConnectionStatus, error?: string): void {
    this.status = status;
    this.errorMessage = error ?? null;
    
    if (this.statusCallback) {
      this.statusCallback(status, error);
    }
  }
}
