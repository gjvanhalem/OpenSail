import React, { useState } from 'react';
import type { CachedRegion } from '@/store/slices/chartCacheSlice';
import type { ChartUpdate } from '@/services/chartUpdates';
import { editionAgeDays } from '@/services/chartUpdates';
import { formatBytes } from './formatBytes';

export interface ChartRegionListProps {
  regions: CachedRegion[];
  updates: ChartUpdate[];
  /** Regions being downloaded or updated right now */
  busyRegionIds: string[];
  online: boolean;
  onUpdate: (regionId: string) => void;
  onDelete: (regionId: string) => void;
}

/** Downloaded chart regions with their size, zoom levels and edition dates (R15) */
export const ChartRegionList: React.FC<ChartRegionListProps> = ({
  regions,
  updates,
  busyRegionIds,
  online,
  onUpdate,
  onDelete,
}) => {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (regions.length === 0) {
    return <p className="text-sm text-gray-500">No downloaded regions yet</p>;
  }

  return (
    <ul className="space-y-2" aria-label="Downloaded regions">
      {regions.map((region) => {
        const regionUpdates = updates.filter((update) => update.regionId === region.id);
        const busy = busyRegionIds.includes(region.id);
        return (
          <li key={region.id} className="p-3 bg-gray-50 rounded-lg" data-testid="cached-region">
            <div className="flex justify-between items-start mb-1 gap-2">
              <span className="font-medium text-sm">{region.name}</span>
              {regionUpdates.length > 0 && (
                <span className="text-xs font-semibold text-amber-800 bg-amber-100 rounded px-1.5 py-0.5">
                  Update available
                </span>
              )}
            </div>
            <dl className="text-xs text-gray-600 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
              <dt>Size</dt>
              <dd>
                {formatBytes(region.sizeBytes)} ({region.tileCount} tiles)
              </dd>
              <dt>Zoom</dt>
              <dd>{region.zoomLevels.join(', ')}</dd>
              <dt>Downloaded</dt>
              <dd>{new Date(region.createdAt).toLocaleDateString()}</dd>
              <dt>Edition</dt>
              <dd data-testid="region-edition">
                {region.editionDate ? (
                  <>
                    {region.editionDate}{' '}
                    <span className="text-gray-500">({editionAgeDays(region.editionDate)} days old)</span>
                  </>
                ) : (
                  'No ENC data (base map and seamarks only)'
                )}
              </dd>
              {region.failedTiles ? (
                <>
                  <dt>Missing</dt>
                  <dd className="text-amber-700">{region.failedTiles} tiles failed to download</dd>
                </>
              ) : null}
            </dl>
            {regionUpdates.map((update) => (
              <p key={update.encRegionId} className="mt-1 text-xs text-amber-800">
                {update.encRegionName}: edition {update.availableEdition} (you have{' '}
                {update.installedEdition ?? 'an undated edition'})
              </p>
            ))}

            <div className="mt-2 flex gap-2">
              {regionUpdates.length > 0 && (
                <button
                  type="button"
                  onClick={() => onUpdate(region.id)}
                  disabled={busy || !online}
                  title={online ? undefined : 'Updates need a connection'}
                  className="text-xs px-2 py-1 rounded bg-blue-600 text-white disabled:bg-gray-300"
                >
                  {busy ? 'Updating…' : 'Update'}
                </button>
              )}
              {confirmDelete === region.id ? (
                <>
                  <span className="text-xs self-center">Delete {region.name}?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(null);
                      onDelete(region.id);
                    }}
                    className="text-xs px-2 py-1 rounded bg-red-600 text-white"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(null)}
                    className="text-xs px-2 py-1 rounded border border-gray-300"
                  >
                    Keep
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(region.id)}
                  disabled={busy}
                  aria-label={`Delete ${region.name}`}
                  className="text-xs px-2 py-1 rounded text-red-600 hover:text-red-800 disabled:text-gray-400"
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
