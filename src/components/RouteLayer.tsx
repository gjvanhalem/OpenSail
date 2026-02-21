import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Route, Waypoint } from '../types';

export interface RouteLayerProps {
  routes: Route[];
  activeRouteId?: string | null;
  onWaypointPress?: (waypoint: Waypoint, route: Route) => void;
  visible?: boolean;
}

/**
 * RouteLayer renders routes with course lines and waypoints on the chart.
 * Satisfies requirement 2.4 for route display.
 */
const RouteLayer: React.FC<RouteLayerProps> = ({
  routes,
  activeRouteId,
  onWaypointPress,
  visible = true,
}) => {
  const [selectedWaypoint, setSelectedWaypoint] = useState<{
    waypoint: Waypoint;
    route: Route;
  } | null>(null);

  if (!visible || routes.length === 0) {
    return null;
  }

  // Create GeoJSON for route lines
  const createRouteLineFeature = (route: Route) => {
    const coordinates = route.waypoints.map((wp) => [
      wp.position.longitude,
      wp.position.latitude,
    ]);

    return {
      type: 'Feature' as const,
      id: route.id,
      geometry: {
        type: 'LineString' as const,
        coordinates,
      },
      properties: {
        routeId: route.id,
        routeName: route.name,
        isActive: route.id === activeRouteId,
      },
    };
  };

  // Create GeoJSON for waypoints
  const createWaypointsFeature = (route: Route) => ({
    type: 'FeatureCollection' as const,
    features: route.waypoints.map((wp, index) => ({
      type: 'Feature' as const,
      id: wp.id,
      geometry: {
        type: 'Point' as const,
        coordinates: [wp.position.longitude, wp.position.latitude],
      },
      properties: {
        waypointId: wp.id,
        waypointName: wp.name,
        waypointIndex: index,
        routeId: route.id,
        routeName: route.name,
        isActive: route.id === activeRouteId,
        isFirst: index === 0,
        isLast: index === route.waypoints.length - 1,
      },
    })),
  });

  // Calculate bearing between two waypoints
  const calculateBearing = (wp1: Waypoint, wp2: Waypoint): number => {
    const lat1 = (wp1.position.latitude * Math.PI) / 180;
    const lat2 = (wp2.position.latitude * Math.PI) / 180;
    const dLon =
      ((wp2.position.longitude - wp1.position.longitude) * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;

    return (bearing + 360) % 360;
  };

  // Calculate distance between two waypoints (in nautical miles)
  const calculateDistance = (wp1: Waypoint, wp2: Waypoint): number => {
    const R = 3440.065; // Earth radius in nautical miles
    const lat1 = (wp1.position.latitude * Math.PI) / 180;
    const lat2 = (wp2.position.latitude * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLon =
      ((wp2.position.longitude - wp1.position.longitude) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Format ETA
  const formatETA = (route: Route): string => {
    if (!route.estimatedDuration) return 'N/A';
    const hours = Math.floor(route.estimatedDuration / 3600);
    const minutes = Math.floor((route.estimatedDuration % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleWaypointPress = (waypointId: string, routeId: string) => {
    const route = routes.find((r) => r.id === routeId);
    const waypoint = route?.waypoints.find((wp) => wp.id === waypointId);

    if (route && waypoint) {
      setSelectedWaypoint({ waypoint, route });
      if (onWaypointPress) {
        onWaypointPress(waypoint, route);
      }
    }
  };

  return (
    <>
      {routes.map((route) => {
        const isActive = route.id === activeRouteId;
        const lineColor = isActive ? '#007AFF' : '#888888';
        const lineWidth = isActive ? 4 : 2;

        return (
          <React.Fragment key={route.id}>
            {/* Route line */}
            <MapboxGL.ShapeSource
              id={`route-line-${route.id}`}
              shape={createRouteLineFeature(route)}
            >
              <MapboxGL.LineLayer
                id={`route-line-layer-${route.id}`}
                style={{
                  lineColor,
                  lineWidth,
                  lineOpacity: 0.8,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </MapboxGL.ShapeSource>

            {/* Waypoints */}
            <MapboxGL.ShapeSource
              id={`waypoints-${route.id}`}
              shape={createWaypointsFeature(route)}
              onPress={(feature: any) => {
                const waypointId = feature.properties?.waypointId;
                if (waypointId) {
                  handleWaypointPress(waypointId, route.id);
                }
              }}
            >
              {/* Waypoint circles */}
              <MapboxGL.CircleLayer
                id={`waypoints-circle-${route.id}`}
                style={{
                  circleRadius: [
                    'case',
                    ['get', 'isFirst'],
                    10,
                    ['get', 'isLast'],
                    10,
                    8,
                  ],
                  circleColor: [
                    'case',
                    ['get', 'isFirst'],
                    '#00FF00',
                    ['get', 'isLast'],
                    '#FF0000',
                    lineColor,
                  ],
                  circleStrokeWidth: 2,
                  circleStrokeColor: '#FFFFFF',
                  circleOpacity: 0.9,
                }}
              />

              {/* Waypoint labels */}
              <MapboxGL.SymbolLayer
                id={`waypoints-label-${route.id}`}
                style={{
                  textField: ['get', 'waypointName'],
                  textSize: 12,
                  textColor: '#000000',
                  textHaloColor: '#FFFFFF',
                  textHaloWidth: 2,
                  textOffset: [0, 1.5],
                  textAnchor: 'top',
                }}
              />
            </MapboxGL.ShapeSource>

            {/* Route information overlay (for active route) */}
            {isActive && route.waypoints.length > 1 && (
              <View style={styles.routeInfo}>
                <Text style={styles.routeInfoTitle}>{route.name}</Text>
                <Text style={styles.routeInfoText}>
                  Distance: {route.totalDistance.toFixed(1)} nm
                </Text>
                <Text style={styles.routeInfoText}>ETA: {formatETA(route)}</Text>
                <Text style={styles.routeInfoText}>
                  Waypoints: {route.waypoints.length}
                </Text>
              </View>
            )}
          </React.Fragment>
        );
      })}

      {/* Waypoint details modal */}
      {selectedWaypoint && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedWaypoint(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedWaypoint(null)}
          >
            <View
              style={styles.waypointDetails}
              onStartShouldSetResponder={() => true}
            >
              <Text style={styles.waypointDetailsTitle}>
                {selectedWaypoint.waypoint.name}
              </Text>

              {selectedWaypoint.waypoint.description && (
                <Text style={styles.waypointDetailsDescription}>
                  {selectedWaypoint.waypoint.description}
                </Text>
              )}

              <View style={styles.waypointDetailsInfo}>
                <Text style={styles.waypointDetailsLabel}>Position:</Text>
                <Text style={styles.waypointDetailsValue}>
                  {selectedWaypoint.waypoint.position.latitude.toFixed(6)}°,{' '}
                  {selectedWaypoint.waypoint.position.longitude.toFixed(6)}°
                </Text>
              </View>

              <View style={styles.waypointDetailsInfo}>
                <Text style={styles.waypointDetailsLabel}>Route:</Text>
                <Text style={styles.waypointDetailsValue}>
                  {selectedWaypoint.route.name}
                </Text>
              </View>

              {/* Calculate leg information */}
              {(() => {
                const wpIndex = selectedWaypoint.route.waypoints.findIndex(
                  (wp) => wp.id === selectedWaypoint.waypoint.id
                );
                const nextWp = selectedWaypoint.route.waypoints[wpIndex + 1];

                if (nextWp) {
                  const bearing = calculateBearing(
                    selectedWaypoint.waypoint,
                    nextWp
                  );
                  const distance = calculateDistance(
                    selectedWaypoint.waypoint,
                    nextWp
                  );

                  return (
                    <>
                      <View style={styles.waypointDetailsInfo}>
                        <Text style={styles.waypointDetailsLabel}>
                          Next Leg:
                        </Text>
                        <Text style={styles.waypointDetailsValue}>
                          {bearing.toFixed(0)}° / {distance.toFixed(1)} nm
                        </Text>
                      </View>
                    </>
                  );
                }
                return null;
              })()}

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedWaypoint(null)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  routeInfo: {
    position: 'absolute',
    top: 80,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 12,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  routeInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  routeInfoText: {
    fontSize: 12,
    color: '#333333',
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waypointDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  waypointDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  waypointDetailsDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  waypointDetailsInfo: {
    marginBottom: 12,
  },
  waypointDetailsLabel: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  waypointDetailsValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RouteLayer;
