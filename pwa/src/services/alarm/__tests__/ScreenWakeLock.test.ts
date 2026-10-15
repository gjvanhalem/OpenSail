import { describe, it, expect, vi } from 'vitest';
import { ScreenWakeLock } from '../ScreenWakeLock';

class FakeSentinel extends EventTarget {
  release = vi.fn(async () => {
    this.dispatchEvent(new Event('release'));
  });
}

function fakeDocument(visibility: DocumentVisibilityState = 'visible') {
  const target = new EventTarget() as EventTarget & { visibilityState: DocumentVisibilityState };
  target.visibilityState = visibility;
  return target;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeApi() {
  const sentinels: FakeSentinel[] = [];
  const api = {
    request: vi.fn(async () => {
      const sentinel = new FakeSentinel();
      sentinels.push(sentinel);
      return sentinel as unknown as WakeLockSentinel;
    }),
  };
  return { api, sentinels };
}

describe('ScreenWakeLock', () => {
  it('holds the lock while wanted and releases it after', async () => {
    const { api, sentinels } = fakeApi();
    const lock = new ScreenWakeLock(() => api, fakeDocument() as unknown as Document);
    lock.setWanted(true);
    await flush();
    expect(lock.getStatus()).toBe('held');
    lock.setWanted(false);
    expect(lock.getStatus()).toBe('off');
    expect(sentinels[0].release).toHaveBeenCalled();
  });

  it('asks again when the page comes back after the browser released the lock', async () => {
    const { api, sentinels } = fakeApi();
    const doc = fakeDocument();
    const lock = new ScreenWakeLock(() => api, doc as unknown as Document);
    lock.setWanted(true);
    await flush();

    // Tab hidden: the browser releases the lock
    doc.visibilityState = 'hidden';
    await sentinels[0].release();
    await flush();
    expect(lock.getStatus()).toBe('waiting');

    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    await flush();
    expect(api.request).toHaveBeenCalledTimes(2);
    expect(lock.getStatus()).toBe('held');
  });

  it('reports unsupported and denied', async () => {
    const unsupported = new ScreenWakeLock(() => null, fakeDocument() as unknown as Document);
    unsupported.setWanted(true);
    await flush();
    expect(unsupported.getStatus()).toBe('unsupported');

    const denied = new ScreenWakeLock(
      () => ({ request: () => Promise.reject(new DOMException('no', 'NotAllowedError')) }),
      fakeDocument() as unknown as Document
    );
    denied.setWanted(true);
    await flush();
    expect(denied.getStatus()).toBe('denied');
  });
});
