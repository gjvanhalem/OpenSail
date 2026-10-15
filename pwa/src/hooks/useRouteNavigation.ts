import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { advanceToNextWaypoint, setRoutes } from '@/store/slices/routesSlice';
import { showInfo } from '@/store/slices/notificationsSlice';
import { routeRepository } from '@/database/repositories/RouteRepository';
import { DEFAULT_ARRIVAL_RADIUS_NM, nextWaypointIndex } from '@/utils/routeGuidance';

/**
 * Follow the active route: whenever the position changes, advance past every
 * waypoint the boat is inside the arrival radius of. Also loads the saved
 * routes, so a route can be started from the chart. Mount once, in the app
 * layout.
 */
export function useRouteNavigation(): void {
  const dispatch = useAppDispatch();
  const position = useAppSelector((state) => state.navigation.position);
  const isNavigating = useAppSelector((state) => state.routes.isNavigating);
  const activeIndex = useAppSelector((state) => state.routes.activeWaypointIndex);
  const route = useAppSelector((state) =>
    state.routes.routes.find((r) => r.id === state.routes.activeRouteId)
  );
  const arrivalRadius = useAppSelector(
    (state) => state.settings.settings.arrivalRadius ?? DEFAULT_ARRIVAL_RADIUS_NM
  );

  useEffect(() => {
    let cancelled = false;
    routeRepository
      .getAll()
      .then((routes) => {
        if (!cancelled) dispatch(setRoutes(routes));
      })
      .catch((error) => console.error('Failed to load routes:', error));
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!isNavigating || !route || !position) return;
    const next = nextWaypointIndex(route, activeIndex, position, arrivalRadius);
    for (let i = activeIndex; i < next; i++) {
      dispatch(advanceToNextWaypoint());
    }
    if (next === activeIndex) return;
    dispatch(
      showInfo(
        next >= route.waypoints.length
          ? `Arrived: end of route ${route.name}`
          : `Waypoint reached. Next: ${route.waypoints[next].name}`
      )
    );
  }, [dispatch, isNavigating, route, activeIndex, position, arrivalRadius]);
}
