import React, { useCallback, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  ChartView,
  type Viewport,
  VesselMarker,
  RouteLayer,
  TrackLayer,
  AISLayer,
  ChartDownloadPanel,
  ViewportRegionSelector,
} from '@/components/chart';
import { useDebounce } from '@/hooks/useDebounce';
import type { RootState } from '@/store';
import type { AISTarget } from '@/models';
import type { Bounds } from '@/database/services/TileCache';

export const ChartPage: React.FC = () => {
  const navigation = useSelector((state: RootState) => state.navigation);
  const routes = useSelector((state: RootState) => state.routes.routes);
  const tracks = useSelector((state: RootState) => state.tracks.tracks);
  const aisTargetsRecord = useSelector((state: RootState) => state.ais.targets);
  const { showRoutes, showTracks, showAIS } = useSelector((state: RootState) => state.ui);

  // Convert AIS targets from Record to Array
  const aisTargets = useMemo(() => Object.values(aisTargetsRecord), [aisTargetsRecord]);

  const [viewport, setViewport] = useState<Viewport>({
    latitude: navigation.position?.latitude || 51.5074,
    longitude: navigation.position?.longitude || -0.1278,
    zoom: 10,
    bearing: 0,
    pitch: 0,
  });

  // Debounce viewport updates to reduce rendering frequency
  const debouncedViewport = useDebounce(viewport, 100);

  const [showDownloadPanel, setShowDownloadPanel] = useState(false);
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  const [selectedBounds, setSelectedBounds] = useState<Bounds | null>(null);

  const handleMove = useCallback((newViewport: Viewport) => {
    setViewport(newViewport);
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
      {/* Download button */}
      {!showRegionSelector && (
        <button
          onClick={() => setShowDownloadPanel(!showDownloadPanel)}
          className="absolute top-4 right-4 z-10 bg-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Offline Charts
        </button>
      )}

      <ChartView
        center={[debouncedViewport.longitude, debouncedViewport.latitude]}
        zoom={debouncedViewport.zoom}
        bearing={debouncedViewport.bearing}
        onMove={handleMove}
      >
        <RouteLayer routes={routes} visible={showRoutes} />
        <TrackLayer tracks={tracks} visible={showTracks} />
        <AISLayer
          targets={aisTargets}
          visible={showAIS}
          onTargetSelect={handleTargetSelect}
        />
        {navigation.position && (
          <VesselMarker position={navigation.position} heading={navigation.heading} />
        )}
      </ChartView>

      {showRegionSelector && (
        <ViewportRegionSelector
          viewport={debouncedViewport}
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
