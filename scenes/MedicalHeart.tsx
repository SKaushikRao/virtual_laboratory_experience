import React, { useRef, Suspense, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { TrackingState } from '../types';

interface SceneProps {
  handState: React.MutableRefObject<TrackingState>;
}

// Surgical Needle Component
const SurgicalNeedle = ({ handState }: { handState: React.MutableRefObject<TrackingState> }) => {
  const needleRef = useRef<THREE.Group>(null);
  const [isHeld, setIsHeld] = useState(false);
  
  useFrame((state, delta) => {
    if (!needleRef.current) return;
    
    const hs = handState.current;
    
    // Check if left hand is pinching to hold needle
    if (hs.leftHand && hs.leftHand.isPinching) {
      setIsHeld(true);
      
      // Map left hand pinch position to needle position
      const targetX = (0.5 - hs.leftHand.pinchPosition.x) * 12;
      const targetY = (0.5 - hs.leftHand.pinchPosition.y) * 8;
      const targetZ = hs.leftHand.pinchPosition.z * 2; // Depth control
      
      needleRef.current.position.lerp(
        new THREE.Vector3(targetX, targetY, targetZ), 
        0.3
      );
      
      // Calculate needle rotation based on hand orientation
      const wrist = hs.leftHand.landmarks[0];
      const index = hs.leftHand.landmarks[8];
      const angle = Math.atan2(index.y - wrist.y, index.x - wrist.x);
      
      needleRef.current.rotation.z = THREE.MathUtils.lerp(
        needleRef.current.rotation.z, 
        -(angle + Math.PI/2), 
        0.2
      );
      
      // Add slight tremor for realism
      needleRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 10) * 0.02;
      needleRef.current.rotation.y = Math.cos(state.clock.elapsedTime * 8) * 0.02;
    } else {
      setIsHeld(false);
      // Return to rest position when not held
      needleRef.current.position.lerp(
        new THREE.Vector3(3, 2, 2), 
        0.05
      );
      needleRef.current.rotation.lerp(
        new THREE.Euler(0, Math.PI/4, 0), 
        0.05
      );
    }
  });
  
  return (
    <group ref={needleRef}>
      {/* Needle shaft */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 2, 16]} />
        <meshStandardMaterial 
          color="#c0c0c0" 
          roughness={0.1} 
          metalness={0.9}
          emissive={isHeld ? "#00ffff" : "#000000"}
          emissiveIntensity={isHeld ? 0.2 : 0}
        />
      </mesh>
      
      {/* Needle tip */}
      <mesh position={[0, -1, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.02, 0.3, 16]} />
        <meshStandardMaterial 
          color="#e0e0e0" 
          roughness={0.05} 
          metalness={0.95}
        />
      </mesh>
      
      {/* Needle hub/handle */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.3, 16]} />
        <meshStandardMaterial 
          color="#ff4444" 
          roughness={0.3} 
          metalness={0.2}
        />
      </mesh>
      
      {/* Highlight when held */}
      {isHeld && (
        <mesh>
          <cylinderGeometry args={[0.05, 0.05, 2.5, 16]} />
          <meshBasicMaterial 
            color="#00ffff" 
            transparent 
            opacity={0.3} 
            wireframe
          />
        </mesh>
      )}
    </group>
  );
};

// Heart Model Component
const HeartModel = ({ handState }: { handState: React.MutableRefObject<TrackingState> }) => {
  const heartRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/heart.glb');
  const [isBeingOperated, setIsBeingOperated] = useState(false);
  
  useFrame((state, delta) => {
    if (!heartRef.current) return;

    // Heartbeat animation
    const time = state.clock.getElapsedTime();
    const beat = 1 + Math.sin(time * 3) * 0.03 + Math.sin(time * 6) * 0.01;
    
    const hs = handState.current;
    
    // Check if needle is near heart (surgical interaction)
    const needlePosition = new THREE.Vector3(3, 2, 2); // Approximate needle rest position
    if (hs.leftHand && hs.leftHand.isPinching) {
      const currentNeedlePos = new THREE.Vector3(
        (0.5 - hs.leftHand.pinchPosition.x) * 12,
        (0.5 - hs.leftHand.pinchPosition.y) * 8,
        hs.leftHand.pinchPosition.z * 2
      );
      
      const distance = currentNeedlePos.distanceTo(heartRef.current.position);
      setIsBeingOperated(distance < 3);
    } else {
      setIsBeingOperated(false);
    }
    
    // Gentle rotation when not being operated
    if (!isBeingOperated) {
      heartRef.current.rotation.y += delta * 0.3;
    }
    
    // Apply heartbeat
    heartRef.current.scale.set(beat, beat, beat);
    
    // Add slight movement during operation
    if (isBeingOperated) {
      heartRef.current.position.x = Math.sin(time * 2) * 0.05;
      heartRef.current.position.y = Math.cos(time * 2) * 0.05;
    }
  });
  
  return (
    <group ref={heartRef} position={[0, 0, 0]}>
      {/* Clone the GLTF scene */}
      <primitive object={scene.clone()} scale={0.5} />
      
      {/* Glow effect during operation */}
      {isBeingOperated && (
        <mesh>
          <sphereGeometry args={[2, 32, 32]} />
          <meshBasicMaterial 
            color="#ff0000" 
            transparent 
            opacity={0.1} 
          />
        </mesh>
      )}
    </group>
  );
};

const MedicalHeart: React.FC<SceneProps> = ({ handState }) => {
  return (
    <group>
      {/* Enhanced surgical lighting */}
      <ambientLight intensity={0.3} />
      <spotLight position={[5, 8, 5]} intensity={2} castShadow angle={0.3} penumbra={0.5} />
      <spotLight position={[-5, 8, 5]} intensity={1.5} castShadow angle={0.3} penumbra={0.5} color="#ffffff" />
      <pointLight position={[0, -5, 5]} intensity={0.5} color="#4444ff" />
      
      {/* Surgical overhead light */}
      <pointLight position={[0, 10, 0]} intensity={3} color="#ffffff" distance={20} decay={1} />

      {/* Main Heart Model */}
      <Suspense fallback={
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color="#ff0033" wireframe />
        </mesh>
      }>
        <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
          <HeartModel handState={handState} />
        </Float>
      </Suspense>
      
      {/* Surgical Needle */}
      <SurgicalNeedle handState={handState} />

      {/* Instructions */}
      <Text 
        position={[0, -4, 0]} 
        color="white" 
        fontSize={0.3} 
        font="/fonts/JetBrainsMono-Regular.ttf"
        anchorX="center"
      >
        LEFT HAND PINCH: HOLD NEEDLE • MOVE HAND: POSITION NEEDLE
      </Text>
      
      <Text 
        position={[0, -4.5, 0]} 
        color="#00ffff" 
        fontSize={0.2} 
        font="/fonts/JetBrainsMono-Regular.ttf"
        anchorX="center"
      >
        BRING NEEDLE CLOSE TO HEART FOR SURGICAL SIMULATION
      </Text>
    </group>
  );
};

export default MedicalHeart;
