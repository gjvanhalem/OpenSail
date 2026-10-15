import React, { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store';
import { deleteRoute, startNavigation, stopNavigation } from '@/store/slices/routesSlice';
import { ChartView, DEFAULT_CHART_VIEW, RouteHazardLayer, RouteLayer } from '@/components/chart';
import {
  RouteHazardList,
  RoutePlannerUI,
  RouteSummary,
  useRouteHazards,
  useRoutePlanner,
} from '@/components/routes';
import { routeRepository } from '@/database/repositories/RouteRepository';
import type { Route, Waypoint } from '@/models';
import { useUnits } from '@/hooks/useUnits';

const MAP_ZOOM = 8;

/** Open on the vessel, or on the Dutch waters without a position */
function useMapCenter(): [number, number] {
  const position = useSelector((state: RootState) => state.navigation.position);
  return position
    ? [position.longitude, position.latitude]
    : [DEFAULT_CHART_VIEW.longitude, DEFAULT_CHART_VIEW.latitude];
}

interface RoutePlanningWorkspaceProps {
  routes: Route[];
  editingRouteId: string | null;
  onClose: () => void;
  onWaypointClick: (waypoint: Waypoint) => void;
}

/**
 * Map plus planner panel while a route is being created or edited.
 * Owns the planner state so that clicking the map adds a waypoint;
 * keyed by the parent so each planning session starts fresh.
 */
const RoutePlanningWorkspace: React.FC<RoutePlanningWorkspaceProps> = ({
  routes,
  editingRouteId,
  onClose,
  onWaypointClick,
}) => {
  const planner = useRoutePlanner({ onClose, editingRouteId });
  const mapCenter = useMapCenter();
  const { handleAddWaypoint, waypoints, routeName } = planner;

  const handleMapClick = useCallback(
    ({ latitude, longitude }: { latitude: number; longitude: number }) => {
      handleAddWaypoint({ latitude, longitude, accuracy: 0, timestamp: Date.now() });
    },
    [handleAddWaypoint]
  );

  // Show the draft in place of the route being edited
  const draftRoute: Route = {
    id: editingRouteId ?? 'draft',
    name: routeName,
    waypoints,
    totalDistance: planner.totalDistance,
    estimatedDuration: planner.estimatedDuration,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  const displayedRoutes = [...routes.filter((r) => r.id !== editingRouteId), draftRoute];
  // Shallow water and hazards along the route being planned (R2.5)
  const hazards = useRouteHazards(draftRoute);

  return (
    <>
      <ChartView center={mapCenter} zoom={MAP_ZOOM} onClick={handleMapClick} cursor="crosshair">
        <RouteLayer routes={displayedRoutes} visible={true} />
        <RouteHazardLayer warnings={hazards.warnings} />
      </ChartView>
      {waypoints.length >= 2 && (
        <div className="absolute top-4 left-4 z-10">
          <RouteHazardList hazards={hazards} />
        </div>
      )}

      <div className="absolute top-0 right-0 w-96 h-full shadow-lg">
        <RoutePlannerUI
          planner={planner}
          editingRouteId={editingRouteId}
          onClose={onClose}
          onWaypointClick={onWaypointClick}
        />
      </div>
    </>
  );
};

export const RoutesPage: React.FC = () => {
  const dispatch = useDispatch();
  const routes = useSelector((state: RootState) => state.routes.routes);
  const activeRouteId = useSelector((state: RootState) => state.routes.activeRouteId);
  const isNavigating = useSelector((state: RootState) => state.routes.isNavigating);
  const position = useSelector((state: RootState) => state.navigation.position);
  const units = useUnits();
  const mapCenter = useMapCenter();
  
  const [showPlanner, setShowPlanner] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [plannerSession, setPlannerSession] = useState(0);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  // Look the route up, so the summary follows edits
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;
  const selectedRouteHazards = useRouteHazards(showPlanner ? null : selectedRoute);

  // The app layout loads the saved routes (useRouteNavigation)

  const handleNewRoute = useCallback(() => {
    setEditingRouteId(null);
    setPlannerSession((n) => n + 1);
    setShowPlanner(true);
  }, []);

  const handleEditRoute = useCallback((routeId: string) => {
    setEditingRouteId(routeId);
    setPlannerSession((n) => n + 1);
    setShowPlanner(true);
  }, []);

  const handleDeleteRoute = useCallback(async (routeId: string) => {
    if (confirm('Are you sure you want to delete this route?')) {
      try {
        await routeRepository.delete(routeId);
        dispatch(deleteRoute(routeId));
      } catch (error) {
        console.error('Failed to delete route:', error);
      }
    }
  }, [dispatch]);

  const handleSelectRoute = useCallback((route: Route) => {
    setSelectedRouteId(route.id);
  }, []);

  const handleStartRoute = useCallback((routeId: string) => {
    dispatch(startNavigation(routeId, position));
  }, [dispatch, position]);

  const handleStopRoute = useCallback(() => {
    dispatch(stopNavigation());
  }, [dispatch]);

  const handleWaypointClick = useCallback((waypoint: Waypoint) => {
    console.log('Waypoint clicked:', waypoint);
    // Could center map on waypoint
  }, []);

  return (
    <div className="h-full flex">
      {/* Sidebar - Route List */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Routes</h1>
            <button
              onClick={handleNewRoute}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              + New Route
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {routes.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p className="mb-2">No routes yet</p>
              <p className="text-sm">Create your first route to get started</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className={`p-3 border rounded-md cursor-pointer hover:border-blue-300 ${
                    selectedRoute?.id === route.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => handleSelectRoute(route)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium">{route.name}</h3>
                      <div className="text-xs text-gray-500 mt-1">
                        {route.waypoints.length} waypoints
                      </div>
                    </div>
                    {isNavigating && activeRouteId === route.id && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                        Navigating
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>{units.format('distance', route.totalDistance, 1)}</span>
                    <span>{Math.floor(route.estimatedDuration)}h {Math.round((route.estimatedDuration % 1) * 60)}m</span>
                  </div>

                  <div className="flex gap-1">
                    {isNavigating && activeRouteId === route.id ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStopRoute();
                        }}
                        aria-label={`Stop navigating ${route.name}`}
                        className="flex-1 px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRoute(route.id);
                        }}
                        disabled={route.waypoints.length < 2}
                        aria-label={`Navigate ${route.name}`}
                        className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Navigate
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRoute(route.id!);
                      }}
                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoute(route.id!);
                      }}
                      className="flex-1 px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Map */}
      <div className="flex-1 relative">
        {showPlanner ? (
          <RoutePlanningWorkspace
            key={plannerSession}
            routes={routes}
            editingRouteId={editingRouteId}
            onClose={() => setShowPlanner(false)}
            onWaypointClick={handleWaypointClick}
          />
        ) : (
          <>
            <ChartView center={mapCenter} zoom={MAP_ZOOM}>
              <RouteLayer
                routes={selectedRoute ? [selectedRoute] : routes}
                visible={true}
              />
              {selectedRoute && <RouteHazardLayer warnings={selectedRouteHazards.warnings} />}
            </ChartView>
            {selectedRoute && (
              <div className="absolute top-4 left-4 z-10">
                <RouteSummary route={selectedRoute} />
                <div className="mt-2">
                  <RouteHazardList hazards={selectedRouteHazards} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
