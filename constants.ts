export const PINCH_THRESHOLD = 0.05; // Distance between thumb and index to trigger pinch
export const ZOOM_SENSITIVITY = 2.0;
export const ROTATION_SPEED = 3.0;
export const SMOOTHING_FACTOR = 0.15; // Lower is smoother but more laggy

// Colors
export const THEME = {
  primary: '#ffffff',
  secondary: '#888888',
  accent: '#00ff00', // Green for active tracking
  bg: '#000000',
  glass: 'rgba(255, 255, 255, 0.05)',
};

export const SCENES = [
  { id: 'SOLAR', label: 'SOLAR SYSTEM' },
  { id: 'HEART', label: 'ANATOMY' },
  { id: 'CHEMISTRY', label: 'CHEMISTRY LAB' },
] as const;
