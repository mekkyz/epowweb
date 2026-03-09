/**
 * Application-wide constants
 * Centralized configuration values to avoid magic strings/numbers throughout the codebase
 */

// =============================================================================
// Map Configuration
// =============================================================================

export const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/fiord',
} as const;

export const DEFAULT_MAP_VIEW = {
  longitude: 8.4346,
  latitude: 49.099,
  zoom: 13.5,
  pitch: 0,
  bearing: 0,
} as const;

export const MAP_3D_VIEW = {
  longitude: 8.4346,
  latitude: 49.099,
  zoom: 15.7,
  pitch: 62,
  bearing: -18,
} as const;

export const MAP_ZOOM_LIMITS = {
  min: 12,
  max: 19,
} as const;

// =============================================================================
// API Configuration
// =============================================================================

export const API_DEFAULTS = {
  seriesLimit: 2000,
  defaultTimeRangeDays: 7,
} as const;

// =============================================================================
// Colors
// =============================================================================

export const COLORS = {
  // Primary accent colors
  accent: {
    primary: '#64d4a3',
    secondary: '#6ea8ff',
  },
  // Status colors
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  // Heatmap scale
  heatmap: {
    low: '#1d4ed8',
    medium: '#22c55e',
    high: '#f59e0b',
    peak: '#ef4444',
  },
  // Map layer colors
  grid: {
    line: '#64d4a3',
    station: '#6ea8ff',
    stroke: '#0b1020',
  },
} as const;

// =============================================================================
// UI Constants
// =============================================================================

export const ENTITY_TYPES = ['station', 'building', 'meter'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

// =============================================================================
// Error Messages
// =============================================================================

export const ERROR_MESSAGES = {
  generic: 'An unexpected error occurred. Please try again.',
  notFound: 'The requested resource was not found.',
  serverError: 'Server error. Please try again later.',
  networkError: 'Network error. Please check your connection.',
  invalidTimestamp: 'Invalid timestamp format.',
  missingParameter: (param: string) => `Missing required parameter: ${param}`,
} as const;

// =============================================================================
// HTTP Status Codes
// =============================================================================

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;
