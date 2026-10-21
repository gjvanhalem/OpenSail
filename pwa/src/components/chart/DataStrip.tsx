import React from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { useUnits } from '@/hooks/useUnits';

const angle = (degrees: number | null) =>
  degrees === null ? '--' : `${String(Math.round(degrees) % 360).padStart(3, '0')}°`;

interface Cell {
  key: string;
  label: string;
  value: string;
  unit?: string;
  alarm: boolean;
  /** Left out on a phone, where three cells fit */
  wideOnly?: boolean;
}

/**
 * The instruments that matter while looking at the chart: SOG, COG, depth,
 * heading and apparent wind speed. A cell turns red while its alert is active.
 * Tapping the strip opens the Instruments page.
 */
export const DataStrip: React.FC = () => {
  const { speed, course, heading } = useAppSelector((state) => state.navigation);
  const { depth, windSpeed } = useAppSelector((state) => state.instruments);
  const active = useAppSelector((state) => state.alerts.active);
  const units = useUnits();

  const cells: Cell[] = [
    {
      key: 'sog',
      label: 'SOG',
      value: speed === null ? '--' : units.value('speed', speed),
      unit: units.label('speed'),
      alarm: !!active.speed,
    },
    { key: 'cog', label: 'COG', value: angle(course), alarm: false },
    {
      key: 'depth',
      label: 'DEPTH',
      value: depth === null ? '--' : units.value('depth', depth),
      unit: units.label('depth'),
      alarm: !!active.depth,
    },
    { key: 'hdg', label: 'HDG', value: angle(heading), alarm: false, wideOnly: true },
    {
      key: 'aws',
      label: 'AWS',
      value: windSpeed === null ? '--' : units.value('windSpeed', windSpeed, 0),
      unit: units.label('windSpeed'),
      alarm: !!active.windSpeed,
      wideOnly: true,
    },
  ];

  return (
    <Link
      to="/instruments"
      aria-label="Instruments"
      title="All instruments"
      data-testid="data-strip"
      className="flex overflow-hidden rounded-xl bg-gauge text-gauge-ink shadow-lg tabular-nums"
    >
      {cells.map((cell) => (
        <div
          key={cell.key}
          data-testid={`strip-${cell.key}`}
          className={`border-l border-white/10 px-3 py-1.5 first:border-l-0 md:px-4 ${
            cell.wideOnly ? 'hidden md:block' : ''
          } ${cell.alarm ? 'bg-danger' : ''}`}
        >
          <div className="text-[11px] font-semibold tracking-widest text-gauge-muted">{cell.label}</div>
          <div className="text-xl font-bold leading-tight md:text-2xl">
            {cell.value}
            {cell.unit && cell.value !== '--' && (
              <span className="ml-1 text-xs font-medium text-gauge-muted">{cell.unit}</span>
            )}
          </div>
        </div>
      ))}
    </Link>
  );
};
