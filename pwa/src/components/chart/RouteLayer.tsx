import React from 'react';
import { Source, Layer, Marker } from 'react-map-gl/mapbox';
import type { Route } from '@/models';

export interface RouteLayerProps {
  routes: Route[];
  visible?: boolean;
}

export const RouteLayer: React.FC<RouteLayerProps> = React.memo(
  ({ routes, visible = true }) => {
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

              {/* Waypoint markers */}
              {route.waypoints.map((waypoint, index) => (
                <Marker
                  key={waypoint.id}
                  longitude={waypoint.position.longitude}
                  latitude={waypoint.position.latitude}
                  anchor="center"
                >
                  <div className="relative">
                    {/* Waypoint circle */}
                    <div className="w-6 h-6 bg-purple-600 border-2 border-white rounded-full flex items-center justify-center shadow-lg">
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
              ))}
            </React.Fragment>
          );
        })}
      </>
    );
  }
);

RouteLayer.displayName = 'RouteLayer';
