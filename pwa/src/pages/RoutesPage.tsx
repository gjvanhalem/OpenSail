import React, { useState, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store';
import { setRoutes, deleteRoute, setActiveRoute } from '@/store/slices/routesSlice';
import { ChartView, RouteLayer } from '@/components/chart';
import { RoutePlannerUI } from '@/components/routes';
import { routeRepository } from '@/database/repositories/RouteRepository';
import type { Route, Waypoint } from '@/models';

export const RoutesPage: React.FC = () => {
  const dispatch = useDispatch();
  const routes = useSelector((state: RootState) => state.routes.routes);
  const activeRouteId = useSelector((state: RootState) => state.routes.activeRouteId) as string | null;
  
  const [showPlanner, setShowPlanner] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  // Load routes from database on mount
  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const loadedRoutes = await routeRepository.getAll();
        dispatch(setRoutes(loadedRoutes));
      } catch (error) {
        console.error('Failed to load routes:', error);
      }
    };
    loadRoutes();
  }, [dispatch]);

  const handleNewRoute = useCallback(() => {
    setEditingRouteId(null);
    setShowPlanner(true);
  }, []);

  const handleEditRoute = useCallback((routeId: string) => {
    setEditingRouteId(routeId);
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
    setSelectedRoute(route);
    dispatch(setActiveRoute(route.id!));
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
                    {activeRouteId === route.id && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                        Active
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>{route.totalDistance.toFixed(1)} nm</span>
                    <span>{Math.floor(route.estimatedDuration)}h {Math.round((route.estimatedDuration % 1) * 60)}m</span>
                  </div>

                  <div className="flex gap-1">
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
        <ChartView
          center={[0, 51.5]}
          zoom={8}
        >
          <RouteLayer 
            routes={selectedRoute ? [selectedRoute] : routes} 
            visible={true} 
          />
        </ChartView>

        {/* Route Planner Overlay */}
        {showPlanner && (
          <div className="absolute top-0 right-0 w-96 h-full shadow-lg">
            <RoutePlannerUI
              editingRouteId={editingRouteId}
              onClose={() => {
                setShowPlanner(false);
              }}
              onWaypointClick={handleWaypointClick}
            />
          </div>
        )}
      </div>
    </div>
  );
};
