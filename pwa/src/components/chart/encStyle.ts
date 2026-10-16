import type { ExpressionSpecification, LayerSpecification } from 'maplibre-gl';

/**
 * A MapLibre style for ENC vector tiles built by tools/enc-pipeline, loosely
 * after the S-52 day palette: depth areas shaded by the vessel's safety
 * depth, contours, soundings, hazards, bridges with their clearance, fairways
 * and locks. Layer names in the tiles are the S-57 object classes in lower case.
 */

/** S-52 day colours */
export const ENC_COLORS = {
  /** Drying or intertidal (DEPIT) */
  drying: '#a3c6a0',
  /** Shallower than the shallow contour (DEPVS) */
  veryShallow: '#73b6ef',
  /** Between the shallow and the safety contour (DEPMS) */
  mediumShallow: '#98c5f2',
  /** Between the safety and the deep contour (DEPMD) */
  mediumDeep: '#bad5e1',
  /** Deeper than the deep contour (DEPDW) */
  deep: '#d4eaee',
  /** A depth area without a surveyed depth (inland ENCs often have these) */
  unknownDepth: '#cfe3ee',
  contour: '#7d8c93',
  safetyContour: '#26353b',
  sounding: '#56636a',
  danger: '#c0168c',
  structure: '#5b4a2e',
  bridge: '#7a6f63',
  fairway: '#a24ba8',
  dredged: '#bcd9e6',
  restricted: '#a24ba8',
  lock: '#d8d2c0',
  label: '#26353b',
  halo: '#ffffff',
} as const;

export interface EncDepthSettings {
  /** Areas shallower than this are very shallow (S-52 shallow contour), in metres */
  shallowContour: number;
  /** Depths below this are unsafe for the vessel (S-52 safety contour), in metres */
  safetyContour: number;
  /** Areas deeper than this are deep water (S-52 deep contour), in metres */
  deepContour: number;
}

/** Defaults for a small yacht on Dutch inland waters */
export const DEFAULT_ENC_DEPTHS: EncDepthSettings = {
  shallowContour: 2,
  safetyContour: 3,
  deepContour: 10,
};

/** Prefix of every ENC source id; each layer id starts with its source id */
export const ENC_LAYER_PREFIX = 'enc-';

/** Source id for a chart region's archive */
export function encSourceId(regionId: string): string {
  return `${ENC_LAYER_PREFIX}${regionId}`;
}

const NAME: ExpressionSpecification = ['coalesce', ['get', 'OBJNAM'], ['get', 'NOBJNM'], ''];

/** Fill colour of a depth area, from its minimum depth (DRVAL1) */
function depthAreaColor({ shallowContour, safetyContour, deepContour }: EncDepthSettings): ExpressionSpecification {
  const drval1: ExpressionSpecification = ['to-number', ['get', 'DRVAL1'], 0];
  return [
    'case',
    // DRVAL1 0 with no DRVAL2: the area has no surveyed depth
    // (to-number turns a missing value into 0, so test for the attribute itself)
    ['all', ['==', drval1, 0], ['!', ['has', 'DRVAL2']]],
    ENC_COLORS.unknownDepth,
    ['<', drval1, 0],
    ENC_COLORS.drying,
    ['<', drval1, shallowContour],
    ENC_COLORS.veryShallow,
    ['<', drval1, safetyContour],
    ENC_COLORS.mediumShallow,
    ['<', drval1, deepContour],
    ENC_COLORS.mediumDeep,
    ENC_COLORS.deep,
  ];
}

