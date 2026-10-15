import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import alertsReducer from '../alertsSlice';
import navigationReducer, { updatePosition } from '../navigationSlice';
import safetyReducer, {
  activateMob,
  clearMob,
  fixMobPosition,
  mobCleared,
  restoreSafety,
} from '../safetySlice';
import { db } from '@/database/db';
import { safetyEventRepository } from '@/database/repositories/SafetyEventRepository';
import type { Position } from '@/models';

const makeStore = () =>
  configureStore({
    reducer: { alerts: alertsReducer, navigation: navigationReducer, safety: safetyReducer },
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  });

const fix = (latitude: number, longitude: number, timestamp = Date.now()): Position => ({
  latitude,
  longitude,
  accuracy: 3,
  timestamp,
});

/** Writes are fire-and-forget; wait for them to land */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('man overboard', () => {
  beforeEach(async () => {
    await db.safetyEvents.clear();
  });

  it('records the latest fix at once, sounds the alarm and logs it', async () => {
    const store = makeStore();
    store.dispatch(updatePosition(fix(52.1, 4.2)));
    const before = Date.now();
    store.dispatch(activateMob());

    // Synchronous: the spot is in the store as soon as the tap is handled
    const mob = store.getState().safety.mob!;
    expect(mob.position).toMatchObject({ latitude: 52.1, longitude: 4.2 });
    expect(mob.activatedAt).toBeGreaterThanOrEqual(before);
    expect(mob.activatedAt - before).toBeLessThan(1000);
    expect(mob.staleFix).toBe(false);
    expect(store.getState().alerts.alarms.mob?.acknowledged).toBe(false);

    await settle();
    const events = await safetyEventRepository.getBySession(mob.id);
    expect(events.map((e) => e.type)).toEqual(['mob_activated']);
    expect(events[0]).toMatchObject({ targetLatitude: 52.1, targetLongitude: 4.2 });
  });

  it('a second tap keeps the first spot', () => {
    const store = makeStore();
    store.dispatch(updatePosition(fix(52.1, 4.2)));
    store.dispatch(activateMob());
    const first = store.getState().safety.mob;
    store.dispatch(updatePosition(fix(52.2, 4.2)));
    store.dispatch(activateMob());
    expect(store.getState().safety.mob).toBe(first);
  });

  it('flags a stale fix, and takes the next fix when there was none', () => {
    const store = makeStore();
    store.dispatch(updatePosition(fix(52, 4, Date.now() - 60_000)));
    store.dispatch(activateMob());
    expect(store.getState().safety.mob?.staleFix).toBe(true);

    const noFix = makeStore();
    noFix.dispatch(activateMob());
    expect(noFix.getState().safety.mob?.position).toBeNull();
    noFix.dispatch(fixMobPosition(fix(52.3, 4.1)));
    noFix.dispatch(fixMobPosition(fix(52.9, 4.9)));
    expect(noFix.getState().safety.mob?.position).toMatchObject({ latitude: 52.3 });
  });

  it('clearing stops the alarm and logs the distance', async () => {
    const store = makeStore();
    store.dispatch(updatePosition(fix(52, 4)));
    store.dispatch(activateMob());
    const id = store.getState().safety.mob!.id;
    store.dispatch(updatePosition(fix(52.001, 4)));
    store.dispatch(clearMob());
    expect(store.getState().safety.mob).toBeNull();
    expect(store.getState().alerts.alarms.mob).toBeUndefined();

    await settle();
    const events = await safetyEventRepository.getBySession(id);
    expect(events.map((e) => e.type)).toEqual(['mob_activated', 'mob_cleared']);
    expect(events[1].distance).toBeCloseTo(111, -1);
  });

  it('an active MOB comes back after a reload, silenced', async () => {
    const store = makeStore();
    store.dispatch(updatePosition(fix(52.5, 4.5)));
    store.dispatch(activateMob());
    const mob = store.getState().safety.mob!;
    await settle();

    const reloaded = makeStore();
    await reloaded.dispatch(restoreSafety());
    expect(reloaded.getState().safety.mob).toMatchObject({
      id: mob.id,
      activatedAt: mob.activatedAt,
      position: { latitude: 52.5, longitude: 4.5 },
    });
    expect(reloaded.getState().alerts.alarms.mob).toBeUndefined();
  });

  it('a cleared MOB stays cleared after a reload', async () => {
    const store = makeStore();
    store.dispatch(updatePosition(fix(52.5, 4.5)));
    store.dispatch(activateMob());
    await settle();
    store.dispatch(clearMob());
    await settle();

    const reloaded = makeStore();
    await reloaded.dispatch(restoreSafety());
    expect(reloaded.getState().safety.mob).toBeNull();
  });

  it('a failed write does not stop the alarm', async () => {
    const spy = vi.spyOn(safetyEventRepository, 'create').mockRejectedValue(new Error('quota'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = makeStore();
    store.dispatch(updatePosition(fix(52, 4)));
    store.dispatch(activateMob());
    expect(store.getState().alerts.alarms.mob).toBeDefined();
    await settle();
    expect(error).toHaveBeenCalled();
    spy.mockRestore();
    error.mockRestore();
    store.dispatch(mobCleared());
  });
});
