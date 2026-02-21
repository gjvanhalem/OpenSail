import { createSelector } from '@reduxjs/toolkit';
import { RootState } from './index';
import { InstrumentDataType, ChartLayer } from '../types';

// Instrument selectors
export const selectInstrumentState = (state: RootState) => state.instrument;
export const selectInstrumentConnected = (state: RootState) =>
  state.instrument.connected;
export const selectInstrumentStubMode = (state: RootState) =>
  state.instrument.stubMode;
export const selectInstrumentData = (dataType: InstrumentDataType) =>
  createSelector(
    selectInstrumentState,
    (instrument) => instrument.latestData[dataType]
  );

// Route selectors
export const selectRouteState = (state: RootState) => state.route;
export const selectAllRoutes = (state: RootState) => state.route.routes;
export const selectActiveRoute = (state: RootState) => state.route.activeRoute;
export const selectActiveRouteId = (state: RootState) =>
  state.route.activeRouteId;
export const selectRouteValidation = (routeId: string) =>
  createSelector(
    selectRouteState,
    (route) => route.routeValidation[routeId]
  );

// AIS selectors
export const selectAISState = (state: RootState) => state.ais;
export const selectAllAISTargets = createSelector(
  selectAISState,
  (ais) => Object.values(ais.targets)
);
export const selectAISTarget = (mmsi: string) =>
  createSelector(selectAISState, (ais) => ais.targets[mmsi]);
export const selectNearbyAISTargets = createSelector(
  [selectAISState],
  (ais) => ais.nearbyTargets.map((mmsi: string) => ais.targets[mmsi]).filter(Boolean)
);
export const selectSelectedAISTarget = createSelector(
  [selectAISState],
  (ais) =>
    ais.selectedTargetMMSI ? ais.targets[ais.selectedTargetMMSI] : null
);

// Chart selectors
export const selectChartState = (state: RootState) => state.chart;
export const selectChartZoom = (state: RootState) => state.chart.zoom;
export const selectChartRotation = (state: RootState) => state.chart.rotation;
export const selectChartCenter = (state: RootState) => state.chart.center;
export const selectChartLayers = (state: RootState) => state.chart.layers;
export const selectVisibleChartLayers = createSelector(
  selectChartLayers,
  (layers) => layers.filter((layer: ChartLayer) => layer.visible)
);
export const selectChartCoverage = (state: RootState) => state.chart.coverage;

// Navigation selectors
export const selectNavigationState = (state: RootState) => state.navigation;
export const selectCurrentPosition = (state: RootState) =>
  state.navigation.currentPosition;
export const selectCurrentHeading = (state: RootState) =>
  state.navigation.currentHeading;
export const selectCurrentSpeed = (state: RootState) =>
  state.navigation.currentSpeed;
export const selectIsRecordingTrack = (state: RootState) =>
  state.navigation.isRecordingTrack;
export const selectCurrentTrack = (state: RootState) =>
  state.navigation.currentTrack;
export const selectMOBMarker = (state: RootState) =>
  state.navigation.mobMarker;
export const selectAnchorWatch = (state: RootState) =>
  state.navigation.anchorWatch;
export const selectCurrentVoyage = (state: RootState) =>
  state.navigation.currentVoyage;
export const selectIsNavigating = (state: RootState) =>
  state.navigation.isNavigating;
export const selectNavigationData = createSelector(
  selectNavigationState,
  (navigation) => ({
    distanceToNextWaypoint: navigation.distanceToNextWaypoint,
    bearingToNextWaypoint: navigation.bearingToNextWaypoint,
    eta: navigation.eta,
  })
);

// Settings selectors
export const selectSettingsState = (state: RootState) => state.settings;
export const selectUnits = (state: RootState) => state.settings.units;
export const selectChartRotationSetting = (state: RootState) =>
  state.settings.chartRotation;
export const selectDefaultZoom = (state: RootState) =>
  state.settings.defaultZoom;
export const selectAnchorWatchRadius = (state: RootState) =>
  state.settings.anchorWatchRadius;
export const selectTheme = (state: RootState) => state.settings.theme;
export const selectAutoSync = (state: RootState) => state.settings.autoSync;
export const selectAllSettings = createSelector(
  selectSettingsState,
  (settings) => ({
    units: settings.units,
    chartRotation: settings.chartRotation,
    defaultZoom: settings.defaultZoom,
    anchorWatchRadius: settings.anchorWatchRadius,
    theme: settings.theme,
    autoSync: settings.autoSync,
  })
);
