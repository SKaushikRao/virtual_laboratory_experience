import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { TrackingState } from '../types';

interface SceneProps {
  handState: React.MutableRefObject<TrackingState>;
}

// 0: Full View (Sun Center), 1-5: Planets
const PLANETS = [
  { name: 'Solar System', color: '#ffaa00', distance: 0, size: 4.0, speed: 0 }, // Target 0 (Fist)
  { name: 'Mercury', color: '#A0A0A0', distance: 10, size: 0.8, speed: 1.2 }, // 1 Finger
  { name: 'Venus', color: '#E3BB76', distance: 15, size: 1.2, speed: 0.9 },   // 2 Fingers
  { name: 'Earth', color: '#2B32B2', distance: 22, size: 1.3, speed: 0.6 },   // 3 Fingers
  { name: 'Mars', color: '#CF3C16', distance: 30, size: 1.0, speed: 0.5 },    // 4 Fingers
  { name: 'Jupiter', color: '#C88B3A', distance: 45, size: 3.5, speed: 0.2 }, // 5 Fingers (Open Palm)
];

const SolarSystem: React.FC<SceneProps> = ({ handState }) => {
  const { camera } = useThree();
  const [targetIndex, setTargetIndex] = useState(0); 
  
  // Physics state
  const planetAngles = useRef(PLANETS.map(() => Math.random() * Math.PI * 2));
  const planetPositions = useRef(PLANETS.map(() => new THREE.Vector3()));
  
  // Camera State
  const camState = useRef({
    radius: 60, // Start zoomed out
    phi: Math.PI / 2.5,   // Elevation
    theta: 0,           // Azimuth
    targetLookAt: new THREE.Vector3(0,0,0)
  });

  useFrame((state, delta) => {
    const hs = handState.current;
    
    // --- 1. Navigation Logic (Hand Gestures) ---
    const hand = hs.rightHand || hs.leftHand;
    
    // Only switch targets if not pinching (pinching is for moving/orbiting)
    if (hand && !hand.isPinching) {
        let newIndex = -1;
        
        // Gesture Mapping
        if (hand.gestureType === 'fist') newIndex = 0;              // Full View
        else if (hand.gestureType === 'one_finger') newIndex = 1;   // Mercury
        else if (hand.gestureType === 'two_fingers') newIndex = 2;  // Venus
        else if (hand.gestureType === 'three_fingers') newIndex = 3;// Earth
        else if (hand.gestureType === 'four_fingers') newIndex = 4; // Mars
        else if (hand.gestureType === 'open_palm') newIndex = 5;    // Jupiter

        if (newIndex !== -1 && newIndex < PLANETS.length && newIndex !== targetIndex) {
            setTargetIndex(newIndex);
        }
    }

    // --- 2. Planet Simulation (Orbiting) ---
    PLANETS.forEach((planet, i) => {
        if (i > 0) { // Skip Sun/Center
            planetAngles.current[i] += planet.speed * delta * 0.5;
            const x = Math.cos(planetAngles.current[i]) * planet.distance;
            const z = Math.sin(planetAngles.current[i]) * planet.distance;
            planetPositions.current[i].set(x, 0, z);
        } else {
            planetPositions.current[i].set(0, 0, 0);
        }
    });

    // --- 3. Pinch to Orbit (Left/Right/Up/Down) ---
    // We modify theta (horizontal) and phi (vertical) based on pinch movement
    if (hs.gesture === 'pinch_drag' && (hs.leftHand || hs.rightHand)) {
        const activeHand = hs.leftHand || hs.rightHand;
        if (activeHand) {
            // Using pinchPosition (0 to 1) relative to center (0.5)
            // If hand is to the right of screen center, rotate camera right
            const dx = (activeHand.pinchPosition.x - 0.5); 
            const dy = (activeHand.pinchPosition.y - 0.5);
            
            const sensitivity = 2.0;
            
            // Continuous rotation based on offset from center (Joystick style)
            camState.current.theta -= dx * delta * sensitivity;
            camState.current.phi += dy * delta * sensitivity;
            
            // Clamp vertical angle to avoid gimbal lock or flipping
            camState.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, camState.current.phi));
        }
    }

    // --- 4. Camera Transition Logic ---
    const targetPlanetPos = planetPositions.current[targetIndex];
    
    // Smoothly interpolate the "Look At" point
    camState.current.targetLookAt.lerp(targetPlanetPos, 0.05);

    // Determine Ideal Radius (Distance)
    // If index 0 (Fist/Full View), zoom out to see everything
    // If planet, zoom in close
    let idealRadius = 60;
    if (targetIndex > 0) {
        idealRadius = PLANETS[targetIndex].size * 5 + 5;
    }

    camState.current.radius = THREE.MathUtils.lerp(camState.current.radius, idealRadius, 0.05);

    // Convert Spherical to Cartesian
    const offsetX = camState.current.radius * Math.sin(camState.current.phi) * Math.sin(camState.current.theta);
    const offsetY = camState.current.radius * Math.cos(camState.current.phi);
    const offsetZ = camState.current.radius * Math.sin(camState.current.phi) * Math.cos(camState.current.theta);

    const idealCamPos = new THREE.Vector3().copy(camState.current.targetLookAt).add(
        new THREE.Vector3(offsetX, offsetY, offsetZ)
    );

    camera.position.lerp(idealCamPos, 0.1);
    camera.lookAt(camState.current.targetLookAt);
  });

  return (
    <group>
      <ambientLight intensity={0.1} />
      
      {/* Sun Light Source */}
      <pointLight position={[0, 0, 0]} intensity={2.5} color="#ffaa00" distance={200} decay={1} />
      
      {/* Sun Mesh (Center) */}
      <mesh position={[0,0,0]}>
         <sphereGeometry args={[4, 64, 64]} />
         <meshBasicMaterial color="#ffaa00" />
      </mesh>
      {/* Sun Glow Halo */}
      <mesh position={[0,0,0]}>
         <sphereGeometry args={[4.5, 32, 32]} />
         <meshBasicMaterial color="#ff5500" transparent opacity={0.3} side={THREE.BackSide} />
      </mesh>

      {/* Planets */}
      {PLANETS.map((planet, i) => {
        if (i === 0) return null; // Skip Sun in loop
        return (
            <group key={planet.name}>
                {/* Orbit Trail */}
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[planet.distance - 0.05, planet.distance + 0.05, 128]} />
                    <meshBasicMaterial color="#ffffff" opacity={0.15} transparent side={THREE.DoubleSide} />
                </mesh>
                
                {/* Planet Sphere */}
                <mesh position={planetPositions.current[i]}>
                    <sphereGeometry args={[planet.size, 64, 64]} />
                    <meshStandardMaterial 
                        color={planet.color}
                        roughness={0.8}
                        metalness={0.2}
                        emissive={targetIndex === i ? planet.color : '#000000'}
                        emissiveIntensity={targetIndex === i ? 0.4 : 0}
                    />
                </mesh>
                
                {/* Text Label */}
                <Billboard
                    position={[planetPositions.current[i].x, planetPositions.current[i].y + planet.size + 1.5, planetPositions.current[i].z]}
                >
                    <Text
                        fontSize={targetIndex === 0 ? 2 : 0.8} // Larger text when zoomed out
                        color="white"
                        anchorX="center"
                        anchorY="bottom"
                        outlineWidth={0.05}
                        outlineColor="#000000"
                    >
                        {planet.name.toUpperCase()}
                    </Text>
                </Billboard>
            </group>
        );
      })}

      <Stars radius={200} depth={50} count={8000} factor={4} saturation={0} fade speed={0.2} />
      
      {/* Helper Text */}
      <Billboard position={[0, -15, 0]}>
          <Text fontSize={2} color="#888888" anchorX="center" fillOpacity={0.5}>
             FIST FOR FULL VIEW
          </Text>
      </Billboard>
    </group>
  );
};

export default SolarSystem;