import React from 'react';
import type { RouteWarning } from '@/models';
import type { RouteHazardState } from './useRouteHazards';

const SEVERITY_STYLE: Record<RouteWarning['severity'], string> = {
  high: 'border-red-300 bg-red-50 text-red-900',
  medium: 'border-amber-300 bg-amber-50 text-amber-900',
  low: 'border-gray-300 bg-gray-50 text-gray-800',
};

const SEVERITY_LABEL: Record<RouteWarning['severity'], string> = {
  high: 'Danger',
  medium: 'Warning',
  low: 'Note',
};

export interface RouteHazardListProps {
  hazards: RouteHazardState;
  onSelect?: (warning: RouteWarning) => void;
}

/** The route's shallow water, hazard and restricted-area warnings (R2.5) */
export const RouteHazardList: React.FC<RouteHazardListProps> = ({ hazards, onSelect }) => {
  const { warnings, checking, safetyDepth, error } = hazards;
  const order: RouteWarning['severity'][] = ['high', 'medium', 'low'];
  const sorted = [...warnings].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));

  return (
    <section aria-label="Route hazards" className="rounded-lg bg-surface/95 shadow p-3 text-sm w-72 max-w-full">
      <h3 className="font-semibold mb-1">Hazard check</h3>
      <p className="text-xs text-gray-600 mb-2">
        Against chart depths for a safety depth of {safetyDepth} m (the depth alert in Settings).
      </p>
      {checking && <p className="text-xs text-gray-600">Checking the route against the charts…</p>}
      {!checking && error && <p className="text-xs text-red-700">The hazard check failed: {error}</p>}
      {!checking && !error && warnings.length === 0 && (
        <p className="text-xs text-green-800">No shallow water or hazards found on charted parts of the route.</p>
      )}
      {!checking && sorted.length > 0 && (
        <ul className="space-y-1">
          {sorted.map((warning, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onSelect?.(warning)}
                className={`w-full text-left rounded border px-2 py-1 text-xs ${SEVERITY_STYLE[warning.severity]}`}
              >
                <span className="font-semibold">{SEVERITY_LABEL[warning.severity]}:</span> {warning.message}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-gray-500">
        Not for navigation. Warnings marked advisory come from survey data, not official charts.
      </p>
    </section>
  );
};
