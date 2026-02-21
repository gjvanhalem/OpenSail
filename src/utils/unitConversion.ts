import { UnitSystem } from '../types';

/**
 * Unit conversion utilities for marine navigation
 * Supports metric, imperial, and nautical unit systems
 */

// Speed conversions (base unit: knots)
export function convertSpeed(knots: number, toUnit: UnitSystem): number {
  switch (toUnit) {
    case 'metric':
      return knots * 1.852; // knots to km/h
    case 'imperial':
      return knots * 1.15078; // knots to mph
    case 'nautical':
    default:
      return knots;
  }
}

export function getSpeedUnit(unitSystem: UnitSystem): string {
  switch (unitSystem) {
    case 'metric':
      return 'km/h';
    case 'imperial':
      return 'mph';
    case 'nautical':
    default:
      return 'kts';
  }
}

// Distance conversions (base unit: nautical miles)
export function convertDistance(nauticalMiles: number, toUnit: UnitSystem): number {
  switch (toUnit) {
    case 'metric':
      return nauticalMiles * 1.852; // nm to km
    case 'imperial':
      return nauticalMiles * 1.15078; // nm to miles
    case 'nautical':
    default:
      return nauticalMiles;
  }
}

export function getDistanceUnit(unitSystem: UnitSystem): string {
  switch (unitSystem) {
    case 'metric':
      return 'km';
    case 'imperial':
      return 'mi';
    case 'nautical':
    default:
      return 'nm';
  }
}

// Depth conversions (base unit: meters)
export function convertDepth(meters: number, toUnit: UnitSystem): number {
  switch (toUnit) {
    case 'metric':
      return meters;
    case 'imperial':
      return meters * 3.28084; // meters to feet
    case 'nautical':
      return meters * 0.546807; // meters to fathoms
  }
}

export function getDepthUnit(unitSystem: UnitSystem): string {
  switch (unitSystem) {
    case 'metric':
      return 'm';
    case 'imperial':
      return 'ft';
    case 'nautical':
      return 'fth';
  }
}

// Temperature conversions (base unit: Celsius)
export function convertTemperature(celsius: number, toUnit: UnitSystem): number {
  switch (toUnit) {
    case 'imperial':
      return (celsius * 9) / 5 + 32; // Celsius to Fahrenheit
    case 'metric':
    case 'nautical':
    default:
      return celsius;
  }
}

export function getTemperatureUnit(unitSystem: UnitSystem): string {
  switch (unitSystem) {
    case 'imperial':
      return '°F';
    case 'metric':
    case 'nautical':
    default:
      return '°C';
  }
}

// Altitude/Height conversions (base unit: meters)
export function convertAltitude(meters: number, toUnit: UnitSystem): number {
  switch (toUnit) {
    case 'metric':
      return meters;
    case 'imperial':
    case 'nautical':
      return meters * 3.28084; // meters to feet
  }
}

export function getAltitudeUnit(unitSystem: UnitSystem): string {
  switch (unitSystem) {
    case 'metric':
      return 'm';
    case 'imperial':
    case 'nautical':
    default:
      return 'ft';
  }
}

// Format numbers with appropriate precision
export function formatValue(value: number, precision: number = 1): string {
  return value.toFixed(precision);
}

// Format coordinates
export function formatLatitude(latitude: number, precision: number = 4): string {
  const dir = latitude >= 0 ? 'N' : 'S';
  return `${Math.abs(latitude).toFixed(precision)}° ${dir}`;
}

export function formatLongitude(longitude: number, precision: number = 4): string {
  const dir = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(longitude).toFixed(precision)}° ${dir}`;
}

// Format bearing/heading
export function formatBearing(degrees: number): string {
  return `${degrees.toFixed(0)}°`;
}

// Convert between different coordinate formats
export function decimalToDegreesMinutes(decimal: number): { degrees: number; minutes: number } {
  const degrees = Math.floor(Math.abs(decimal));
  const minutes = (Math.abs(decimal) - degrees) * 60;
  return { degrees, minutes };
}

export function degreesMinutesToDecimal(degrees: number, minutes: number, isNegative: boolean): number {
  const decimal = degrees + minutes / 60;
  return isNegative ? -decimal : decimal;
}
