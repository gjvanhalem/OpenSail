import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { addRoute, updateRoute } from '@/store/slices/routesSlice';
import { routeRepository } from '@/database/repositories/RouteRepository';
import { calculateTotalDistance, estimateRouteTime } from '@/utils/routeCalculations';
import { DEFAULT_ARRIVAL_RADIUS_NM } from '@/utils/routeGuidance';
import type { Waypoint, Position } from '@/models';

export interface RoutePlannerProps {
  onClose?: () => void;
  editingRouteId?: string | null;
}

export interface RoutePlannerHook {
  routeName: string;
  setRouteName: React.Dispatch<React.SetStateAction<string>>;
  waypoints: Waypoint[];
  averageSpeed: number;
  setAverageSpeed: React.Dispatch<React.SetStateAction<number>>;
  totalDistance: number;
  estimatedDuration: number;
  isSaving: boolean;
  error: string | null;
  handleAddWaypoint: (position: Position, name?: string) => void;
  handleRemoveWaypoint: (waypointId: string) => void;
  handleUpdateWaypoint: (waypointId: string, updates: Partial<Waypoint>) => void;
  handleReorderWaypoints: (fromIndex: number, toIndex: number) => void;
  handleSave: () => Promise<void>;
  handleLoad: (routeId: string) => Promise<void>;
}

export const useRoutePlanner = ({ onClose, editingRouteId }: RoutePlannerProps): RoutePlannerHook => {
  const dispatch = useDispatch();
  const routes = useSelector((state: RootState) => state.routes.routes);
  const defaultArrivalRadius = useSelector(
    (state: RootState) => state.settings.settings.arrivalRadius ?? DEFAULT_ARRIVAL_RADIUS_NM
  );
  
  const editingRoute = editingRouteId 
    ? routes.find((r) => r.id === editingRouteId) 
    : null;

  const [routeName, setRouteName] = useState(editingRoute?.name || '');
  const [waypoints, setWaypoints] = useState<Waypoint[]>(editingRoute?.waypoints || []);
  const [averageSpeed, setAverageSpeed] = useState(5); // Default 5 knots
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate route metrics
  const totalDistance = calculateTotalDistance(waypoints);
  const estimatedDuration = estimateRouteTime(waypoints, averageSpeed);

  const handleAddWaypoint = useCallback((position: Position, name?: string) => {
    // Functional update: map click handlers may hold an older closure
    setWaypoints((prev) => [
      ...prev,
      {
        id: `waypoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        position,
        name: name || `Waypoint ${prev.length + 1}`,
        arrivalRadius: defaultArrivalRadius,
      },
    ]);
  }, [defaultArrivalRadius]);

  const handleRemoveWaypoint = useCallback((waypointId: string) => {
    setWaypoints(waypoints.filter(w => w.id !== waypointId));
  }, [waypoints]);

  const handleUpdateWaypoint = useCallback((waypointId: string, updates: Partial<Waypoint>) => {
    setWaypoints(waypoints.map(w => 
      w.id === waypointId ? { ...w, ...updates } : w
    ));
  }, [waypoints]);

  const handleReorderWaypoints = useCallback((fromIndex: number, toIndex: number) => {
    const newWaypoints = [...waypoints];
    const [removed] = newWaypoints.splice(fromIndex, 1);
    newWaypoints.splice(toIndex, 0, removed);
    setWaypoints(newWaypoints);
  }, [waypoints]);

  const handleSave = useCallback(async () => {
    if (!routeName.trim()) {
      setError('Route name is required');
      return;
    }

    if (waypoints.length < 2) {
      setError('Route must have at least 2 waypoints');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const routeData = {
        name: routeName,
        waypoints,
        totalDistance,
        estimatedDuration,
        createdAt: editingRoute?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      if (editingRouteId && editingRoute) {
        // Update existing route
        const updated = await routeRepository.update(editingRouteId, routeData);
        dispatch(updateRoute(updated));
      } else {
        // Create new route
        const created = await routeRepository.create(routeData);
        dispatch(addRoute(created));
      }

      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save route');
    } finally {
      setIsSaving(false);
    }
  }, [routeName, waypoints, totalDistance, estimatedDuration, editingRouteId, editingRoute, dispatch, onClose]);

  const handleLoad = useCallback(async (routeId: string) => {
    try {
      const route = await routeRepository.getById(routeId);
      if (route) {
        setRouteName(route.name);
        setWaypoints(route.waypoints);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load route');
    }
  }, []);

  return {
    routeName,
    setRouteName,
    waypoints,
    averageSpeed,
    setAverageSpeed,
    totalDistance,
    estimatedDuration,
    isSaving,
    error,
    handleAddWaypoint,
    handleRemoveWaypoint,
    handleUpdateWaypoint,
    handleReorderWaypoints,
    handleSave,
    handleLoad,
  };
};
