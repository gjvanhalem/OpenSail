import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import {
  formatQuantity,
  formatValue,
  fromDisplay,
  toDisplay,
  unitLabel,
  type Quantity,
} from '@/utils/units';

/** Unit conversion bound to the user's units setting */
export function useUnits() {
  const system = useAppSelector((state) => state.settings.settings.units);

  return useMemo(
    () => ({
      system,
      label: (quantity: Quantity) => unitLabel(quantity, system),
      toDisplay: (quantity: Quantity, value: number) => toDisplay(quantity, value, system),
      fromDisplay: (quantity: Quantity, value: number) => fromDisplay(quantity, value, system),
      value: (quantity: Quantity, value: number, decimals?: number) =>
        formatValue(quantity, value, system, decimals),
      format: (quantity: Quantity, value: number, decimals?: number) =>
        formatQuantity(quantity, value, system, decimals),
    }),
    [system]
  );
}
