import React, { useRef, useCallback, useMemo } from 'react';
import Map, { type MapRef, type ViewStateChangeEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

export interface Viewport {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface ChartViewProps {
  center?: [number, number];
  zoom?: number;
  bearing?: number;
  onMove?: (viewport: Viewport) => void;
  children?: React.ReactNode;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

// Debounce helper
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const ChartView: React.FC<ChartViewProps> = ({
  center = [0, 0],
  zoom = 10,
  bearing = 0,
  onMove,
  children,
}) => {
  const mapRef = useRef<MapRef>(null);

  // Debounce move events to reduce update frequency
  const debouncedOnMove = useMemo(
    () => (onMove ? debounce(onMove, 100) : undefined),
    [onMove]
  );

  const handleMove = useCallback(
    (evt: ViewStateChangeEvent) => {
      if (debouncedOnMove) {
        const { longitude, latitude, zoom, bearing, pitch } = evt.viewState;
        debouncedOnMove({
          latitude,
          longitude,
          zoom,
          bearing,
          pitch,
        });
      }
    },
    [debouncedOnMove]
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
    <div className="w-full h-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
          zoom,
          bearing,
          pitch: 0,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        onMove={handleMove}
        maxPitch={0}
        renderWorldCopies={false}
      >
        {children}
      </Map>
    </div>
  );
};
