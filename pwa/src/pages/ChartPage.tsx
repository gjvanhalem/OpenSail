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
import { RouteNavigationControl } from '@/components/routes';
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
    // Future: Show detailed target info in sidebar
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
    <div className="h-full relative">
      {/* Control buttons */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        {/* Recenter button */}
        {navigation.position && (
          <button
            onClick={handleRecenter}
            className={`min-h-12 bg-surface px-4 py-2 rounded-xl shadow-lg hover:bg-gray-50 flex items-center gap-2 ${
              autoCenterEnabled ? 'ring-2 ring-blue-500' : ''
            }`}
            title={autoCenterEnabled ? 'Auto-center enabled' : 'Click to recenter on vessel'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {autoCenterEnabled ? 'Centered' : 'Recenter'}
          </button>
        )}

        {/* Chart orientation */}
        <div
          role="group"
          aria-label="Chart orientation"
          className="bg-surface rounded-xl shadow-lg flex overflow-hidden text-sm"
        >
          {(
            [
              ['north-up', 'North up'],
              ['heading-up', 'Heading up'],
            ] as const
          ).map(([orientation, label]) => (
            <button
              key={orientation}
              onClick={() => handleOrientationChange(orientation)}
              aria-pressed={settings.chartRotation === orientation}
              className={`flex-1 min-h-12 px-3 py-2 ${
                settings.chartRotation === orientation
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <RouteNavigationControl />

        {/* Download button */}
        {!showRegionSelector && (
          <button
            onClick={() => setShowDownloadPanel(!showDownloadPanel)}
            className="min-h-12 bg-surface px-4 py-2 rounded-xl shadow-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Offline Charts
          </button>
        )}
      </div>

      <ChartView
        viewState={viewState}
        onMove={handleMove}
        onBoundsChange={setVisibleBounds}
        onUserPan={handleUserPan}
        rotatable={false}
      >
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

      {/* Route guidance while navigating */}
      <div className="absolute top-4 left-4 z-10">
        <NavigationStatus />
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
