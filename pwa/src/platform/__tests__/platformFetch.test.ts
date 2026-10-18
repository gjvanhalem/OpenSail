import { describe, it, expect, vi, afterEach } from 'vitest';
import { EtagMismatch, PMTiles } from 'pmtiles';
import { FetchRangeSource } from '../FetchRangeSource';

const nativeFetch = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(async () => new Response('from rust'));
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: nativeFetch }));

afterEach(() => {
  vi.unstubAllGlobals();
  nativeFetch.mockClear();
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe('platformFetch', () => {
  it('uses window.fetch in the browser', async () => {
    const browserFetch = vi.fn(async () => new Response('from the browser'));
    vi.stubGlobal('fetch', browserFetch);
    const { platformFetch } = await import('../platformFetch');
    const response = await platformFetch('https://example.org/index.json', { cache: 'no-cache' });
    expect(await response.text()).toBe('from the browser');
    expect(browserFetch).toHaveBeenCalledWith('https://example.org/index.json', { cache: 'no-cache' });
    expect(nativeFetch).not.toHaveBeenCalled();
  });

  it('uses tauri-plugin-http in the desktop app, so CORS does not apply', async () => {
    const browserFetch = vi.fn();
    vi.stubGlobal('fetch', browserFetch);
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    const { platformFetch } = await import('../platformFetch');
    const init = { headers: { Range: 'bytes=0-9' } };
    const response = await platformFetch('https://github.com/x/releases/latest/download/a.pmtiles', init);
    expect(await response.text()).toBe('from rust');
    expect(nativeFetch).toHaveBeenCalledWith('https://github.com/x/releases/latest/download/a.pmtiles', init);
    expect(browserFetch).not.toHaveBeenCalled();
  });

  it('reads the chart catalog through it', async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    nativeFetch.mockResolvedValueOnce(new Response(JSON.stringify({ version: 1, regions: [] })));
    const { fetchChartCatalog } = await import('@/services/chartCatalog');
    expect(await fetchChartCatalog('https://github.com/x/releases/latest/download/index.json')).toEqual([]);
    expect(nativeFetch).toHaveBeenCalledOnce();
  });
});

/** A server for `bytes` that honours Range like GitHub's release downloads do */
function rangeServer(bytes: Uint8Array, etag = '"v1"') {
  return vi.fn(async (_url: string, init?: RequestInit) => {
    const range = (init?.headers as Record<string, string>).Range;
    const [, first, last] = /bytes=(\d+)-(\d+)/.exec(range)!.map(Number);
    if (first >= bytes.length) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.length}` } });
    }
    const end = Math.min(last, bytes.length - 1);
    const body = bytes.slice(first, end + 1);
    return new Response(body, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${first}-${end}/${bytes.length}`,
        'Content-Length': String(body.length),
        ETag: etag,
      },
    });
  });
}

describe('FetchRangeSource', () => {
  const bytes = Uint8Array.from({ length: 100 }, (_, i) => i);

  it('reads a byte range', async () => {
    const fetchImpl = rangeServer(bytes);
    const source = new FetchRangeSource('https://example.org/a.pmtiles', fetchImpl);
    const result = await source.getBytes(10, 5);
    expect([...new Uint8Array(result.data)]).toEqual([10, 11, 12, 13, 14]);
    expect(result.etag).toBe('"v1"');
    expect(fetchImpl).toHaveBeenCalledWith('https://example.org/a.pmtiles', expect.objectContaining({ headers: { Range: 'bytes=10-14' } }));
    expect(source.getKey()).toBe('https://example.org/a.pmtiles');
  });

  it('reads an archive smaller than the first request', async () => {
    const small = new FetchRangeSource('https://example.org/a.pmtiles', async (url, init) => {
      const range = (init?.headers as Record<string, string>).Range;
      if (range === 'bytes=0-16383') {
        return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */100' } });
      }
      return rangeServer(bytes)(url, init);
    });
    const result = await small.getBytes(0, 16384);
    expect(result.data.byteLength).toBe(100);
  });

  it('notices when the archive changed', async () => {
    const source = new FetchRangeSource('https://example.org/a.pmtiles', rangeServer(bytes, '"v2"'));
    await expect(source.getBytes(0, 10, undefined, '"v1"')).rejects.toBeInstanceOf(EtagMismatch);
  });

  it('refuses a server without byte ranges', async () => {
    const source = new FetchRangeSource('https://example.org/a.pmtiles', async () => new Response(bytes, { status: 200 }));
    await expect(source.getBytes(0, 10)).rejects.toThrow(/without byte ranges/);
  });

  it('reports HTTP errors', async () => {
    const source = new FetchRangeSource('https://example.org/a.pmtiles', async () => new Response('gone', { status: 404 }));
    await expect(source.getBytes(0, 10)).rejects.toThrow('HTTP 404');
  });

  it('reads tiles of a real archive with PMTiles', async () => {
    // The Stavoren inland ENC cell the end-to-end tests use (36 KB, z10-14)
    // Vitest runs in Node; the app's tsconfig has no Node types, so fs is loaded untyped
    const fs: { readFileSync(path: string): Uint8Array } = await import(/* @vite-ignore */ 'node:fs' as string);
    const cwd = (globalThis as unknown as { process: { cwd(): string } }).process.cwd();
    const fixture = new Uint8Array(fs.readFileSync(`${cwd}/e2e/fixtures/charts/e2e-stavoren.pmtiles`));
    const archive = new PMTiles(new FetchRangeSource('https://example.org/e2e-stavoren.pmtiles', rangeServer(fixture)));
    const header = await archive.getHeader();
    expect(header.minZoom).toBe(10);
    // Stavoren harbour at z12
    const tile = await archive.getZxy(12, 2107, 1335);
    expect(tile?.data.byteLength).toBeGreaterThan(0);
  });
});

