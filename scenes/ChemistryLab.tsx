import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Cylinder, Float, RoundedBox, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { TrackingState } from '../types';
import HandCursorSimple from '../components/HandCursorSimple';

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
  isHovered?: boolean;
  originalPosition?: THREE.Vector3;
}

// Data for Lab Items - Enhanced Test Tubes
const INITIAL_ITEMS: Equipment[] = [
    // Test Tubes Rack
    { 
        id: 'tube1', type: 'TEST_TUBE', 
        position: new THREE.Vector3(-4, -1, 0), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#ff4444'), liquidLevel: 0.7, heldBy: null,
        liquidType: 'acid', label: 'HCl', isHovered: false,
        originalPosition: new THREE.Vector3(-4, -1, 0)
    },
    { 
        id: 'tube2', type: 'TEST_TUBE', 
        position: new THREE.Vector3(-2.5, -1, 0), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#4444ff'), liquidLevel: 0.6, heldBy: null,
        liquidType: 'base', label: 'NaOH', isHovered: false,
        originalPosition: new THREE.Vector3(-2.5, -1, 0)
    },
    { 
        id: 'tube3', type: 'TEST_TUBE', 
        position: new THREE.Vector3(-1, -1, 0), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#44ff44'), liquidLevel: 0.8, heldBy: null,
        liquidType: 'water', label: 'H₂O', isHovered: false,
        originalPosition: new THREE.Vector3(-1, -1, 0)
    },
    { 
        id: 'tube4', type: 'TEST_TUBE', 
        position: new THREE.Vector3(0.5, -1, 0), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#ffaa00'), liquidLevel: 0.5, heldBy: null,
        liquidType: 'indicator', label: 'PH', isHovered: false,
        originalPosition: new THREE.Vector3(0.5, -1, 0)
    },
    { 
        id: 'tube5', type: 'TEST_TUBE', 
        position: new THREE.Vector3(2, -1, 0), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#ff00ff'), liquidLevel: 0.4, heldBy: null,
        liquidType: 'acid', label: 'H₂SO₄', isHovered: false,
        originalPosition: new THREE.Vector3(2, -1, 0)
    },
    { 
        id: 'tube6', type: 'TEST_TUBE', 
        position: new THREE.Vector3(3.5, -1, 0), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#00ffff'), liquidLevel: 0.9, heldBy: null,
        liquidType: 'water', label: 'Distilled', isHovered: false,
        originalPosition: new THREE.Vector3(3.5, -1, 0)
    },
    // Mixing Beakers
    { 
        id: 'beaker1', type: 'FLASK', 
        position: new THREE.Vector3(-2, 0, 2), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#ffffff'), liquidLevel: 0.0, heldBy: null,
        label: 'MIX 1', isHovered: false,
        originalPosition: new THREE.Vector3(-2, 0, 2)
    },
    { 
        id: 'beaker2', type: 'FLASK', 
        position: new THREE.Vector3(2, 0, 2), rotation: new THREE.Euler(0,0,0),
        color: new THREE.Color('#ffffff'), liquidLevel: 0.0, heldBy: null,
        label: 'MIX 2', isHovered: false,
        originalPosition: new THREE.Vector3(2, 0, 2)
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

const GlassWare = ({ item, label, onHover }: { item: Equipment, label?: string, onHover?: (hovered: boolean) => void }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (!groupRef.current) return;
    // Physics-like smoothing
    groupRef.current.position.lerp(item.position, 0.15);
    
    // Smooth Rotation
    const currentQ = new THREE.Quaternion().setFromEuler(groupRef.current.rotation);
    const targetQ = new THREE.Quaternion().setFromEuler(item.rotation);
    groupRef.current.rotation.setFromQuaternion(currentQ.slerp(targetQ, 0.15));
    
    // Hover effect - slight scale and glow
    if (item.isHovered) {
      const targetScale = 1.05;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    } else {
      groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
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
            opacity={0.3} 
            wireframe
          />
        </mesh>
      )}
      
      {/* Hover effect */}
      {item.isHovered && !item.heldBy && (
        <mesh>
          {item.type === 'FLASK' ? (
            <cylinderGeometry args={[neckRadius + 0.03, radius + 0.03, height + 0.05, 32]} />
          ) : (
            <cylinderGeometry args={[radius + 0.03, radius + 0.03, height + 0.05, 32]} />
          )}
          <meshBasicMaterial 
            color="#00ffff" 
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
  const [reactionMode, setReactionMode] = useState<boolean>(false);
  const [reactionExplosion, setReactionExplosion] = useState<{pos: THREE.Vector3, color: string, active: boolean} | null>(null);
  const cursorPosition = useRef<THREE.Vector3>(new THREE.Vector3());
  const fistStartTime = useRef<number | null>(null);
  const isFisting = useRef<boolean>(false);

  useFrame((state, delta) => {
    const hs = handState.current;
    const nextItems = items.map(i => ({...i}));
    let changed = false;

    // Get active hand position for cursor
    const activeHand = hs.rightHand || hs.leftHand;
    if (activeHand) {
      cursorPosition.current.set(
        (0.5 - activeHand.pinchPosition.x) * 12,
        (0.5 - activeHand.pinchPosition.y) * 8,
        activeHand.pinchPosition.z * 3
      );
    }

    // Check for reaction mode (two test tubes held)
    const heldTestTubes = nextItems.filter(item => item.type === 'TEST_TUBE' && item.heldBy);
    const shouldEnterReactionMode = heldTestTubes.length === 2;
    
    if (shouldEnterReactionMode && !reactionMode) {
      setReactionMode(true);
      console.log('Entering reaction mode - only showing held test tubes');
    } else if (!shouldEnterReactionMode && reactionMode) {
      setReactionMode(false);
      setReactionExplosion(null);
      console.log('Exiting reaction mode');
    }
    // Check for fist reset (both hands closed for 3 seconds)
    const leftHandClosed = hs.leftHand && hs.leftHand.gestureType === 'fist';
    const rightHandClosed = hs.rightHand && hs.rightHand.gestureType === 'fist';
    const bothHandsClosed = leftHandClosed && rightHandClosed;
    
    if (bothHandsClosed && !isFisting.current) {
      // Start timing
      fistStartTime.current = state.clock.elapsedTime;
      isFisting.current = true;
    } else if (bothHandsClosed && isFisting.current && fistStartTime.current) {
      // Check if 3 seconds have passed
      if (state.clock.elapsedTime - fistStartTime.current > 3) {
        console.log('Resetting all positions due to 3-second fist gesture');
        // Reset all items to original positions
        nextItems.forEach(item => {
          if (item.originalPosition) {
            item.position.copy(item.originalPosition);
            item.rotation.set(0, 0, 0);
            item.heldBy = null;
            item.isHovered = false;
          }
        });
        changed = true;
        fistStartTime.current = null;
        isFisting.current = false;
      }
    } else if (!bothHandsClosed) {
      // Reset fist tracking
      fistStartTime.current = null;
      isFisting.current = false;
    }

    // --- Enhanced Interaction Logic ---
    ['Left', 'Right'].forEach((side) => {
        const hand = side === 'Left' ? hs.leftHand : hs.rightHand;
        if (!hand) return;

        // Map hand to world space coordinates
        const handPos = new THREE.Vector3(
            (0.5 - hand.pinchPosition.x) * 12,
            (0.5 - hand.pinchPosition.y) * 8,
            hand.pinchPosition.z * 3
        );

        nextItems.forEach(item => {
            const dist = handPos.distanceTo(item.position);
            const grabDistance = item.type === 'TEST_TUBE' ? 1.0 : 1.5;
            const hoverDistance = item.type === 'TEST_TUBE' ? 1.5 : 2.0;
            
            // Update hover state only if not held by any hand
            if (!item.heldBy) {
              const wasHovered = item.isHovered || false;
              item.isHovered = dist < hoverDistance;
              if (wasHovered !== item.isHovered) changed = true;
            }
            
            // GRAB Logic - Only allow one item per hand, prevent multi-grab
            if (dist < grabDistance && hand.isPinching && item.heldBy === null) {
                // Check if this hand is already holding something
                const handAlreadyHolding = nextItems.some(i => i.heldBy === side);
                
                if (!handAlreadyHolding) {
                    changed = true;
                    item.heldBy = side as 'Left' | 'Right';
                    console.log(`Picked up ${item.label || item.id} with ${side} hand`);
                }
            } 
            // RELEASE Logic - Only release if this hand is holding this item
            else if (item.heldBy === side && !hand.isPinching) {
                item.heldBy = null;
                console.log(`Released ${item.label || item.id}`);
                
                // Enhanced snap back logic
                if (item.originalPosition) {
                    // Smoothly return to original position
                    item.position.lerp(item.originalPosition, 0.1);
                    
                    // Check if close enough to snap
                    if (item.position.distanceTo(item.originalPosition) < 0.1) {
                        item.position.copy(item.originalPosition);
                    }
                }
                
                // Reset rotation
                item.rotation.x = THREE.MathUtils.lerp(item.rotation.x, 0, 0.1);
                item.rotation.y = THREE.MathUtils.lerp(item.rotation.y, 0, 0.1);
                item.rotation.z = THREE.MathUtils.lerp(item.rotation.z, 0, 0.1);
                changed = true;
            }
            
            // Move held item with hand
            if (item.heldBy === side) {
                // Move item with hand - smoother movement
                item.position.lerp(handPos, 0.3);
                
                // Enhanced rotation logic for test tubes
                if (item.type === 'TEST_TUBE') {
                    // Test tubes rotate more naturally
                    const wrist = hand.landmarks[0];
                    const index = hand.landmarks[8];
                    const angle = Math.atan2(index.y - wrist.y, index.x - wrist.x);
                    const targetZ = -(angle + Math.PI/2) * 0.5; // Dampen rotation for test tubes
                    item.rotation.z = THREE.MathUtils.lerp(item.rotation.z, targetZ, 0.2);
                    
                    // Add slight wobble for realism
                    item.rotation.x = Math.sin(state.clock.elapsedTime * 2) * 0.02;
                } else {
                    // Original rotation for flasks
                    const wrist = hand.landmarks[0];
                    const index = hand.landmarks[8];
                    const angle = Math.atan2(index.y - wrist.y, index.x - wrist.x);
                    const targetZ = -(angle + Math.PI/2) * 0.7;
                    item.rotation.z = THREE.MathUtils.lerp(item.rotation.z, targetZ, 0.15);
                }
            }
        });
    });
    
    // --- Reaction Detection in Reaction Mode ---
    if (reactionMode && heldTestTubes.length === 2) {
      const [tube1, tube2] = heldTestTubes;
      const distance = tube1.position.distanceTo(tube2.position);
      
      // Check if tubes are close enough and tilted for reaction
      const tube1Tilted = Math.abs(tube1.rotation.z) > 0.6;
      const tube2Tilted = Math.abs(tube2.rotation.z) > 0.6;
      
      if (distance < 2.0 && (tube1Tilted || tube2Tilted)) {
        // Trigger explosion reaction
        const reactionPos = new THREE.Vector3()
          .addVectors(tube1.position, tube2.position)
          .multiplyScalar(0.5);
        
        // Mix colors for explosion
        const mixedColor = new THREE.Color().copy(tube1.color).lerp(tube2.color, 0.5);
        
        setReactionExplosion({
          pos: reactionPos,
          color: '#' + mixedColor.getHexString(),
          active: true
        });
        
        // Reduce liquid levels
        tube1.liquidLevel = Math.max(0, tube1.liquidLevel - 0.3);
        tube2.liquidLevel = Math.max(0, tube2.liquidLevel - 0.3);
        changed = true;
        
        console.log('Chemical reaction triggered!');
      }
    }
    
    // --- Pouring & Mixing Logic (only when not in reaction mode) ---
    if (!reactionMode) {
      nextItems.forEach((source, i) => {
          if (!source.heldBy || source.liquidLevel <= 0) return;
          
          // If tilted enough
          if (Math.abs(source.rotation.z) > 0.8) {
              nextItems.forEach((target, j) => {
                  if (i === j || target.heldBy) return;
                  
                  const d = source.position.distanceTo(target.position);
                  // Check proximity and height difference
                  if (d < 2.0 && source.position.y > target.position.y + 0.5) {
                      // Transfer liquid
                      const amount = 0.01;
                      source.liquidLevel = Math.max(0, source.liquidLevel - amount);
                      
                      // Mix colors
                      if (target.liquidLevel <= 0.05) {
                        target.color.copy(source.color);
                      } else {
                        target.color.lerp(source.color, 0.05);
                      }
                      target.liquidLevel = Math.min(1, target.liquidLevel + amount);
                      changed = true;

                      // Spawn Particles - reduced frequency for performance
                      if (Math.random() > 0.8) {
                           setParticles(prev => [
                               ...prev,
                               { 
                                   pos: target.position.clone().add(new THREE.Vector3((Math.random()-0.5) * 0.5, 1.5, (Math.random()-0.5) * 0.5)),
                                   color: '#' + source.color.getHexString(),
                                   id: Math.random()
                               }
                           ].slice(-15)); // Reduced max particles
                      }
                  }
              });
          }
      });
    }

    // Update particles with physics
    setParticles(prev => prev.map(p => ({
        ...p,
        pos: p.pos.clone().add(new THREE.Vector3(0, -delta * 2, 0)) // Gravity effect
    })).filter(p => p.pos.y > -3)); // Remove particles that fall too low

    if (changed) setItems(nextItems);
  });

  return (
    <group position={[0, 0, 0]}>
        {/* Fist reset indicator */}
        {isFisting.current && fistStartTime.current && (
          <group position={[0, 8, 0]}>
            <Text fontSize={0.5} color="#ff0000" anchorX="center">
              RESET IN {Math.max(0, 3 - (Date.now() / 1000 - (fistStartTime.current || 0))).toFixed(1)}s
            </Text>
            <mesh position={[0, -0.5, 0]}>
              <ringGeometry args={[1, 1.2, 32]} />
              <meshBasicMaterial color="#ff0000" transparent opacity={0.5} />
            </mesh>
          </group>
        )}
        
        {/* Reaction Mode Indicator */}
        {reactionMode && (
          <group position={[0, 8, -2]}>
            <Text fontSize={0.6} color="#00ff00" anchorX="center">
              REACTION MODE
            </Text>
            <mesh position={[0, -0.5, 0]}>
              <ringGeometry args={[0.8, 1.0, 32]} />
              <meshBasicMaterial color="#00ff00" transparent opacity={0.3} />
            </mesh>
          </group>
        )}
        
        {/* EXPLICIT LIGHTING SETUP */}
        <ambientLight intensity={0.4} />
        <pointLight position={[0, 10, 5]} intensity={2} color="white" castShadow />
        <pointLight position={[-10, 5, 0]} intensity={1.5} color="#00ffff" />
        <pointLight position={[10, 5, 0]} intensity={1.5} color="#ff00ff" />
        
        {/* Move apparatus to left when in reaction mode */}
        <group position={reactionMode ? [-8, 0, 0] : [0, 0, 0]}>
          {!reactionMode && <TestTubeRack />}
          {!reactionMode && <LabTable />}
          
          {/* Show all items when not in reaction mode, only held test tubes in reaction mode */}
          {items.map((item) => {
            const shouldShow = !reactionMode || (item.heldBy && item.type === 'TEST_TUBE');
            return shouldShow ? (
              <GlassWare 
                key={item.id} 
                item={item} 
                label={item.label || (item.type === 'FLASK' ? 'BEAKER' : item.type)} 
              />
            ) : null;
          })}
        </group>

        {/* Liquid Particles */}
        {particles.map((p) => (
            <mesh key={p.id} position={p.pos}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshBasicMaterial color={p.color} transparent opacity={0.8} />
            </mesh>
        ))}

        {/* Reaction Explosion */}
        {reactionExplosion && reactionExplosion.active && (
          <group position={reactionExplosion.pos}>
            {/* Explosion rings */}
            <mesh>
              <ringGeometry args={[0.5, 1.5, 32]} />
              <meshBasicMaterial color={reactionExplosion.color} transparent opacity={0.6} />
            </mesh>
            <mesh>
              <ringGeometry args={[1.0, 2.0, 32]} />
              <meshBasicMaterial color={reactionExplosion.color} transparent opacity={0.4} />
            </mesh>
            <mesh>
              <ringGeometry args={[1.5, 2.5, 32]} />
              <meshBasicMaterial color={reactionExplosion.color} transparent opacity={0.2} />
            </mesh>
            
            {/* Explosion particles */}
            {[...Array(20)].map((_, i) => (
              <mesh
                key={i}
                position={[
                  (Math.random() - 0.5) * 3,
                  (Math.random() - 0.5) * 3,
                  (Math.random() - 0.5) * 3
                ]}
              >
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshBasicMaterial color={reactionExplosion.color} />
              </mesh>
            ))}
          </group>
        )}

        {/* Hand Cursors - Show both hands with different colors */}
        {handState.current.leftHand && (
          <HandCursorSimple 
            handState={{ current: { ...handState.current, rightHand: null } }} 
            handColor="#00ffff" // Cyan for left hand
          />
        )}
        {handState.current.rightHand && (
          <HandCursorSimple 
            handState={{ current: { ...handState.current, leftHand: null } }} 
            handColor="#ff00ff" // Magenta for right hand
          />
        )}

        <Float speed={2} rotationIntensity={0} floatIntensity={0.2} position={[0, 6, -8]}>
            <Text fontSize={0.6} color="white" anchorX="center" outlineWidth={0.02} outlineColor="black">
                CHEMISTRY LAB
            </Text>
        </Float>
    </group>
  );
};

export default ChemistryLab;