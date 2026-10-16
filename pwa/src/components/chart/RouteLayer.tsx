import React from 'react';
import { Source, Layer, Marker } from 'react-map-gl/maplibre';
import type { Position, Route } from '@/models';

/** The leg being navigated: from `from` to waypoint `waypointIndex` of route `routeId` */
export interface ActiveLeg {
  routeId: string;
  waypointIndex: number;
  /** Start of the leg; null for a first leg without a known start */
  from: Position | null;
}

export interface RouteLayerProps {
  routes: Route[];
  visible?: boolean;
  activeLeg?: ActiveLeg | null;
}

export const RouteLayer: React.FC<RouteLayerProps> = React.memo(
  ({ routes, visible = true, activeLeg = null }) => {
    if (!visible || routes.length === 0) {
      return null;
    }

    return (
      <>
        {routes.map((route) => {
          // Create GeoJSON LineString for the route
          const lineCoordinates = route.waypoints.map((wp) => [
            wp.position.longitude,
            wp.position.latitude,
          ]);

          const lineGeoJSON = {
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: lineCoordinates,
            },
            properties: {
              routeId: route.id,
              routeName: route.name,
            },
          };

          const isActive = activeLeg?.routeId === route.id;
          const target = isActive ? route.waypoints[activeLeg.waypointIndex] : undefined;
          const legGeoJSON =
            isActive && target && activeLeg.from
              ? {
                  type: 'Feature' as const,
                  geometry: {
                    type: 'LineString' as const,
                    coordinates: [
                      [activeLeg.from.longitude, activeLeg.from.latitude],
                      [target.position.longitude, target.position.latitude],
                    ],
                  },
                  properties: { routeId: route.id },
                }
              : null;

          return (
            <React.Fragment key={route.id}>
              {/* Route line */}
              <Source id={`route-${route.id}`} type="geojson" data={lineGeoJSON}>
                <Layer
                  id={`route-line-${route.id}`}
                  type="line"
                  paint={{
                    'line-color': '#8b5cf6',
                    'line-width': 3,
                    'line-opacity': 0.8,
                  }}
                />
              </Source>

              {/* The leg being navigated, drawn over the route line */}
              {legGeoJSON && (
                <Source id={`route-active-leg-${route.id}`} type="geojson" data={legGeoJSON}>
                  <Layer
                    id={`route-active-leg-line-${route.id}`}
                    type="line"
                    paint={{
                      'line-color': '#f59e0b',
                      'line-width': 5,
                      'line-opacity': 0.95,
                    }}
                  />
                </Source>
              )}

              {/* Waypoint markers */}
              {route.waypoints.map((waypoint, index) => {
                const isTarget = isActive && index === activeLeg.waypointIndex;
                return (
                <Marker
                  key={waypoint.id}
                  longitude={waypoint.position.longitude}
                  latitude={waypoint.position.latitude}
                  anchor="center"
                >
                  <div
                    className="relative"
                    data-testid="waypoint-marker"
                    data-active={isTarget ? 'true' : undefined}
                  >
                    {/* Waypoint circle; the one being steered for stands out */}
                    <div
                      className={`w-6 h-6 border-2 rounded-full flex items-center justify-center shadow-lg ${
                        isTarget
                          ? 'bg-amber-500 border-amber-200 ring-4 ring-amber-400/60'
                          : 'bg-purple-600 border-white'
                      }`}
                    >
                      <span className="text-white text-xs font-bold">{index + 1}</span>
                    </div>
                    {/* Waypoint name tooltip */}
                    {waypoint.name && (
                      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow-md text-xs whitespace-nowrap">
                        {waypoint.name}
                      </div>
                    )}
                  </div>
                </Marker>
                );
              })}
            </React.Fragment>
          );
        })}
      </>
    );
  }
);

RouteLayer.displayName = 'RouteLayer';
