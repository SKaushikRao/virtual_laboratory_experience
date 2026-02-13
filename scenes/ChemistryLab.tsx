import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Cylinder, Float, RoundedBox, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { TrackingState } from '../types';

interface SceneProps {
  handState: React.MutableRefObject<TrackingState>;
}

interface Equipment {
  id: string;
  type: 'FLASK' | 'TUBE' | 'TEST_TUBE';
  position: THREE.Vector3;
  rotation: THREE.Euler;
  color: THREE.Color;
  liquidLevel: number; // 0 to 1
  heldBy: 'Left' | 'Right' | null;
  liquidType?: 'water' | 'acid' | 'base' | 'indicator';
  label?: string;
}

// Data for Lab Items - Enhanced Test Tubes
const INITIAL_ITEMS: Equipment[] = [
    // Test Tubes Rack
    { 
        id: 'tube1', type: 'TEST_TUBE', 
        position: new THREE.Vector3(-4, -1, 0), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#ff4444'), liquidLevel: 0.7, heldBy: null,
        liquidType: 'acid', label: 'HCl'
    },
    { 
        id: 'tube2', type: 'TEST_TUBE', 
        position: new THREE.Vector3(-2.5, -1, 0), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#4444ff'), liquidLevel: 0.6, heldBy: null,
        liquidType: 'base', label: 'NaOH'
    },
    { 
        id: 'tube3', type: 'TEST_TUBE', 
        position: new THREE.Vector3(-1, -1, 0), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#44ff44'), liquidLevel: 0.8, heldBy: null,
        liquidType: 'water', label: 'H₂O'
    },
    { 
        id: 'tube4', type: 'TEST_TUBE', 
        position: new THREE.Vector3(0.5, -1, 0), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#ffaa00'), liquidLevel: 0.5, heldBy: null,
        liquidType: 'indicator', label: 'PH'
    },
    { 
        id: 'tube5', type: 'TEST_TUBE', 
        position: new THREE.Vector3(2, -1, 0), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#ff00ff'), liquidLevel: 0.4, heldBy: null,
        liquidType: 'acid', label: 'H₂SO₄'
    },
    { 
        id: 'tube6', type: 'TEST_TUBE', 
        position: new THREE.Vector3(3.5, -1, 0), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#00ffff'), liquidLevel: 0.9, heldBy: null,
        liquidType: 'water', label: 'Distilled'
    },
    // Mixing Beakers
    { 
        id: 'beaker1', type: 'FLASK', 
        position: new THREE.Vector3(-2, 0, 2), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#ffffff'), liquidLevel: 0.0, heldBy: null,
        label: 'MIX 1'
    },
    { 
        id: 'beaker2', type: 'FLASK', 
        position: new THREE.Vector3(2, 0, 2), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#ffffff'), liquidLevel: 0.0, heldBy: null,
        label: 'MIX 2'
    },
];

const TestTubeRack = () => (
    <group position={[0, -2.2, 0]}>
        {/* Rack Base */}
        <RoundedBox args={[12, 0.2, 1]} radius={0.05} smoothness={2}>
            <meshStandardMaterial color="#444444" roughness={0.6} metalness={0.3} />
        </RoundedBox>
        
        {/* Rack Posts */}
        {[-5.5, -2.75, 0, 2.75, 5.5].map((x, i) => (
            <mesh key={i} position={[x, 0.5, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 1]} />
                <meshStandardMaterial color="#666666" roughness={0.5} metalness={0.4} />
            </mesh>
        ))}
        
        {/* Test Tube Holders */}
        {[-4, -2.5, -1, 0.5, 2, 3.5].map((x, i) => (
            <group key={i} position={[x, 0.3, 0]}>
                {/* Holder Ring */}
                <mesh>
                    <torusGeometry args={[0.18, 0.03, 8, 16]} />
                    <meshStandardMaterial color="#888888" roughness={0.4} metalness={0.5} />
                </mesh>
                {/* Support */}
                <mesh position={[0, -0.15, 0]}>
                    <boxGeometry args={[0.4, 0.1, 0.1]} />
                    <meshStandardMaterial color="#666666" roughness={0.5} metalness={0.4} />
                </mesh>
            </group>
        ))}
    </group>
);

