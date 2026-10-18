import { NATIVE_BUILD, isTauri } from './platform';

export type FetchFunction = (input: string, init?: RequestInit) => Promise<Response>;

let nativeFetch: Promise<FetchFunction> | null = null;

function loadNativeFetch(): Promise<FetchFunction> {
  // Only the desktop app loads the plugin's code
  nativeFetch ??= import('@tauri-apps/plugin-http').then(({ fetch }) => fetch as FetchFunction);
  return nativeFetch;
}

/**
 * fetch() for files from another host that may not send CORS headers, such as
 * the charts on GitHub releases. In the desktop app the request is made by
 * Rust (tauri-plugin-http), where CORS doesn't apply; in the browser it is
 * window.fetch.
 */
export async function platformFetch(input: string, init?: RequestInit): Promise<Response> {
  if (!isTauri()) return fetch(input, init);
  const fetchNative = await loadNativeFetch();
  return fetchNative(input, init);
}

declare global {
  interface Window {
    /** The desktop app's smoke test (desktop/smoke) checks native HTTP with it */
    __OPENSAIL_PLATFORM_FETCH__?: typeof platformFetch;
  }
}

if (NATIVE_BUILD && typeof window !== 'undefined') window.__OPENSAIL_PLATFORM_FETCH__ = platformFetch;
