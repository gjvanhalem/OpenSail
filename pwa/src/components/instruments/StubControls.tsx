import { useState } from 'react';
import { connectionRegistry, StubConnection } from '@/services/connections';
import type { SimulationConfig } from '@/services/simulator/VesselSimulation';

type NumericSetting = 'heading' | 'speed' | 'depth' | 'windSpeed' | 'windAngle';

const FIELDS: { key: NumericSetting; label: string; unit: string; min: number; max: number; step: number }[] = [
  { key: 'heading', label: 'Heading', unit: '° true', min: 0, max: 359, step: 1 },
  { key: 'speed', label: 'Speed', unit: 'kn', min: 0, max: 30, step: 0.5 },
  { key: 'depth', label: 'Depth', unit: 'm', min: 0.5, max: 200, step: 0.5 },
  { key: 'windSpeed', label: 'Apparent wind speed', unit: 'kn', min: 0, max: 60, step: 1 },
  { key: 'windAngle', label: 'Apparent wind angle', unit: '°', min: 0, max: 359, step: 1 },
];

/** Adjust what the instrument simulator sends while it runs */
export function StubControls({ connectionId }: { connectionId: string }) {
  const connection = connectionRegistry.get(connectionId);
  const stub = connection instanceof StubConnection ? connection : null;
  const [config, setConfig] = useState<SimulationConfig | null>(() => stub?.getSimulationConfig() ?? null);

  if (!stub || !config) return null;

  const update = (changes: Partial<SimulationConfig>) => {
    stub.updateSimulation(changes);
    setConfig({ ...config, ...changes });
  };

  // Typing a coordinate moves the boat there
  const position = (axis: 'latitude' | 'longitude', limit: number) => {
    const id = `${connectionId}-${axis}`;
    return (
      <div>
        <label htmlFor={id} className="block text-xs text-gray-600 mb-1">
          {axis === 'latitude' ? 'Latitude' : 'Longitude'} (°)
        </label>
        <input
          id={id}
          type="number"
          min={-limit}
          max={limit}
          step={0.001}
          defaultValue={config.start[axis]}
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            if (Number.isFinite(value) && Math.abs(value) <= limit) {
              const { latitude, longitude } = stub.state.position;
              update({ start: { latitude, longitude, [axis]: value } });
            }
          }}
          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
        />
      </div>
    );
  };

  return (
    <fieldset className="mt-4 pt-4 border-t border-gray-200">
      <legend className="text-sm font-medium text-gray-700">Simulated values</legend>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
        {position('latitude', 90)}
        {position('longitude', 180)}
        {FIELDS.map(({ key, label, unit, min, max, step }) => {
          const id = `${connectionId}-${key}`;
          return (
            <div key={key}>
              <label htmlFor={id} className="block text-xs text-gray-600 mb-1">
                {label} ({unit})
              </label>
              <input
                id={id}
                type="number"
                min={min}
                max={max}
                step={step}
                value={config[key]}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (Number.isFinite(value)) update({ [key]: value });
                }}
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
          );
        })}
        <label className="flex items-center gap-2 text-xs text-gray-600 self-end pb-1">
          <input
            type="checkbox"
            checked={config.variability}
            onChange={(e) => update({ variability: e.target.checked })}
          />
          Realistic variation
        </label>
      </div>
    </fieldset>
  );
}
