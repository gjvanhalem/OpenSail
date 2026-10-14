import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { useUnits } from '@/hooks/useUnits';
import { useGaugeAlert, GAUGE_ALERT_CLASSES } from '@/hooks/useGaugeAlert';
import { GaugeAlert } from '@/components/alerts/GaugeAlert';

interface WindGaugeProps {
  className?: string;
}

export const WindGauge: React.FC<WindGaugeProps> = React.memo(({ className = '' }) => {
  const windSpeed = useSelector((state: RootState) => state.instruments.windSpeed);
  const windDirection = useSelector((state: RootState) => state.instruments.windDirection);
  const heading = useSelector((state: RootState) => state.navigation.heading);
  const units = useUnits();
  const alert = useGaugeAlert('windSpeed');

  const displaySpeed = windSpeed ?? 0;
  const displayDirection = windDirection ?? 0;
  
  // Convert to apparent wind angle relative to bow (0° = from bow, 180° = from stern)
  const apparentWindAngle = displayDirection;
  
  // Calculate true wind direction if we have heading
  const trueWindDirection = heading !== null 
    ? (heading + displayDirection) % 360 
    : null;

  // Calculate gauge rotation for wind arrow
  const arrowRotation = apparentWindAngle;

  // Get wind strength description
  const getWindStrength = (speed: number): string => {
    if (speed < 1) return 'Calm';
    if (speed < 4) return 'Light air';
    if (speed < 7) return 'Light breeze';
    if (speed < 11) return 'Gentle breeze';
    if (speed < 17) return 'Moderate breeze';
    if (speed < 22) return 'Fresh breeze';
    if (speed < 28) return 'Strong breeze';
    if (speed < 34) return 'Near gale';
    if (speed < 41) return 'Gale';
    if (speed < 48) return 'Strong gale';
    if (speed < 56) return 'Storm';
    if (speed < 64) return 'Violent storm';
    return 'Hurricane';
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-4 bg-gray-800 rounded-lg ${alert ? GAUGE_ALERT_CLASSES : ''} ${className}`}
    >
      <div className="text-sm text-gray-400 mb-2">WIND</div>
      
      {/* Compass rose with wind arrow */}
      <div className="relative w-32 h-32">
        {/* Compass background */}
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Outer circle */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="#374151" strokeWidth="2" />
          
          {/* Cardinal directions */}
          <text x="50" y="12" textAnchor="middle" fill="#9ca3af" fontSize="10" fontWeight="bold">N</text>
          <text x="88" y="54" textAnchor="middle" fill="#9ca3af" fontSize="10">E</text>
          <text x="50" y="92" textAnchor="middle" fill="#9ca3af" fontSize="10">S</text>
          <text x="12" y="54" textAnchor="middle" fill="#9ca3af" fontSize="10">W</text>
          
          {/* Degree markers */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
            const rad = (angle - 90) * Math.PI / 180;
            const x1 = 50 + 40 * Math.cos(rad);
            const y1 = 50 + 40 * Math.sin(rad);
            const x2 = 50 + 45 * Math.cos(rad);
            const y2 = 50 + 45 * Math.sin(rad);
            return (
              <line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#4b5563"
                strokeWidth="1"
              />
            );
          })}
          
          {/* Wind arrow */}
          <g transform={`rotate(${arrowRotation} 50 50)`} className="transition-transform duration-500">
            {/* Arrow shaft */}
            <line x1="50" y1="50" x2="50" y2="15" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
            {/* Arrow head */}
            <polygon points="50,10 45,20 55,20" fill="#3b82f6" />
            {/* Arrow tail */}
            <line x1="45" y1="50" x2="55" y2="50" stroke="#3b82f6" strokeWidth="2" />
          </g>
          
          {/* Center dot */}
          <circle cx="50" cy="50" r="3" fill="#3b82f6" />
        </svg>
      </div>
      
      {/* Digital readout */}
      <div className="mt-2 text-center">
        <div className="text-3xl font-bold text-white" data-testid="wind-speed-readout">
          {units.value('windSpeed', displaySpeed)}
        </div>
        <div className="text-xs text-gray-400">{units.label('windSpeed')}</div>
        <div className="text-sm text-gray-500 mt-1" data-testid="wind-angle-readout">
          {apparentWindAngle.toFixed(0)}° {apparentWindAngle < 180 ? 'Stbd' : 'Port'}
        </div>
        {trueWindDirection !== null && (
          <div className="text-xs text-gray-500">
            True: {trueWindDirection.toFixed(0)}°
          </div>
        )}
      </div>
      
      {/* Wind strength description */}
      <div className="mt-1 text-xs text-gray-400">
        {windSpeed !== null ? getWindStrength(displaySpeed) : 'No data'}
      </div>
      <GaugeAlert alert={alert} />
    </div>
  );
});

WindGauge.displayName = 'WindGauge';
