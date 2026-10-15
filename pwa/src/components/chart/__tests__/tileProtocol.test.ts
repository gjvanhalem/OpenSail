import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('maplibre-gl', () => ({ default: { addProtocol: vi.fn() } }));

const getTile = vi.fn();
const getGlyphs = vi.fn();
vi.mock('@/database/services/TileCache', () => ({
  tileCache: { getTile: (...args: unknown[]) => getTile(...args), getGlyphs: (...args: unknown[]) => getGlyphs(...args) },
}));

const { loadTile, registerTileSource, tileStats } = await import('../tileProtocol');
const { parseProtocolUrl } = await import('../tileUrls');

function blob(bytes: number[]) {
  return { arrayBuffer: async () => new Uint8Array(bytes).buffer };
}

const fetchTile = vi.fn();
registerTileSource('test', { format: 'vector', fetchTile });

beforeEach(() => {
  getTile.mockReset();
  getGlyphs.mockReset();
  fetchTile.mockReset();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => vi.restoreAllMocks());

describe('opensail:// protocol', () => {
  it('parses tile and glyph URLs', () => {
    expect(parseProtocolUrl('opensail://enc-nl/12/2100/1350')).toEqual({ source: 'enc-nl', parts: ['12', '2100', '1350'] });
    expect(parseProtocolUrl('opensail://glyphs/Noto%20Sans%20Regular/0-255')).toEqual({
      source: 'glyphs',
      parts: ['Noto Sans Regular', '0-255'],
    });
    expect(parseProtocolUrl('https://example.org')).toBeNull();
  });

  it('serves a downloaded tile from IndexedDB without the network', async () => {
    getTile.mockResolvedValue(blob([1, 2, 3]));
    const data = await loadTile('opensail://test/10/1/2');
    expect(new Uint8Array(data)).toEqual(new Uint8Array([1, 2, 3]));
    expect(getTile).toHaveBeenCalledWith('test', 10, 1, 2);
    expect(fetchTile).not.toHaveBeenCalled();
  });

  it('fetches a tile that was not downloaded while online', async () => {
    getTile.mockResolvedValue(null);
    fetchTile.mockResolvedValue(new Uint8Array([9]).buffer);
    const before = tileStats().fromNetwork;
    expect(new Uint8Array(await loadTile('opensail://test/10/1/2'))).toEqual(new Uint8Array([9]));
    expect(tileStats().fromNetwork).toBe(before + 1);
  });

  it('answers offline with an empty tile instead of an error', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    getTile.mockResolvedValue(null);
    const before = tileStats().missing;
    expect((await loadTile('opensail://test/10/1/2')).byteLength).toBe(0);
    expect(fetchTile).not.toHaveBeenCalled();
    expect(tileStats().missing).toBe(before + 1);
  });

  it('answers with an empty tile when the network fails', async () => {
    getTile.mockResolvedValue(null);
    fetchTile.mockRejectedValue(new TypeError('Failed to fetch'));
    expect((await loadTile('opensail://test/10/1/2')).byteLength).toBe(0);
  });

  it('serves downloaded glyphs', async () => {
    getGlyphs.mockResolvedValue(blob([7]));
    expect(new Uint8Array(await loadTile('opensail://glyphs/Noto%20Sans%20Italic/0-255'))).toEqual(new Uint8Array([7]));
    expect(getGlyphs).toHaveBeenCalledWith('Noto Sans Italic', '0-255');
  });
});
