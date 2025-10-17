// src/utils/geoUtils.js

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Array} coord1 - [lon, lat]
 * @param {Array} coord2 - [lon, lat]
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (coord1, coord2) => {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate total distance of a path
 * @param {Array} coordinates - Array of [lon, lat] pairs
 * @returns {number} Total distance in kilometers
 */
export const calculatePathDistance = (coordinates) => {
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    total += calculateDistance(coordinates[i], coordinates[i + 1]);
  }
  return total;
};

/**
 * Get elevation statistics from elevation array
 * @param {Array} elevations - Array of elevation values
 * @returns {Object|null} Statistics object or null
 */
export const getElevationStats = (elevations) => {
  if (!elevations || elevations.length === 0) return null;

  const max = Math.max(...elevations);
  const min = Math.min(...elevations);
  
  let gain = 0;
  let loss = 0;
  
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) {
      gain += diff;
    } else {
      loss += Math.abs(diff);
    }
  }

  return { max, min, gain, loss };
};

/**
 * Convert decimal degrees to DMS (Degrees Minutes Seconds)
 * @param {number} decimal - Decimal coordinate
 * @param {string} type - 'lat' or 'lon'
 * @returns {string} DMS string
 */
export const convertToDMS = (decimal, type) => {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(2);

  let direction = '';
  if (type === 'lat') {
    direction = decimal >= 0 ? 'N' : 'S';
  } else {
    direction = decimal >= 0 ? 'E' : 'W';
  }

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
};

/**
 * Calculate bearing between two coordinates
 * @param {Array} from - [lon, lat]
 * @param {Array} to - [lon, lat]
 * @returns {number} Bearing in degrees
 */
export const calculateBearing = (from, to) => {
  const [lon1, lat1] = from;
  const [lon2, lat2] = to;

  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;

  return bearing;
};

/**
 * Extract coordinates from GeoJSON feature
 * @param {Object} feature - GeoJSON feature
 * @returns {Array} Array of [lon, lat, elevation] or [lon, lat]
 */
export const extractCoordinatesFromGeoJSON = (feature) => {
  if (!feature || !feature.geometry) return [];
  
  if (feature.geometry.type === 'LineString') {
    return feature.geometry.coordinates;
  }
  
  return [];
};

/**
 * Create elevation array from coordinates
 * @param {Array} coordinates - Array of [lon, lat, elevation?]
 * @returns {Array} Array of elevation values
 */
export const extractElevations = (coordinates) => {
  return coordinates.map(coord => coord[2] || 0);
};