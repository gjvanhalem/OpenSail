import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { startNavigation, stopNavigation } from '@/store/slices/routesSlice';

/** Start a saved route from the chart, or stop the active one */
export const RouteNavigationControl: React.FC = () => {
  const dispatch = useAppDispatch();
  const routes = useAppSelector((state) => state.routes.routes);
  const isNavigating = useAppSelector((state) => state.routes.isNavigating);
  const activeRouteId = useAppSelector((state) => state.routes.activeRouteId);
  const position = useAppSelector((state) => state.navigation.position);
  const [chosenRouteId, setChosenRouteId] = useState('');

  const navigable = routes.filter((route) => route.waypoints.length >= 2);
  const activeRoute = routes.find((route) => route.id === activeRouteId);

  if (isNavigating && activeRoute) {
    return (
      <button
        onClick={() => dispatch(stopNavigation())}
        className="bg-surface px-4 py-2 rounded-lg shadow-lg hover:bg-gray-50 text-sm"
      >
        Stop route
      </button>
    );
  }

  if (navigable.length === 0) return null;

  // Default to the route navigated last, then the first saved route
  const selectedId =
    navigable.find((route) => route.id === chosenRouteId)?.id ??
    navigable.find((route) => route.id === activeRouteId)?.id ??
    navigable[0].id;

  return (
    <div className="bg-surface rounded-lg shadow-lg p-2 flex flex-col gap-2 text-sm">
      <select
        aria-label="Route to navigate"
        value={selectedId}
        onChange={(e) => setChosenRouteId(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 max-w-[12rem]"
      >
        {navigable.map((route) => (
          <option key={route.id} value={route.id}>
            {route.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => dispatch(startNavigation(selectedId, position))}
        className="bg-green-600 text-white rounded px-3 py-1.5 hover:bg-green-700"
      >
        Start route
      </button>
    </div>
  );
};
