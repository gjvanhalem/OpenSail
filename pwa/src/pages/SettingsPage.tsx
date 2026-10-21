import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateSetting, resetSettings } from '@/store/slices/settingsSlice';
import type { AppSettings } from '@/database/repositories/SettingsRepository';
import { CompatibilityInfo } from '@/components/CompatibilityInfo';
import { GPSControl } from '@/components/GPSControl';
import { NavigationSourceSettings } from '@/components/NavigationSourceSettings';
import { AccountSettings } from '@/components/account/AccountSettings';
import { InstrumentAlertSettings } from '@/components/InstrumentAlertSettings';
import { APP_NAME, APP_VERSION } from '@/utils/constants';
import { useUnits } from '@/hooks/useUnits';
import { raiseAlarm } from '@/store/slices/alertsSlice';
import { SPEED_GAUGE_RANGES } from '@/components/instruments/dial';
import { ANCHOR_RADIUS_MAX_M, ANCHOR_RADIUS_MIN_M } from '@/utils/safety';

export const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { settings, isLoading } = useAppSelector((state) => state.settings);
  const units = useUnits();
  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    dispatch(updateSetting({ key, value }));
    setHasChanges(true);
  };

  const handleResetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      dispatch(resetSettings());
      setHasChanges(false);
    }
  };

  useEffect(() => {
    if (hasChanges) {
      const timer = setTimeout(() => setHasChanges(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasChanges]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          {hasChanges && (
            <span className="text-sm text-green-600 font-medium">
              Settings saved
            </span>
          )}
        </div>

        <AccountSettings />

        {/* Map Preferences Section */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Map Preferences
          </h2>
          
          <div className="space-y-4">
            {/* Units */}
            <div>
              <label htmlFor="settings-units" className="block text-sm font-medium text-gray-700 mb-2">
                Units
              </label>
              <select
                id="settings-units"
                value={settings.units}
                onChange={(e) =>
                  handleSettingChange('units', e.target.value as AppSettings['units'])
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="nautical">Nautical (nm, knots, m)</option>
                <option value="metric">Metric (km, km/h, m)</option>
                <option value="imperial">Imperial (mi, mph, ft)</option>
              </select>
            </div>

            {/* Speed gauge range */}
            <div>
              <label htmlFor="settings-speed-gauge" className="block text-sm font-medium text-gray-700 mb-2">
                Speed gauge range
              </label>
              <select
                id="settings-speed-gauge"
                value={settings.speedGaugeMax}
                onChange={(e) => handleSettingChange('speedGaugeMax', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.keys(SPEED_GAUGE_RANGES).map((max) => (
                  <option key={max} value={max}>
                    0–{units.format('speed', Number(max), 0)}
                  </option>
                ))}
              </select>
            </div>

            {/* Chart Rotation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chart Rotation
              </label>
              <select
                value={settings.chartRotation}
                onChange={(e) =>
                  handleSettingChange(
                    'chartRotation',
                    e.target.value as AppSettings['chartRotation']
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="north-up">North Up</option>
                <option value="heading-up">Heading Up</option>
              </select>
            </div>

            {/* Default Zoom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Zoom Level: {settings.defaultZoom}
              </label>
              <input
                type="range"
                min="8"
                max="18"
                value={settings.defaultZoom}
                onChange={(e) =>
                  handleSettingChange('defaultZoom', parseInt(e.target.value))
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Far (8)</span>
                <span>Close (18)</span>
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <select
                value={settings.theme}
                onChange={(e) =>
                  handleSettingChange('theme', e.target.value as AppSettings['theme'])
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>

            {/* Chart Layers */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.showNavigationAids}
                  onChange={(e) =>
                    handleSettingChange('showNavigationAids', e.target.checked)
                  }
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Show Navigation Aids</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.showDepthContours}
                  onChange={(e) =>
                    handleSettingChange('showDepthContours', e.target.checked)
                  }
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Show Depth Contours</span>
              </label>
            </div>
          </div>
        </section>

        {/* Instrument Preferences Section */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Instrument Preferences
          </h2>
          
          <div className="space-y-4">
            {/* Protocol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Protocol
              </label>
              <select
                value={settings.instrumentProtocol}
                onChange={(e) =>
                  handleSettingChange(
                    'instrumentProtocol',
                    e.target.value as AppSettings['instrumentProtocol']
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="nmea0183">NMEA 0183</option>
                <option value="nmea2000">NMEA 2000</option>
                <option value="seatalk">SeaTalk</option>
              </select>
            </div>

            {/* Connection Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Connection Type
              </label>
              <select
                value={settings.instrumentConnectionType}
                onChange={(e) =>
                  handleSettingChange(
                    'instrumentConnectionType',
                    e.target.value as AppSettings['instrumentConnectionType']
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="serial">USB Serial</option>
                <option value="bluetooth">Bluetooth</option>
                <option value="network">Network (TCP)</option>
              </select>
            </div>

            {/* Network Settings (shown when network is selected) */}
            {settings.instrumentConnectionType === 'network' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Network Host
                  </label>
                  <input
                    type="text"
                    value={settings.networkHost}
                    onChange={(e) =>
                      handleSettingChange('networkHost', e.target.value)
                    }
                    placeholder="192.168.1.100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Network Port
                  </label>
                  <input
                    type="number"
                    value={settings.networkPort}
                    onChange={(e) =>
                      handleSettingChange('networkPort', parseInt(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Baud Rate (shown for serial) */}
            {settings.instrumentConnectionType === 'serial' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Baud Rate
                </label>
                <select
                  value={settings.baudRate}
                  onChange={(e) =>
                    handleSettingChange('baudRate', parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="4800">4800</option>
                  <option value="9600">9600</option>
                  <option value="19200">19200</option>
                  <option value="38400">38400</option>
                  <option value="57600">57600</option>
                  <option value="115200">115200</option>
                </select>
              </div>
            )}

            {/* Auto Reconnect */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.autoReconnect}
                onChange={(e) =>
                  handleSettingChange('autoReconnect', e.target.checked)
                }
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                Auto-reconnect on connection loss
              </span>
            </label>
          </div>
        </section>

        {/* GPS Control Section */}
        <GPSControl />

        <NavigationSourceSettings />

        <InstrumentAlertSettings />

        {/* Route navigation */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Route Navigation</h2>
          <label htmlFor="arrival-radius" className="block text-sm font-medium text-gray-700 mb-1">
            Arrival radius ({units.label('distance')})
          </label>
          <input
            id="arrival-radius"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={Number(units.toDisplay('distance', settings.arrivalRadius).toFixed(2))}
            key={`${units.system}-${settings.arrivalRadius}`}
            onBlur={(e) => {
              const value = parseFloat(e.target.value);
              if (Number.isFinite(value) && value > 0) {
                handleSettingChange('arrivalRadius', units.fromDisplay('distance', value));
              }
            }}
            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            While navigating a route, the next waypoint becomes active once the boat is this close
            to the current one. New waypoints also start with this radius.
          </p>
        </section>

        {/* Alarms Section */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Alarms</h2>
          
          <div className="space-y-4">
            {/* Anchor Watch */}
            <div>
              <label htmlFor="anchor-watch-radius" className="block text-sm font-medium text-gray-700 mb-1">
                Anchor watch radius: {units.format('length', settings.anchorWatchRadius, 0)}
              </label>
              <input
                id="anchor-watch-radius"
                type="range"
                min={ANCHOR_RADIUS_MIN_M}
                max={ANCHOR_RADIUS_MAX_M}
                step="5"
                value={settings.anchorWatchRadius}
                onChange={(e) =>
                  handleSettingChange('anchorWatchRadius', parseInt(e.target.value))
                }
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                The radius a new anchor watch starts with; you can change it while the watch runs.
                Take at least the length of the anchor rode plus the boat.
              </p>
            </div>

            {/* Collision Alarm */}
            <div>
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={settings.enableCollisionAlarm}
                  onChange={(e) =>
                    handleSettingChange('enableCollisionAlarm', e.target.checked)
                  }
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable Collision Warning
                </span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Sounds the alarm for AIS targets on a collision course (AIS arrives in a later
                version).
              </p>
              
              {settings.enableCollisionAlarm && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Warning Distance: {units.format('distance', settings.collisionWarningDistance, 1)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={settings.collisionWarningDistance}
                    onChange={(e) =>
                      handleSettingChange(
                        'collisionWarningDistance',
                        parseFloat(e.target.value)
                      )
                    }
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Weather Alerts */}
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enableWeatherAlerts}
                onChange={(e) =>
                  handleSettingChange('enableWeatherAlerts', e.target.checked)
                }
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Enable Weather Alerts</span>
            </label>

            {/* Alarm test: also unlocks audio, since it is a tap */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() =>
                  dispatch(
                    raiseAlarm({
                      kind: 'test',
                      message: 'Test alarm: this is how an alarm looks and sounds',
                      now: Date.now(),
                    })
                  )
                }
                className="px-4 py-2 border border-red-300 text-red-700 rounded hover:bg-red-50"
              >
                Test alarm
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Check the volume before you rely on man overboard or anchor watch. Alarms sound
                through the device speaker; a muted device or silent switch can silence them.
              </p>
            </div>
          </div>
        </section>

        {/* Offline Mode Section */}
        <section className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Offline Mode
          </h2>
          
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.offlineMode}
                onChange={(e) =>
                  handleSettingChange('offlineMode', e.target.checked)
                }
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                Enable Offline Mode (use cached data only)
              </span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.autoSync}
                onChange={(e) =>
                  handleSettingChange('autoSync', e.target.checked)
                }
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                Auto-sync data when online
              </span>
            </label>
          </div>
        </section>

        {/* Browser Compatibility Section */}
        <CompatibilityInfo />

        {/* Reset Button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {APP_NAME} version {APP_VERSION}
          </p>
          <button
            onClick={handleResetSettings}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Reset All Settings
          </button>
        </div>
      </div>
    </div>
  );
};
