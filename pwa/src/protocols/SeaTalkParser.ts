import type { SeaTalkMessage, InstrumentData } from '../models';
import { InstrumentDataType } from '../models';

export class SeaTalkParser {
  private static readonly SUPPORTED_COMMANDS: Record<
    number,
    (data: Uint8Array) => InstrumentData | null
  > = {
    0x00: SeaTalkParser.parseDepth,
    0x10: SeaTalkParser.parseApparentWindAngle,
    0x11: SeaTalkParser.parseApparentWindSpeed,
    0x20: SeaTalkParser.parseSpeedThroughWater,
    0x84: SeaTalkParser.parseHeading
  };

  parse(data: Uint8Array): SeaTalkMessage | null {
    if (data.length < 2) return null;

    const command = this.getCommandByte(data);
    const commandData = data.slice(1);

    const interpretation: Record<string, unknown> = {};

    switch (command) {
      case 0x00:
        interpretation.depth = ((commandData[0] & 0x07) << 7) | (commandData[1] & 0x7f);
        interpretation.offset = ((commandData[2] & 0x0f) - 10) * 0.1;
        break;
      case 0x10:
        interpretation.windAngle =
          (((commandData[0] & 0x7f) << 1) | ((commandData[1] >> 7) & 1)) * 0.5;
        break;
      case 0x11:
        interpretation.windSpeed = ((commandData[0] & 0x3f) << 3) | ((commandData[1] >> 4) & 0x07);
        break;
      case 0x20:
        interpretation.speed = ((commandData[0] & 0x3f) << 4) | ((commandData[1] >> 4) & 0x0f);
        interpretation.trip = ((commandData[2] & 0x0f) << 8) | commandData[3];
        break;
      case 0x84:
        interpretation.heading = (((commandData[0] & 0x1f) << 7) | (commandData[1] & 0x7f)) * 0.5;
        interpretation.deviation = (commandData[2] & 0x7f) * 0.5 - 180;
        interpretation.variation = (commandData[3] & 0x7f) * 0.5 - 180;
        break;
    }

    return {
      command,
      data: commandData,
      interpretation,
      timestamp: Date.now()
    };
  }

  getCommandByte(data: Uint8Array): number {
    if (data.length < 1) return 0;
    return data[0];
  }

  parseToInstrumentData(message: SeaTalkMessage): InstrumentData | null {
    const parser = SeaTalkParser.SUPPORTED_COMMANDS[message.command];
    if (!parser) {
      return null;
    }
    return parser(message.data);
  }

  private static parseDepth(data: Uint8Array): InstrumentData | null {
    if (data.length < 3) return null;

    const depthRaw = ((data[0] & 0x07) << 7) | (data[1] & 0x7f);
    const depth = depthRaw * 0.1 + 0.2;
    const offset = ((data[2] & 0x0f) - 10) * 0.1;
    const alarm = (data[2] & 0x10) !== 0;

    return {
      type: InstrumentDataType.Depth,
      value: { depth: depth + offset, offset, alarm },
      unit: 'm',
      timestamp: Date.now(),
      source: 'seatalk'
    };
  }

  private static parseApparentWindAngle(data: Uint8Array): InstrumentData | null {
    if (data.length < 2) return null;

    const angleRaw = ((data[0] & 0x7f) << 1) | ((data[1] >> 7) & 1);
    const angle = angleRaw * 0.5;
    const direction = (data[1] & 0x40) !== 0 ? 'port' : 'starboard';

    return {
      type: InstrumentDataType.Wind,
      value: { angle, direction, reference: 'apparent' },
      unit: 'deg',
      timestamp: Date.now(),
      source: 'seatalk'
    };
  }

  private static parseApparentWindSpeed(data: Uint8Array): InstrumentData | null {
    if (data.length < 2) return null;

    const speedRaw = ((data[0] & 0x3f) << 3) | ((data[1] >> 4) & 0x07);
    const speed = speedRaw * 0.1;
    const unit = data[1] & 0x08 ? 'm/s' : 'knots';

    return {
      type: InstrumentDataType.Wind,
      value: { speed, unit, reference: 'apparent' },
      unit: unit,
      timestamp: Date.now(),
      source: 'seatalk'
    };
  }

  private static parseSpeedThroughWater(data: Uint8Array): InstrumentData | null {
    if (data.length < 4) return null;

    const speedRaw = ((data[0] & 0x3f) << 4) | ((data[1] >> 4) & 0x0f);
    const speed = speedRaw * 0.1;
    const tripRaw = ((data[2] & 0x0f) << 8) | data[3];
    const trip = tripRaw * 0.1;

    return {
      type: InstrumentDataType.Speed,
      value: { speed, trip },
      unit: 'nm',
      timestamp: Date.now(),
      source: 'seatalk'
    };
  }

  private static parseHeading(data: Uint8Array): InstrumentData | null {
    if (data.length < 4) return null;

    const headingRaw = ((data[0] & 0x1f) << 7) | (data[1] & 0x7f);
    const heading = headingRaw * 0.5;
    const locked = (data[0] & 0x20) !== 0;
    const deviation = ((data[2] & 0x7f) - 180) * 0.5;
    const variation = ((data[3] & 0x7f) - 180) * 0.5;

    return {
      type: InstrumentDataType.Heading,
      value: { heading, deviation, variation, locked },
      unit: 'deg',
      timestamp: Date.now(),
      source: 'seatalk'
    };
  }
}
