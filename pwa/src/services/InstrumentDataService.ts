/**
 * InstrumentDataService - Connects protocol parsers to serial data streams
 * 
 * This service wires up the NMEA0183, NMEA2000, and SeaTalk parsers to
 * serial connections and dispatches parsed data to the Redux store.
 */

import { NMEA0183Parser, NMEA2000Parser, SeaTalkParser } from '@/protocols';
import type { BluetoothConnection, InstrumentDataConnection } from '@/services/connections';
import { addInstrumentData } from '@/store/slices/instrumentsSlice';
import { reportNavigation } from '@/store/slices/navigationSlice';
import {
  hasNavigationValues,
  normalizeNavigationData,
} from '@/store/slices/navigationNormalization';
import type { ProtocolType } from '@/store/slices/instrumentsSlice';
import { InstrumentDataType, type InstrumentData } from '@/models';
import type { AppDispatch, RootState } from '@/store';

export class InstrumentDataService {
  private nmea0183Parser: NMEA0183Parser;
  private nmea2000Parser: NMEA2000Parser;
  private seaTalkParser: SeaTalkParser;
  private dispatch: AppDispatch;
  /** Magnetic variation last sent by an instrument (RMC, HDG), east positive */
  private instrumentVariation: number | null = null;

  constructor(dispatch: AppDispatch) {
    this.dispatch = dispatch;
    this.nmea0183Parser = new NMEA0183Parser();
    this.nmea2000Parser = new NMEA2000Parser();
    this.seaTalkParser = new SeaTalkParser();
  }

  /**
   * Wire a connection (serial, Bluetooth or stub) to the appropriate protocol parser
   */
  wireConnection(connection: Pick<InstrumentDataConnection, 'onData'>, protocol: ProtocolType): void {
    connection.onData((data: string) => {
      this.handleData(data, protocol);
    });
  }

  /**
   * Wire a Bluetooth connection to the appropriate protocol parser
   */
  wireBluetoothConnection(connection: BluetoothConnection, protocol: ProtocolType): void {
    connection.onData((data: string) => {
      this.handleData(data, protocol);
    });
  }

  /**
   * Handle incoming data based on protocol type
   */
  private handleData(data: string, protocol: ProtocolType): void {
    try {
      switch (protocol) {
        case 'NMEA0183':
          this.handleNMEA0183(data);
          break;
        case 'NMEA2000':
          this.handleNMEA2000(data);
          break;
        case 'SeaTalk':
          this.handleSeaTalk(data);
          break;
        default:
          console.warn(`Unknown protocol: ${protocol}`);
      }
    } catch (error) {
      console.error(`Error parsing ${protocol} data:`, error);
    }
  }

  /**
   * Parse and dispatch NMEA0183 data
   */
  private handleNMEA0183(sentence: string): void {
    // Validate the sentence
    if (!this.nmea0183Parser.validate(sentence)) {
      console.debug('Invalid NMEA0183 sentence:', sentence);
      return;
    }

    // Parse the sentence
    const message = this.nmea0183Parser.parse(sentence);
    if (!message) {
      return;
    }

    // Convert to instrument data
    const instrumentData = this.nmea0183Parser.parseToInstrumentData(message);
    if (instrumentData) {
      this.dispatchInstrumentData(instrumentData);
    }
  }

  /**
   * Parse and dispatch NMEA2000 data
   */
  private handleNMEA2000(data: string): void {
    // NMEA2000 data comes as hex strings, convert to Uint8Array
    const bytes = this.hexStringToBytes(data);
    if (!bytes || bytes.length === 0) {
      return;
    }

    // Parse the message
    const message = this.nmea2000Parser.parse(bytes);
    if (!message) {
      return;
    }

    // Convert to instrument data
    const instrumentData = this.nmea2000Parser.parseToInstrumentData(message);
    if (instrumentData) {
      this.dispatchInstrumentData(instrumentData);
    }
  }

  /**
   * Parse and dispatch SeaTalk data
   */
  private handleSeaTalk(data: string): void {
    // SeaTalk data comes as hex bytes, either plain ("84 86 26 ...") or wrapped
    // by a SeaTalk-to-NMEA gateway as $STALK,84,86,26,...*hh
    const stalk = /^\$(STALK,([0-9A-Fa-f,]+))(?:\*([0-9A-Fa-f]{2}))?$/.exec(data.trim());
    if (stalk?.[3] && this.nmea0183Parser.calculateChecksum(stalk[1]) !== stalk[3].toUpperCase()) {
      console.debug('Invalid $STALK checksum:', data);
      return;
    }
    const bytes = this.hexStringToBytes(stalk ? stalk[2] : data);
    if (!bytes || bytes.length === 0) {
      return;
    }

    // Parse the message
    const message = this.seaTalkParser.parse(bytes);
    if (!message) {
      return;
    }

    // Convert to instrument data
    const instrumentData = this.seaTalkParser.parseToInstrumentData(message);
    if (instrumentData) {
      this.dispatchInstrumentData(instrumentData);
    }
  }

  /**
   * Dispatch instrument data to Redux store
   */
  private dispatchInstrumentData(data: InstrumentData): void {
    this.dispatch(addInstrumentData(data));

    // An instrument's own variation beats the setting
    const value = data.value as { variation?: unknown } | null;
    if (
      (data.type === InstrumentDataType.GPS || data.type === InstrumentDataType.Heading) &&
      typeof value?.variation === 'number' &&
      Number.isFinite(value.variation)
    ) {
      this.instrumentVariation = value.variation;
    }

    // Position, COG/SOG and heading also go to navigation, where the source
    // settings decide whether they win over GPS
    this.dispatch((dispatch: AppDispatch, getState: () => RootState) => {
      const settings = (getState() as Partial<RootState>).settings?.settings;
      const variation = this.instrumentVariation ?? settings?.magneticVariation ?? 0;
      const navigation = normalizeNavigationData(data, variation);
      if (hasNavigationValues(navigation)) {
        dispatch(reportNavigation('instrument', navigation));
      }
    });
  }

  /**
   * Convert hex string to Uint8Array
   */
  private hexStringToBytes(hex: string): Uint8Array | null {
    try {
      // Remove any whitespace and non-hex characters
      const cleaned = hex.replace(/[^0-9A-Fa-f]/g, '');
      
      // Must have even number of characters
      if (cleaned.length % 2 !== 0) {
        return null;
      }

      const bytes = new Uint8Array(cleaned.length / 2);
      for (let i = 0; i < cleaned.length; i += 2) {
        bytes[i / 2] = parseInt(cleaned.substring(i, i + 2), 16);
      }

      return bytes;
    } catch (error) {
      console.error('Error converting hex string to bytes:', error);
      return null;
    }
  }
}
