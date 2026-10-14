import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

interface HeadingCompassProps {
  className?: string;
}

export const HeadingCompass: React.FC<HeadingCompassProps> = React.memo(({ className = '' }) => {
  const heading = useSelector((state: RootState) => state.navigation.heading);
  const course = useSelector((state: RootState) => state.navigation.course);

  const displayHeading = heading ?? 0;
  const displayCourse = course ?? heading ?? 0;

  // Calculate compass rotation (rotate compass opposite to heading)
  const compassRotation = -displayHeading;

  // Get cardinal direction
  const getCardinalDirection = (degrees: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  return (
    <div className={`flex flex-col items-center justify-center p-4 bg-gray-800 rounded-lg ${className}`}>
      <div className="text-sm text-gray-400 mb-2">HEADING</div>
      
      {/* Compass */}
      <div className="relative w-32 h-32">
        {/* Rotating compass rose */}
        <svg 
          className="w-full h-full transition-transform duration-300" 
          viewBox="0 0 100 100"
          style={{ transform: `rotate(${compassRotation}deg)` }}
        >
          {/* Outer circle */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="#374151" strokeWidth="2" />
          
          {/* Cardinal directions with larger text */}
          <text x="50" y="15" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">N</text>
          <text x="85" y="54" textAnchor="middle" fill="#9ca3af" fontSize="10">E</text>
          <text x="50" y="90" textAnchor="middle" fill="#9ca3af" fontSize="10">S</text>
          <text x="15" y="54" textAnchor="middle" fill="#9ca3af" fontSize="10">W</text>
          
          {/* Degree markers every 30° */}
          {Array.from({ length: 12 }, (_, i) => i * 30).map((angle) => {
            const rad = (angle - 90) * Math.PI / 180;
            const x1 = 50 + 38 * Math.cos(rad);
            const y1 = 50 + 38 * Math.sin(rad);
            const x2 = 50 + 45 * Math.cos(rad);
            const y2 = 50 + 45 * Math.sin(rad);
            const isCardinal = angle % 90 === 0;
            return (
              <line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isCardinal ? '#6b7280' : '#4b5563'}
                strokeWidth={isCardinal ? '2' : '1'}
              />
            );
          })}
          
          {/* Degree markers every 10° (smaller) */}
          {Array.from({ length: 36 }, (_, i) => i * 10).filter(a => a % 30 !== 0).map((angle) => {
            const rad = (angle - 90) * Math.PI / 180;
            const x1 = 50 + 42 * Math.cos(rad);
            const y1 = 50 + 42 * Math.sin(rad);
            const x2 = 50 + 45 * Math.cos(rad);
            const y2 = 50 + 45 * Math.sin(rad);
            return (
              <line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#374151"
                strokeWidth="1"
              />
            );
          })}
          
          {/* North arrow (decorative) */}
          <polygon points="50,8 48,18 52,18" fill="#ef4444" />
          
          {/* Center circle */}
          <circle cx="50" cy="50" r="8" fill="#1f2937" stroke="#4b5563" strokeWidth="1" />
        </svg>
        
        {/* Fixed heading indicator (lubber line) at top */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
          <div className="w-1 h-4 bg-yellow-400" />
        </div>
      </div>
      
      {/* Digital readout */}
      <div className="mt-2 text-center">
        <div className="text-3xl font-bold text-white" data-testid="heading-readout">
          {displayHeading.toFixed(0).padStart(3, '0')}°
        </div>
        <div className="text-sm text-gray-400">
          {getCardinalDirection(displayHeading)}
        </div>
      </div>
      
      {/* Course over ground (if different from heading) */}
      {course !== null && Math.abs(displayHeading - displayCourse) > 5 && (
        <div className="mt-2 text-xs text-gray-500">
          COG: {displayCourse.toFixed(0)}° {getCardinalDirection(displayCourse)}
        </div>
      )}
      
      {/* Status indicator */}
      {heading === null && (
        <div className="mt-2 text-xs text-gray-500">No data</div>
      )}
    </div>
  );
});

HeadingCompass.displayName = 'HeadingCompass';
