/**
 * Unit conversion for display (R14.4). The store keeps one set of units:
 * speeds in knots, distances in nautical miles, depths and short distances in
 * metres. Components convert at the edge, with the user's unit system.
 */

import type { UnitSystem } from '@/models';

export type { UnitSystem };

/** What a stored value measures */
export type Quantity = 'speed' | 'windSpeed' | 'distance' | 'depth' | 'length';

const KNOT_TO_KMH = 1.852;
const KNOT_TO_MPH = 1.852 / 1.609344;
const NM_TO_KM = 1.852;
const NM_TO_MI = 1.852 / 1.609344;
const M_TO_FT = 1 / 0.3048;

interface UnitDefinition {
  label: string;
  /** Multiply the stored value by this to get the display value */
  factor: number;
  decimals: number;
}

const UNITS: Record<Quantity, Record<UnitSystem, UnitDefinition>> = {
  // Stored in knots
  speed: {
    nautical: { label: 'kn', factor: 1, decimals: 1 },
    metric: { label: 'km/h', factor: KNOT_TO_KMH, decimals: 1 },
    imperial: { label: 'mph', factor: KNOT_TO_MPH, decimals: 1 },
  },
  windSpeed: {
    nautical: { label: 'kn', factor: 1, decimals: 1 },
    metric: { label: 'km/h', factor: KNOT_TO_KMH, decimals: 1 },
    imperial: { label: 'mph', factor: KNOT_TO_MPH, decimals: 1 },
  },
  // Stored in nautical miles
  distance: {
    nautical: { label: 'nm', factor: 1, decimals: 2 },
    metric: { label: 'km', factor: NM_TO_KM, decimals: 2 },
    imperial: { label: 'mi', factor: NM_TO_MI, decimals: 2 },
  },
  // Stored in metres; sailors in nautical units still read depth in metres
  depth: {
    nautical: { label: 'm', factor: 1, decimals: 1 },
    metric: { label: 'm', factor: 1, decimals: 1 },
    imperial: { label: 'ft', factor: M_TO_FT, decimals: 1 },
  },
  length: {
    nautical: { label: 'm', factor: 1, decimals: 1 },
    metric: { label: 'm', factor: 1, decimals: 1 },
    imperial: { label: 'ft', factor: M_TO_FT, decimals: 1 },
  },
};

export function unitLabel(quantity: Quantity, system: UnitSystem): string {
  return UNITS[quantity][system].label;
}

/** Stored value → display value */
export function toDisplay(quantity: Quantity, value: number, system: UnitSystem): number {
  return value * UNITS[quantity][system].factor;
}

/** Display value (e.g. typed by the user) → stored value */
export function fromDisplay(quantity: Quantity, value: number, system: UnitSystem): number {
  return value / UNITS[quantity][system].factor;
}

/** The display value as text, without the unit */
export function formatValue(
  quantity: Quantity,
  value: number,
  system: UnitSystem,
  decimals = UNITS[quantity][system].decimals
): string {
  return toDisplay(quantity, value, system).toFixed(decimals);
}

/** The display value with its unit, e.g. "11.1 km/h" */
export function formatQuantity(
  quantity: Quantity,
  value: number,
  system: UnitSystem,
  decimals?: number
): string {
  return `${formatValue(quantity, value, system, decimals)} ${unitLabel(quantity, system)}`;
}
