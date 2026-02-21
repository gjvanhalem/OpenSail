import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { AISTarget } from '../types';

export interface AISTargetsLayerProps {
  targets: AISTarget[];
  showHistory?: boolean;
  highlightNearbyThreshold?: number; // nautical miles
  onTargetPress?: (target: AISTarget) => void;
  visible?: boolean;
}

/**
 * AISTargetsLayer renders AIS vessel icons with heading indicators and history trails.
 * Satisfies requirements 4.2, 4.3, 4.4 for AIS target display.
 */
const AISTargetsLayer: React.FC<AISTargetsLayerProps> = ({
  targets,
  showHistory = true,
  highlightNearbyThreshold = 2, // 2 nautical miles
  onTargetPress,
  visible = true,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<AISTarget | null>(null);
  const currentPosition = useSelector(
    (state: RootState) => state.navigation.currentPosition
  );

  if (!visible || targets.length === 0) {
    return null;
  }

  // Calculate distance to vessel (in nautical miles)
  const calculateDistance = (target: AISTarget): number | null => {
    if (!currentPosition) return null;

    const R = 3440.065; // Earth radius in nautical miles
    const lat1 = (currentPosition.latitude * Math.PI) / 180;
    const lat2 = (target.position.latitude * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLon =
      ((target.position.longitude - currentPosition.longitude) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Check if target is nearby (within threshold)
  const isNearby = (target: AISTarget): boolean => {
    const distance = calculateDistance(target);
    return distance !== null && distance <= highlightNearbyThreshold;
  };

  // Create GeoJSON for AIS targets
  const createTargetsFeature = () => ({
    type: 'FeatureCollection' as const,
    features: targets.map((target) => ({
      type: 'Feature' as const,
      id: target.mmsi,
      geometry: {
        type: 'Point' as const,
        coordinates: [target.position.longitude, target.position.latitude],
      },
      properties: {
        mmsi: target.mmsi,
        name: target.name,
        heading: target.heading,
        speed: target.speed,
        course: target.course,
        isNearby: isNearby(target),
        hasCPA: !!target.cpa,
        cpaDistance: target.cpa?.distance || null,
      },
    })),
  });

  // Create GeoJSON for history trails
  const createHistoryFeatures = () =>
    targets
      .filter((target) => target.history && target.history.length > 1)
      .map((target) => ({
        type: 'Feature' as const,
        id: `history-${target.mmsi}`,
        geometry: {
          type: 'LineString' as const,
          coordinates: target.history.map((pos) => [
            pos.longitude,
            pos.latitude,
          ]),
        },
        properties: {
          mmsi: target.mmsi,
          isNearby: isNearby(target),
        },
      }));

  // Get vessel type icon
  const getVesselTypeIcon = (vesselType: number): string => {
    // Simplified vessel type mapping
    if (vesselType >= 30 && vesselType <= 39) return '🚢'; // Fishing
    if (vesselType >= 40 && vesselType <= 49) return '⛴️'; // High speed craft
    if (vesselType >= 50 && vesselType <= 59) return '🚤'; // Pilot vessel
    if (vesselType >= 60 && vesselType <= 69) return '⚓'; // Passenger
    if (vesselType >= 70 && vesselType <= 79) return '🚢'; // Cargo
    if (vesselType >= 80 && vesselType <= 89) return '🛢️'; // Tanker
    return '⛵'; // Default
  };

  // Format CPA information
  const formatCPA = (target: AISTarget): string => {
    if (!target.cpa) return 'N/A';
    return `${target.cpa.distance.toFixed(1)} nm in ${target.cpa.time.toFixed(0)} min`;
  };

  const handleTargetPress = (mmsi: string) => {
    const target = targets.find((t) => t.mmsi === mmsi);
    if (target) {
      setSelectedTarget(target);
      if (onTargetPress) {
        onTargetPress(target);
      }
    }
  };

  return (
    <>
      {/* History trails */}
      {showHistory && (
        <MapboxGL.ShapeSource
          id="ais-history-source"
          shape={{
            type: 'FeatureCollection',
            features: createHistoryFeatures(),
          }}
        >
          <MapboxGL.LineLayer
            id="ais-history-layer"
            style={{
              lineColor: [
                'case',
                ['get', 'isNearby'],
                '#FF9500',
                '#888888',
              ],
              lineWidth: 2,
              lineOpacity: 0.5,
              lineDasharray: [2, 2],
            }}
          />
        </MapboxGL.ShapeSource>
      )}

      {/* AIS targets */}
      <MapboxGL.ShapeSource
        id="ais-targets-source"
        shape={createTargetsFeature()}
        onPress={(feature: any) => {
          const mmsi = feature.properties?.mmsi;
          if (mmsi) {
            handleTargetPress(mmsi);
          }
        }}
      >
        {/* Target circles */}
        <MapboxGL.CircleLayer
          id="ais-targets-circle"
          style={{
            circleRadius: [
              'case',
              ['get', 'isNearby'],
              12,
              ['get', 'hasCPA'],
              10,
              8,
            ],
            circleColor: [
              'case',
              ['get', 'isNearby'],
              '#FF3B30',
              ['get', 'hasCPA'],
              '#FF9500',
              '#34C759',
            ],
            circleStrokeWidth: 2,
            circleStrokeColor: '#FFFFFF',
            circleOpacity: 0.9,
          }}
        />

        {/* Heading indicators (arrows) */}
        <MapboxGL.SymbolLayer
          id="ais-targets-heading"
          style={{
            iconImage: 'arrow-up', // Requires custom icon
            iconSize: 0.8,
            iconRotate: ['get', 'heading'],
            iconRotationAlignment: 'map',
            iconAllowOverlap: true,
            iconIgnorePlacement: true,
          }}
        />

        {/* Target labels */}
        <MapboxGL.SymbolLayer
          id="ais-targets-label"
          style={{
            textField: ['get', 'name'],
            textSize: 10,
            textColor: '#000000',
            textHaloColor: '#FFFFFF',
            textHaloWidth: 1,
            textOffset: [0, 1.8],
            textAnchor: 'top',
          }}
        />
      </MapboxGL.ShapeSource>

      {/* Target details modal */}
      {selectedTarget && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedTarget(null)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedTarget(null)}
          >
            <View
              style={styles.targetDetails}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.targetHeader}>
                <Text style={styles.targetIcon}>
                  {getVesselTypeIcon(selectedTarget.vesselType)}
                </Text>
                <View style={styles.targetHeaderText}>
                  <Text style={styles.targetName}>{selectedTarget.name}</Text>
                  <Text style={styles.targetMMSI}>
                    MMSI: {selectedTarget.mmsi}
                  </Text>
                </View>
              </View>

              <View style={styles.targetInfo}>
                <View style={styles.targetInfoRow}>
                  <Text style={styles.targetInfoLabel}>Call Sign:</Text>
                  <Text style={styles.targetInfoValue}>
                    {selectedTarget.callSign || 'N/A'}
                  </Text>
                </View>

                <View style={styles.targetInfoRow}>
                  <Text style={styles.targetInfoLabel}>Position:</Text>
                  <Text style={styles.targetInfoValue}>
                    {selectedTarget.position.latitude.toFixed(6)}°,{' '}
                    {selectedTarget.position.longitude.toFixed(6)}°
                  </Text>
                </View>

                <View style={styles.targetInfoRow}>
                  <Text style={styles.targetInfoLabel}>Course:</Text>
                  <Text style={styles.targetInfoValue}>
                    {selectedTarget.course.toFixed(0)}°
                  </Text>
                </View>

                <View style={styles.targetInfoRow}>
                  <Text style={styles.targetInfoLabel}>Speed:</Text>
                  <Text style={styles.targetInfoValue}>
                    {selectedTarget.speed.toFixed(1)} kts
                  </Text>
                </View>

                <View style={styles.targetInfoRow}>
                  <Text style={styles.targetInfoLabel}>Heading:</Text>
                  <Text style={styles.targetInfoValue}>
                    {selectedTarget.heading.toFixed(0)}°
                  </Text>
                </View>

                {calculateDistance(selectedTarget) !== null && (
                  <View style={styles.targetInfoRow}>
                    <Text style={styles.targetInfoLabel}>Distance:</Text>
                    <Text style={styles.targetInfoValue}>
                      {calculateDistance(selectedTarget)!.toFixed(1)} nm
                    </Text>
                  </View>
                )}

                {selectedTarget.cpa && (
                  <View style={styles.targetInfoRow}>
                    <Text style={styles.targetInfoLabel}>CPA:</Text>
                    <Text
                      style={[
                        styles.targetInfoValue,
                        selectedTarget.cpa.distance < highlightNearbyThreshold &&
                          styles.targetInfoWarning,
                      ]}
                    >
                      {formatCPA(selectedTarget)}
                    </Text>
                  </View>
                )}

                <View style={styles.targetInfoRow}>
                  <Text style={styles.targetInfoLabel}>Dimensions:</Text>
                  <Text style={styles.targetInfoValue}>
                    {selectedTarget.length}m × {selectedTarget.width}m
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedTarget(null)}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 450,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  targetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  targetIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  targetHeaderText: {
    flex: 1,
  },
  targetName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  targetMMSI: {
    fontSize: 14,
    color: '#666666',
  },
  targetInfo: {
    marginBottom: 16,
  },
  targetInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  targetInfoLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  targetInfoValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  targetInfoWarning: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  closeButton: {
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

export default AISTargetsLayer;
