import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sphere, Ring } from '@react-three/drei';
import * as THREE from 'three';
import { TrackingState } from '../types';

interface HandCursorProps {
  handState: React.MutableRefObject<TrackingState>;
}

const HandCursor: React.FC<HandCursorProps> = ({ handState }) => {
  const cursorRef = useRef<THREE.Group>(null);
  const targetPosition = useRef<THREE.Vector3>(new THREE.Vector3());
  const currentHovered = useRef<string | null>(null);

  useFrame((state, delta) => {
    const hs = handState.current;
    
    // Use the dominant hand (prefer right, fallback to left)
    const activeHand = hs.rightHand || hs.leftHand;
    
    if (!activeHand || !cursorRef.current) return;

    // Map hand position to 3D world space
    const handPos = new THREE.Vector3(
      (0.5 - activeHand.pinchPosition.x) * 12,
      (0.5 - activeHand.pinchPosition.y) * 8,
      activeHand.pinchPosition.z * 3
    );

    // Smooth cursor movement
    targetPosition.current.lerp(handPos, 0.3);
    cursorRef.current.position.lerp(targetPosition.current, 0.15);

    // Add subtle floating animation
    cursorRef.current.position.y += Math.sin(state.clock.elapsedTime * 2) * 0.02;

    // Scale based on pinch state
    const targetScale = activeHand.isPinching ? 0.8 : 1.0;
    cursorRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2);

    // Rotation animation when pinching
    if (activeHand.isPinching) {
      cursorRef.current.rotation.z += delta * 2;
    } else {
      cursorRef.current.rotation.z *= 0.95;
    }
  });

  const getCursorColor = () => {
    const hs = handState.current;
    const activeHand = hs.rightHand || hs.leftHand;
    
    if (!activeHand) return '#666666';
    if (activeHand.isPinching) return '#00ff00';
    return '#00ffff';
  };

  return (
    <group ref={cursorRef}>
      {/* Outer ring - indicates interaction range */}
      <Ring args={[0.3, 0.35, 32]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial 
          color={getCursorColor()} 
          transparent 
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </Ring>

      {/* Inner sphere - main cursor point */}
      <Sphere args={[0.08, 16, 16]}>
        <meshStandardMaterial 
          color={getCursorColor()} 
          emissive={getCursorColor()}
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </Sphere>

      {/* Center dot - precise pointing */}
      <Sphere args={[0.02, 8, 8]}>
        <meshBasicMaterial color="#ffffff" />
      </Sphere>

      {/* Pinch indicator */}
      {handState.current.rightHand?.isPinching || handState.current.leftHand?.isPinching ? (
        <group>
          {/* Pinch rings */}
          <Ring args={[0.15, 0.18, 16]} rotation={[Math.PI / 2, 0, 0]}>
            <meshBasicMaterial 
              color="#00ff00" 
              transparent 
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </Ring>
          
          {/* Grabbing text */}
          <Text
            position={[0, 0.3, 0]}
            fontSize={0.1}
            color="#00ff00"
            anchorX="center"
            anchorY="middle"
            font="/fonts/JetBrainsMono-Regular.ttf"
          >
            GRABBING
          </Text>
        </group>
      ) : null}
    </group>
  );
};

export default HandCursor;
