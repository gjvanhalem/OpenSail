import React, { useState, useCallback } from 'react';
import { Marker } from 'react-map-gl/maplibre';
import type { AISTarget } from '@/models';
import { useUnits } from '@/hooks/useUnits';

export interface AISLayerProps {
  targets: AISTarget[];
  visible?: boolean;
  onTargetSelect?: (target: AISTarget) => void;
}

export const AISLayer: React.FC<AISLayerProps> = React.memo(
  ({ targets, visible = true, onTargetSelect }) => {
    const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
    const units = useUnits();

    const handleTargetClick = useCallback(
      (target: AISTarget) => {
        setSelectedTarget(target.mmsi);
        onTargetSelect?.(target);
      },
      [onTargetSelect]
    );

    if (!visible || targets.length === 0) {
      return null;
    }

    return (
      <>
        {targets.map((target) => {
          const isSelected = selectedTarget === target.mmsi;
          const hasCPAWarning = target.cpa && target.cpa.distance < 0.5; // CPA less than 0.5 nautical miles

          return (
            <Marker
              key={target.mmsi}
              longitude={target.position.longitude}
              latitude={target.position.latitude}
              anchor="center"
              onClick={() => handleTargetClick(target)}
            >
              <div className="relative cursor-pointer">
                {/* AIS vessel icon */}
                <svg
                  width={isSelected ? 32 : 24}
                  height={isSelected ? 32 : 24}
                  viewBox="0 0 24 24"
                  style={{
                    transform: `rotate(${target.heading}deg)`,
                    transition: 'all 0.3s ease-out',
                  }}
                >
                  {/* Vessel triangle */}
                  <path
                    d="M12 2 L18 18 L12 15 L6 18 Z"
                    fill={hasCPAWarning ? '#ef4444' : '#3b82f6'}
                    stroke={isSelected ? '#fbbf24' : '#ffffff'}
                    strokeWidth={isSelected ? '2' : '1.5'}
                  />
                  {/* Heading line */}
                  <line
                    x1="12"
                    y1="2"
                    x2="12"
                    y2="0"
                    stroke={hasCPAWarning ? '#ef4444' : '#3b82f6'}
                    strokeWidth="1.5"
                  />
                </svg>

                {/* CPA Warning indicator */}
                {hasCPAWarning && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}

                {/* Target info popup */}
                {isSelected && (
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap z-10">
                    <div className="font-bold">{target.name || `MMSI: ${target.mmsi}`}</div>
                    <div className="text-gray-600">Speed: {units.format('speed', target.speed)}</div>
                    <div className="text-gray-600">Heading: {target.heading.toFixed(0)}°</div>
                    {target.cpa && (
                      <div className="text-red-600 font-semibold mt-1">
                        CPA: {units.format('distance', target.cpa.distance)} in{' '}
                        {(target.cpa.time / 60).toFixed(0)} min
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Marker>
          );
        })}
      </>
    );
  }
);

AISLayer.displayName = 'AISLayer';
