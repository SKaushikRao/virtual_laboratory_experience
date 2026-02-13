import { Vector3, Quaternion } from 'three';

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
  handedness: 'Left' | 'Right';
  isPinching: boolean;
  pinchStrength: number; // 0 to 1
  palmPosition: Vector3; // Normalized -1 to 1 for 3D usage
  pinchPosition: Vector3; // Midpoint between thumb and index
  rotation: Quaternion; // Hand orientation
  extendedFingers: number; // Count of extended fingers (0-5)
  gestureType: 'none' | 'one_finger' | 'two_fingers' | 'three_fingers' | 'four_fingers' | 'open_palm' | 'fist';
}

export interface TrackingState {
  leftHand: HandData | null;
  rightHand: HandData | null;
  gesture: 'none' | 'rotate' | 'pinch_drag' | 'zoom' | 'hover';
  interactionStrength: number; // For UI feedback
}

export type SceneType = 'SOLAR' | 'HEART' | 'CHEMISTRY';
