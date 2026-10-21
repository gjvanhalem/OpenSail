import React from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { Icon } from '@/components/icons';
import type { ChartRotation } from '@/models';

interface ChartControlsProps {
  following: boolean;
  /** Shown only with a position to follow */
  canFollow: boolean;
  onFollow: () => void;
  orientation: ChartRotation;
  onOrientationChange: (orientation: ChartRotation) => void;
  layersOpen: boolean;
  onToggleLayers: () => void;
  offlineOpen: boolean;
  onToggleOffline: () => void;
}

const BUTTON =
  'grid h-12 w-12 place-items-center rounded-xl border shadow-lg transition-colors';
const OFF = 'border-line bg-surface text-ink hover:bg-gray-50';
const ON = 'border-accent bg-accent text-accent-ink';

/**
 * The chart's buttons, one column on the right edge (docs/ui-redesign.md 2.2):
 * follow the vessel, north up / heading up, layers, offline charts and zoom.
 * Rendered inside the map, so zoom can reach it.
 */
export const ChartControls: React.FC<ChartControlsProps> = ({
  following,
  canFollow,
  onFollow,
  orientation,
  onOrientationChange,
  layersOpen,
  onToggleLayers,
  offlineOpen,
  onToggleOffline,
}) => {
  const { current: map } = useMap();
  const headingUp = orientation === 'heading-up';

  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
      {canFollow && (
        <button
          onClick={onFollow}
          aria-label="Follow vessel"
          aria-pressed={following}
          title={following ? 'Following the vessel' : 'Follow the vessel again'}
          className={`${BUTTON} ${following ? ON : OFF}`}
        >
          <Icon name="locate" />
        </button>
      )}
      <button
        onClick={() => onOrientationChange(headingUp ? 'north-up' : 'heading-up')}
        aria-label="Heading up"
        aria-pressed={headingUp}
        title={headingUp ? 'Heading up: tap for north up' : 'North up: tap for heading up'}
        className={`${BUTTON} ${OFF} text-sm font-bold`}
      >
        {headingUp ? 'H↑' : 'N↑'}
      </button>
      <button
        onClick={onToggleLayers}
        aria-label="Layers"
        aria-expanded={layersOpen}
        title="Layers"
        className={`${BUTTON} ${layersOpen ? ON : OFF}`}
      >
        <Icon name="layers" />
      </button>
      <button
        onClick={onToggleOffline}
        aria-label="Offline charts"
        aria-expanded={offlineOpen}
        title="Offline charts"
        className={`${BUTTON} ${offlineOpen ? ON : OFF}`}
      >
        <Icon name="download" />
      </button>
      <div className="h-2" />
      <button onClick={() => map?.zoomIn()} aria-label="Zoom in" title="Zoom in" className={`${BUTTON} ${OFF}`}>
        <Icon name="plus" />
      </button>
      <button onClick={() => map?.zoomOut()} aria-label="Zoom out" title="Zoom out" className={`${BUTTON} ${OFF}`}>
        <Icon name="minus" />
      </button>
    </div>
  );
};
