import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';

let protocol: Protocol | null = null;

/**
 * Let MapLibre read PMTiles archives: a source URL `pmtiles://https://…/x.pmtiles`
 * is served tile by tile with HTTP range requests. Safe to call more than once.
 */
export function registerPmtilesProtocol(): Protocol {
  if (!protocol) {
    protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);
  }
  return protocol;
}
