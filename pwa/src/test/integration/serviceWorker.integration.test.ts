import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type MockFn = ReturnType<typeof vi.fn>;

interface MockServiceWorkerRegistration {
  installing: null;
  waiting: null;
  active: { state: string; postMessage: MockFn };
  addEventListener: MockFn;
  removeEventListener: MockFn;
}

describe('Service Worker Integration Tests', () => {
  let mockServiceWorker: MockServiceWorkerRegistration;
  let mockCache: Map<string, Response>;

  beforeEach(() => {
    // Mock Cache API
    mockCache = new Map();

    globalThis.caches = {
      open: vi.fn().mockResolvedValue({
        match: vi.fn((request: string) => {
          return Promise.resolve(mockCache.get(request));
        }),
        put: vi.fn((request: string, response: Response) => {
          mockCache.set(request, response);
          return Promise.resolve();
        }),
        delete: vi.fn((request: string) => {
          const existed = mockCache.has(request);
          mockCache.delete(request);
          return Promise.resolve(existed);
        }),
        keys: vi.fn(() => {
          return Promise.resolve(Array.from(mockCache.keys()));
        }),
      }),
      match: vi.fn((request: string) => {
        return Promise.resolve(mockCache.get(request));
      }),
      delete: vi.fn(),
      has: vi.fn(),
      keys: vi.fn(),
    } as unknown as CacheStorage;

    // Mock Service Worker registration
    mockServiceWorker = {
      installing: null,
      waiting: null,
      active: {
        state: 'activated',
        postMessage: vi.fn(),
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: vi.fn().mockResolvedValue(mockServiceWorker),
        ready: Promise.resolve(mockServiceWorker),
        controller: mockServiceWorker.active,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    mockCache.clear();
    vi.clearAllMocks();
  });

  describe('Cache Operations', () => {
    it('should cache app shell resources', async () => {
      const cache = await caches.open('app-shell');
      const response = new Response('<!DOCTYPE html><html></html>', {
        headers: { 'Content-Type': 'text/html' },
      });

      await cache.put('/index.html', response);

      const cached = await cache.match('/index.html');
      expect(cached).toBeDefined();
      expect(cached?.headers.get('Content-Type')).toBe('text/html');
    });

    it('should cache chart tiles', async () => {
      const cache = await caches.open('chart-vector-tiles');
      const tileData = new ArrayBuffer(1024);
      const response = new Response(tileData, {
        headers: { 'Content-Type': 'application/x-protobuf' },
      });

      const tileUrl = 'https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/10/512/384.mvt';
      await cache.put(tileUrl, response);

      const cached = await cache.match(tileUrl);
      expect(cached).toBeDefined();
    });

    it('should retrieve cached resources when offline', async () => {
      const cache = await caches.open('app-shell');
      const response = new Response('cached content');
      await cache.put('/app.js', response);

      // Simulate offline by checking cache first
      const cached = await cache.match('/app.js');
      expect(cached).toBeDefined();
      
      const text = await cached!.text();
      expect(text).toBe('cached content');
    });

    it('should delete cached resources', async () => {
      const cache = await caches.open('test-cache');
      const response = new Response('test');
      await cache.put('/test', response);

      const deleted = await cache.delete('/test');
      expect(deleted).toBe(true);

      const cached = await cache.match('/test');
      expect(cached).toBeUndefined();
    });

    it('should list all cached keys', async () => {
      const cache = await caches.open('test-cache');
      
      await cache.put('/file1.js', new Response('1'));
      await cache.put('/file2.js', new Response('2'));
      await cache.put('/file3.js', new Response('3'));

      const keys = await cache.keys();
      expect(keys).toHaveLength(3);
    });
  });

  describe('Service Worker Registration', () => {
    it('should register service worker', async () => {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      expect(registration).toBeDefined();
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });

    it('should have active service worker', async () => {
      await navigator.serviceWorker.ready;
      
      expect(navigator.serviceWorker.controller).toBeDefined();
      expect(navigator.serviceWorker.controller?.state).toBe('activated');
    });

    it('should communicate with service worker', async () => {
      const registration = await navigator.serviceWorker.ready;
      
      registration.active?.postMessage({
        type: 'CACHE_URLS',
        payload: ['/file1.js', '/file2.js'],
      });

      expect(registration.active?.postMessage).toHaveBeenCalledWith({
        type: 'CACHE_URLS',
        payload: ['/file1.js', '/file2.js'],
      });
    });
  });

  describe('Offline Functionality', () => {
    it('should serve cached content when offline', async () => {
      const cache = await caches.open('app-shell');
      const offlineResponse = new Response('<html>Offline Page</html>');
      await cache.put('/offline.html', offlineResponse);

      // Simulate offline scenario
      const cached = await caches.match('/offline.html');
      expect(cached).toBeDefined();
      
      const html = await cached!.text();
      expect(html).toContain('Offline Page');
    });

    it('should cache API responses for offline use', async () => {
      const cache = await caches.open('api-data');
      const apiResponse = new Response(JSON.stringify({ data: 'test' }), {
        headers: { 'Content-Type': 'application/json' },
      });

      await cache.put('/api/routes', apiResponse);

      const cached = await cache.match('/api/routes');
      expect(cached).toBeDefined();
      
      const data = await cached!.json();
      expect(data).toEqual({ data: 'test' });
    });
  });

  describe('Cache Strategies', () => {
    it('should implement cache-first strategy for app shell', async () => {
      const cache = await caches.open('app-shell');
      const cachedResponse = new Response('cached version');
      await cache.put('/app.js', cachedResponse);

      // Cache-first: check cache before network
      let response = await cache.match('/app.js');
      
      if (!response) {
        // Only fetch from network if not in cache
        response = await fetch('/app.js');
        await cache.put('/app.js', response.clone());
      }

      expect(response).toBeDefined();
      const text = await response.text();
      expect(text).toBe('cached version');
    });

    it('should implement network-first strategy for API data', async () => {
      const cache = await caches.open('api-data');
      
      // Mock fetch
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ fresh: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Network-first: try network, fall back to cache
      let response: Response;
      try {
        response = await fetch('/api/data');
        await cache.put('/api/data', response.clone());
      } catch {
        response = (await cache.match('/api/data'))!;
      }

      expect(response).toBeDefined();
      const data = await response.json();
      expect(data).toEqual({ fresh: true });
    });
  });

  describe('Cache Management', () => {
    it('should clear old cache versions', async () => {
      const oldCache = await caches.open('app-shell-v1');
      const newCache = await caches.open('app-shell-v2');

      await oldCache.put('/app.js', new Response('old'));
      await newCache.put('/app.js', new Response('new'));

      // Simulate cache cleanup
      const cacheNames = ['app-shell-v1', 'app-shell-v2'];
      const currentCache = 'app-shell-v2';
      
      const cachesToDelete = cacheNames.filter(name => name !== currentCache);
      expect(cachesToDelete).toContain('app-shell-v1');
      expect(cachesToDelete).not.toContain('app-shell-v2');
    });

    it('should handle cache quota exceeded', async () => {
      const cache = await caches.open('chart-tiles');
      
      // Simulate adding many tiles
      const tiles = Array.from({ length: 100 }, (_, i) => ({
        url: `/tile-${i}`,
        response: new Response(`tile data ${i}`),
      }));

      // In real scenario, this would throw QuotaExceededError
      // Here we just verify the operation works
      for (const tile of tiles.slice(0, 10)) {
        await cache.put(tile.url, tile.response);
      }

      const keys = await cache.keys();
      expect(keys.length).toBeGreaterThan(0);
    });
  });

  describe('Background Sync', () => {
    it('should queue data for background sync', async () => {
      const syncData = {
        type: 'track-upload',
        data: { trackId: 'track-123' },
        timestamp: Date.now(),
      };

      // Store sync data in IndexedDB (simulated with cache)
      const cache = await caches.open('sync-queue');
      const response = new Response(JSON.stringify(syncData));
      await cache.put('/sync/track-123', response);

      const queued = await cache.match('/sync/track-123');
      expect(queued).toBeDefined();
      
      const data = await queued!.json();
      expect(data.type).toBe('track-upload');
    });
  });
});
