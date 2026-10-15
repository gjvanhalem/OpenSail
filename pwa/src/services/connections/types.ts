import type { ProtocolType } from '@/store/slices/instrumentsSlice';

export type DataConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * What every instrument connection offers, whether it talks to hardware
 * (serial, Bluetooth) or simulates it (stub): one line of protocol data per
 * onData call, NMEA 0183 sentences or hex-encoded NMEA 2000 / SeaTalk frames.
 */
export interface InstrumentDataConnection {
  readonly id: string;
  readonly protocol: ProtocolType;
  status: DataConnectionStatus;
  errorMessage: string | null;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onData(callback: (data: string) => void): void;
  onStatusChange(callback: (status: DataConnectionStatus, error?: string) => void): void;
}
