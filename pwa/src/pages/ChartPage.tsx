import React, { useCallback, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '@/store/hooks';
import { updateSetting } from '@/store/slices/settingsSlice';
import {
  ChartView,
  type Viewport,
  VesselMarker,
  RouteLayer,
  TrackLayer,
  AISLayer,
  ChartDownloadPanel,
  ViewportRegionSelector,
  resolveChartViewState,
  DEFAULT_CHART_VIEW,
  type ActiveLeg,
  vesselDirection,
} from '@/components/chart';
import { ChartControls } from '@/components/chart/ChartControls';
import { LayersPanel } from '@/components/chart/LayersPanel';
import { DataStrip } from '@/components/chart/DataStrip';
import { NavigationStatus } from '@/components/NavigationStatus';
import { SafetyMapLayers } from '@/components/safety';
import { activeLegStart } from '@/utils/routeGuidance';
import { useDebounce } from '@/hooks/useDebounce';
import type { RootState } from '@/store';
import type { AISTarget, ChartRotation } from '@/models';
import type { Bounds } from '@/database/services/TileCache';

export const ChartPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useSelector((state: RootState) => state.navigation);
  const routes = useSelector((state: RootState) => state.routes.routes);
  const { activeRouteId, activeWaypointIndex, isNavigating, navigationStart } = useSelector(
    (state: RootState) => state.routes
  );
  const tracks = useSelector((state: RootState) => state.tracks.tracks);
  const aisTargetsRecord = useSelector((state: RootState) => state.ais.targets);
  const { showRoutes, showTracks, showAIS } = useSelector((state: RootState) => state.ui);
  const settings = useSelector((state: RootState) => state.settings.settings);

  const activeLeg = useMemo((): ActiveLeg | null => {
    const route = routes.find((r) => r.id === activeRouteId);
    if (!isNavigating || !route) return null;
    return {
      routeId: route.id,
      waypointIndex: activeWaypointIndex,
      from: activeLegStart(route, activeWaypointIndex, navigationStart),
    };
  }, [routes, activeRouteId, activeWaypointIndex, isNavigating, navigationStart]);

  // Convert AIS targets from Record to Array
  const aisTargets = useMemo(() => Object.values(aisTargetsRecord), [aisTargetsRecord]);

  const [viewport, setViewport] = useState<Viewport>(() => ({
    latitude: navigation.position?.latitude ?? DEFAULT_CHART_VIEW.latitude,
    longitude: navigation.position?.longitude ?? DEFAULT_CHART_VIEW.longitude,
    zoom: navigation.position ? settings.defaultZoom || 10 : DEFAULT_CHART_VIEW.zoom,
    bearing: 0,
    pitch: 0,
  }));

  // Follow the vessel until the user pans away; Recenter turns it back on
  const [autoCenterEnabled, setAutoCenterEnabled] = useState(true);

  const viewState = useMemo(
    () =>
      resolveChartViewState(viewport, {
        followVessel: autoCenterEnabled,
        position: navigation.position,
        orientation: settings.chartRotation,
        heading: navigation.heading,
        course: navigation.course,
      }),
    [
      viewport,
      autoCenterEnabled,
      navigation.position,
      settings.chartRotation,
      navigation.heading,
      navigation.course,
    ]
  );

  const handleOrientationChange = useCallback(
    (orientation: ChartRotation) => {
      dispatch(updateSetting({ key: 'chartRotation', value: orientation }));
    },
    [dispatch]
  );

  // Debounced copy for the region selector, which doesn't need every frame
  const debouncedViewport = useDebounce(viewState, 100);

  const [showLayers, setShowLayers] = useState(false);
  const [showDownloadPanel, setShowDownloadPanel] = useState(false);
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [selectedBounds, setSelectedBounds] = useState<Bounds | null>(null);
  // The map's visible area, which "Select This Area" downloads
  const [visibleBounds, setVisibleBounds] = useState<Bounds | null>(null);

  const handleMove = useCallback((newViewport: Viewport) => {
    setViewport(newViewport);
  }, []);

  const handleUserPan = useCallback(() => {
    setAutoCenterEnabled(false);
  }, []);

  const handleRecenter = useCallback(() => {
    setAutoCenterEnabled(true);
  }, []);

  const handleTargetSelect = useCallback((target: AISTarget) => {
    console.log('Selected AIS target:', target);
    // The target's details show in AISLayer's own popup
  }, []);

  const handleRegionSelected = useCallback((bounds: Bounds) => {
    setSelectedBounds(bounds);
    setShowRegionSelector(false);
    setShowDownloadPanel(true);
  }, []);

  const handleStartRegionSelection = useCallback(() => {
    setShowRegionSelector(true);
    setShowDownloadPanel(false);
  }, []);

  return (
    <div className="chart-page h-full relative">
      <ChartView
        viewState={viewState}
        onMove={handleMove}
        onBoundsChange={setVisibleBounds}
        onUserPan={handleUserPan}
        rotatable={false}
        showSeamarks={settings.showNavigationAids}
        showEnc={settings.showDepthContours}
        zoomControl={false}
        topLeft={<NavigationStatus />}
      >
        <ChartControls
          following={autoCenterEnabled}
          canFollow={navigation.position !== null}
          onFollow={handleRecenter}
          orientation={settings.chartRotation}
          onOrientationChange={handleOrientationChange}
          layersOpen={showLayers}
          onToggleLayers={() => setShowLayers((open) => !open)}
          offlineOpen={showDownloadPanel || showRegionSelector}
          onToggleOffline={() => {
            setShowRegionSelector(false);
            setShowDownloadPanel((open) => !(open || showRegionSelector));
          }}
        />
        <RouteLayer routes={routes} visible={showRoutes} activeLeg={activeLeg} />
        <TrackLayer tracks={tracks} visible={showTracks} showAllTracks />
        <AISLayer
          targets={aisTargets}
          visible={showAIS}
          onTargetSelect={handleTargetSelect}
        />
        <SafetyMapLayers />
        {navigation.position && (
          <VesselMarker
            position={navigation.position}
            heading={vesselDirection(navigation.heading, navigation.course)}
          />
        )}
      </ChartView>

      {showLayers && <LayersPanel onClose={() => setShowLayers(false)} />}

      {/* Bottom right; on a phone above the safety buttons */}
      <div className="absolute right-3 bottom-[96px] z-10 md:bottom-3">
        <DataStrip />
      </div>

      {showRegionSelector && (
        <ViewportRegionSelector
          viewport={debouncedViewport}
          bounds={visibleBounds}
          onSelectCurrentView={handleRegionSelected}
          onCancel={() => setShowRegionSelector(false)}
        />
      )}

      {showDownloadPanel && (
        <ChartDownloadPanel
          selectedBounds={selectedBounds}
          onClose={() => {
            setShowDownloadPanel(false);
            setSelectedBounds(null);
          }}
          onSelectNewRegion={handleStartRegionSelection}
        />
      )}
    </div>
  );
};
