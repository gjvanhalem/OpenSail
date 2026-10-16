import React, { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { regionArchiveUrl, type ChartRegionManifest } from '@/services/chartCatalog';
import { createEncLayers, DEFAULT_ENC_DEPTHS, encSourceId, type EncDepthSettings } from './encStyle';
import { registerPmtilesProtocol } from './pmtilesProtocol';

/** Base map layer the ENC layers go under, so place and water names stay on top */
const ENC_BEFORE_LAYER = 'water-name';

export interface EncLayersProps {
  regions: ChartRegionManifest[];
  depths?: EncDepthSettings;
}

/** ENC depth areas, contours, hazards and structures for each chart region */
export const EncLayers: React.FC<EncLayersProps> = React.memo(({ regions, depths = DEFAULT_ENC_DEPTHS }) => {
  registerPmtilesProtocol();

  const sources = useMemo(
    () =>
      regions.map((region) => {
        const sourceId = encSourceId(region.id);
        return {
          sourceId,
          attribution: `${region.source.publisher} ${region.official ? 'ENC' : 'depth data'}, ${region.source.licence}${
            region.editionDate ? `, edition ${region.editionDate}` : ''
          }`,
          url: `pmtiles://${regionArchiveUrl(region)}`,
          layers: createEncLayers(sourceId, depths),
        };
      }),
    [regions, depths]
  );

  return (
    <>
      {sources.map(({ sourceId, attribution, url, layers }) => (
        <Source key={sourceId} id={sourceId} type="vector" url={url} attribution={attribution}>
          {layers.map((layer) => (
            <Layer key={layer.id} {...layer} beforeId={ENC_BEFORE_LAYER} />
          ))}
        </Source>
      ))}
    </>
  );
});

EncLayers.displayName = 'EncLayers';
