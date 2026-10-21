import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { useUnits } from '@/hooks/useUnits';
import { useGaugeAlert } from '@/hooks/useGaugeAlert';
import { formatQuantity } from '@/utils/units';
import { normalizeInstrumentData } from '@/store/slices/instrumentNormalization';
import { InstrumentDataType } from '@/models';
import { GaugeCard, GAUGE_COLORS as C } from './GaugeCard';
import { depthState, depthTrend, recentSamples, type DepthSample } from './depthTrend';

interface DepthGaugeProps {
  className?: string;
}

const STATE_COLORS = { danger: C.danger, warning: C.warning, normal: C.ink } as const;

// The trend graph: deeper is lower, the surface at the top
const GRAPH = { x: 10, y: 120, width: 180, height: 56 };

/**
 * Depth as a large number that turns amber close to and red below the
 * shallow-water limit, with the last two minutes as a graph and the limit drawn in.
 */
export const DepthGauge: React.FC<DepthGaugeProps> = React.memo(({ className = '' }) => {
  const depth = useSelector((state: RootState) => state.instruments.depth);
  const stream = useSelector((state: RootState) => state.instruments.dataStreams[InstrumentDataType.Depth]);
  const threshold = useSelector((state: RootState) => state.settings.settings.alertThresholds.depth);
  const units = useUnits();
  const alert = useGaugeAlert('depth');

  const limit = threshold.enabled ? threshold.min : null;
  // Also show the other unit, for charts in feet or metres
  const secondary = units.label('depth') === 'ft' ? 'metric' : 'imperial';

  const samples = useMemo((): DepthSample[] => {
    const all = (stream ?? []).flatMap((data) => {
      const d = normalizeInstrumentData(data).depth;
      return d === undefined ? [] : [{ t: data.timestamp, depth: d }];
    });
    return all.length ? recentSamples(all, all[all.length - 1].t) : [];
  }, [stream]);
  const trend = depthTrend(samples);

  let line: string | null = null;
  let limitY: number | null = null;
  if (samples.length > 1) {
    const scale = Math.max(...samples.map((s) => s.depth), (limit ?? 0) * 2, 1);
    const t0 = samples[0].t;
    const span = Math.max(samples[samples.length - 1].t - t0, 1);
    line = samples
      .map((s) => {
        const x = GRAPH.x + ((s.t - t0) / span) * GRAPH.width;
        const y = GRAPH.y + (s.depth / scale) * GRAPH.height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    if (limit !== null) limitY = GRAPH.y + (limit / scale) * GRAPH.height;
  }

  return (
    <GaugeCard
      title="DEPTH"
      alert={alert}
      className={className}
      footer={
        depth === null ? (
          <span>No data</span>
        ) : (
          <>
            <span>{trend ? `${trend.kind[0].toUpperCase()}${trend.kind.slice(1)}` : 'Trend: waiting'}</span>
            {trend && trend.kind !== 'steady' && (
              <span>
                {units.value('depth', Math.abs(trend.rate))} {units.label('depth')}/min
              </span>
            )}
          </>
        )
      }
    >
      <svg viewBox="0 0 200 186" className="w-full max-w-60" role="img" aria-label="Depth and trend">
        <text
          x={100}
          y={74}
          textAnchor="middle"
          fontSize={60}
          fontWeight={700}
          fill={depth === null ? C.muted : STATE_COLORS[depthState(depth, limit)]}
          data-testid="depth-readout"
        >
          {depth === null ? '--' : units.value('depth', depth)}
        </text>
        <text x={100} y={98} textAnchor="middle" fontSize={14} fill={C.muted}>
          {units.label('depth')}
          {depth !== null && ` · ${formatQuantity('depth', depth, secondary)}`}
        </text>
        <rect x={GRAPH.x} y={GRAPH.y} width={GRAPH.width} height={GRAPH.height} rx={4} fill={C.track} />
        {limitY !== null && limit !== null && (
          <>
            <line x1={GRAPH.x} x2={GRAPH.x + GRAPH.width} y1={limitY} y2={limitY} stroke={C.danger} strokeWidth={2} strokeDasharray="5 4" />
            <text x={GRAPH.x + GRAPH.width - 2} y={limitY - 4} textAnchor="end" fontSize={11} fill={C.danger}>
              {units.format('depth', limit)} alarm
            </text>
          </>
        )}
        {line && <polyline points={line} fill="none" stroke={C.accent} strokeWidth={2.5} />}
      </svg>
    </GaugeCard>
  );
});

DepthGauge.displayName = 'DepthGauge';