describe('capacitorFetch (Android)', () => {
  const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

  it('is used by platformFetch in the Android app', async () => {
    const request = vi.fn(async () => ({ data: toBase64(new Uint8Array([1, 2, 3])), status: 200, headers: {}, url: '' }));
    vi.resetModules();
    vi.doMock('@capacitor/core', () => ({ CapacitorHttp: { request } }));
    (window as unknown as Record<string, unknown>).Capacitor = { isNativePlatform: () => true };
    try {
      const { platformFetch, usesNativeFetch } = await import('../platformFetch');
      expect(usesNativeFetch()).toBe(true);
      const response = await platformFetch('https://github.com/x/releases/latest/download/a.pmtiles');
      expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
      expect(request).toHaveBeenCalledOnce();
    } finally {
      delete (window as unknown as Record<string, unknown>).Capacitor;
      vi.doUnmock('@capacitor/core');
    }
  });

  it('sends the Range header and decodes the base64 body', async () => {
    const { capacitorFetch } = await import('../platformFetch');
    const request = vi.fn(async () => ({
      data: toBase64(new Uint8Array([10, 11, 12])),
      status: 206,
      headers: { 'Content-Range': 'bytes 10-12/100', 'Content-Length': '3', ETag: '"v1"', null: 'HTTP/1.1 206' },
      url: 'https://objects.githubusercontent.com/a.pmtiles',
    }));
    const response = await capacitorFetch({ request })('https://github.com/a.pmtiles', { headers: { Range: 'bytes=10-12' } });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://github.com/a.pmtiles',
      method: 'GET',
      headers: { range: 'bytes=10-12' },
      responseType: 'arraybuffer',
      connectTimeout: 15000,
      readTimeout: 30000,
    }));
    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe('bytes 10-12/100');
    expect(response.headers.get('etag')).toBe('"v1"');
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([10, 11, 12]);
  });

  it('turns JSON that CapacitorHttp parsed back into text', async () => {
    const { capacitorFetch } = await import('../platformFetch');
    const catalog = { version: 1, regions: [] };
    const response = await capacitorFetch({ request: async () => ({ data: catalog, status: 200, headers: {}, url: '' }) })('https://x/index.json');
    expect(await response.json()).toEqual(catalog);
  });

  it('keeps error bodies, which come back as text', async () => {
    const { capacitorFetch } = await import('../platformFetch');
    const response = await capacitorFetch({
      request: async () => ({ data: '', status: 416, headers: { 'Content-Range': 'bytes */100' }, url: '' }),
    })('https://x/a.pmtiles');
    expect(response.status).toBe(416);
    expect(response.headers.get('content-range')).toBe('bytes */100');
    const notFound = await capacitorFetch({ request: async () => ({ data: 'Not Found', status: 404, headers: {}, url: '' }) })('https://x/b');
    expect(await notFound.text()).toBe('Not Found');
  });

  it('honours an abort signal', async () => {
    const { capacitorFetch } = await import('../platformFetch');
    const controller = new AbortController();
    const request = vi.fn(async () => {
      controller.abort();
      return { data: '', status: 200, headers: {}, url: '' };
    });
    await expect(capacitorFetch({ request })('https://x/a', { signal: controller.signal })).rejects.toThrow(/aborted/);
    await expect(capacitorFetch({ request })('https://x/a', { signal: controller.signal })).rejects.toThrow(/aborted/);
    expect(request).toHaveBeenCalledOnce();
  });

  it('reads a real PMTiles archive through it', async () => {
    const { capacitorFetch } = await import('../platformFetch');
    const fs: { readFileSync(path: string): Uint8Array } = await import(/* @vite-ignore */ 'node:fs' as string);
    const cwd = (globalThis as unknown as { process: { cwd(): string } }).process.cwd();
    const fixture = new Uint8Array(fs.readFileSync(`${cwd}/e2e/fixtures/charts/e2e-stavoren.pmtiles`));
    const server = rangeServer(fixture);
    // What Android's HTTP client hands back for the range server's answers
    const http = {
      request: async ({ url, headers }: { url: string; headers?: Record<string, string> }) => {
        const answer = await server(url, { headers: { Range: headers!.range } });
        const body = new Uint8Array(await answer.arrayBuffer());
        return {
          data: answer.status >= 400 ? '' : toBase64(body),
          status: answer.status,
          headers: Object.fromEntries(answer.headers.entries()),
          url,
        };
      },
    };
    const archive = new PMTiles(new FetchRangeSource('https://example.org/e2e-stavoren.pmtiles', capacitorFetch(http)));
    const tile = await archive.getZxy(12, 2107, 1335);
    expect(tile?.data.byteLength).toBeGreaterThan(0);
  });
});
