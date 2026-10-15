/**
 * Keep the screen on with the Screen Wake Lock API while an alarm sounds or a
 * watch (MOB, anchor watch) is active. Browsers release the lock whenever the
 * page is hidden, so it is requested again each time the page becomes visible.
 */

export type WakeLockStatus =
  /** Not wanted */
  | 'off'
  /** Wanted and held: the screen stays on */
  | 'held'
  /** Wanted but the page is hidden; requested again when it is visible */
  | 'waiting'
  /** Wanted, but the browser has no Screen Wake Lock API */
  | 'unsupported'
  /** Wanted, but the browser refused it (low battery, permissions policy) */
  | 'denied';

type Listener = (status: WakeLockStatus) => void;

interface WakeLockApi {
  request(type: 'screen'): Promise<WakeLockSentinel>;
}

function wakeLockApi(): WakeLockApi | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock ?? null;
}

export class ScreenWakeLock {
  private wanted = false;
  private sentinel: WakeLockSentinel | null = null;
  private requesting = false;
  private status: WakeLockStatus = 'off';
  private listeners = new Set<Listener>();
  private readonly api: () => WakeLockApi | null;
  private readonly doc: Document | null;

  constructor(api: () => WakeLockApi | null = wakeLockApi, doc: Document | null = typeof document === 'undefined' ? null : document) {
    this.api = api;
    this.doc = doc;
    this.doc?.addEventListener('visibilitychange', () => {
      if (this.wanted) void this.acquire();
    });
  }

  getStatus(): WakeLockStatus {
    return this.status;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Whether the screen should be kept on */
  setWanted(wanted: boolean): void {
    if (wanted === this.wanted) return;
    this.wanted = wanted;
    if (wanted) {
      void this.acquire();
    } else {
      const sentinel = this.sentinel;
      this.sentinel = null;
      sentinel?.release().catch(() => undefined);
      this.setStatus('off');
    }
  }

  private async acquire(): Promise<void> {
    if (!this.wanted || this.sentinel || this.requesting) return;
    const api = this.api();
    if (!api) {
      this.setStatus('unsupported');
      return;
    }
    if (this.doc && this.doc.visibilityState !== 'visible') {
      this.setStatus('waiting');
      return;
    }
    this.requesting = true;
    try {
      const sentinel = await api.request('screen');
      if (!this.wanted) {
        await sentinel.release();
        return;
      }
      this.sentinel = sentinel;
      sentinel.addEventListener('release', () => {
        if (this.sentinel !== sentinel) return;
        this.sentinel = null;
        if (!this.wanted) return;
        this.setStatus('waiting');
        void this.acquire();
      });
      this.setStatus('held');
    } catch {
      this.setStatus('denied');
    } finally {
      this.requesting = false;
    }
  }

  private setStatus(status: WakeLockStatus) {
    if (status === this.status) return;
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }
}

/** The app's one wake lock */
export const screenWakeLock = new ScreenWakeLock();
