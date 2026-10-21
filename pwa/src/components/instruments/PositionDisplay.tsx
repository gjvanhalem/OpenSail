import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { formatCoordinate } from '@/utils/formatting';
import { GaugeCard } from './GaugeCard';

interface PositionDisplayProps {
  className?: string;
}

const SOURCE_LABELS = { gps: 'GPS', instrument: 'Instrument' } as const;

export const PositionDisplay: React.FC<PositionDisplayProps> = React.memo(({ className = '' }) => {
  const position = useSelector((state: RootState) => state.navigation.position);
  const source = useSelector((state: RootState) => state.navigation.sources.position);

  return (
    <GaugeCard
      title="POSITION"
      reference={source ? SOURCE_LABELS[source].toUpperCase() : undefined}
      className={className}
      footer={
        position ? (
          position.accuracy > 0 && <span>Accuracy ± {Math.round(position.accuracy)} m</span>
        ) : (
          <span>No data</span>
        )
      }
    >
      {position ? (
        <div className="py-4 text-center font-mono text-base @[15rem]:text-2xl font-bold leading-relaxed" data-testid="position-readout">
          <div>{formatCoordinate(position.latitude, true)}</div>
          <div>{formatCoordinate(position.longitude, false)}</div>
        </div>
      ) : (
        <div className="py-4 text-3xl font-bold text-slate-500">--</div>
      )}
    </GaugeCard>
  );
});

PositionDisplay.displayName = 'PositionDisplay';
