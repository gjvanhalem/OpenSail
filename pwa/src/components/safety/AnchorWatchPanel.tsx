import React, { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  dropAnchor,
  raiseAnchor,
  setAnchorPanelOpen,
  setAnchorRadius,
  type AnchorLogEntry,
} from '@/store/slices/safetySlice';
import { useWakeLockStatus } from '@/hooks/useAlarmOutput';
import type { SafetyEventType } from '@/database/db';
import { ANCHOR_RADIUS_MAX_M, ANCHOR_RADIUS_MIN_M, clampAnchorRadius } from '@/utils/safety';
import { formatCoordinate } from '@/utils/formatting';
import { clockTime } from './format';

const EVENT_LABELS: Partial<Record<SafetyEventType, string>> = {
  anchor_dropped: 'Anchor dropped',
  anchor_radius_changed: 'Radius changed',
  anchor_drag_alarm: 'DRAGGING alarm',
  anchor_back_inside: 'Back inside',
  anchor_gps_lost: 'GPS lost',
  anchor_gps_restored: 'GPS back',
  anchor_raised: 'Anchor raised',
};

const m = (metres: number | undefined | null) =>
  metres === undefined || metres === null ? '--' : `${Math.round(metres)} m`;

function logLine(entry: AnchorLogEntry): string {
  const label = EVENT_LABELS[entry.type] ?? entry.type;
  if (entry.type === 'anchor_radius_changed') return `${label} to ${m(entry.radiusM)}`;
  if (entry.type === 'anchor_dropped') return `${label}, circle ${m(entry.radiusM)}`;
  if (entry.distanceM !== undefined) return `${label} (${m(entry.distanceM)})`;
  return label;
}

/** Radius in metres: a slider and a number field kept in step */
const RadiusControl: React.FC<{ value: number; onChange: (metres: number) => void }> = ({
  value,
  onChange,
}) => {
  // What is being typed; null shows the value
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? String(value);
  const commit = () => {
    if (draft !== null) onChange(clampAnchorRadius(Number(draft)));
    setDraft(null);
  };
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={ANCHOR_RADIUS_MIN_M}
        max={ANCHOR_RADIUS_MAX_M}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Anchor watch radius slider"
        className="flex-1"
      />
      <label className="flex items-center gap-1 text-sm">
        <input
          type="number"
          min={ANCHOR_RADIUS_MIN_M}
          max={ANCHOR_RADIUS_MAX_M}
          value={text}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
          aria-label="Anchor watch radius (m)"
          className="w-16 px-1 py-0.5 border border-gray-300 rounded text-right"
        />
        m
      </label>
    </div>
  );
};

/**
 * Anchor watch (R8): pick a radius, drop anchor at the boat's position, then
 * the distance from the anchor, the alarm state and a timestamped log. When
 * minimised during a watch it stays on screen as a small status button.
 */
