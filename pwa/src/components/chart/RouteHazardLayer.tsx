import React from 'react';
import { Marker } from 'react-map-gl/maplibre';
import type { RouteWarning } from '@/models';

const COLORS: Record<RouteWarning['severity'], string> = {
  high: '#c0162c',
  medium: '#d97706',
  low: '#6b7280',
};

export interface RouteHazardLayerProps {
  warnings: RouteWarning[];
}

/** A warning triangle on the chart for each route hazard (R2.5) */
export const RouteHazardLayer: React.FC<RouteHazardLayerProps> = React.memo(({ warnings }) => (
  <>
    {warnings.map((warning, i) => (
      <Marker
        key={i}
        latitude={warning.position.latitude}
        longitude={warning.position.longitude}
        anchor="bottom"
      >
        <svg
          width={22}
          height={20}
          viewBox="0 0 22 20"
          role="img"
          aria-label={`Route hazard: ${warning.message}`}
          data-testid="route-hazard-marker"
          style={{ opacity: warning.advisory ? 0.8 : 1 }}
        >
          <title>{warning.message}</title>
          <path
            d="M11 1 L21 19 H1 Z"
            fill={COLORS[warning.severity]}
            stroke="#fff"
            strokeWidth={1.5}
            strokeDasharray={warning.advisory ? '3 2' : undefined}
          />
          <text x={11} y={16} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#fff">
            !
          </text>
        </svg>
      </Marker>
    ))}
  </>
));

RouteHazardLayer.displayName = 'RouteHazardLayer';
