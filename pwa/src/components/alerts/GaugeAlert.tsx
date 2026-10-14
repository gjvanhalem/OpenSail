import React from 'react';
import type { ActiveAlert } from '@/store/slices/alertsSlice';
import { useUnits } from '@/hooks/useUnits';
import { ALERT_LABELS } from './alertLabels';

/** "BELOW MIN 3.0 m" under a gauge in alarm; stays while the alert is active, even when acknowledged */
export const GaugeAlert: React.FC<{ alert: ActiveAlert | undefined }> = ({ alert }) => {
  const units = useUnits();
  if (!alert) return null;
  const { quantity } = ALERT_LABELS[alert.value];
  return (
    <div className="mt-2 text-xs font-bold text-red-400 uppercase" data-testid={`${alert.value}-alert`}>
      {alert.kind === 'below' ? 'Below min' : 'Above max'} {units.format(quantity, alert.limit)}
    </div>
  );
};
