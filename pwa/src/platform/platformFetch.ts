import { NATIVE_BUILD, nativePlatform } from './platform';

export type FetchFunction = (input: string, init?: RequestInit) => Promise<Response>;

/** The parts of Capacitor's CapacitorHttp plugin the Android app uses; tests pass a fake */
export interface CapacitorHttpApi {
  request(options: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    data?: string;
    responseType?: 'arraybuffer';
    connectTimeout?: number;
    readTimeout?: number;
  }): Promise<{ data: unknown; status: number; headers: Record<string, string>; url: string }>;
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * fetch() on top of CapacitorHttp: the request is made by Android's
 * HttpURLConnection, where CORS doesn't apply. Bodies come back base64 encoded
 * (responseType 'arraybuffer'); CapacitorHttp parses JSON itself and returns
 * error bodies (status 400 and up) as text. It can't be aborted midway, so a
 * signal only stops the answer from being used.
 */
export function capacitorFetch(http: CapacitorHttpApi): FetchFunction {
  return async (input, init) => {
    const signal = init?.signal;
    if (signal?.aborted) throw abortError();
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const body = typeof init?.body === 'string' ? init.body : undefined;
    const response = await http.request({
      url: input,
      method: init?.method ?? 'GET',
      headers,
      data: body,
      responseType: 'arraybuffer',
      // Without these, a request on a dead connection (the boat's Wi-Fi) never ends
      connectTimeout: 15000,
      readTimeout: 30000,
    });
    if (signal?.aborted) throw abortError();

    let data: BodyInit | null;
    if (response.data === null || response.data === undefined || response.data === '') data = null;
    else if (typeof response.data !== 'string') data = JSON.stringify(response.data);
    else if (response.status >= 400) data = response.data;
    else data = base64ToBytes(response.data);
    // A Response for these statuses can't have a body
    if ([101, 204, 205, 304].includes(response.status)) data = null;

    const responseHeaders = new Headers();
    for (const [name, value] of Object.entries(response.headers ?? {})) {
      // HttpURLConnection lists the status line under a null name
      if (name && name !== 'null' && value != null) responseHeaders.append(name, String(value));
    }
    return new Response(data, { status: response.status, headers: responseHeaders });
  };
}

let nativeFetch: Promise<FetchFunction> | null = null;

function loadNativeFetch(): Promise<FetchFunction> {
  // Only the native apps load their plugin's code
  nativeFetch ??=
    nativePlatform() === 'tauri'
      ? import('@tauri-apps/plugin-http').then(({ fetch }) => fetch as FetchFunction)
      : import('@capacitor/core').then(({ CapacitorHttp }) => capacitorFetch(CapacitorHttp as CapacitorHttpApi));
  return nativeFetch;
}

/** Whether platformFetch goes around the browser (and CORS) here: in the native apps */
export function usesNativeFetch(): boolean {
  return nativePlatform() !== null;
}

/**
 * fetch() for files from another host that may not send CORS headers, such as
 * the charts on GitHub releases. In the native apps the request is made outside
 * the webview, where CORS doesn't apply: by Rust on Windows (tauri-plugin-http),
 * by Android's HTTP client on Android (CapacitorHttp). In the browser it is
 * window.fetch.
 */
export async function platformFetch(input: string, init?: RequestInit): Promise<Response> {
  if (!usesNativeFetch()) return fetch(input, init);
  const fetchNative = await loadNativeFetch();
  return fetchNative(input, init);
}

declare global {
  interface Window {
    /** The native apps' smoke tests (desktop/smoke, android/smoke) check native HTTP with it */
    __OPENSAIL_PLATFORM_FETCH__?: typeof platformFetch;
  }
}

if (NATIVE_BUILD && typeof window !== 'undefined') window.__OPENSAIL_PLATFORM_FETCH__ = platformFetch;
