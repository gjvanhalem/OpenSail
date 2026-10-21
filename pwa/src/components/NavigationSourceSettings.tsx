import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateSetting } from '@/store/slices/settingsSlice';
import type {
  NavigationSource,
  NavigationSourceChoice,
  NavigationValue,
} from '@/store/slices/navigationSlice';

const VALUES: {
  value: NavigationValue;
  setting: 'positionSource' | 'cogSogSource' | 'headingSource';
  label: string;
  gpsLabel: string;
}[] = [
  { value: 'position', setting: 'positionSource', label: 'Position', gpsLabel: 'GPS' },
  {
    value: 'cogSog',
    setting: 'cogSogSource',
    label: 'Course & speed over ground',
    gpsLabel: 'GPS',
  },
  // GPS has no heading sensor: choosing GPS shows course over ground instead
  { value: 'heading', setting: 'headingSource', label: 'Heading', gpsLabel: 'None (use GPS course)' },
];

const SOURCE_NAMES: Record<NavigationSource, string> = {
  gps: 'GPS',
  instrument: 'Instrument',
};

/**
 * Choose where position, COG/SOG and heading come from: the device GPS, the
 * connected instruments, or auto (instruments while they report, else GPS).
 */
export const NavigationSourceSettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings.settings);
  const activeSources = useAppSelector((state) => state.navigation.sources);

  return (
    <section className="bg-surface rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Navigation Sources</h2>
      <p className="text-sm text-gray-500 mb-4">
        Auto uses the instruments while they send a value, and GPS otherwise.
      </p>

      <div className="space-y-4">
        {VALUES.map(({ value, setting, label, gpsLabel }) => {
          const id = `navigation-source-${value}`;
          const active = activeSources[value];
          return (
            <div key={value}>
              <div className="flex items-baseline justify-between mb-2">
                <label htmlFor={id} className="block text-sm font-medium text-gray-700">
                  {label}
                </label>
                <span className="text-xs text-gray-500" data-testid={`${id}-active`}>
                  Now from: {active ? SOURCE_NAMES[active] : 'none'}
                </span>
              </div>
              <select
                id={id}
                value={settings[setting]}
                onChange={(e) =>
                  dispatch(
                    updateSetting({
                      key: setting,
                      value: e.target.value as NavigationSourceChoice,
                    })
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">Auto</option>
                <option value="instrument">Instrument</option>
                <option value="gps">{gpsLabel}</option>
              </select>
            </div>
          );
        })}

        <div>
          <label htmlFor="magnetic-variation" className="block text-sm font-medium text-gray-700 mb-2">
            Magnetic variation (° east, negative for west)
          </label>
          <input
            id="magnetic-variation"
            type="number"
            step="0.1"
            min={-30}
            max={30}
            value={settings.magneticVariation}
            onChange={(e) => {
              const variation = parseFloat(e.target.value);
              if (Number.isFinite(variation) && Math.abs(variation) <= 30) {
                dispatch(updateSetting({ key: 'magneticVariation', value: variation }));
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Turns a magnetic heading (for example from an autopilot) into a true heading. Used
            when no instrument sends the variation. The Netherlands: about 2° east (2026).
          </p>
        </div>
      </div>
    </section>
  );
};