const LabTable = () => (
    <group position={[0, -3, 0]}>
        {/* Table Top */}
        <RoundedBox args={[14, 0.3, 6]} radius={0.1} smoothness={4}>
            <meshStandardMaterial color="#222222" roughness={0.3} metalness={0.4} />
        </RoundedBox>
        {/* Neon Edge for Visibility */}
        <mesh position={[0, 0.16, 3]} rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[14, 0.2]} />
            <meshBasicMaterial color="#00ffff" />
        </mesh>
    </group>
);

const GlassWare = ({ item, label }: { item: Equipment, label?: string }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!groupRef.current) return;
    // Physics-like smoothing
    groupRef.current.position.lerp(item.position, 0.2);
    
    // Smooth Rotation
    const currentQ = new THREE.Quaternion().setFromEuler(groupRef.current.rotation);
    const targetQ = new THREE.Quaternion().setFromEuler(item.rotation);
    groupRef.current.rotation.setFromQuaternion(currentQ.slerp(targetQ, 0.2));
  });

  // Enhanced dimensions for test tubes
  const getDimensions = () => {
    switch(item.type) {
      case 'TEST_TUBE':
        return {
          radius: 0.15,
          height: 2.5,
          neckRadius: 0.15,
          rimThickness: 0.02,
          glassThickness: 0.01
        };
      case 'FLASK':
        return {
          radius: 0.7,
          height: 2.2,
          neckRadius: 0.35,
          rimThickness: 0.04,
          glassThickness: 0.02
        };
      case 'TUBE':
      default:
        return {
          radius: 0.4,
          height: 3.0,
          neckRadius: 0.4,
          rimThickness: 0.04,
          glassThickness: 0.02
        };
    }
  };

  const { radius, height, neckRadius, rimThickness, glassThickness } = getDimensions();

  // Enhanced glass material based on type
  const getGlassMaterial = () => {
    const baseProps = {
      transparent: true,
      roughness: 0.1,
      metalness: 0.1,
      side: THREE.DoubleSide as const,
    };

    if (item.type === 'TEST_TUBE') {
      return {
        ...baseProps,
        color: '#e6f3ff',
        transmission: 0.8,
        opacity: 0.3,
        emissive: '#e6f3ff',
        emissiveIntensity: 0.05
      };
    } else {
      return {
        ...baseProps,
        color: '#aaccff',
        transmission: 0.6,
        opacity: 0.4,
        emissive: '#aaccff',
        emissiveIntensity: 0.1
      };
    }
  };

  const glassMaterial = getGlassMaterial();

  return (
    <group ref={groupRef}>
      {/* Enhanced Label */}
      {item.label && (
        <Billboard position={[0, height + 0.6, 0]}>
          <Text 
            fontSize={item.type === 'TEST_TUBE' ? 0.15 : 0.25} 
            color="white" 
            anchorX="center" 
            outlineWidth={0.02} 
            outlineColor="black"
            font="/fonts/JetBrainsMono-Regular.ttf"
          >
            {item.label}
          </Text>
        </Billboard>
      )}

      {/* Glass Container */}
      <group>
        {/* Main glass body */}
        <mesh>
          {item.type === 'FLASK' ? (
            <cylinderGeometry args={[neckRadius, radius, height, 32]} />
          ) : (
            <cylinderGeometry args={[radius, radius, height, 32]} />
          )}
          <meshPhysicalMaterial {...glassMaterial} />
        </mesh>
        
        {/* Enhanced rim */}
        <mesh position={[0, height/2, 0]} rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[radius + rimThickness/2, rimThickness, 16, 32]} />
          <meshStandardMaterial 
            color={item.type === 'TEST_TUBE' ? '#ffffff' : '#cccccc'} 
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>

        {/* Test tube bottom */}
        {item.type === 'TEST_TUBE' && (
          <mesh position={[0, -height/2, 0]}>
            <sphereGeometry args={[radius - glassThickness, 16, 16]} />
            <meshPhysicalMaterial {...glassMaterial} />
          </mesh>
        )}
      </group>
      
      {/* Enhanced Liquid Content */}
      {item.liquidLevel > 0.01 && (
        <group position={[0, -height/2 + (height * item.liquidLevel)/2, 0]}>
          <mesh>
            {item.type === 'FLASK' ? (
              <cylinderGeometry args={[
                THREE.MathUtils.lerp(radius, neckRadius, item.liquidLevel), 
                radius - 0.1, 
                height * item.liquidLevel - 0.1, 
                32
              ]} />
            ) : (
              <cylinderGeometry args={[radius - 0.08, radius - 0.08, height * item.liquidLevel - 0.1, 32]} />
            )}
            {/* Enhanced liquid material */}
            <meshStandardMaterial 
              color={item.color}
              emissive={item.color}
              emissiveIntensity={item.type === 'TEST_TUBE' ? 1.0 : 0.8}
              roughness={0.1}
              metalness={0.3}
              transparent={true}
              opacity={0.9}
            />
          </mesh>
          
          {/* Liquid surface effect for test tubes */}
          {item.type === 'TEST_TUBE' && (
            <mesh position={[0, (height * item.liquidLevel - 0.1)/2, 0]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[radius - 0.08, radius - 0.08, 0.01, 32]} />
              <meshStandardMaterial 
                color={item.color}
                emissive={item.color}
                emissiveIntensity={1.2}
                transparent={true}
                opacity={0.7}
              />
            </mesh>
          )}
        </group>
      )}

      {/* Highlight effect when held */}
      {item.heldBy && (
        <mesh>
          {item.type === 'FLASK' ? (
            <cylinderGeometry args={[neckRadius + 0.05, radius + 0.05, height + 0.1, 32]} />
          ) : (
            <cylinderGeometry args={[radius + 0.05, radius + 0.05, height + 0.1, 32]} />
          )}
          <meshBasicMaterial 
            color="#00ff00" 
            transparent 
            opacity={0.2} 
            wireframe
          />
        </mesh>
      )}
    </group>
  );
};

