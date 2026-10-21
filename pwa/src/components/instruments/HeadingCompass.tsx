import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { FooterValue, GaugeCard, GAUGE_COLORS as C } from './GaugeCard';
import { polar } from './dial';

interface HeadingCompassProps {
  className?: string;
}

const CARDINALS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const cardinal = (degrees: number) => CARDINALS[Math.round(degrees / 22.5) % 16];
const pad3 = (degrees: number) => String(Math.round(degrees) % 360).padStart(3, '0');

/**
 * True heading on a compass card that turns, so the heading is always under the
 * lubber mark at the top. A small ring on the edge marks the course over ground.
 */
export const HeadingCompass: React.FC<HeadingCompassProps> = React.memo(({ className = '' }) => {
  const heading = useSelector((state: RootState) => state.navigation.heading);
  const course = useSelector((state: RootState) => state.navigation.course);
  const hdg = heading ?? 0;

  const card: React.ReactNode[] = [];
  for (let d = 0; d < 360; d += 10) {
    const major = d % 30 === 0;
    const [x0, y0] = polar(d - hdg, 80);
    const [x1, y1] = polar(d - hdg, major ? 68 : 74);
    card.push(
      <line key={d} x1={x0} y1={y0} x2={x1} y2={y1} stroke={C.muted} strokeWidth={major ? 2.5 : 1.5} />
    );
  }
  for (const [d, label] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']] as const) {
    const [x, y] = polar(d - hdg, 56);
    card.push(
      <text key={label} x={x} y={y + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill={label === 'N' ? C.port : C.muted}>
        {label}
      </text>
    );
  }
  const cogMark = heading !== null && course !== null ? polar(course - hdg, 88) : null;

  return (
    <GaugeCard
      title="HEADING"
      reference={heading !== null ? 'TRUE' : undefined}
      className={className}
      footer={
        heading === null ? (
          <span>No data</span>
        ) : (
          <>
            <span>{cardinal(hdg)}</span>
            {course !== null && <FooterValue label="COG">{pad3(course)}° ●</FooterValue>}
          </>
        )
      }
    >
      <svg viewBox="0 0 200 200" className="w-full max-w-60" role="img" aria-label="Compass card">
        <circle cx={100} cy={100} r={80} fill="none" stroke={C.track} strokeWidth={6} />
        {heading !== null && card}
        {/* COG under the lubber mark, so the mark stays readable when they coincide */}
        {cogMark && <circle cx={cogMark[0]} cy={cogMark[1]} r={5} fill={C.ink} />}
        {/* Lubber mark: the bow */}
        <polygon points="100,4 91,22 109,22" fill={C.accent} />
        <text
          x={100}
          y={114}
          textAnchor="middle"
          fontSize={40}
          fontWeight={700}
          fill={heading === null ? C.muted : C.ink}
          data-testid="heading-readout"
        >
          {heading === null ? '---°' : `${pad3(hdg)}°`}
        </text>
      </svg>
    </GaugeCard>
  );
});

HeadingCompass.displayName = 'HeadingCompass';
