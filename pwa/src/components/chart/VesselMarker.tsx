import React, { useMemo } from 'react';
import { Marker } from 'react-map-gl/mapbox';
import type { Position } from '@/models';

export interface VesselMarkerProps {
  position: Position;
  heading?: number | null;
  size?: number;
}

export const VesselMarker: React.FC<VesselMarkerProps> = React.memo(
  ({ position, heading = null, size = 24 }) => {
    const vesselIcon = useMemo(() => {
      const rotation = heading !== null ? heading : 0;

      return (
        <svg
          data-testid="vessel-marker"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          {/* Vessel shape - triangle pointing up (north) */}
          <path
            d="M12 2 L20 20 L12 16 L4 20 Z"
            fill="#2563eb"
            stroke="#ffffff"
            strokeWidth="2"
          />
          {/* Heading indicator line */}
          {heading !== null && (
            <line x1="12" y1="2" x2="12" y2="0" stroke="#ef4444" strokeWidth="2" />
          )}
        </svg>
      );
    }, [heading, size]);

    return (
      <Marker longitude={position.longitude} latitude={position.latitude} anchor="center">
        {vesselIcon}
      </Marker>
    );
  }
);

VesselMarker.displayName = 'VesselMarker';
