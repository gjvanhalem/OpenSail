import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateSetting, resetSettings } from '@/store/slices/settingsSlice';
import type { AppSettings } from '@/database/repositories/SettingsRepository';
import { CompatibilityInfo } from '@/components/CompatibilityInfo';
import { GPSControl } from '@/components/GPSControl';
import { NavigationSourceSettings } from '@/components/NavigationSourceSettings';
import { AccountSettings } from '@/components/account/AccountSettings';
import { useAccount } from '@/services/account';
import { InstrumentAlertSettings } from '@/components/InstrumentAlertSettings';
import { APP_NAME, APP_VERSION } from '@/utils/constants';
import { NATIVE_BUILD } from '@/platform/platform';
import { useUnits } from '@/hooks/useUnits';
import { raiseAlarm } from '@/store/slices/alertsSlice';
import { SPEED_GAUGE_RANGES } from '@/components/instruments/dial';
import { ANCHOR_RADIUS_MAX_M, ANCHOR_RADIUS_MIN_M } from '@/utils/safety';

/** The groups of settings, in page order; the index on wide screens links to them */
const SECTIONS = [
  { id: 'boat', title: 'Boat & units' },
  { id: 'chart', title: 'Chart' },
  { id: 'sources', title: 'Navigation sources' },
  { id: 'alarms', title: 'Alarms' },
  { id: 'account', title: 'Account' },
  { id: 'about', title: 'About' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const Section: React.FC<{ id: SectionId; children: React.ReactNode }> = ({ id, children }) => (
  <section id={`settings-${id}`} aria-labelledby={`settings-${id}-title`} className="scroll-mt-4 space-y-4">
    <h2 id={`settings-${id}-title`} className="text-xl font-semibold text-ink">
      {SECTIONS.find((s) => s.id === id)!.title}
    </h2>
    {children}
  </section>
);

/** A white card for settings that are not their own component */
const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="space-y-4 rounded-xl border border-line bg-surface p-5 shadow-sm">{children}</div>
);

const FIELD = 'w-full min-h-11 px-3 py-2 border border-gray-300 rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL = 'block text-sm font-medium text-gray-700 mb-1';
const HELP = 'text-xs text-gray-500 mt-1';

export const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { settings, isLoading } = useAppSelector((state) => state.settings);
  const units = useUnits();
  const account = useAccount();
  const hasAccount = account.status === 'signed-in' || account.status === 'offline';
  const sections = SECTIONS.filter((section) => section.id !== 'account' || hasAccount);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
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
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="mx-auto grid max-w-6xl gap-8 p-4 pb-32 md:p-6 md:pb-32 lg:grid-cols-[13rem_1fr]">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="sticky top-6 space-y-1">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#settings-${section.id}`}
                  className="flex min-h-11 items-center rounded-lg px-3 text-ink hover:bg-surface"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 max-w-3xl space-y-10">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-ink">Settings</h1>
            {hasChanges && <span className="text-sm font-medium text-green-600">Settings saved</span>}
          </div>

          <Section id="boat">
            <Card>
              <div>
                <label htmlFor="settings-display" className={LABEL}>
                  Display
                </label>
                <select
                  id="settings-display"
                  value={settings.displayMode}
                  onChange={(e) => handleSettingChange('displayMode', e.target.value as AppSettings['displayMode'])}
                  className={FIELD}
                >
                  <option value="day">Day</option>
                  <option value="night">Night (red, keeps night vision)</option>
                  <option value="auto">Auto (night from dusk to dawn)</option>
                </select>
                <p className={HELP}>The moon button in the top bar switches day and night with one tap.</p>
              </div>
              <div>
                <label htmlFor="settings-units" className={LABEL}>
                  Units
                </label>
                <select
                  id="settings-units"
                  value={settings.units}
                  onChange={(e) => handleSettingChange('units', e.target.value as AppSettings['units'])}
                  className={FIELD}
                >
                  <option value="nautical">Nautical (nm, knots, m)</option>
                  <option value="metric">Metric (km, km/h, m)</option>
                  <option value="imperial">Imperial (mi, mph, ft)</option>
                </select>
              </div>
              <div>
                <label htmlFor="settings-speed-gauge" className={LABEL}>
                  Speed gauge range
                </label>
                <select
                  id="settings-speed-gauge"
                  value={settings.speedGaugeMax}
                  onChange={(e) => handleSettingChange('speedGaugeMax', Number(e.target.value))}
                  className={FIELD}
                >
                  {Object.keys(SPEED_GAUGE_RANGES).map((max) => (
                    <option key={max} value={max}>
                      0–{units.format('speed', Number(max), 0)}
                    </option>
                  ))}
                </select>
                <p className={HELP}>Pick the range your boat sails in, so the dial uses its whole sweep.</p>
              </div>
            </Card>
          </Section>

          <Section id="chart">
            <Card>
              <div>
                <label htmlFor="settings-chart-rotation" className={LABEL}>
                  Chart orientation
                </label>
                <select
                  id="settings-chart-rotation"
                  value={settings.chartRotation}
                  onChange={(e) =>
                    handleSettingChange('chartRotation', e.target.value as AppSettings['chartRotation'])
                  }
                  className={FIELD}
                >
                  <option value="north-up">North up</option>
                  <option value="heading-up">Heading up</option>
                </select>
              </div>
              <div>
                <label htmlFor="settings-default-zoom" className={LABEL}>
                  Zoom with a position: {settings.defaultZoom}
                </label>
                <input
                  id="settings-default-zoom"
                  type="range"
                  min="8"
                  max="18"
                  value={settings.defaultZoom}
                  onChange={(e) => handleSettingChange('defaultZoom', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Far (8)</span>
                  <span>Close (18)</span>
                </div>
              </div>
              <p className={HELP}>
                Seamarks, inland ENC, routes, tracks and AIS are switched on the chart itself, under
                Layers. Offline charts are downloaded there too.
              </p>
            </Card>
          </Section>

          <Section id="sources">
            <GPSControl />
            <NavigationSourceSettings />
          </Section>

          <Section id="alarms">
            <InstrumentAlertSettings />
            <Card>
              <div>
                <label htmlFor="anchor-watch-radius" className={LABEL}>
                  Anchor watch radius: {units.format('length', settings.anchorWatchRadius, 0)}
                </label>
                <input
                  id="anchor-watch-radius"
                  type="range"
                  min={ANCHOR_RADIUS_MIN_M}
                  max={ANCHOR_RADIUS_MAX_M}
                  step="5"
                  value={settings.anchorWatchRadius}
                  onChange={(e) => handleSettingChange('anchorWatchRadius', parseInt(e.target.value))}
                  className="w-full"
                />
                <p className={HELP}>
                  The radius a new anchor watch starts with; you can change it while the watch runs.
                  Take at least the length of the anchor rode plus the boat.
                </p>
              </div>
              <div>
                <label htmlFor="arrival-radius" className={LABEL}>
                  Route arrival radius ({units.label('distance')})
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
                  className={`${FIELD} w-32`}
                />
                <p className={HELP}>
                  While navigating a route, the next waypoint becomes active once the boat is this close
                  to the current one. New waypoints also start with this radius.
                </p>
              </div>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.enableCollisionAlarm}
                  onChange={(e) => handleSettingChange('enableCollisionAlarm', e.target.checked)}
                  className="h-5 w-5"
                />
                <span className="text-sm font-medium text-gray-700">
                  Collision warning for AIS targets (AIS arrives in a later version)
                </span>
              </label>
              <div className="border-t border-gray-200 pt-4">
                {/* Also unlocks audio, since it is a tap */}
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
                  className="min-h-11 rounded-lg border border-red-300 px-4 text-red-700 hover:bg-red-50"
                >
                  Test alarm
                </button>
                <p className={HELP}>
                  Check the volume before you rely on man overboard or anchor watch. Alarms sound
                  through the device speaker; a muted device or silent switch can silence them.
                </p>
              </div>
            </Card>
          </Section>

          {/* Has its own heading; only with accounts (the server version) */}
          <div id="settings-account" className="scroll-mt-4">
            <AccountSettings />
          </div>

          <Section id="about">
            <Card>
              <p className="text-sm text-gray-700">
                {APP_NAME} version {APP_VERSION}
              </p>
              <button
                onClick={handleResetSettings}
                className="min-h-11 rounded-lg bg-red-600 px-4 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Reset All Settings
              </button>
            </Card>
            {/* Browser feature support doesn't apply to the Windows and Android apps */}
            {!NATIVE_BUILD && <CompatibilityInfo />}
          </Section>
        </div>
      </div>
    </div>
  );
};
