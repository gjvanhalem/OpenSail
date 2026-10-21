import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { useUnits } from '@/hooks/useUnits';
import { useGaugeAlert } from '@/hooks/useGaugeAlert';
import { GaugeCard, GAUGE_COLORS as C } from './GaugeCard';
import {
  arcPath,
  DEFAULT_SPEED_GAUGE_MAX,
  polar,
  SPEED_DIAL_START,
  SPEED_DIAL_SWEEP,
  SPEED_GAUGE_RANGES,
  speedAngle,
} from './dial';

interface SpeedGaugeProps {
  className?: string;
}

const END = SPEED_DIAL_START + SPEED_DIAL_SWEEP;

/**
 * Boat speed: a 270° dial that fills up to the speed, the number in the middle.
 * Speed through the water from the log when there is one, otherwise SOG.
 */
export const SpeedGauge: React.FC<SpeedGaugeProps> = React.memo(({ className = '' }) => {
  const speed = useSelector((state: RootState) => state.navigation.speed);
  const waterSpeed = useSelector((state: RootState) => state.instruments.waterSpeed);
  const storedMax = useSelector((state: RootState) => state.settings.settings.speedGaugeMax);
  const units = useUnits();
  const alert = useGaugeAlert('speed');

  const max = SPEED_GAUGE_RANGES[storedMax] ? storedMax : DEFAULT_SPEED_GAUGE_MAX;
  const { major, minor } = SPEED_GAUGE_RANGES[max];
  const value = waterSpeed ?? speed;
  const angle = speedAngle(value ?? 0, max);
  const [mx, my] = polar(angle, 80);

  const ticks: React.ReactNode[] = [];
  for (let s = 0; s <= max + 1e-9; s += minor) {
    const a = speedAngle(s, max);
    const isMajor = Math.abs(s / major - Math.round(s / major)) < 1e-9;
    const [x0, y0] = polar(a, 94);
    const [x1, y1] = polar(a, isMajor ? 86 : 90);
    ticks.push(<line key={`t${s}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke={C.muted} strokeWidth={2} />);
    if (isMajor) {
      const [tx, ty] = polar(a, 66);
      ticks.push(
        <text key={`l${s}`} x={tx} y={ty + 4} textAnchor="middle" fontSize={12} fill={C.muted}>
          {units.value('speed', s, 0)}
        </text>
      );
    }
  }

  return (
    <GaugeCard
      title="SPEED"
      reference={waterSpeed !== null ? 'STW' : speed !== null ? 'SOG' : undefined}
      alert={alert}
      className={className}
      footer={
        value === null ? (
          <span>No data</span>
        ) : waterSpeed !== null && speed !== null ? (
          <span>
            <span data-testid="sog-readout">SOG {units.value('speed', speed)}</span> {units.label('speed')}
          </span>
        ) : (
          <span>{waterSpeed !== null ? 'Log' : 'GPS'}</span>
        )
      }
    >
      <svg viewBox="0 0 200 180" className="w-full max-w-60" role="img" aria-label="Speed dial">
        <path d={arcPath(SPEED_DIAL_START, END, 80)} fill="none" stroke={C.track} strokeWidth={12} strokeLinecap="round" />
        {value !== null && (
          <>
            {angle > SPEED_DIAL_START && (
              <path d={arcPath(SPEED_DIAL_START, angle, 80)} fill="none" stroke={C.accent} strokeWidth={12} strokeLinecap="round" />
            )}
            <circle cx={mx} cy={my} r={9} fill={C.ink} />
          </>
        )}
        {ticks}
        <text
          x={100}
          y={112}
          textAnchor="middle"
          fontSize={46}
          fontWeight={700}
          fill={value === null ? C.muted : C.ink}
          data-testid="speed-readout"
        >
          {value === null ? '--' : units.value('speed', value)}
        </text>
        <text x={100} y={136} textAnchor="middle" fontSize={14} fill={C.muted}>
          {units.label('speed')}
        </text>
      </svg>
    </GaugeCard>
  );
});

SpeedGauge.displayName = 'SpeedGauge';
