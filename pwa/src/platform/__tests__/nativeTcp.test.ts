import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { capacitorTcp, tauriTcp, type CapacitorTcpPlugin, type TcpClosedEvent, type TcpDataEvent } from '../nativeTcp';

const win = window as unknown as Record<string, unknown>;

beforeEach(() => vi.resetModules());
afterEach(() => {
  delete win.__TAURI_INTERNALS__;
  delete win.Capacitor;
  vi.doUnmock('@tauri-apps/api/core');
  vi.doUnmock('@tauri-apps/api/event');
  vi.doUnmock('@capacitor/core');
});

/** The Android plugin (TcpPlugin.kt), driven by hand */
function fakePlugin() {
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  const plugin = {
    connect: vi.fn(async () => {}),
    write: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    addListener: vi.fn(async (event: string, handler: (event: unknown) => void) => {
      const set = listeners.get(event) ?? new Set();
      listeners.set(event, set);
      set.add(handler);
      return { remove: async () => void set.delete(handler) };
    }),
  };
  const emit = (event: string, payload: unknown) => listeners.get(event)?.forEach((handler) => handler(payload));
  return { plugin: plugin as unknown as CapacitorTcpPlugin & typeof plugin, emit, listeners };
}

describe('nativePlatform', () => {
  it('tells the browser, Tauri and Capacitor apart', async () => {
    const { nativePlatform } = await import('../platform');
    expect(nativePlatform()).toBeNull();
    win.Capacitor = { isNativePlatform: () => false }; // @capacitor/core in a browser
    expect(nativePlatform()).toBeNull();
    win.Capacitor = { isNativePlatform: () => true };
    expect(nativePlatform()).toBe('capacitor');
    delete win.Capacitor;
    win.__TAURI_INTERNALS__ = {};
    expect(nativePlatform()).toBe('tauri');
  });
});

describe('capacitorTcp', () => {
  it('passes calls to the Kotlin plugin with the same arguments as the Rust commands', async () => {
    const { plugin } = fakePlugin();
    const tcp = capacitorTcp(plugin);
    await tcp.connect('wifi#1', '192.168.14.1', 20220);
    await tcp.write('wifi#1', '$GPAPB*00\r\n');
    await tcp.disconnect('wifi#1');
    expect(plugin.connect).toHaveBeenCalledWith({ id: 'wifi#1', host: '192.168.14.1', port: 20220 });
    expect(plugin.write).toHaveBeenCalledWith({ id: 'wifi#1', data: '$GPAPB*00\r\n' });
    expect(plugin.disconnect).toHaveBeenCalledWith({ id: 'wifi#1' });
  });

  it('delivers the plugin events until unsubscribed', async () => {
    const { plugin, emit, listeners } = fakePlugin();
    const tcp = capacitorTcp(plugin);
    const data: TcpDataEvent[] = [];
    const closed: TcpClosedEvent[] = [];
    const stopData = await tcp.onData((event) => data.push(event));
    const stopClosed = await tcp.onClosed((event) => closed.push(event));
    emit('tcp-data', { id: 'wifi#1', data: '$APHDM,1.0,M*00\r\n' });
    emit('tcp-closed', { id: 'wifi#1', error: 'Connection reset' });
    expect(data).toEqual([{ id: 'wifi#1', data: '$APHDM,1.0,M*00\r\n' }]);
    expect(closed).toEqual([{ id: 'wifi#1', error: 'Connection reset' }]);
    stopData();
    stopClosed();
    await Promise.resolve();
    expect(listeners.get('tcp-data')?.size).toBe(0);
    expect(listeners.get('tcp-closed')?.size).toBe(0);
  });

  it('rejects with the plugin error', async () => {
    const { plugin } = fakePlugin();
    plugin.connect.mockRejectedValueOnce(new Error('failed to connect to /192.168.14.1 (port 20220)'));
    await expect(capacitorTcp(plugin).connect('wifi#1', '192.168.14.1', 20220)).rejects.toThrow('failed to connect');
  });
});

describe('tauriTcp', () => {
  it('turns the string errors from Rust into Errors', async () => {
    const tcp = tauriTcp({
      invoke: async () => {
        throw 'no answer within 5 s';
      },
      listen: async () => () => {},
    });
    await expect(tcp.connect('wifi#1', '192.168.14.1', 20220)).rejects.toThrow(new Error('no answer within 5 s'));
  });
});

describe('loadNativeTcp', () => {
  it('uses the Rust commands in the Windows app', async () => {
    const invoke = vi.fn(async () => undefined);
    const listen = vi.fn(async () => () => {});
    vi.doMock('@tauri-apps/api/core', () => ({ invoke }));
    vi.doMock('@tauri-apps/api/event', () => ({ listen }));
    win.__TAURI_INTERNALS__ = {};
    const { loadNativeTcp, isNativeTcpSupported } = await import('../nativeTcp');
    expect(isNativeTcpSupported()).toBe(true);
    const tcp = await loadNativeTcp();
    await tcp.onData(() => {});
    await tcp.connect('wifi#1', '192.168.14.1', 20220);
    expect(listen).toHaveBeenCalledWith('tcp-data', expect.any(Function));
    expect(invoke).toHaveBeenCalledWith('tcp_connect', { id: 'wifi#1', host: '192.168.14.1', port: 20220 });
  });

  it('uses the OpenSailTcp plugin in the Android app', async () => {
    const { plugin } = fakePlugin();
    const registerPlugin = vi.fn(() => plugin);
    vi.doMock('@capacitor/core', () => ({ registerPlugin }));
    win.Capacitor = { isNativePlatform: () => true };
    const { loadNativeTcp } = await import('../nativeTcp');
    const tcp = await loadNativeTcp();
    await tcp.connect('wifi#1', '192.168.14.1', 20220);
    expect(registerPlugin).toHaveBeenCalledWith('OpenSailTcp');
    expect(plugin.connect).toHaveBeenCalledOnce();
  });

  it('is not there in a browser', async () => {
    const { loadNativeTcp, isNativeTcpSupported } = await import('../nativeTcp');
    expect(isNativeTcpSupported()).toBe(false);
    await expect(loadNativeTcp()).rejects.toThrow(/Windows or Android/);
  });

  it('lets NativeTcpConnection connect without being handed the sockets', async () => {
    const { plugin, emit } = fakePlugin();
    vi.doMock('@capacitor/core', () => ({ registerPlugin: () => plugin }));
    win.Capacitor = { isNativePlatform: () => true };
    const { NativeTcpConnection } = await import('@/services/connections/NativeTcpConnection');
    expect(NativeTcpConnection.isSupported()).toBe(true);
    const conn = new NativeTcpConnection({ id: 'wifi', protocol: 'NMEA0183', host: '192.168.14.1', port: 20220 });
    const lines: string[] = [];
    conn.onData((line) => lines.push(line));
    await conn.connect();
    emit('tcp-data', { id: 'wifi#1', data: '$APHDM,123.4,M*3A\r\n$APRSA' });
    expect(lines).toEqual(['$APHDM,123.4,M*3A']);
    expect(conn.status).toBe('connected');
    await conn.disconnect();
    expect(plugin.disconnect).toHaveBeenCalledWith({ id: 'wifi#1' });
  });
});
