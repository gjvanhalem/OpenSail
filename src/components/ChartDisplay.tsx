import React, { useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import {
  setZoom,
  setCenter,
  setVisibleBounds,
  setRotation,
} from '../store/slices/chartSlice';
import { ChartRotation, Route, Waypoint, AISTarget } from '../types';
import VesselMarker from './VesselMarker';
import NavigationAidsLayer, { NavigationAid } from './NavigationAidsLayer';
import RouteLayer from './RouteLayer';
import AISTargetsLayer from './AISTargetsLayer';
import { useThrottle, useBatteryOptimization } from '../hooks/usePerformance';

// Configure Mapbox access token (should be set from environment)
// MapboxGL.setAccessToken(process.env.MAPBOX_ACCESS_TOKEN || '');

export interface MapInteractionEvent {
  type: 'press' | 'longPress' | 'regionChange';
  coordinates?: [number, number];
  bounds?: {
    ne: [number, number];
    sw: [number, number];
  };
}

export interface ChartDisplayProps {
  onMapInteraction?: (event: MapInteractionEvent) => void;
  style?: object;
  showVesselMarker?: boolean;
  vesselIconSize?: number;
  vesselIconColor?: string;
  navigationAids?: NavigationAid[];
  routes?: Route[];
  onWaypointPress?: (waypoint: Waypoint, route: Route) => void;
  aisTargets?: AISTarget[];
  onAISTargetPress?: (target: AISTarget) => void;
}

const ChartDisplay: React.FC<ChartDisplayProps> = ({
  onMapInteraction,
  style,
  showVesselMarker = true,
  vesselIconSize = 24,
  vesselIconColor = '#FF0000',
  navigationAids = [],
  routes = [],
  onWaypointPress,
  aisTargets = [],
  onAISTargetPress,
}) => {
  const dispatch = useDispatch();
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  
  // Performance optimization
  const { settings: batterySettings } = useBatteryOptimization();

  // Get state from Redux
  const { zoom, rotation, center } = useSelector(
    (state: RootState) => state.chart
  );
  const { currentPosition, currentHeading } = useSelector(
    (state: RootState) => state.navigation
  );
  const { activeRouteId } = useSelector((state: RootState) => state.route);

  // Use current position as center if no center is set
  const mapCenter = center || currentPosition
    ? [
        (center?.longitude || currentPosition?.longitude || 0),
        (center?.latitude || currentPosition?.latitude || 0),
      ]
    : [0, 0];

  // Calculate map bearing based on rotation mode
  const mapBearing =
    rotation === ChartRotation.HeadingUp && currentHeading !== null
      ? currentHeading
      : 0;

  // Handle map press
  const handleMapPress = useCallback(
    (feature: GeoJSON.Feature) => {
      if (onMapInteraction && feature.geometry.type === 'Point') {
        const coords = feature.geometry.coordinates as [number, number];
        onMapInteraction({
          type: 'press',
          coordinates: coords,
        });
      }
    },
    [onMapInteraction]
  );

  // Handle map long press
  const handleMapLongPress = useCallback(
    (feature: GeoJSON.Feature) => {
      if (onMapInteraction && feature.geometry.type === 'Point') {
        const coords = feature.geometry.coordinates as [number, number];
        onMapInteraction({
          type: 'longPress',
          coordinates: coords,
        });
      }
    },
    [onMapInteraction]
  );

  // Handle region change (pan, zoom) - throttled for performance
  const handleRegionDidChangeInternal = useCallback(async () => {
    if (!mapRef.current) return;

    try {
      const bounds = await mapRef.current.getVisibleBounds();
      const centerCoord = await mapRef.current.getCenter();
      const zoomLevel = await mapRef.current.getZoom();

      // Update Redux state
      dispatch(
        setVisibleBounds({
          north: bounds[1][1],
          south: bounds[0][1],
          east: bounds[1][0],
          west: bounds[0][0],
        })
      );

      dispatch(
        setCenter({
          longitude: centerCoord[0],
          latitude: centerCoord[1],
        })
      );

      dispatch(setZoom(zoomLevel));

      // Notify parent component
      if (onMapInteraction) {
        onMapInteraction({
          type: 'regionChange',
          bounds: {
            ne: bounds[1] as [number, number],
            sw: bounds[0] as [number, number],
          },
        });
      }
    } catch (error) {
      console.error('Error handling region change:', error);
    }
  }, [dispatch, onMapInteraction]);

  // Throttle region changes to reduce CPU usage (250ms for battery saving, 100ms normal)
  const throttleDelay = batterySettings.reducedAnimations ? 250 : 100;
  const handleRegionDidChange = useThrottle(handleRegionDidChangeInternal, throttleDelay);

  // Update camera when rotation mode changes
  useEffect(() => {
    if (cameraRef.current && currentHeading !== null) {
      const animationDuration = batterySettings.reducedAnimations ? 150 : 300;
      cameraRef.current.setCamera({
        heading: mapBearing,
        animationDuration,
      });
    }
  }, [mapBearing, currentHeading, batterySettings.reducedAnimations]);

  return (
    <View style={[styles.container, style]}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Street}
        onPress={handleMapPress}
        onLongPress={handleMapLongPress}
        onRegionDidChange={handleRegionDidChange}
        compassEnabled={true}
        compassViewPosition={3} // Top right
        compassViewMargins={{ x: 16, y: 100 }}
        scaleBarEnabled={true}
        scaleBarPosition={{ bottom: 16, left: 16 }}
        pitchEnabled={false} // Disable 3D tilt for marine navigation
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        attributionEnabled={true}
        logoEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={zoom}
          centerCoordinate={mapCenter as [number, number]}
          heading={mapBearing}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {/* Navigation aids layer */}
        <NavigationAidsLayer navigationAids={navigationAids} visible={true} />

        {/* Routes and waypoints */}
        <RouteLayer
          routes={routes}
          activeRouteId={activeRouteId}
          onWaypointPress={onWaypointPress}
          visible={true}
        />

        {/* AIS targets */}
        <AISTargetsLayer
          targets={aisTargets}
          showHistory={true}
          highlightNearbyThreshold={2}
          onTargetPress={onAISTargetPress}
          visible={true}
        />

        {/* Vessel position marker */}
        {showVesselMarker && (
          <VesselMarker
            showHeading={true}
            iconSize={vesselIconSize}
            iconColor={vesselIconColor}
          />
        )}
      </MapboxGL.MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default ChartDisplay;
