import { EtagMismatch, type RangeResponse, type Source } from 'pmtiles';
import type { FetchFunction } from './platformFetch';

/**
 * A PMTiles archive read with HTTP range requests through any fetch function.
 * pmtiles' own FetchSource always uses window.fetch; the native apps need
 * platformFetch, because GitHub release downloads have no CORS headers.
 * Follows FetchSource: no If-Match, an ETag change means the archive changed.
 */
export class FetchRangeSource implements Source {
  readonly url: string;
  private readonly fetchImpl: FetchFunction;

  constructor(url: string, fetchImpl: FetchFunction) {
    this.url = url;
    this.fetchImpl = fetchImpl;
  }

  getKey(): string {
    return this.url;
  }

  async getBytes(offset: number, length: number, signal?: AbortSignal, etag?: string): Promise<RangeResponse> {
    let response = await this.fetchRange(offset, offset + length - 1, signal);

    // The archive is smaller than the first request (16 KB): ask again for what's there
    if (offset === 0 && response.status === 416) {
      const contentRange = response.headers.get('Content-Range');
      if (!contentRange?.startsWith('bytes */')) throw new Error('Missing content-length on 416 response');
      response = await this.fetchRange(0, Number(contentRange.slice(8)) - 1, signal);
    }

    let newEtag = response.headers.get('ETag');
    if (newEtag?.startsWith('W/')) newEtag = null;
    if (response.status === 416 || (etag && newEtag && newEtag !== etag)) {
      throw new EtagMismatch(`Archive changed: ETag ${newEtag} instead of ${etag}`);
    }
    if (response.status >= 300) throw new Error(`HTTP ${response.status} for ${this.url}`);

    // A server without byte ranges sends the whole archive
    const contentLength = response.headers.get('Content-Length');
    if (response.status === 200 && (!contentLength || Number(contentLength) > length)) {
      throw new Error(`${this.url} was served without byte ranges`);
    }

    return {
      data: await response.arrayBuffer(),
      etag: newEtag ?? undefined,
      cacheControl: response.headers.get('Cache-Control') ?? undefined,
      expires: response.headers.get('Expires') ?? undefined,
    };
  }

  private fetchRange(first: number, last: number, signal?: AbortSignal): Promise<Response> {
    return this.fetchImpl(this.url, { signal, headers: { Range: `bytes=${first}-${last}` } });
  }
}
