export interface StateViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

/**
 * Center coordinates and zoom levels for all 50 US states + DC.
 * Zoom levels calibrated for satellite-streets-v12 to show the whole state:
 * - Large states (TX, AK, CA, MT): zoom 5-6
 * - Medium states (KS, CO, NE): zoom 6-7
 * - Small states (CT, DE, RI, DC): zoom 8-11
 */
export const US_STATE_COORDINATES: Record<string, StateViewport> = {
  AL: { latitude: 32.806671, longitude: -86.79113, zoom: 7 },
  AK: { latitude: 61.370716, longitude: -152.404419, zoom: 4 },
  AZ: { latitude: 33.729759, longitude: -111.431221, zoom: 6 },
  AR: { latitude: 34.969704, longitude: -92.373123, zoom: 7 },
  CA: { latitude: 36.116203, longitude: -119.681564, zoom: 6 },
  CO: { latitude: 39.059811, longitude: -105.311104, zoom: 7 },
  CT: { latitude: 41.597782, longitude: -72.755371, zoom: 9 },
  DE: { latitude: 39.318523, longitude: -75.507141, zoom: 9 },
  DC: { latitude: 38.897438, longitude: -77.026817, zoom: 11 },
  FL: { latitude: 27.766279, longitude: -81.686783, zoom: 6 },
  GA: { latitude: 33.040619, longitude: -83.643074, zoom: 7 },
  HI: { latitude: 21.094318, longitude: -157.498337, zoom: 7 },
  ID: { latitude: 44.240459, longitude: -114.478828, zoom: 6 },
  IL: { latitude: 40.349457, longitude: -88.986137, zoom: 7 },
  IN: { latitude: 39.849426, longitude: -86.258278, zoom: 7 },
  IA: { latitude: 42.011539, longitude: -93.210526, zoom: 7 },
  KS: { latitude: 38.5266, longitude: -96.726486, zoom: 7 },
  KY: { latitude: 37.66814, longitude: -84.670067, zoom: 7 },
  LA: { latitude: 31.169546, longitude: -91.867805, zoom: 7 },
  ME: { latitude: 44.693947, longitude: -69.381927, zoom: 7 },
  MD: { latitude: 39.063946, longitude: -76.802101, zoom: 8 },
  MA: { latitude: 42.230171, longitude: -71.530106, zoom: 8 },
  MI: { latitude: 43.326618, longitude: -84.536095, zoom: 7 },
  MN: { latitude: 45.694454, longitude: -93.900192, zoom: 6 },
  MS: { latitude: 32.741646, longitude: -89.678696, zoom: 7 },
  MO: { latitude: 38.456085, longitude: -92.288368, zoom: 7 },
  MT: { latitude: 46.921925, longitude: -110.454353, zoom: 6 },
  NE: { latitude: 41.12537, longitude: -98.268082, zoom: 7 },
  NV: { latitude: 38.313515, longitude: -117.055374, zoom: 6 },
  NH: { latitude: 43.452492, longitude: -71.563896, zoom: 8 },
  NJ: { latitude: 40.298904, longitude: -74.521011, zoom: 8 },
  NM: { latitude: 34.840515, longitude: -106.248482, zoom: 7 },
  NY: { latitude: 42.165726, longitude: -74.948051, zoom: 7 },
  NC: { latitude: 35.630066, longitude: -79.806419, zoom: 7 },
  ND: { latitude: 47.528912, longitude: -99.784012, zoom: 7 },
  OH: { latitude: 40.388783, longitude: -82.764915, zoom: 7 },
  OK: { latitude: 35.565342, longitude: -96.928917, zoom: 7 },
  OR: { latitude: 44.572021, longitude: -122.070938, zoom: 7 },
  PA: { latitude: 40.590752, longitude: -77.209755, zoom: 7 },
  RI: { latitude: 41.680893, longitude: -71.51178, zoom: 10 },
  SC: { latitude: 33.856892, longitude: -80.945007, zoom: 7 },
  SD: { latitude: 44.299782, longitude: -99.438828, zoom: 7 },
  TN: { latitude: 35.747845, longitude: -86.692345, zoom: 7 },
  TX: { latitude: 31.054487, longitude: -97.563461, zoom: 6 },
  UT: { latitude: 40.150032, longitude: -111.862434, zoom: 7 },
  VT: { latitude: 44.045876, longitude: -72.710686, zoom: 8 },
  VA: { latitude: 37.769337, longitude: -78.169968, zoom: 7 },
  WA: { latitude: 47.400902, longitude: -121.490494, zoom: 7 },
  WV: { latitude: 38.491226, longitude: -80.954453, zoom: 7 },
  WI: { latitude: 44.268543, longitude: -89.616508, zoom: 7 },
  WY: { latitude: 42.755966, longitude: -107.30249, zoom: 7 },
};
