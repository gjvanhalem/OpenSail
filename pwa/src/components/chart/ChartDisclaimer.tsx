import React, { useState } from 'react';

/**
 * A "not for navigation" notice that always stays on the chart (R1.4). The
 * seamarks come from OpenSeaMap, which anyone can edit, and the base map is
 * OpenStreetMap: neither is an official chart.
 */
export const ChartDisclaimer: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      role="note"
      aria-label="Chart disclaimer"
      className="max-w-xs rounded bg-amber-50/95 border border-amber-400 px-2 py-1 text-xs text-amber-900 shadow"
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="font-semibold"
      >
        ⚠ Not for navigation
      </button>
      {expanded && (
        <p className="mt-1">
          Seamarks come from OpenSeaMap and the base map from OpenStreetMap. Both are
          crowd-sourced and may be incomplete, wrong or out of date. Always carry and use
          official charts and notices to mariners.
        </p>
      )}
    </div>
  );
};
