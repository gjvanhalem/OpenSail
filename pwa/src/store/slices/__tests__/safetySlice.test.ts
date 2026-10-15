import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import alertsReducer, { silenceAlarms } from '../alertsSlice';
import navigationReducer, { updatePosition } from '../navigationSlice';
import safetyReducer, {
  activateMob,
  clearMob,
  fixMobPosition,
  mobCleared,
  raiseAnchor,
  dropAnchor,
  restoreSafety,
  runAnchorCheck,
  setAnchorRadius,
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

  it('events in the same millisecond keep the order they were logged in', async () => {
    // A fast device can activate and clear within one millisecond
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_760_000_000_000);
    try {
      const store = makeStore();
      store.dispatch(updatePosition(fix(52.5, 4.5, Date.now())));
      store.dispatch(activateMob());
      const id = store.getState().safety.mob!.id;
      store.dispatch(clearMob());
      await settle();

      const events = await safetyEventRepository.getBySession(id);
      expect(events.map((e) => e.type)).toEqual(['mob_activated', 'mob_cleared']);
      expect(events[0].timestamp.getTime()).toBe(events[1].timestamp.getTime());

      const reloaded = makeStore();
      await reloaded.dispatch(restoreSafety());
      expect(reloaded.getState().safety.mob).toBeNull();
    } finally {
      now.mockRestore();
    }
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

describe('anchor watch', () => {
  beforeEach(async () => {
    await db.safetyEvents.clear();
  });

  /** A fix `north` metres north of 52 N 4 E, `seconds` after `t0` */
  const t0 = Date.now();
  const north = (metres: number, seconds: number) => fix(52 + metres / 111_195, 4, t0 + seconds * 1000);

  /** Feed one fix a second and run the check, as the layout hook does */
  function sail(store: ReturnType<typeof makeStore>, metres: number, from: number, to: number) {
    for (let s = from; s <= to; s++) {
      store.dispatch(updatePosition(north(metres, s)));
      store.dispatch(runAnchorCheck(t0 + s * 1000));
    }
  }

  function anchored() {
    const store = makeStore();
    store.dispatch(updatePosition(north(0, 0)));
    store.dispatch(dropAnchor(50));
    return store;
  }

  it('drops the anchor at the boat with the radius clamped to 10–500 m', () => {
    const store = makeStore();
    store.dispatch(dropAnchor(50));
    expect(store.getState().safety.anchor).toBeNull(); // no fix yet

    store.dispatch(updatePosition(north(0, 0)));
    store.dispatch(dropAnchor(900));
    const watch = store.getState().safety.anchor!;
    expect(watch.anchor).toMatchObject({ latitude: 52, longitude: 4 });
    expect(watch.radiusM).toBe(500);
    expect(watch.log.map((e) => e.type)).toEqual(['anchor_dropped']);
  });

  it('drags: alarm, silence, back inside, and a new drag sounds again', () => {
    const store = anchored();
    sail(store, 20, 1, 10);
    expect(store.getState().alerts.alarms.anchorDrag).toBeUndefined();

    sail(store, 80, 11, 20);
    const alarm = store.getState().alerts.alarms.anchorDrag!;
    expect(alarm.acknowledged).toBe(false);
    expect(alarm.message).toBe('ANCHOR DRAGGING: 80 m from the anchor (circle 50 m)');
    expect(store.getState().safety.anchor!.dragging).toBe(true);

    store.dispatch(silenceAlarms());
    sail(store, 30, 21, 22);
    // Silenced and back inside: the alarm goes
    expect(store.getState().alerts.alarms.anchorDrag).toBeUndefined();

    sail(store, 90, 23, 35);
    expect(store.getState().alerts.alarms.anchorDrag?.acknowledged).toBe(false);
    expect(store.getState().safety.anchor!.log.map((e) => e.type)).toEqual([
      'anchor_drag_alarm',
      'anchor_back_inside',
      'anchor_drag_alarm',
      'anchor_dropped',
    ]);
  });

  it('a drag that was not silenced keeps sounding after the boat is back inside', () => {
    const store = anchored();
    sail(store, 80, 1, 10);
    sail(store, 20, 11, 12);
    const alarm = store.getState().alerts.alarms.anchorDrag!;
    expect(alarm.acknowledged).toBe(false);
    expect(alarm.message).toMatch(/back inside/);
  });

  it('a larger radius brings the boat back inside', () => {
    const store = anchored();
    sail(store, 80, 1, 10);
    store.dispatch(silenceAlarms());
    store.dispatch(setAnchorRadius(120));
    sail(store, 80, 11, 11);
    expect(store.getState().safety.anchor!.dragging).toBe(false);
    expect(store.getState().alerts.alarms.anchorDrag).toBeUndefined();
  });

  it('raising the anchor ends the watch and its alarms', async () => {
    const store = anchored();
    sail(store, 80, 1, 10);
    const id = store.getState().safety.anchor!.id;
    store.dispatch(raiseAnchor());
    expect(store.getState().safety.anchor).toBeNull();
    expect(store.getState().alerts.alarms.anchorDrag).toBeUndefined();

    await settle();
    const events = await safetyEventRepository.getBySession(id);
    // Sorted by time stamp, and the test's fixes are in the simulated future
    expect(events.map((e) => e.type).sort()).toEqual([
      'anchor_drag_alarm',
      'anchor_dropped',
      'anchor_raised',
    ]);
    expect(events.every((e) => e.timestamp instanceof Date)).toBe(true);
    const drag = events.find((e) => e.type === 'anchor_drag_alarm')!;
    expect(drag).toMatchObject({ targetLatitude: 52, targetLongitude: 4, radius: 50 });
    expect(drag.distance).toBeCloseTo(80, 0);
  });

  it('the watch comes back after a reload with its radius and log', async () => {
    const store = anchored();
    store.dispatch(setAnchorRadius(75));
    await settle();

    const reloaded = makeStore();
    await reloaded.dispatch(restoreSafety());
    const watch = reloaded.getState().safety.anchor!;
    expect(watch.id).toBe(store.getState().safety.anchor!.id);
    expect(watch.radiusM).toBe(75);
    expect(watch.anchor).toMatchObject({ latitude: 52, longitude: 4 });
    expect(watch.log.map((e) => e.type)).toEqual(['anchor_radius_changed', 'anchor_dropped']);

    store.dispatch(raiseAnchor());
    await settle();
    const again = makeStore();
    await again.dispatch(restoreSafety());
    expect(again.getState().safety.anchor).toBeNull();
  });

  it('a GPS that goes quiet raises its own alarm', () => {
    const store = anchored();
    const now = Date.now();
    store.dispatch(runAnchorCheck(now));
    store.dispatch(runAnchorCheck(now + 30_000));
    expect(store.getState().alerts.alarms.anchorGpsLost).toBeUndefined();
    store.dispatch(runAnchorCheck(now + 61_000));
    expect(store.getState().alerts.alarms.anchorGpsLost?.message).toMatch(/no usable position/);
  });
});