const ChemistryLab: React.FC<SceneProps> = ({ handState }) => {
  const [items, setItems] = useState<Equipment[]>(INITIAL_ITEMS);
  const [particles, setParticles] = useState<{pos: THREE.Vector3, color: string, id: number}[]>([]);

  useFrame((state, delta) => {
    const hs = handState.current;
    const nextItems = items.map(i => ({...i}));
    let changed = false;

    // --- Enhanced Interaction Logic ---
    ['Left', 'Right'].forEach((side) => {
        const hand = side === 'Left' ? hs.leftHand : hs.rightHand;
        if (!hand) return;

        // Map hand to world space coordinates
        const handPos = new THREE.Vector3(
            (0.5 - hand.pinchPosition.x) * 14,
            (0.5 - hand.pinchPosition.y) * 10,
            0
        );

        nextItems.forEach(item => {
            const dist = handPos.distanceTo(item.position);
            const grabDistance = item.type === 'TEST_TUBE' ? 0.8 : 1.5; // Easier to grab test tubes
            
            // GRAB Logic - Enhanced for test tubes
            if (dist < grabDistance && hand.isPinching && (item.heldBy === null || item.heldBy === side)) {
                if (item.heldBy !== side) {
                    changed = true;
                    console.log(`Picked up ${item.label || item.id} with ${side} hand`);
                }
                item.heldBy = side as 'Left' | 'Right';
                
                // Move item with hand
                item.position.copy(handPos);
                
                // Enhanced rotation logic for test tubes
                if (item.type === 'TEST_TUBE') {
                    // Test tubes rotate more naturally
                    const wrist = hand.landmarks[0];
                    const index = hand.landmarks[8];
                    const angle = Math.atan2(index.y - wrist.y, index.x - wrist.x);
                    const targetZ = -(angle + Math.PI/2) * 0.7; // Dampen rotation for test tubes
                    item.rotation.z = THREE.MathUtils.lerp(item.rotation.z, targetZ, 0.3);
                    
                    // Add slight wobble for realism
                    item.rotation.x = Math.sin(state.clock.elapsedTime * 2) * 0.05;
                } else {
                    // Original rotation for flasks
                    const wrist = hand.landmarks[0];
                    const index = hand.landmarks[8];
                    const angle = Math.atan2(index.y - wrist.y, index.x - wrist.x);
                    const targetZ = -(angle + Math.PI/2);
                    item.rotation.z = THREE.MathUtils.lerp(item.rotation.z, targetZ, 0.2);
                }
                
            } 
            // RELEASE Logic
            else if (item.heldBy === side && !hand.isPinching) {
                item.heldBy = null;
                console.log(`Released ${item.label || item.id}`);
                
                // Enhanced snap back logic
                if (item.type === 'TEST_TUBE') {
                    // Test tubes snap back to rack position
                    if (item.position.y > -1.5) {
                        item.position.y = -1.5;
                        // Find nearest rack position
                        const rackPositions = [-4, -2.5, -1, 0.5, 2, 3.5];
                        const nearestPos = rackPositions.reduce((prev, curr) => 
                            Math.abs(curr - item.position.x) < Math.abs(prev - item.position.x) ? curr : prev
                        );
                        item.position.x = THREE.MathUtils.lerp(item.position.x, nearestPos, 0.5);
                    }
                } else {
                    // Flasks snap to table level
                    if (item.position.y > -1.5) {
                        item.position.y = -1.5;
                    }
                }
                
                // Reset rotation
                item.rotation.set(0,0,0);
                changed = true;
            }
        });
    });
    
    // --- Pouring & Mixing Logic ---
    nextItems.forEach((source, i) => {
        if (!source.heldBy || source.liquidLevel <= 0) return;
        
        // If tilted enough
        if (Math.abs(source.rotation.z) > 1.0) {
            nextItems.forEach((target, j) => {
                if (i === j) return;
                
                const d = source.position.distanceTo(target.position);
                // Check proximity and height difference
                if (d < 2.5 && source.position.y > target.position.y + 1) {
                    // Transfer liquid
                    const amount = 0.015;
                    source.liquidLevel -= amount;
                    
                    // Mix colors
                    if (target.liquidLevel <= 0.05) {
                        target.color.copy(source.color);
                    } else {
                        target.color.lerp(source.color, 0.1);
                    }
                    target.liquidLevel = Math.min(1, target.liquidLevel + amount);
                    changed = true;

                    // Spawn Particles
                    if (Math.random() > 0.6) {
                         setParticles(prev => [
                             ...prev,
                             { 
                                 pos: target.position.clone().add(new THREE.Vector3((Math.random()-0.5), 1.5, (Math.random()-0.5))),
                                 color: '#' + source.color.getHexString(),
                                 id: Math.random()
                             }
                         ].slice(-25));
                    }
                }
            });
        }
    });

    if (changed) setItems(nextItems);
  });

  return (
    <group>
        {/* EXPLICIT LIGHTING SETUP - Ensures nothing is black */}
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 10, 5]} intensity={1.5} color="white" castShadow />
        <pointLight position={[-10, 5, 0]} intensity={1} color="#00ffff" />
        <pointLight position={[10, 5, 0]} intensity={1} color="#ff00ff" />
        
        <TestTubeRack />
        <LabTable />
        
        {items.map((item) => (
            <GlassWare 
                key={item.id} 
                item={item} 
                label={item.label || (item.type === 'FLASK' ? 'BEAKER' : item.type)} 
            />
        ))}

        {/* Liquid Particles */}
        {particles.map((p) => (
            <mesh key={p.id} position={p.pos}>
                <sphereGeometry args={[0.08]} />
                <meshBasicMaterial color={p.color} />
            </mesh>
        ))}

        <Float speed={2} rotationIntensity={0} floatIntensity={0.2} position={[0, 4, -4]}>
            <Text fontSize={0.4} color="white" font="/fonts/JetBrainsMono-Regular.ttf" anchorX="center" outlineWidth={0.02} outlineColor="black">
                CHEMISTRY LAB
            </Text>
        </Float>
    </group>
  );
};

export default ChemistryLab;