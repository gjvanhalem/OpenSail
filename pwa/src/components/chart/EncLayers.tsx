import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { regionArchiveUrl, type ChartRegionManifest } from '@/services/chartCatalog';
import { createEncLayers, DEFAULT_ENC_DEPTHS, encSourceId, regionAttribution, type EncDepthSettings } from './encStyle';
import { registerPmtilesSource } from './tileProtocol';
import { protocolTileUrl } from './tileUrls';

/** Base map layer the ENC layers go under, so place and water names stay on top */
const ENC_BEFORE_LAYER = 'water-name';

export interface EncLayersProps {
  regions: ChartRegionManifest[];
  depths?: EncDepthSettings;
}

/**
 * ENC depth areas, contours, hazards and structures for each chart region.
 * Tiles come through the opensail:// protocol: from IndexedDB when the region
 * was downloaded, otherwise from the region's PMTiles archive.
 */
export const EncLayers: React.FC<EncLayersProps> = React.memo(({ regions, depths = DEFAULT_ENC_DEPTHS }) => {
  const sources = useMemo(
    () =>
      regions.map((region) => {
        const sourceId = encSourceId(region.id);
        registerPmtilesSource(sourceId, regionArchiveUrl(region));
        return {
          region,
          sourceId,
          attribution: regionAttribution(region),
          layers: createEncLayers(sourceId, depths),
        };
      }),
    [regions, depths]
  );

  return (
    <>
      {sources.map(({ region, sourceId, attribution, layers }) => (
        <Source
          key={sourceId}
          id={sourceId}
          type="vector"
          tiles={[protocolTileUrl(sourceId)]}
          minzoom={region.minzoom}
          maxzoom={region.maxzoom}
          bounds={region.bounds}
          attribution={attribution}
        >
          {layers.map((layer) => (
            <Layer key={layer.id} {...layer} beforeId={ENC_BEFORE_LAYER} />
          ))}
        </Source>
      ))}
    </>
  );
});

EncLayers.displayName = 'EncLayers';
