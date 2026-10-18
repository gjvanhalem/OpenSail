/**
 * Where the app runs: in a browser (the PWA, served from the web) or as the
 * desktop app (Tauri, desktop/), which loads this same build from disk.
 */

/** Built for the desktop app: `npm run build:native` (vite --mode native, see .env.native) */
export const NATIVE_BUILD: boolean = import.meta.env.VITE_NATIVE_APP === 'tauri';

/** Running inside Tauri's webview, where the Rust commands and plugins can be called */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
