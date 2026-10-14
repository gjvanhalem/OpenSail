import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import Map, {
  NavigationControl,
  type MapEvent,
  type MapMouseEvent,
  type MapRef,
  type ViewStateChangeEvent,
} from 'react-map-gl/mapbox';
import type { Map as MapboxMap } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface Viewport {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface ChartViewProps {
  /** Initial center for an uncontrolled map; ignored when viewState is set */
  center?: [number, number];
  /** Initial zoom for an uncontrolled map; ignored when viewState is set */
  zoom?: number;
  /** Initial bearing for an uncontrolled map; ignored when viewState is set */
  bearing?: number;
  /**
   * Controlled view. When set, the map always shows this view and every
   * camera change goes through onMove, so the parent decides what the map shows.
   */
  viewState?: Viewport;
  /** Called on every camera change (each animation frame while moving) */
  onMove?: (viewport: Viewport) => void;
  /** Called when the user starts dragging or rotating the map */
  onUserPan?: () => void;
  /** Called with the clicked map coordinate */
  onClick?: (coordinate: { latitude: number; longitude: number }) => void;
  /** CSS cursor for the map canvas */
  cursor?: string;
  children?: React.ReactNode;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

declare global {
  interface Window {
    /** The chart's mapbox-gl map, exposed for end-to-end tests */
    __OPENSAIL_MAP__?: MapboxMap;
  }
}

export const ChartView: React.FC<ChartViewProps> = ({
  center = [0, 0],
  zoom = 10,
  bearing = 0,
  viewState,
  onMove,
  onUserPan,
  onClick,
  cursor,
  children,
}) => {
  const mapRef = useRef<MapRef>(null);

  const handleMove = useCallback(
    (evt: ViewStateChangeEvent) => {
      // Not debounced: a controlled map must get its new view every frame,
      // or it snaps back to the previous one while the user drags
      const { longitude, latitude, zoom, bearing, pitch } = evt.viewState;
      onMove?.({ latitude, longitude, zoom, bearing, pitch });
    },
    [onMove]
  );

  const handleUserPan = useCallback(
    (evt: ViewStateChangeEvent) => {
      // Only events with an originalEvent come from the user; jumpTo from a
      // changed viewState fires rotatestart too
      if ('originalEvent' in evt && evt.originalEvent) onUserPan?.();
    },
    [onUserPan]
  );

  // On render rather than load: load waits for the style's tiles, which never
  // arrive without a valid Mapbox token
  const handleRender = useCallback((evt: MapEvent) => {
    if (window.__OPENSAIL_MAP__ !== evt.target) window.__OPENSAIL_MAP__ = evt.target;
  }, []);

  useEffect(
    () => () => {
      if (window.__OPENSAIL_MAP__ === mapRef.current?.getMap()) {
        delete window.__OPENSAIL_MAP__;
      }
    },
    []
  );

  const handleClick = useCallback(
    (evt: MapMouseEvent) => {
      onClick?.({ latitude: evt.lngLat.lat, longitude: evt.lngLat.lng });
    },
    [onClick]
  );

  // Optimized map style for performance
  const mapStyle = useMemo(
    () => ({
      version: 8 as const,
      sources: {
        'mapbox-streets': {
          type: 'vector' as const,
          url: 'mapbox://mapbox.mapbox-streets-v8',
        },
      },
      layers: [
        {
          id: 'background',
          type: 'background' as const,
          paint: {
            'background-color': '#d4e6f1',
          },
        },
        {
          id: 'water',
          type: 'fill' as const,
          source: 'mapbox-streets',
          'source-layer': 'water',
          paint: {
            'fill-color': '#a8dadc',
          },
        },
        {
          id: 'land',
          type: 'fill' as const,
          source: 'mapbox-streets',
          'source-layer': 'landuse',
          paint: {
            'fill-color': '#f1faee',
          },
        },
        {
          id: 'roads',
          type: 'line' as const,
          source: 'mapbox-streets',
          'source-layer': 'road',
          paint: {
            'line-color': '#457b9d',
            'line-width': 1,
          },
        },
      ],
    }),
    []
  );

  return (
    <div className="w-full h-full relative">
      {!MAPBOX_TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-4">Mapbox Token Missing</h2>
            <p className="text-gray-700 mb-4">
              The Mapbox API token is not configured. Please add your token to the .env file:
            </p>
            <code className="block bg-gray-100 p-3 rounded text-sm mb-4">
              VITE_MAPBOX_TOKEN=your_token_here
            </code>
            <p className="text-sm text-gray-600">
              Get a free token at{' '}
              <a
                href="https://account.mapbox.com/access-tokens/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
        </div>
      )}
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        {...(viewState
          ? { ...viewState }
          : {
              initialViewState: {
                longitude: center[0],
                latitude: center[1],
                zoom,
                bearing,
                pitch: 0,
              },
            })}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        onMove={viewState || onMove ? handleMove : undefined}
        onDragStart={onUserPan ? handleUserPan : undefined}
        onRotateStart={onUserPan ? handleUserPan : undefined}
        onRender={handleRender}
        onClick={onClick ? handleClick : undefined}
        cursor={cursor}
        maxPitch={0}
        renderWorldCopies={false}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        {children}
      </Map>
    </div>
  );
};