/** Every ENC layer for one vector source, bottom to top */
export function createEncLayers(
  source: string,
  depths: EncDepthSettings = DEFAULT_ENC_DEPTHS
): LayerSpecification[] {
  const id = (name: string) => `${source}-${name}`;
  const hazardFilter: ExpressionSpecification = ['==', ['geometry-type'], 'Point'];

  return [
    {
      id: id('depare'),
      type: 'fill',
      source,
      'source-layer': 'depare',
      paint: { 'fill-color': depthAreaColor(depths) },
    },
    {
      id: id('drgare'),
      type: 'fill',
      source,
      'source-layer': 'drgare',
      paint: { 'fill-color': ENC_COLORS.dredged, 'fill-outline-color': ENC_COLORS.contour },
    },
    {
      id: id('lokbsn'),
      type: 'fill',
      source,
      'source-layer': 'lokbsn',
      paint: { 'fill-color': ENC_COLORS.lock, 'fill-outline-color': ENC_COLORS.structure },
    },
    {
      id: id('depcnt'),
      type: 'line',
      source,
      'source-layer': 'depcnt',
      paint: {
        'line-color': [
          'case',
          ['==', ['to-number', ['get', 'VALDCO'], -1], depths.safetyContour],
          ENC_COLORS.safetyContour,
          ENC_COLORS.contour,
        ],
        'line-width': [
          'case',
          ['==', ['to-number', ['get', 'VALDCO'], -1], depths.safetyContour],
          1.6,
          0.6,
        ],
      },
    },
    {
      id: id('fairwy'),
      type: 'line',
      source,
      'source-layer': 'fairwy',
      paint: { 'line-color': ENC_COLORS.fairway, 'line-width': 0.8, 'line-dasharray': [4, 3] },
    },
    {
      id: id('wtwaxs'),
      type: 'line',
      source,
      'source-layer': 'wtwaxs',
      minzoom: 12,
      paint: { 'line-color': ENC_COLORS.fairway, 'line-width': 0.5, 'line-opacity': 0.5, 'line-dasharray': [1, 4] },
    },
    {
      id: id('navlne'),
      type: 'line',
      source,
      'source-layer': 'navlne',
      paint: { 'line-color': ENC_COLORS.label, 'line-width': 0.8, 'line-dasharray': [6, 3] },
    },
    {
      id: id('rectrc'),
      type: 'line',
      source,
      'source-layer': 'rectrc',
      paint: { 'line-color': ENC_COLORS.label, 'line-width': 1.2, 'line-dasharray': [6, 3] },
    },
    {
      id: id('resare'),
      type: 'line',
      source,
      'source-layer': 'resare',
      paint: { 'line-color': ENC_COLORS.restricted, 'line-width': 1, 'line-dasharray': [2, 2] },
    },
    {
      id: id('slcons'),
      type: 'line',
      source,
      'source-layer': 'slcons',
      paint: { 'line-color': ENC_COLORS.structure, 'line-width': 1.4 },
    },
    {
      id: id('damcon'),
      type: 'line',
      source,
      'source-layer': 'damcon',
      paint: { 'line-color': ENC_COLORS.structure, 'line-width': 2 },
    },
    {
      id: id('ponton'),
      type: 'fill',
      source,
      'source-layer': 'ponton',
      paint: { 'fill-color': ENC_COLORS.structure, 'fill-opacity': 0.6 },
    },
    {
      id: id('bridge'),
      type: 'line',
      source,
      'source-layer': 'bridge',
      paint: { 'line-color': ENC_COLORS.bridge, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 6] },
    },
    {
      id: id('cblohd'),
      type: 'line',
      source,
      'source-layer': 'cblohd',
      paint: { 'line-color': ENC_COLORS.danger, 'line-width': 1, 'line-dasharray': [1, 2] },
    },
    // Hazards: obstructions, wrecks, rocks, hulks and piles drawn as isolated dangers
    ...(['obstrn', 'wrecks', 'uwtroc', 'hulkes', 'pilpnt'] as const).map(
      (layer): LayerSpecification => ({
        id: id(layer),
        type: 'circle',
        source,
        'source-layer': layer,
        filter: hazardFilter,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 5],
          'circle-color': ENC_COLORS.halo,
          'circle-stroke-color': ENC_COLORS.danger,
          'circle-stroke-width': 1.5,
        },
      })
    ),
    ...(['obstrn', 'wrecks', 'hulkes'] as const).map(
      (layer): LayerSpecification => ({
        id: id(`${layer}-area`),
        type: 'line',
        source,
        'source-layer': layer,
        filter: ['!=', ['geometry-type'], 'Point'],
        paint: { 'line-color': ENC_COLORS.danger, 'line-width': 1, 'line-dasharray': [2, 1] },
      })
    ),
    {
      id: id('soundg'),
      type: 'symbol',
      source,
      'source-layer': 'soundg',
      minzoom: 13,
      layout: {
        'text-field': ['number-format', ['to-number', ['get', 'DEPTH'], 0], { 'max-fraction-digits': 1 }],
        'text-font': ['Noto Sans Italic'],
        'text-size': 10,
      },
      paint: {
        'text-color': [
          'case',
          ['<', ['to-number', ['get', 'DEPTH'], 0], depths.safetyContour],
          ENC_COLORS.safetyContour,
          ENC_COLORS.sounding,
        ],
      },
    },
    {
      id: id('bridge-clearance'),
      type: 'symbol',
      source,
      'source-layer': 'bridge',
      minzoom: 13,
      filter: ['has', 'VERCLR'],
      layout: {
        'text-field': ['concat', '↕ ', ['to-string', ['get', 'VERCLR']], ' m'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
        'symbol-placement': 'point',
      },
      paint: { 'text-color': ENC_COLORS.label, 'text-halo-color': ENC_COLORS.halo, 'text-halo-width': 1.2 },
    },
    {
      id: id('lokbsn-name'),
      type: 'symbol',
      source,
      'source-layer': 'lokbsn',
      minzoom: 13,
      layout: { 'text-field': NAME, 'text-font': ['Noto Sans Regular'], 'text-size': 11 },
      paint: { 'text-color': ENC_COLORS.label, 'text-halo-color': ENC_COLORS.halo, 'text-halo-width': 1.2 },
    },
  ];
}
