import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import settingsReducer, {
  loadSettings,
  setSettingOptimistic,
  updateMultipleSettings,
  updateSetting,
} from '../settingsSlice';
import {
  DEFAULT_SETTINGS,
  settingsRepository,
  type AppSettings,
} from '@/database/repositories/SettingsRepository';
import { db, REMOVED_SETTINGS } from '@/database/db';

const createStore = () => configureStore({ reducer: { settings: settingsReducer } });

/** A promise the test resolves itself, to decide when the load finishes */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('settings changed while the initial load runs', () => {
  let stored: ReturnType<typeof deferred<AppSettings>>;

  beforeEach(() => {
    stored = deferred<AppSettings>();
    vi.spyOn(settingsRepository, 'initialize').mockResolvedValue();
    // The load reads the settings before the user changes one, and finishes after
    vi.spyOn(settingsRepository, 'getAll').mockReturnValue(stored.promise);
    vi.spyOn(settingsRepository, 'set').mockResolvedValue();
    vi.spyOn(settingsRepository, 'setMany').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps a setting updated before the load finishes', async () => {
    const store = createStore();
    const load = store.dispatch(loadSettings());
    await store.dispatch(updateSetting({ key: 'chartRotation', value: 'heading-up' }));

    stored.resolve({ ...DEFAULT_SETTINGS, chartRotation: 'north-up', defaultZoom: 14 });
    await load;

    const { settings, isInitialized } = store.getState().settings;
    expect(isInitialized).toBe(true);
    expect(settings.chartRotation).toBe('heading-up');
    // The other settings come from the load
    expect(settings.defaultZoom).toBe(14);
  });

  it('keeps optimistic and multiple updates made before the load finishes', async () => {
    const store = createStore();
    const load = store.dispatch(loadSettings());
    store.dispatch(setSettingOptimistic({ key: 'units', value: 'metric' }));
    await store.dispatch(updateMultipleSettings({ gpsMode: 'simulator', speedGaugeMax: 20 }));

    stored.resolve({ ...DEFAULT_SETTINGS, units: 'nautical', gpsMode: 'off', speedGaugeMax: 12 });
    await load;

    const { settings } = store.getState().settings;
    expect(settings.units).toBe('metric');
    expect(settings.gpsMode).toBe('simulator');
    expect(settings.speedGaugeMax).toBe(20);
  });

  it('takes the loaded values once loaded, and later loads replace them', async () => {
    const store = createStore();
    const load = store.dispatch(loadSettings());
    await store.dispatch(updateSetting({ key: 'chartRotation', value: 'heading-up' }));
    stored.resolve({ ...DEFAULT_SETTINGS, chartRotation: 'north-up' });
    await load;

    vi.mocked(settingsRepository.getAll).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      chartRotation: 'north-up',
    });
    await store.dispatch(loadSettings());
    expect(store.getState().settings.settings.chartRotation).toBe('north-up');
  });
});

describe('SettingsRepository.initialize', () => {
  beforeEach(async () => {
    await db.settings.clear();
  });

  it("doesn't overwrite a setting saved while it writes the defaults", async () => {
    await Promise.all([
      settingsRepository.initialize(),
      settingsRepository.set('chartRotation', 'heading-up'),
    ]);
    expect((await settingsRepository.getAll()).chartRotation).toBe('heading-up');
  });
});

describe('removed settings', () => {
  it('are not settings any more, so the version 4 migration may delete them', () => {
    for (const key of REMOVED_SETTINGS) expect(key in DEFAULT_SETTINGS).toBe(false);
  });
});
