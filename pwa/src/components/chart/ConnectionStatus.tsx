import React from 'react';
import { useOnlineStatus } from './useOnlineStatus';

/**
 * Shows when the app has no network connection: the chart then shows only the
 * regions downloaded for offline use. Online it shows nothing.
 */
export const ConnectionStatus: React.FC = () => {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      title="No network connection. The chart shows the regions downloaded for offline use."
      className="flex items-center gap-1.5 rounded bg-gray-800/90 px-2 py-1 text-xs font-semibold text-white shadow"
    >
      <span className="inline-block h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
      Offline: downloaded charts only
    </div>
  );
};
