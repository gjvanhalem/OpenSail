import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { useUnits } from '@/hooks/useUnits';
import { useGaugeAlert } from '@/hooks/useGaugeAlert';
import { trueWind, windSide } from '@/utils/wind';
import { FooterValue, GaugeCard, GAUGE_COLORS as C } from './GaugeCard';
import { arcPath, polar } from './dial';

interface WindGaugeProps {
  className?: string;
}

const pad3 = (degrees: number) => String(Math.round(degrees) % 360).padStart(3, '0');

/**
 * Apparent wind on a boat-relative dial: the bow at the top, red and green
 * close-hauled sectors on port and starboard, the pointer where the wind comes
 * from. True wind (TWS, TWA, TWD) is worked out from the boat speed and shown
 * underneath only when the boat speed is known.
 */
export const WindGauge: React.FC<WindGaugeProps> = React.memo(({ className = '' }) => {
  const windSpeed = useSelector((state: RootState) => state.instruments.windSpeed);
  const windAngle = useSelector((state: RootState) => state.instruments.windDirection);
  const waterSpeed = useSelector((state: RootState) => state.instruments.waterSpeed);
  const sog = useSelector((state: RootState) => state.navigation.speed);
  const heading = useSelector((state: RootState) => state.navigation.heading);
  const units = useUnits();
  const alert = useGaugeAlert('windSpeed');

  // Speed through the water gives the wind over the water; SOG is the fallback
  const boatSpeed = waterSpeed ?? sog;
  const truth =
    windSpeed !== null && windAngle !== null && boatSpeed !== null
      ? trueWind(windSpeed, windAngle, boatSpeed, heading)
      : null;
  const apparent = windAngle === null ? null : windSide(windAngle);

  const ticks = Array.from({ length: 12 }, (_, i) => i * 30).map((a) => {
    const [x0, y0] = polar(a, 80);
    const [x1, y1] = polar(a, a % 90 ? 73 : 68);
    return <line key={a} x1={x0} y1={y0} x2={x1} y2={y1} stroke={C.muted} strokeWidth={2} />;
  });

  let pointer: string | null = null;
  if (windAngle !== null) {
    const [tx, ty] = polar(windAngle, 84);
    const [lx, ly] = polar(windAngle - 8, 99);
    const [rx, ry] = polar(windAngle + 8, 99);
    pointer = `${tx},${ty} ${lx},${ly} ${rx},${ry}`;
  }

  return (
    <GaugeCard
      title="WIND"
      reference="APPARENT"
      alert={alert}
      className={className}
      footer={
        windSpeed === null ? (
          <span>No data</span>
        ) : truth ? (
          <>
            <FooterValue label="TWS">
              <span data-testid="tws-readout">{units.value('windSpeed', truth.speed)}</span>{' '}
              {units.label('windSpeed')}
            </FooterValue>
            <FooterValue label="TWA">
              <span data-testid="twa-readout">
                {windSide(truth.angle).degrees.toFixed(0)}° {windSide(truth.angle).side}
              </span>
            </FooterValue>
            {truth.direction !== null && (
              <FooterValue label="TWD">
                <span data-testid="twd-readout">{pad3(truth.direction)}°</span>
              </FooterValue>
            )}
          </>
        ) : (
          <span>True wind needs the boat speed</span>
        )
      }
    >
      <svg viewBox="0 0 200 200" className="w-full max-w-60" role="img" aria-label="Apparent wind dial">
        <circle cx={100} cy={100} r={80} fill="none" stroke={C.track} strokeWidth={6} />
        <path d={arcPath(20, 60, 80)} fill="none" stroke={C.starboard} strokeWidth={8} />
        <path d={arcPath(300, 340, 80)} fill="none" stroke={C.port} strokeWidth={8} />
        {ticks}
        {/* The bow */}
        <polygon points="100,26 93,40 107,40" fill={C.muted} />
        {pointer && <polygon points={pointer} fill={C.accent} />}
        <text
          x={100}
          y={106}
          textAnchor="middle"
          fontSize={40}
          fontWeight={700}
          fill={windSpeed === null ? C.muted : C.ink}
          data-testid="wind-speed-readout"
        >
          {windSpeed === null ? '--' : units.value('windSpeed', windSpeed)}
        </text>
        <text x={100} y={126} textAnchor="middle" fontSize={13} fill={C.muted}>
          {units.label('windSpeed')}
        </text>
        {apparent && (
          <text x={100} y={146} textAnchor="middle" fontSize={14} fill={C.ink}>
            AWA <tspan data-testid="wind-angle-readout">{apparent.degrees.toFixed(0)}° {apparent.side}</tspan>
          </text>
        )}
      </svg>
    </GaugeCard>
  );
});

WindGauge.displayName = 'WindGauge';
