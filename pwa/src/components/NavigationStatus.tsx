import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActiveRoute, stopNavigation } from '@/store/slices/routesSlice';
import { useUnits } from '@/hooks/useUnits';
import { calculateRouteGuidance } from '@/utils/routeGuidance';
import { formatDuration } from '@/utils/routeCalculations';

const pad = (n: number) => String(n).padStart(2, '0');
const clockTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const bearing = (degrees: number) => `${String(Math.round(degrees) % 360).padStart(3, '0')}°`;

/** "14:05 (in 1h 20m)", or a dash when the boat isn't moving */
function etaText(eta: Date | null, now: number): string {
  if (!eta) return '--';
  return `${clockTime(eta)} (in ${formatDuration((eta.getTime() - now) / 3_600_000)})`;
}

/**
 * Route-guidance panel for the chart: bearing and distance to the next
 * waypoint, cross-track error and ETAs while a route is being navigated.
 */
export function NavigationStatus() {
  const dispatch = useAppDispatch();
  const position = useAppSelector((state) => state.navigation.position);
  const sog = useAppSelector((state) => state.navigation.speed);
  const { activeWaypointIndex, isNavigating, navigationStart, routeCompleted } = useAppSelector(
    (state) => state.routes
  );
  const route = useAppSelector((state) =>
    state.routes.routes.find((r) => r.id === state.routes.activeRouteId)
  );
  const units = useUnits();

  // ETAs count from the time of the latest fix, so they move on with each update
  const now = position?.timestamp ?? 0;
  const guidance =
    isNavigating && route && position
      ? calculateRouteGuidance({
          route,
          activeIndex: activeWaypointIndex,
          position,
          sog,
          navigationStart,
          now,
        })
      : null;

  if (!route) return null;

  if (routeCompleted) {
    return (
      <section
        aria-label="Route guidance"
        className="bg-surface/95 rounded-lg shadow-lg p-3 text-sm w-72"
      >
        <div className="font-semibold">Arrived</div>
        <div className="text-gray-600">End of route {route.name}</div>
        <button
          onClick={() => dispatch(setActiveRoute(null))}
          className="mt-2 px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
        >
          Close
        </button>
      </section>
    );
  }

  if (!isNavigating) return null;

  const total = route.waypoints.length;
  const xte = guidance?.crossTrackError ?? null;
  // Right of the leg means steer to port to get back on it
  const xteSide = xte === null || Math.abs(xte) < 0.005 ? '' : xte > 0 ? ' R' : ' L';

  return (
    <section
      aria-label="Route guidance"
      className="bg-surface/95 rounded-lg shadow-lg p-3 text-sm w-72"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="font-semibold truncate">{route.name}</div>
          <div className="text-gray-600 truncate" data-testid="guidance-waypoint">
            To {activeWaypointIndex + 1}/{total}: {route.waypoints[activeWaypointIndex]?.name}
          </div>
        </div>
        <button
          onClick={() => dispatch(stopNavigation())}
          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 shrink-0"
        >
          Stop
        </button>
      </div>

      {guidance ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
          <dt className="text-gray-500">BRG</dt>
          <dd className="font-mono text-right" data-testid="guidance-bearing">
            {bearing(guidance.bearingToWaypoint)}
          </dd>
          <dt className="text-gray-500">DTW</dt>
          <dd className="font-mono text-right" data-testid="guidance-distance">
            {units.format('distance', guidance.distanceToWaypoint)}
          </dd>
          <dt className="text-gray-500">XTE</dt>
          <dd
            className={`font-mono text-right ${
              xte !== null && Math.abs(xte) > 0.1 ? 'text-red-600' : ''
            }`}
            data-testid="guidance-xte"
          >
            {xte === null ? '--' : `${units.format('distance', Math.abs(xte))}${xteSide}`}
          </dd>
          <dt className="text-gray-500">ETA WPT</dt>
          <dd className="font-mono text-right" data-testid="guidance-eta-waypoint">
            {etaText(guidance.etaWaypoint, now)}
          </dd>
          <dt className="text-gray-500">ETA END</dt>
          <dd className="font-mono text-right" data-testid="guidance-eta-route">
            {etaText(guidance.etaRoute, now)}
          </dd>
          <dt className="text-gray-500">To go</dt>
          <dd className="font-mono text-right" data-testid="guidance-remaining">
            {units.format('distance', guidance.remainingDistance)}
          </dd>
        </dl>
      ) : (
        <div className="text-gray-500">Waiting for a position…</div>
      )}
    </section>
  );
}
