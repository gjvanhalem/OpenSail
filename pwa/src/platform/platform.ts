/**
 * Where the app runs: in a browser (the PWA, served from the web), or as one of
 * the native apps that load this same build from their package: Windows (Tauri,
 * desktop/) and Android (Capacitor, android/).
 *
 * This is the one place that tells them apart. Features ask for a capability
 * (platformFetch, loadNativeTcp, platformGeolocation, platformBackground) and the
 * modules in this folder pick the implementation.
 */

/** A native app's shell: Tauri on Windows, Capacitor on Android */
export type NativePlatform = 'tauri' | 'capacitor';

/** Built for the native apps: `npm run build:native` (vite --mode native, see .env.native) */
export const NATIVE_BUILD: boolean = import.meta.env.VITE_NATIVE_APP === 'true';

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
}

/** The native shell this page runs in, or null in a browser */
export function nativePlatform(): NativePlatform | null {
  if (typeof window === 'undefined') return null;
  if ('__TAURI_INTERNALS__' in window) return 'tauri';
  // Capacitor's native bridge defines window.Capacitor before the app's scripts run
  const capacitor = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (capacitor?.isNativePlatform?.() === true) return 'capacitor';
  return null;
}

/** Running inside Tauri's webview, where the Rust commands and plugins can be called */
export function isTauri(): boolean {
  return nativePlatform() === 'tauri';
}

/** Running inside Capacitor's Android WebView, where the app's Kotlin plugins can be called */
export function isCapacitor(): boolean {
  return nativePlatform() === 'capacitor';
}

/**
 * A Capacitor plugin loaded on demand. Capacitor's plugin objects are proxies that answer every
 * property, `then` too, so a Promise must never resolve to one (awaiting it calls a native
 * method "then" that doesn't exist): wrap it.
 */
export interface LoadedPlugin<T> {
  plugin: T;
}
