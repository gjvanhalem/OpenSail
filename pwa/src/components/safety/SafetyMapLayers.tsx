import React, { useMemo } from 'react';
import { Layer, Marker, Source } from 'react-map-gl/maplibre';
import { useAppSelector } from '@/store/hooks';
import { circleRing } from '@/utils/safety';

const RED = '#dc2626';
const BLUE = '#2563eb';

/**
 * The man-overboard spot (R12.2) and the anchor-watch circle (R8.3) on the
 * chart. Render inside ChartView.
 */
export const SafetyMapLayers: React.FC = () => {
  const mob = useAppSelector((state) => state.safety.mob);
  const watch = useAppSelector((state) => state.safety.anchor);
  const vessel = useAppSelector((state) => state.navigation.position);

  const anchor = watch?.anchor ?? null;
  const radiusM = watch?.radiusM ?? null;
  const circle = useMemo(
    () =>
      anchor && radiusM
        ? {
            type: 'Feature' as const,
            geometry: { type: 'Polygon' as const, coordinates: [circleRing(anchor, radiusM)] },
            properties: { radius: radiusM },
          }
        : null,
    [anchor, radiusM]
  );

  const mobSpot = mob?.position ?? null;
  const mobLine = useMemo(
    () =>
      mobSpot && vessel
        ? {
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [vessel.longitude, vessel.latitude],
                [mobSpot.longitude, mobSpot.latitude],
              ],
            },
            properties: {},
          }
        : null,
    [mobSpot, vessel]
  );

  const dragging = watch?.dragging ?? false;

  return (
    <>
      {circle && (
        <Source id="anchor-watch-circle" type="geojson" data={circle}>
          <Layer
            id="anchor-watch-circle-fill"
            type="fill"
            paint={{ 'fill-color': dragging ? RED : BLUE, 'fill-opacity': dragging ? 0.25 : 0.1 }}
          />
          <Layer
            id="anchor-watch-circle-line"
            type="line"
            paint={{
              'line-color': dragging ? RED : BLUE,
              'line-width': 3,
              'line-dasharray': [2, 1],
            }}
          />
        </Source>
      )}
      {anchor && (
        <Marker longitude={anchor.longitude} latitude={anchor.latitude} anchor="center">
          <div
            data-testid="anchor-marker"
            data-dragging={dragging}
            title="Anchor"
            className={`w-8 h-8 flex items-center justify-center rounded-full border-2 border-white shadow-lg text-lg ${
              dragging ? 'bg-red-600' : 'bg-blue-600'
            }`}
          >
            ⚓
          </div>
        </Marker>
      )}

      {mobLine && (
        <Source id="mob-line" type="geojson" data={mobLine}>
          <Layer
            id="mob-line"
            type="line"
            paint={{ 'line-color': RED, 'line-width': 3, 'line-dasharray': [1, 1] }}
          />
        </Source>
      )}
      {mobSpot && (
        <Marker longitude={mobSpot.longitude} latitude={mobSpot.latitude} anchor="center">
          {/* High visibility (R12.2): large, red and yellow, with a pulsing ring */}
          <div data-testid="mob-marker" title="Man overboard" className="relative w-14 h-14">
            <span
              className="absolute inset-0 rounded-full bg-yellow-300 opacity-75 animate-ping"
              aria-hidden="true"
            />
            <span className="absolute inset-1 flex items-center justify-center rounded-full bg-red-600 border-4 border-yellow-300 text-white text-xs font-extrabold shadow-xl">
              MOB
            </span>
          </div>
        </Marker>
      )}
    </>
  );
};
