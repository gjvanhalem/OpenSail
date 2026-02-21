import React from 'react';
import MapboxGL from '@rnmapbox/maps';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export interface NavigationAid {
  id: string;
  type: 'buoy' | 'beacon' | 'lighthouse' | 'hazard' | 'depth_contour';
  position: [number, number];
  name?: string;
  properties?: Record<string, unknown>;
}

export interface NavigationAidsLayerProps {
  navigationAids: NavigationAid[];
  visible?: boolean;
}

/**
 * NavigationAidsLayer renders buoys, beacons, lighthouses, and hazard markers.
 * Satisfies requirement 1.4 for displaying navigation aids.
 */
const NavigationAidsLayer: React.FC<NavigationAidsLayerProps> = ({
  navigationAids,
  visible = true,
}) => {
  const layers = useSelector((state: RootState) => state.chart.layers);

  // Check if navigation aids layer is visible
  const navAidsLayer = layers.find((l) => l.id === 'navigation-aids');
  const isVisible = visible && (navAidsLayer?.visible ?? true);

  if (!isVisible || navigationAids.length === 0) {
    return null;
  }

  // Group navigation aids by type for efficient rendering
  const aidsByType = navigationAids.reduce(
    (acc, aid) => {
      if (!acc[aid.type]) {
        acc[aid.type] = [];
      }
      acc[aid.type].push(aid);
      return acc;
    },
    {} as Record<string, NavigationAid[]>
  );

  // Create GeoJSON features for each type
  const createFeatureCollection = (aids: NavigationAid[]) => ({
    type: 'FeatureCollection' as const,
    features: aids.map((aid) => ({
      type: 'Feature' as const,
      id: aid.id,
      geometry: {
        type: 'Point' as const,
        coordinates: aid.position,
      },
      properties: {
        name: aid.name,
        type: aid.type,
        ...aid.properties,
      },
    })),
  });

  return (
    <>
      {/* Buoys */}
      {aidsByType.buoy && (
        <MapboxGL.ShapeSource
          id="buoys-source"
          shape={createFeatureCollection(aidsByType.buoy)}
        >
          <MapboxGL.CircleLayer
            id="buoys-layer"
            style={{
              circleRadius: 8,
              circleColor: '#00FF00',
              circleStrokeWidth: 2,
              circleStrokeColor: '#FFFFFF',
              circleOpacity: 0.8,
            }}
          />
          <MapboxGL.SymbolLayer
            id="buoys-label"
            style={{
              textField: ['get', 'name'],
              textSize: 10,
              textColor: '#000000',
              textHaloColor: '#FFFFFF',
              textHaloWidth: 1,
              textOffset: [0, 1.5],
            }}
          />
        </MapboxGL.ShapeSource>
      )}

      {/* Beacons */}
      {aidsByType.beacon && (
        <MapboxGL.ShapeSource
          id="beacons-source"
          shape={createFeatureCollection(aidsByType.beacon)}
        >
          <MapboxGL.CircleLayer
            id="beacons-layer"
            style={{
              circleRadius: 10,
              circleColor: '#FFFF00',
              circleStrokeWidth: 2,
              circleStrokeColor: '#000000',
              circleOpacity: 0.9,
            }}
          />
          <MapboxGL.SymbolLayer
            id="beacons-label"
            style={{
              textField: ['get', 'name'],
              textSize: 11,
              textColor: '#000000',
              textHaloColor: '#FFFFFF',
              textHaloWidth: 1,
              textOffset: [0, 1.5],
            }}
          />
        </MapboxGL.ShapeSource>
      )}

      {/* Lighthouses */}
      {aidsByType.lighthouse && (
        <MapboxGL.ShapeSource
          id="lighthouses-source"
          shape={createFeatureCollection(aidsByType.lighthouse)}
        >
          <MapboxGL.CircleLayer
            id="lighthouses-layer"
            style={{
              circleRadius: 12,
              circleColor: '#FF00FF',
              circleStrokeWidth: 3,
              circleStrokeColor: '#FFFFFF',
              circleOpacity: 1,
            }}
          />
          <MapboxGL.SymbolLayer
            id="lighthouses-label"
            style={{
              textField: ['get', 'name'],
              textSize: 12,
              textColor: '#000000',
              textHaloColor: '#FFFFFF',
              textHaloWidth: 2,
              textOffset: [0, 1.8],
              textFont: ['Open Sans Bold'],
            }}
          />
        </MapboxGL.ShapeSource>
      )}

      {/* Hazards */}
      {aidsByType.hazard && (
        <MapboxGL.ShapeSource
          id="hazards-source"
          shape={createFeatureCollection(aidsByType.hazard)}
        >
          <MapboxGL.CircleLayer
            id="hazards-layer"
            style={{
              circleRadius: 10,
              circleColor: '#FF0000',
              circleStrokeWidth: 2,
              circleStrokeColor: '#FFFFFF',
              circleOpacity: 0.9,
            }}
          />
          <MapboxGL.SymbolLayer
            id="hazards-label"
            style={{
              textField: '⚠',
              textSize: 16,
              textColor: '#FFFFFF',
              textOffset: [0, 0],
            }}
          />
        </MapboxGL.ShapeSource>
      )}

      {/* Depth Contours */}
      {aidsByType.depth_contour && (
        <MapboxGL.ShapeSource
          id="depth-contours-source"
          shape={createFeatureCollection(aidsByType.depth_contour)}
        >
          <MapboxGL.LineLayer
            id="depth-contours-layer"
            style={{
              lineColor: '#0000FF',
              lineWidth: 1,
              lineOpacity: 0.6,
              lineDasharray: [2, 2],
            }}
          />
        </MapboxGL.ShapeSource>
      )}
    </>
  );
};

export default NavigationAidsLayer;
