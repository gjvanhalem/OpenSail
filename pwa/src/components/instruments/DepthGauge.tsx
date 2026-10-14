import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { useUnits } from '@/hooks/useUnits';
import { useGaugeAlert, GAUGE_ALERT_CLASSES } from '@/hooks/useGaugeAlert';
import { GaugeAlert } from '@/components/alerts/GaugeAlert';
import { formatQuantity } from '@/utils/units';

interface DepthGaugeProps {
  className?: string;
  maxDepth?: number;
}

export const DepthGauge: React.FC<DepthGaugeProps> = React.memo(({ 
  className = '',
  maxDepth = 50 
}) => {
  const depth = useSelector((state: RootState) => state.instruments.depth);
  const units = useUnits();
  const alert = useGaugeAlert('depth');

  const depthMeters = depth ?? 0;
  // Also show the other unit, for charts in feet or metres
  const secondary = units.label('depth') === 'ft' ? 'metric' : 'imperial';

  // Calculate bar height (0-maxDepth range)
  const barHeight = Math.min((depthMeters / maxDepth) * 100, 100);
  
  // Color based on depth (red for shallow, green for safe, blue for deep)
  const getDepthColor = (depth: number): string => {
    if (depth < 2) return '#ef4444'; // red - danger
    if (depth < 5) return '#f59e0b'; // amber - caution
    if (depth < 20) return '#10b981'; // green - safe
    return '#3b82f6'; // blue - deep
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-4 bg-gray-800 rounded-lg ${alert ? GAUGE_ALERT_CLASSES : ''} ${className}`}
    >
      <div className="text-sm text-gray-400 mb-2">DEPTH</div>
      
      {/* Bar gauge */}
      <div className="relative w-24 h-32 bg-gray-700 rounded-lg overflow-hidden">
        {/* Depth bar */}
        <div 
          className="absolute bottom-0 left-0 right-0 transition-all duration-300"
          style={{ 
            height: `${barHeight}%`,
            backgroundColor: getDepthColor(depthMeters)
          }}
        />
        
        {/* Scale markers */}
        <div className="absolute inset-0 flex flex-col justify-between py-2 px-1">
          {[maxDepth, maxDepth * 0.75, maxDepth * 0.5, maxDepth * 0.25, 0].map((mark, i) => (
            <div key={i} className="flex items-center">
              <div className="w-2 h-px bg-gray-500" />
              <span className="ml-1 text-xs text-gray-400">{units.value('depth', mark, 0)}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Digital readout */}
      <div className="mt-3 text-center">
        <div className="text-3xl font-bold text-white" data-testid="depth-readout">
          {units.value('depth', depthMeters)}
        </div>
        <div className="text-xs text-gray-400">
          {units.label('depth') === 'ft' ? 'feet' : 'meters'}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {formatQuantity('depth', depthMeters, secondary)}
        </div>
      </div>
      
      {/* Status indicator */}
      {depth === null && (
        <div className="mt-2 text-xs text-gray-500">No data</div>
      )}
      <GaugeAlert alert={alert} />
    </div>
  );
});

DepthGauge.displayName = 'DepthGauge';