export const AnchorWatchPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.safety.anchorPanelOpen);
  const watch = useAppSelector((state) => state.safety.anchor);
  const position = useAppSelector((state) => state.navigation.position);
  const defaultRadius = useAppSelector((state) => state.settings.settings.anchorWatchRadius);
  const wakeLock = useWakeLockStatus();
  // A new watch starts with the radius from settings unless one is picked here
  const [chosenRadius, setChosenRadius] = useState<number | null>(null);
  const radius = chosenRadius ?? clampAnchorRadius(defaultRadius ?? 50);
  const [confirmRaise, setConfirmRaise] = useState(false);

  useEffect(() => {
    if (!confirmRaise) return;
    const timer = setTimeout(() => setConfirmRaise(false), 5000);
    return () => clearTimeout(timer);
  }, [confirmRaise]);

  if (!open && !watch) return null;

  const status = !watch
    ? null
    : watch.dragging
      ? { text: 'DRAGGING', className: 'bg-red-600 text-white' }
      : watch.gpsLost
        ? { text: 'NO POSITION', className: 'bg-orange-500 text-white' }
        : watch.poorAccuracy
          ? { text: 'GPS too inaccurate', className: 'bg-orange-100 text-orange-800' }
          : watch.distanceM === null
            ? { text: 'Waiting for a fix', className: 'bg-gray-100 text-gray-700' }
            : { text: 'Holding', className: 'bg-green-100 text-green-800' };

  if (!open && watch && status) {
    return (
      <button
        onClick={() => dispatch(setAnchorPanelOpen(true))}
        aria-label="Anchor watch status"
        data-testid="anchor-status-pill"
        className={`fixed z-[80] right-3 bottom-24 px-3 py-2 rounded-full shadow-lg font-semibold text-sm ${status.className}`}
      >
        <Icon name="anchor" className="inline w-4 h-4 mr-1 -mt-0.5" />{m(watch.distanceM)} / {m(watch.radiusM)} · {status.text}
      </button>
    );
  }

  return (
    <section
      aria-label="Anchor watch"
      className="fixed z-[80] right-3 bottom-24 w-80 max-w-[calc(100vw-1.5rem)] rounded-lg bg-surface shadow-2xl border border-gray-200 text-sm text-gray-900"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <h2 className="font-semibold flex items-center gap-2"><Icon name="anchor" className="w-5 h-5" /> Anchor watch</h2>
        <button
          onClick={() => dispatch(setAnchorPanelOpen(false))}
          className="px-2 py-1 rounded hover:bg-gray-100"
          aria-label={watch ? 'Minimise anchor watch' : 'Close anchor watch'}
        >
          {watch ? '–' : '✕'}
        </button>
      </div>

      <div className="p-3 space-y-3">
        {!watch ? (
          <>
            <div>
              <div className="text-gray-600 mb-1">Radius</div>
              <RadiusControl
                value={radius}
                onChange={(r) => setChosenRadius(clampAnchorRadius(r))}
              />
              <p className="text-xs text-gray-500 mt-1">
                At least the anchor rode plus the boat length. The watch uses the boat's position
                as the anchor, so drop it when you are right above the anchor.
              </p>
            </div>
            <button
              onClick={() => {
                dispatch(dropAnchor(radius));
                setChosenRadius(null);
              }}
              disabled={!position}
              className="w-full px-3 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-600"
            >
              Drop anchor here
            </button>
            {!position && (
              <p className="text-xs text-orange-700">Needs a position fix (GPS or instruments).</p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span
                className={`px-2 py-1 rounded font-bold ${status!.className}`}
                data-testid="anchor-status"
              >
                {status!.text}
              </span>
              <span className="font-mono text-lg" data-testid="anchor-distance">
                {m(watch.distanceM)} / {m(watch.radiusM)}
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-0.5">
              <div>
                Max {m(watch.maxDistanceM)} · dropped {clockTime(watch.droppedAt)}
              </div>
              <div className="font-mono" data-testid="anchor-position">
                {formatCoordinate(watch.anchor.latitude, true)}{' '}
                {formatCoordinate(watch.anchor.longitude, false)}
              </div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Radius</div>
              <RadiusControl
                value={watch.radiusM}
                onChange={(r) => dispatch(setAnchorRadius(r))}
              />
            </div>
            {(wakeLock === 'unsupported' || wakeLock === 'denied') && (
              <p className="text-xs text-orange-700">
                This browser can't keep the screen on. Set auto-lock to "never" and keep this
                page open, or the watch stops when the device sleeps.
              </p>
            )}
            <div>
              <div className="text-gray-600 mb-1">Log</div>
              <ol className="max-h-32 overflow-y-auto text-xs space-y-0.5" data-testid="anchor-log">
                {watch.log.map((entry, i) => (
                  <li key={`${entry.time}-${i}`} className="flex gap-2">
                    <span className="font-mono text-gray-500">{clockTime(entry.time)}</span>
                    <span>{logLine(entry)}</span>
                  </li>
                ))}
              </ol>
            </div>
            <button
              onClick={() => {
                if (confirmRaise) {
                  setConfirmRaise(false);
                  dispatch(raiseAnchor());
                } else {
                  setConfirmRaise(true);
                }
              }}
              className={`w-full px-3 py-2 rounded font-semibold ${
                confirmRaise
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {confirmRaise ? 'Tap again to stop the watch' : 'Raise anchor (stop watch)'}
            </button>
          </>
        )}
      </div>
    </section>
  );
};
