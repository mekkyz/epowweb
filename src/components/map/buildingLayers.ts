import type { LayerProps } from 'react-map-gl/maplibre';

// ---------------------------------------------------------------------------
// Building colors — neutral by default, gently highlighted on hover
// ---------------------------------------------------------------------------

/** Warm neutral gray matching the OpenFreeMap building tone */
const BUILDING_DEFAULT = 'rgba(190, 185, 176, 0.25)';
/** Soft highlight on hover — subtle enough to feel like selecting the building */
const BUILDING_HOVER = 'rgba(120, 165, 200, 0.45)';

// ---------------------------------------------------------------------------
// 2D Layers  (fill + thin outline, NOT fill-extrusion — reliable click/hover)
// ---------------------------------------------------------------------------

/** Transparent fill for click/hover detection on building footprints */
export const buildingsFillLayer: LayerProps = {
  id: 'buildings-fill',
  type: 'fill',
  paint: {
    'fill-color': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      BUILDING_HOVER,
      BUILDING_DEFAULT,
    ],
    'fill-opacity': 1,
  },
};

/** Very thin outline — just enough to hint at building edges */
export const buildingsOutlineLayer: LayerProps = {
  id: 'buildings-outline',
  type: 'line',
  paint: {
    'line-color': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      'rgba(100, 145, 185, 0.6)',
      'rgba(160, 155, 148, 0.35)',
    ],
    'line-width': [
      'interpolate', ['linear'], ['zoom'],
      13, 0.3,
      15, 0.8,
      18, 1.2,
    ],
  },
  layout: {
    'line-join': 'round',
  },
};

/** Subtle text labels — only appear at higher zoom levels */
export const buildingLabelsLayer: LayerProps = {
  id: 'building-labels',
  type: 'symbol',
  minzoom: 15,
  layout: {
    'text-field': ['get', 'id'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 15, 8, 17, 11, 19, 14],
    'text-anchor': 'center',
    'text-allow-overlap': false,
    'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
  },
  paint: {
    'text-color': '#4a4a4a',
    'text-halo-color': 'rgba(255, 255, 255, 0.85)',
    'text-halo-width': 1.2,
    'text-opacity': 0.85,
  },
};
