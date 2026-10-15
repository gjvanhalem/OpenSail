import type { AlertValue } from '@/store/slices/alertsSlice';
import type { Quantity } from '@/utils/units';

export const ALERT_LABELS: Record<AlertValue, { name: string; quantity: Quantity; hint: string }> = {
  depth: { name: 'Depth', quantity: 'depth', hint: 'Min is the shallow-water alarm' },
  speed: { name: 'Speed', quantity: 'speed', hint: 'Log speed, or SOG without a log' },
  windSpeed: {
    name: 'Wind speed',
    quantity: 'windSpeed',
    hint: 'Apparent wind, e.g. a max to remind you to reef',
  },
};
