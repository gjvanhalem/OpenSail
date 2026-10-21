import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setAnchorPanelOpen } from '@/store/slices/safetySlice';
import { Icon } from '@/components/icons';
import { MobButton } from './MobButton';

/**
 * The safety actions, one tap away on every page and in fullscreen mode:
 * man overboard, and the anchor watch next to it.
 */
export const SafetyCluster: React.FC = () => {
  const dispatch = useAppDispatch();
  const panelOpen = useAppSelector((state) => state.safety.anchorPanelOpen);
  const watching = useAppSelector((state) => state.safety.anchor !== null);

  return (
    <div className="pointer-events-none absolute bottom-24 left-3 z-[90] flex items-end gap-3">
      <div className="pointer-events-auto">
        <MobButton />
      </div>
      <button
        onClick={() => dispatch(setAnchorPanelOpen(!panelOpen))}
        aria-label="Anchor watch"
        aria-expanded={panelOpen}
        title={watching ? 'Anchor watch running' : 'Anchor watch'}
        className={`pointer-events-auto flex h-12 items-center gap-2 rounded-full border px-4 font-semibold shadow-lg ${
          watching
            ? 'border-accent bg-accent text-accent-ink'
            : 'border-line bg-surface text-ink hover:bg-gray-50'
        }`}
      >
        <Icon name="anchor" className="h-5 w-5" />
        <span className="hidden sm:inline">Anchor</span>
      </button>
    </div>
  );
};
