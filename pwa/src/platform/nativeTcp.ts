import { nativePlatform } from './platform';

/** One chunk read from a socket ('tcp-data' in both native apps) */
export interface TcpDataEvent {
  id: string;
  data: string;
}

/** The other side closed the socket, or reading failed ('tcp-closed') */
export interface TcpClosedEvent {
  id: string;
  error: string | null;
}

/**
 * Plain TCP sockets, opened by the native app: Rust in the Windows app
 * (desktop/src-tauri/src/tcp.rs), Kotlin in the Android app
 * (android/native/app/src/main/java/nl/gzeven/opensail/tcp/). Both have the
 * same calls and events. Ids come from the page, one per attempt, so it knows
 * a socket's events before connect() returns. disconnect() sends no 'closed'.
 */
export interface NativeTcp {
  connect(id: string, host: string, port: number): Promise<void>;
  write(id: string, data: string): Promise<void>;
  disconnect(id: string): Promise<void>;
  onData(handler: (event: TcpDataEvent) => void): Promise<() => void>;
  onClosed(handler: (event: TcpClosedEvent) => void): Promise<() => void>;
}

/** The parts of the Tauri API the Windows app's sockets use; tests pass a fake */
export interface TauriApi {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  listen<T>(event: string, handler: (event: { payload: T }) => void): Promise<() => void>;
}

/** Errors from Rust arrive as strings */
function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** Windows: the Rust commands tcp_connect / tcp_write / tcp_disconnect */
export function tauriTcp(tauri: TauriApi): NativeTcp {
  const call = (command: string, args: Record<string, unknown>) =>
    tauri.invoke<void>(command, args).catch((error: unknown) => {
      throw asError(error);
    });
  return {
    connect: (id, host, port) => call('tcp_connect', { id, host, port }),
    write: (id, data) => call('tcp_write', { id, data }),
    disconnect: (id) => call('tcp_disconnect', { id }),
    onData: (handler) => tauri.listen<TcpDataEvent>('tcp-data', ({ payload }) => handler(payload)),
    onClosed: (handler) => tauri.listen<TcpClosedEvent>('tcp-closed', ({ payload }) => handler(payload)),
  };
}

/** The Android app's Kotlin plugin (TcpPlugin.kt), as registerPlugin('OpenSailTcp') returns it */
export interface CapacitorTcpPlugin {
  connect(options: { id: string; host: string; port: number }): Promise<void>;
  write(options: { id: string; data: string }): Promise<void>;
  disconnect(options: { id: string }): Promise<void>;
  addListener(event: 'tcp-data', handler: (event: TcpDataEvent) => void): Promise<{ remove(): Promise<void> }>;
  addListener(event: 'tcp-closed', handler: (event: TcpClosedEvent) => void): Promise<{ remove(): Promise<void> }>;
}

/** Android: the in-repo Capacitor plugin OpenSailTcp */
export function capacitorTcp(plugin: CapacitorTcpPlugin): NativeTcp {
  const unsubscribe = (handle: { remove(): Promise<void> }) => () => void handle.remove();
  return {
    connect: (id, host, port) => plugin.connect({ id, host, port }),
    write: (id, data) => plugin.write({ id, data }),
    disconnect: (id) => plugin.disconnect({ id }),
    onData: async (handler) => unsubscribe(await plugin.addListener('tcp-data', handler)),
    onClosed: async (handler) => unsubscribe(await plugin.addListener('tcp-closed', handler)),
  };
}

let loaded: Promise<NativeTcp> | null = null;

/** The sockets of the native app this page runs in. Only the native apps load this code. */
export function loadNativeTcp(): Promise<NativeTcp> {
  loaded ??= (async () => {
    switch (nativePlatform()) {
      case 'tauri': {
        const [{ invoke }, { listen }] = await Promise.all([import('@tauri-apps/api/core'), import('@tauri-apps/api/event')]);
        return tauriTcp({ invoke, listen });
      }
      case 'capacitor': {
        const { registerPlugin } = await import('@capacitor/core');
        return capacitorTcp(registerPlugin<CapacitorTcpPlugin>('OpenSailTcp'));
      }
      default:
        throw new Error('TCP needs the OpenSail app for Windows or Android');
    }
  })();
  return loaded;
}

/** Whether this page can open TCP sockets: only in the native apps */
export function isNativeTcpSupported(): boolean {
  return nativePlatform() !== null;
}
