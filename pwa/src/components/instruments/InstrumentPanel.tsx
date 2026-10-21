import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSettingOptimistic, updateSetting } from '@/store/slices/settingsSlice';
import { SpeedGauge } from './SpeedGauge';
import { DepthGauge } from './DepthGauge';
import { WindGauge } from './WindGauge';
import { HeadingCompass } from './HeadingCompass';
import { PositionDisplay } from './PositionDisplay';
import {
  GAUGE_NAMES,
  GAUGE_SIZES,
  moveGauge,
  normalizePanelLayout,
  updateGauge,
  type GaugeSize,
  type GaugeType,
  type PanelLayout,
} from './panelLayout';

interface InstrumentPanelProps {
  className?: string;
  layout?: 'grid' | 'horizontal' | 'vertical';
  showConfig?: boolean;
}

const GAUGES: Record<GaugeType, React.FC> = {
  speed: SpeedGauge,
  depth: DepthGauge,
  wind: WindGauge,
  heading: HeadingCompass,
  position: PositionDisplay,
};

// Grid columns a gauge takes, and how much its content is enlarged
const SIZE_STYLES: Record<GaugeSize, { span: string; zoom: number }> = {
  small: { span: '', zoom: 1 },
  medium: { span: 'col-span-2', zoom: 1.4 },
  large: { span: 'col-span-2 lg:col-span-4', zoom: 1.8 },
};

const SIZE_NAMES: Record<GaugeSize, string> = { small: 'Small', medium: 'Medium', large: 'Large' };

/**
 * Instrument gauges in the layout saved in settings (R14.2). Edit layout lets
 * the user choose which gauges show, their order and their size.
 */
export const InstrumentPanel: React.FC<InstrumentPanelProps> = ({
  className = '',
  layout = 'grid',
  showConfig = false,
}) => {
  const dispatch = useAppDispatch();
  const stored = useAppSelector((state) => state.settings.settings.instrumentPanelLayout);
  const gauges = normalizePanelLayout(stored);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const save = (next: PanelLayout) => {
    const update = { key: 'instrumentPanelLayout' as const, value: next };
    // Update the store at once so quick successive changes build on each other
    dispatch(setSettingOptimistic(update));
    dispatch(updateSetting(update));
  };

  const getLayoutClasses = () => {
    switch (layout) {
      case 'horizontal':
        return 'flex flex-row flex-wrap gap-4 justify-center';
      case 'vertical':
        return 'flex flex-col gap-4';
      case 'grid':
      default:
        // Two small gauges side by side even on a phone
        return 'grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4';
    }
  };

  const enabledGauges = gauges.filter((g) => g.enabled);

  return (
    <div className={`relative ${className}`}>
      {/* Configuration button */}
      {showConfig && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            aria-expanded={isConfigOpen}
            className="min-h-11 px-4 bg-surface border border-line text-ink hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Edit layout
          </button>
        </div>
      )}

      {/* Configuration panel */}
      {isConfigOpen && (
        <div className="mb-4 p-4 bg-gauge rounded-lg">
          <h3 className="text-lg font-semibold text-gauge-ink mb-3">Gauge layout</h3>
          <ol className="space-y-2">
            {gauges.map((gauge, index) => {
              const name = GAUGE_NAMES[gauge.type];
              return (
                <li
                  key={gauge.type}
                  className="flex flex-wrap items-center gap-3 p-2 hover:bg-white/10 rounded"
                  data-testid={`gauge-config-${gauge.type}`}
                >
                  <label className="flex items-center gap-3 flex-1 min-w-32 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gauge.enabled}
                      onChange={() => save(updateGauge(gauges, gauge.type, { enabled: !gauge.enabled }))}
                      aria-label={`Show ${name}`}
                      className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                    />
                    <span className="text-gauge-ink">{name}</span>
                  </label>
                  <select
                    value={gauge.size}
                    onChange={(e) =>
                      save(updateGauge(gauges, gauge.type, { size: e.target.value as GaugeSize }))
                    }
                    aria-label={`${name} size`}
                    className="px-2 py-1 bg-white/10 text-gauge-ink border border-white/20 rounded"
                  >
                    {GAUGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {SIZE_NAMES[size]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => save(moveGauge(gauges, gauge.type, -1))}
                    disabled={index === 0}
                    aria-label={`Move ${name} up`}
                    className="px-2 py-1 text-gauge-ink bg-white/10 rounded disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => save(moveGauge(gauges, gauge.type, 1))}
                    disabled={index === gauges.length - 1}
                    aria-label={`Move ${name} down`}
                    className="px-2 py-1 text-gauge-ink bg-white/10 rounded disabled:opacity-30"
                  >
                    ↓
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Instrument gauges */}
      {enabledGauges.length > 0 ? (
        <div className={getLayoutClasses()}>
          {enabledGauges.map((gauge) => {
            const Gauge = GAUGES[gauge.type];
            const { span, zoom } = SIZE_STYLES[gauge.size];
            return (
              <div
                key={gauge.type}
                className={layout === 'grid' ? span : ''}
                data-testid={`gauge-${gauge.type}`}
                data-size={gauge.size}
              >
                <div style={{ zoom }} className="h-full [&>section]:h-full">
                  <Gauge />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          No gauges enabled. Use Edit layout to show gauges.
        </div>
      )}
    </div>
  );
};
