import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { TrackingState } from '../types';

interface HandCursorProps {
  handState: React.MutableRefObject<TrackingState>;
  handColor?: string;
}

const HandCursorSimple: React.FC<HandCursorProps> = ({ handState, handColor = '#00ff00' }) => {
  const cursorRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const hs = handState.current;
    
    // Use dominant hand (prefer right, fallback to left)
    const activeHand = hs.rightHand || hs.leftHand;
    
    if (!activeHand || !cursorRef.current) return;

    // Map hand position to 3D world space
    const handPos = new THREE.Vector3(
      (0.5 - activeHand.pinchPosition.x) * 12,
      (0.5 - activeHand.pinchPosition.y) * 8,
      activeHand.pinchPosition.z * 3
    );

    cursorRef.current.position.lerp(handPos, 0.3);
    
    // Scale based on pinch state
    const targetScale = activeHand.isPinching ? 0.8 : 1.0;
    cursorRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2);
  });

  return (
    <>
      <Sphere ref={cursorRef} args={[0.15, 16, 16]}>
        <meshBasicMaterial color={handColor} />
      </Sphere>
      <Sphere args={[0.05, 8, 8]}>
        <meshBasicMaterial color="#ffffff" />
      </Sphere>
    </>
  );
};

export default HandCursorSimple;
