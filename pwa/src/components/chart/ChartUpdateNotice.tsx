import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { useChartUpdateCheck } from './useChartUpdateCheck';

/** Says on the chart when downloaded regions have newer ENC editions (R15.2) */
export const ChartUpdateNotice: React.FC = () => {
  useChartUpdateCheck();
  const updates = useSelector((state: RootState) => state.chartCache.updates);
  const regionCount = new Set(updates.map((update) => update.regionId)).size;
  if (regionCount === 0) return null;

  return (
    <div
      role="status"
      className="rounded bg-blue-50/95 border border-blue-300 px-2 py-1 text-xs text-blue-900 shadow"
    >
      New chart editions for {regionCount} downloaded {regionCount === 1 ? 'region' : 'regions'}: update
      them under Offline Charts
    </div>
  );
};
