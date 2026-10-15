import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { formatCoordinate } from '@/utils/formatting';

interface PositionDisplayProps {
  className?: string;
}

const SOURCE_LABELS = { gps: 'GPS', instrument: 'Instrument' } as const;

export const PositionDisplay: React.FC<PositionDisplayProps> = React.memo(({ className = '' }) => {
  const position = useSelector((state: RootState) => state.navigation.position);
  const source = useSelector((state: RootState) => state.navigation.sources.position);

  return (
    <div className={`flex flex-col items-center justify-center p-4 bg-gray-800 rounded-lg ${className}`}>
      <div className="text-sm text-gray-400 mb-2">POSITION</div>
      {position ? (
        <div className="text-center font-mono text-white text-xl leading-relaxed" data-testid="position-readout">
          <div>{formatCoordinate(position.latitude, true)}</div>
          <div>{formatCoordinate(position.longitude, false)}</div>
        </div>
      ) : (
        <div className="text-3xl font-bold text-gray-500">--</div>
      )}
      <div className="mt-2 text-xs text-gray-500">{source ? SOURCE_LABELS[source] : 'No data'}</div>
    </div>
  );
});

PositionDisplay.displayName = 'PositionDisplay';
