import React from 'react';
import type { Route } from '@/models';
import { useUnits } from '@/hooks/useUnits';
import { calculateRouteSummary, formatDuration, plannedSpeed } from '@/utils/routeCalculations';

const course = (degrees: number) => `${String(Math.round(degrees) % 360).padStart(3, '0')}°`;
const pad = (n: number) => String(n).padStart(2, '0');

function arrivalText(eta: Date, departure: Date): string {
  const time = `${pad(eta.getHours())}:${pad(eta.getMinutes())}`;
  const sameDay = eta.toDateString() === departure.toDateString();
  return sameDay ? time : `${eta.toLocaleDateString()} ${time}`;
}

export interface RouteSummaryProps {
  route: Route;
  /** When the passage starts; defaults to now */
  departure?: Date;
}

/** Total distance, ETA and course changes for a route (R2.4) */
export const RouteSummary: React.FC<RouteSummaryProps> = ({ route, departure }) => {
  const units = useUnits();
  const leaving = departure ?? new Date();
  const speed = plannedSpeed(route);
  const summary = calculateRouteSummary(route.waypoints, speed, leaving);

  return (
    <section aria-label="Route summary" className="bg-surface/95 rounded-lg shadow-lg p-4 text-sm w-80">
      <h2 className="font-semibold text-base mb-2">{route.name}</h2>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 mb-3">
        <dt className="text-gray-500">Total distance</dt>
        <dd className="text-right font-mono" data-testid="summary-distance">
          {units.format('distance', summary.totalDistance)}
        </dd>
        <dt className="text-gray-500">Time at {units.format('speed', speed)}</dt>
        <dd className="text-right font-mono" data-testid="summary-time">
          {formatDuration(summary.totalTime)}
        </dd>
        <dt className="text-gray-500">ETA leaving now</dt>
        <dd className="text-right font-mono" data-testid="summary-eta">
          {summary.eta ? arrivalText(summary.eta, leaving) : '--'}
        </dd>
      </dl>

      <h3 className="font-medium text-gray-700 mb-1">
        Course changes ({summary.courseChanges.length})
      </h3>
      {summary.legs.length > 0 && (
        <ol className="space-y-1 max-h-64 overflow-y-auto" data-testid="summary-course-changes">
          <li className="flex justify-between text-gray-600">
            <span>Start: {route.waypoints[0].name}</span>
            <span className="font-mono">{course(summary.legs[0].bearing)}</span>
          </li>
          {summary.courseChanges.map((change) => (
            <li key={change.waypoint.id} className="flex justify-between gap-2">
              <span className="truncate">
                {change.waypointIndex + 1}. {change.waypoint.name}
              </span>
              <span className="font-mono shrink-0">
                {course(change.fromCourse)} → {course(change.toCourse)}{' '}
                <span className={change.change > 0 ? 'text-green-700' : 'text-red-700'}>
                  {Math.abs(Math.round(change.change))}° {change.change > 0 ? 'stbd' : 'port'}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
