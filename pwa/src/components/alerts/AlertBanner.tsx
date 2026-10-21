import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { acknowledgeAlerts, type ActiveAlert } from '@/store/slices/alertsSlice';
import { useUnits } from '@/hooks/useUnits';
import { ALERT_LABELS } from './alertLabels';

/**
 * Instrument alerts that the user has not acknowledged yet, shown above every
 * page. Acknowledging hides an alert until it clears and comes back.
 */
export const AlertBanner: React.FC = () => {
  const dispatch = useAppDispatch();
  const active = useAppSelector((state) => state.alerts.active);
  const units = useUnits();

  const alerts = Object.values(active).filter(
    (alert): alert is ActiveAlert => alert !== undefined && !alert.acknowledged
  );
  if (alerts.length === 0) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-4 px-4 py-2 bg-red-600 text-white shadow-md animate-pulse"
    >
      <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
      <ul className="flex-1 flex flex-wrap gap-x-6 gap-y-1 font-semibold">
        {alerts.map((alert) => {
          const { name, quantity } = ALERT_LABELS[alert.value];
          return (
            <li key={alert.value}>
              {name} {units.format(quantity, alert.reading)}:{' '}
              {alert.kind === 'below' ? 'below minimum' : 'above maximum'}{' '}
              {units.format(quantity, alert.limit)}
            </li>
          );
        })}
      </ul>
      <button
        onClick={() => dispatch(acknowledgeAlerts())}
        className="px-3 py-1 rounded bg-surface text-red-700 font-semibold hover:bg-red-50"
      >
        Acknowledge
      </button>
    </div>
  );
};
