import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

interface SpeedGaugeProps {
  className?: string;
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = React.memo(({ className = '' }) => {
  const speed = useSelector((state: RootState) => state.navigation.speed);
  const waterSpeed = useSelector((state: RootState) => state.instruments.waterSpeed);

  // Use water speed if available, otherwise GPS speed
  const displaySpeed = waterSpeed ?? speed ?? 0;
  const speedKnots = displaySpeed; // Already in knots from parsers

  // Calculate gauge rotation (0-30 knots range)
  const maxSpeed = 30;
  const rotation = Math.min((speedKnots / maxSpeed) * 180 - 90, 90);

  return (
    <div className={`flex flex-col items-center justify-center p-4 bg-gray-800 rounded-lg ${className}`}>
      <div className="text-sm text-gray-400 mb-2">SPEED</div>
      
      {/* Gauge */}
      <div className="relative w-32 h-32">
        {/* Background arc */}
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <path
            d="M 10 90 A 40 40 0 0 1 90 90"
            fill="none"
            stroke="#374151"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Active arc */}
          <path
            d="M 10 90 A 40 40 0 0 1 90 90"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(speedKnots / maxSpeed) * 126} 126`}
            className="transition-all duration-300"
          />
          {/* Needle */}
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="20"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${rotation} 50 50)`}
            className="transition-transform duration-300"
          />
          {/* Center dot */}
          <circle cx="50" cy="50" r="3" fill="#ef4444" />
        </svg>
        
        {/* Scale markers */}
        <div className="absolute inset-0 flex items-end justify-between px-2 pb-2 text-xs text-gray-500">
          <span>0</span>
          <span>15</span>
          <span>30</span>
        </div>
      </div>
      
      {/* Digital readout */}
      <div className="mt-2 text-center">
        <div className="text-3xl font-bold text-white">
          {speedKnots.toFixed(1)}
        </div>
        <div className="text-xs text-gray-400">knots</div>
      </div>
      
      {/* Data source indicator */}
      <div className="mt-1 text-xs text-gray-500">
        {waterSpeed !== null ? 'Log' : speed !== null ? 'GPS' : 'No data'}
      </div>
    </div>
  );
});

SpeedGauge.displayName = 'SpeedGauge';
