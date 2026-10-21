import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setAnchorPanelOpen } from '@/store/slices/safetySlice';
import { Icon } from '@/components/icons';
import { MobButton } from './MobButton';
import { anchorWatchDistance, anchorWatchStatus } from './format';

/**
 * The safety actions, one tap away on every page and in fullscreen mode:
 * man overboard, and the anchor watch next to it. While a watch runs, the
 * anchor button shows how far the boat is from the anchor and the watch's state.
 */
export const SafetyCluster: React.FC = () => {
  const dispatch = useAppDispatch();
  const panelOpen = useAppSelector((state) => state.safety.anchorPanelOpen);
  const watch = useAppSelector((state) => state.safety.anchor);
  const status = watch ? anchorWatchStatus(watch) : null;

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[90] flex items-end gap-3">
      <div className="pointer-events-auto">
        <MobButton />
      </div>
      <button
        onClick={() => dispatch(setAnchorPanelOpen(!panelOpen))}
        aria-label="Anchor watch"
        aria-expanded={panelOpen}
        title={watch ? 'Anchor watch running' : 'Anchor watch'}
        data-testid={watch ? 'anchor-status-pill' : undefined}
        className={`pointer-events-auto flex h-12 items-center gap-2 rounded-full border px-4 font-semibold shadow-lg ${
          status ? status.className : 'border-line bg-surface text-ink hover:bg-gray-50'
        }`}
      >
        <Icon name="anchor" className="h-5 w-5" />
        {watch && status ? (
          <span className="whitespace-nowrap text-sm tabular-nums">
            {anchorWatchDistance(watch)} · {status.text}
          </span>
        ) : (
          <span className="hidden sm:inline">Anchor</span>
        )}
      </button>
    </div>
  );
};
