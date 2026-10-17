import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import Map, {
  NavigationControl,
  type MapEvent,
  type MapMouseEvent,
  type MapRef,
  type ViewStateChangeEvent,
} from 'react-map-gl/maplibre';
import type { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createBaseMapStyle } from './baseMapStyle';
import { ChartDisclaimer } from './ChartDisclaimer';
import { EncLayers } from './EncLayers';
import { useChartCatalog } from './useChartCatalog';
import { registerTileProtocol } from './tileProtocol';
import { ConnectionStatus } from './ConnectionStatus';
import { ChartUpdateNotice } from './ChartUpdateNotice';
import { lngLatBoundsToBounds } from './mapBounds';
import type { Bounds } from '@/database/services/TileCache';

// Before any map loads its style: every tile and glyph goes through opensail://
registerTileProtocol();
import type { EncDepthSettings } from './encStyle';

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
  /**
   * Called with the map's visible area whenever it changes while the map stands
   * still (after a move or resize), so a download covers exactly what is on screen
   */
  onBoundsChange?: (bounds: Bounds) => void;
  /** Called when the user starts dragging or rotating the map */
  onUserPan?: () => void;
  /** Let the user rotate the map. Off when the chart orientation sets the bearing. */
  rotatable?: boolean;
  /** Called with the clicked map coordinate */
  onClick?: (coordinate: { latitude: number; longitude: number }) => void;
  /** CSS cursor for the map canvas */
  cursor?: string;
  /** Draw OpenSeaMap seamarks (buoys, beacons, lights). On by default. */
  showSeamarks?: boolean;
  /** Shallow, safety and deep contours for shading ENC depth areas */
  encDepths?: EncDepthSettings;
  children?: React.ReactNode;
}

declare global {
  interface Window {
    /** The chart's MapLibre map, exposed for end-to-end tests */
    __OPENSAIL_MAP__?: MapLibreMap;
  }
}

export const ChartView: React.FC<ChartViewProps> = ({
  center = [0, 0],
  zoom = 10,
  bearing = 0,
  viewState,
  onMove,
  onBoundsChange,
  onUserPan,
  rotatable = true,
  onClick,
  cursor,
  showSeamarks = true,
  encDepths,
  children,
}) => {
  const mapRef = useRef<MapRef>(null);

  // MapLibre starts a drag only once the pointer has moved a few pixels, and a
  // new view before that (the vessel moving while the chart follows it) jumps
  // the camera, which cancels the gesture. So the view is held from the moment
  // a pointer goes down until it is released or the map starts moving.
  const [heldViewState, setHeldViewState] = useState<Viewport | null>(null);
  const shownViewState = heldViewState ?? viewState;

  const handlePointerDown = useCallback(() => {
    if (viewState) setHeldViewState(viewState);
  }, [viewState]);
  const releaseView = useCallback(() => setHeldViewState(null), []);

  useEffect(() => {
    if (!heldViewState) return;
    window.addEventListener('pointerup', releaseView);
    window.addEventListener('pointercancel', releaseView);
    return () => {
      window.removeEventListener('pointerup', releaseView);
      window.removeEventListener('pointercancel', releaseView);
    };
  }, [heldViewState, releaseView]);

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

  // On render rather than load: load waits for the base map's tiles, which
  // never arrive offline or when the tile server can't be reached
  // MapLibre opens a compact attribution until the first drag; start it
  // collapsed so it doesn't cover the "Not for navigation" note
  const handleLoad = useCallback((evt: MapEvent) => {
    const attribution = evt.target.getContainer().querySelector('.maplibregl-ctrl-attrib');
    attribution?.classList.remove('maplibregl-compact-show');
    attribution?.removeAttribute('open');
  }, []);

  // A controlled map only shows its new view once the parent re-renders, so
  // the bounds at moveend can still be the old ones: check again on every
  // render while the map stands still, and report only when they change
  const reportedBounds = useRef<Bounds | null>(null);
  const reportBounds = useCallback(
    (map: MapLibreMap) => {
      if (!onBoundsChange) return;
      const bounds = lngLatBoundsToBounds(map.getBounds());
      const last = reportedBounds.current;
      if (
        last &&
        last.north === bounds.north &&
        last.south === bounds.south &&
        last.east === bounds.east &&
        last.west === bounds.west
      ) {
        return;
      }
      reportedBounds.current = bounds;
      onBoundsChange(bounds);
    },
    [onBoundsChange]
  );
  const handleSettled = useCallback((evt: MapEvent) => reportBounds(evt.target), [reportBounds]);

  const handleRender = useCallback(
    (evt: MapEvent) => {
      if (window.__OPENSAIL_MAP__ !== evt.target) window.__OPENSAIL_MAP__ = evt.target;
      if (!evt.target.isMoving()) reportBounds(evt.target);
    },
    [reportBounds]
  );

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

  const chartRegions = useChartCatalog();
  const mapStyle = useMemo(() => createBaseMapStyle({ seamarks: showSeamarks }), [showSeamarks]);

  return (
    <div className="w-full h-full relative" onPointerDownCapture={handlePointerDown}>
      <Map
        ref={mapRef}
        {...(shownViewState
          ? { ...shownViewState }
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
        onMoveStart={heldViewState ? releaseView : undefined}
        onMoveEnd={onBoundsChange ? handleSettled : undefined}
        onResize={onBoundsChange ? handleSettled : undefined}
        onDragStart={onUserPan ? handleUserPan : undefined}
        onRotateStart={onUserPan ? handleUserPan : undefined}
        dragRotate={rotatable}
        touchPitch={false}
        onRender={handleRender}
        onLoad={handleLoad}
        onClick={onClick ? handleClick : undefined}
        cursor={cursor}
        maxPitch={0}
        renderWorldCopies={false}
        // Collapsed to an (i) button, so the attribution never covers the disclaimer
        attributionControl={{ compact: true }}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        <EncLayers regions={chartRegions} depths={encDepths} />
        {children}
      </Map>
      <div className="absolute bottom-2 left-2 z-10 flex flex-col items-start gap-1">
        <ChartUpdateNotice />
        <ConnectionStatus />
        <ChartDisclaimer />
      </div>
    </div>
  );
};
