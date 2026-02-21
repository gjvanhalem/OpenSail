import React, { useState } from 'react';
import { SpeedGauge } from './SpeedGauge';
import { DepthGauge } from './DepthGauge';
import { WindGauge } from './WindGauge';
import { HeadingCompass } from './HeadingCompass';

export type GaugeType = 'speed' | 'depth' | 'wind' | 'heading';

export interface GaugeConfig {
  id: string;
  type: GaugeType;
  enabled: boolean;
}

interface InstrumentPanelProps {
  className?: string;
  layout?: 'grid' | 'horizontal' | 'vertical';
  initialGauges?: GaugeConfig[];
  showConfig?: boolean;
}

const defaultGauges: GaugeConfig[] = [
  { id: 'speed', type: 'speed', enabled: true },
  { id: 'depth', type: 'depth', enabled: true },
  { id: 'wind', type: 'wind', enabled: true },
  { id: 'heading', type: 'heading', enabled: true },
];

export const InstrumentPanel: React.FC<InstrumentPanelProps> = ({
  className = '',
  layout = 'grid',
  initialGauges = defaultGauges,
  showConfig = false,
}) => {
  const [gauges, setGauges] = useState<GaugeConfig[]>(initialGauges);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const toggleGauge = (id: string) => {
    setGauges(prev =>
      prev.map(gauge =>
        gauge.id === id ? { ...gauge, enabled: !gauge.enabled } : gauge
      )
    );
  };

  const renderGauge = (gauge: GaugeConfig) => {
    if (!gauge.enabled) return null;

    switch (gauge.type) {
      case 'speed':
        return <SpeedGauge key={gauge.id} />;
      case 'depth':
        return <DepthGauge key={gauge.id} />;
      case 'wind':
        return <WindGauge key={gauge.id} />;
      case 'heading':
        return <HeadingCompass key={gauge.id} />;
      default:
        return null;
    }
  };

  const getLayoutClasses = () => {
    switch (layout) {
      case 'horizontal':
        return 'flex flex-row flex-wrap gap-4 justify-center';
      case 'vertical':
        return 'flex flex-col gap-4';
      case 'grid':
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';
    }
  };

  const enabledGauges = gauges.filter(g => g.enabled);

  return (
    <div className={`relative ${className}`}>
      {/* Configuration button */}
      {showConfig && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Configure
          </button>
        </div>
      )}

      {/* Configuration panel */}
      {isConfigOpen && (
        <div className="mb-4 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-3">Gauge Configuration</h3>
          <div className="space-y-2">
            {gauges.map(gauge => (
              <label
                key={gauge.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={gauge.enabled}
                  onChange={() => toggleGauge(gauge.id)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-white capitalize">{gauge.type}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Instrument gauges */}
      {enabledGauges.length > 0 ? (
        <div className={getLayoutClasses()}>
          {gauges.map(renderGauge)}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          No gauges enabled. Click Configure to enable gauges.
        </div>
      )}
    </div>
  );
};
