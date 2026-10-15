/** URLs of the opensail:// tile protocol (see tileProtocol.ts) */

export const TILE_PROTOCOL = 'opensail';
export const BASE_SOURCE = 'base';
export const SEAMARK_SOURCE_ID = 'seamarks';
export const GLYPHS_SOURCE = 'glyphs';

export function protocolTileUrl(source: string): string {
  return `${TILE_PROTOCOL}://${source}/{z}/{x}/{y}`;
}

export const PROTOCOL_GLYPHS_URL = `${TILE_PROTOCOL}://${GLYPHS_SOURCE}/{fontstack}/{range}`;

/** Parse `opensail://<source>/<a>/<b>[/<c>]` */
export function parseProtocolUrl(url: string): { source: string; parts: string[] } | null {
  const prefix = `${TILE_PROTOCOL}://`;
  if (!url.startsWith(prefix)) return null;
  const [source, ...parts] = url.slice(prefix.length).split('/').map(decodeURIComponent);
  return source ? { source, parts } : null;
}

/** Fonts the chart style uses, and the glyph ranges to download for Dutch names and chart symbols */
export const CHART_FONTS = ['Noto Sans Regular', 'Noto Sans Italic'];
export const CHART_GLYPH_RANGES = ['0-255', '256-511', '8192-8447', '8448-8703'];
