import React, { useRef, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float, Cylinder, RoundedBox, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { TrackingState } from '../types';
import HandTracker, { HandTrackerRef } from '../components/HandTracker';

interface ChemistryPageProps {}

interface TestTube {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  color: THREE.Color;
  liquidColor: string;
  liquidLevel: number;
  chemicalType: 'acid' | 'base' | 'neutral' | 'indicator';
  heldBy: 'Left' | 'Right' | null;
  label: string;
}

// Particle system for chemical reactions
const ReactionParticles = ({ position, color, active }: { position: THREE.Vector3, color: string, active: boolean }) => {
  const particlesRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!particlesRef.current || !active) return;
    
    const time = state.clock.getElapsedTime();
    particlesRef.current.children.forEach((particle, index) => {
      const offset = index * 0.1;
      particle.position.y = Math.sin(time * 3 + offset) * 0.5;
      particle.position.x = Math.cos(time * 2 + offset) * 0.3;
      particle.rotation.y += 0.05;
    });
  });

  if (!active) return null;

  return (
    <group ref={particlesRef} position={position}>
      {[...Array(12)].map((_, i) => (
        <mesh key={i} position={[
          (Math.random() - 0.5) * 0.5,
          Math.random() * 0.5,
          (Math.random() - 0.5) * 0.5
        ]}>
          <sphereGeometry args={[0.02]} />
          <meshBasicMaterial color={color} emissive={color} emissiveIntensity={2} />
        </mesh>
      ))}
    </group>
  );
};

// Enhanced Test Tube Component with Glassmorphism
const GlassTestTube = ({ tube, isGrabbed, onGrab }: { 
  tube: TestTube, 
  isGrabbed: boolean, 
  onGrab: () => void 
}) => {
  const tubeRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (!tubeRef.current) return;
    
    // Smooth position and rotation interpolation
    tubeRef.current.position.lerp(tube.position, 0.15);
    tubeRef.current.rotation.x = THREE.MathUtils.lerp(tubeRef.current.rotation.x, tube.rotation.x, 0.15);
    tubeRef.current.rotation.y = THREE.MathUtils.lerp(tubeRef.current.rotation.y, tube.rotation.y, 0.15);
    tubeRef.current.rotation.z = THREE.MathUtils.lerp(tubeRef.current.rotation.z, tube.rotation.z, 0.15);
    
    // Subtle floating animation when not held
    if (!isGrabbed) {
      const time = state.clock.getElapsedTime();
      tubeRef.current.position.y += Math.sin(time * 2 + tube.id.charCodeAt(0)) * 0.001;
    }
  });

  return (
    <group ref={tubeRef} onClick={onGrab}>
      {/* Glass tube with enhanced material */}
      <mesh>
        <cylinderGeometry args={[0.15, 0.15, 2.5, 32]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={0.95}
          thickness={0.5}
          roughness={0.0}
          metalness={0.0}
          clearcoat={1.0}
          clearcoatRoughness={0.0}
          transparent={true}
          opacity={0.15}
          envMapIntensity={2}
        />
      </mesh>
      
      {/* Liquid content with animated surface */}
      {tube.liquidLevel > 0 && (
        <group position={[0, -1.25 + (2.5 * tube.liquidLevel) / 2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.12, 0.12, 2.5 * tube.liquidLevel - 0.1, 32]} />
            <meshStandardMaterial
              color={tube.liquidColor}
              emissive={tube.liquidColor}
              emissiveIntensity={0.3}
              transparent={true}
              opacity={0.8}
              roughness={0.1}
              metalness={0.2}
            />
          </mesh>
          
          {/* Animated liquid surface */}
          <mesh position={[0, (2.5 * tube.liquidLevel - 0.1) / 2, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.02, 32]} />
            <meshBasicMaterial
              color={tube.liquidColor}
              transparent={true}
              opacity={0.6}
            />
          </mesh>
        </group>
      )}
      
      {/* Tube rim */}
      <mesh position={[0, 1.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.02, 16, 32]} />
        <meshStandardMaterial
          color="#e0e0e0"
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      
      {/* Bottom of tube */}
      <mesh position={[0, -1.25, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={0.9}
          thickness={0.3}
          transparent={true}
          opacity={0.2}
        />
      </mesh>
      
      {/* Highlight when grabbed */}
      {isGrabbed && (
        <mesh>
          <cylinderGeometry args={[0.18, 0.18, 2.6, 32]} />
          <meshBasicMaterial
            color="#00ffff"
            transparent={true}
            opacity={0.2}
            wireframe
          />
        </mesh>
      )}
      
      {/* Floating label */}
      <Text
        position={[0, 1.8, 0]}
        fontSize={0.12}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {tube.label}
      </Text>
    </group>
  );
};

// Main Lab Scene
const ChemistryLab = ({ handState }: { handState: React.MutableRefObject<TrackingState> }) => {
  const [testTubes, setTestTubes] = useState<TestTube[]>([
    {
      id: 'tube1',
      position: new THREE.Vector3(-3, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      color: new THREE.Color('#ff6b6b'),
      liquidColor: '#ff6b6b',
      liquidLevel: 0.7,
      chemicalType: 'acid',
      heldBy: null,
      label: 'HCl'
    },
    {
      id: 'tube2',
      position: new THREE.Vector3(-1, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      color: new THREE.Color('#4ecdc4'),
      liquidColor: '#4ecdc4',
      liquidLevel: 0.6,
      chemicalType: 'base',
      heldBy: null,
      label: 'NaOH'
    },
    {
      id: 'tube3',
      position: new THREE.Vector3(1, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      color: new THREE.Color('#45b7d1'),
      liquidColor: '#45b7d1',
      liquidLevel: 0.8,
      chemicalType: 'neutral',
      heldBy: null,
      label: 'H₂O'
    },
    {
      id: 'tube4',
      position: new THREE.Vector3(3, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      color: new THREE.Color('#96ceb4'),
      liquidColor: '#96ceb4',
      liquidLevel: 0.5,
      chemicalType: 'indicator',
      heldBy: null,
      label: 'PH'
    }
  ]);

  const [activeReaction, setActiveReaction] = useState<{ position: THREE.Vector3, color: string } | null>(null);
  const [reactionIntensity, setReactionIntensity] = useState(0);

  useFrame((state, delta) => {
    const hs = handState.current;
    const nextTubes = testTubes.map(tube => ({ ...tube }));
    let changed = false;

    // Hand interaction for grabbing test tubes
    ['Left', 'Right'].forEach((side) => {
      const hand = side === 'Left' ? hs.leftHand : hs.rightHand;
      if (!hand) return;

      const handPos = new THREE.Vector3(
        (0.5 - hand.pinchPosition.x) * 10,
        (0.5 - hand.pinchPosition.y) * 6,
        hand.pinchPosition.z * 2
      );

      nextTubes.forEach(tube => {
        const dist = handPos.distanceTo(tube.position);
        
        if (dist < 1.0 && hand.isPinching && (tube.heldBy === null || tube.heldBy === side)) {
          if (tube.heldBy !== side) changed = true;
          tube.heldBy = side as 'Left' | 'Right';
          tube.position.copy(handPos);
          
          // Add rotation based on hand orientation
          const wrist = hand.landmarks[0];
          const index = hand.landmarks[8];
          const angle = Math.atan2(index.y - wrist.y, index.x - wrist.x);
          tube.rotation.z = -(angle + Math.PI / 2) * 0.5;
        } else if (tube.heldBy === side && !hand.isPinching) {
          tube.heldBy = null;
          tube.position.y = 0; // Snap back to table level
          tube.rotation.set(0, 0, 0);
          changed = true;
        }
      });
    });

    // Check for chemical reactions between tubes
    for (let i = 0; i < nextTubes.length; i++) {
      for (let j = i + 1; j < nextTubes.length; j++) {
        const tube1 = nextTubes[i];
        const tube2 = nextTubes[j];
        const distance = tube1.position.distanceTo(tube2.position);
        
        if (distance < 1.5 && tube1.liquidLevel > 0.1 && tube2.liquidLevel > 0.1) {
          // Trigger chemical reaction
          const reactionPosition = new THREE.Vector3()
            .addVectors(tube1.position, tube2.position)
            .multiplyScalar(0.5);
          
          let reactionColor = '#ffffff';
          
          // Simple reaction logic
          if ((tube1.chemicalType === 'acid' && tube2.chemicalType === 'base') ||
              (tube1.chemicalType === 'base' && tube2.chemicalType === 'acid')) {
            reactionColor = '#ffaa00'; // Orange for neutralization
          } else if (tube1.chemicalType === 'indicator' || tube2.chemicalType === 'indicator') {
            reactionColor = tube1.chemicalType === 'indicator' ? tube2.liquidColor : tube1.liquidColor;
          }
          
          setActiveReaction({ position: reactionPosition, color: reactionColor });
          setReactionIntensity(1);
          
          // Reduce liquid levels
          tube1.liquidLevel = Math.max(0, tube1.liquidLevel - 0.01);
          tube2.liquidLevel = Math.max(0, tube2.liquidLevel - 0.01);
          changed = true;
        }
      }
    }

    // Fade reaction effect
    if (reactionIntensity > 0) {
      setReactionIntensity(prev => Math.max(0, prev - delta * 0.5));
      if (reactionIntensity <= 0.01) {
        setActiveReaction(null);
      }
    }

    if (changed) setTestTubes(nextTubes);
  });

  return (
    <group>
      {/* Glass lab table */}
      <RoundedBox args={[12, 0.2, 6]} position={[0, -2, 0]} radius={0.1}>
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={0.8}
          thickness={0.5}
          roughness={0.0}
          metalness={0.1}
          transparent={true}
          opacity={0.3}
          envMapIntensity={1}
        />
      </RoundedBox>

      {/* Test tubes */}
      {testTubes.map((tube) => (
        <GlassTestTube
          key={tube.id}
          tube={tube}
          isGrabbed={tube.heldBy !== null}
          onGrab={() => console.log(`Grabbed ${tube.label}`)}
        />
      ))}

      {/* Reaction particles */}
      {activeReaction && (
        <ReactionParticles
          position={activeReaction.position}
          color={activeReaction.color}
          active={true}
        />
      )}

      {/* Reaction glow effect */}
      {activeReaction && (
        <mesh position={activeReaction.position}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color={activeReaction.color}
            transparent={true}
            opacity={reactionIntensity * 0.3}
          />
        </mesh>
      )}
    </group>
  );
};

const ChemistryPage: React.FC<ChemistryPageProps> = () => {
  const handTrackerRef = useRef<HandTrackerRef>(null);
  const handStateRef = useRef<TrackingState>({
    leftHand: null,
    rightHand: null,
    gesture: 'none',
    interactionStrength: 0,
  });

  const handleHandUpdate = (newState: TrackingState) => {
    handStateRef.current = newState;
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-teal-900 via-emerald-900 to-green-900 text-white overflow-hidden">
      <HandTracker ref={handTrackerRef} onUpdate={handleHandUpdate} />

      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Canvas
          shadows
          camera={{ position: [0, 2, 10], fov: 50 }}
          gl={{ 
            antialias: true, 
            alpha: false, 
            toneMappingExposure: 1.3,
            powerPreference: "high-performance"
          }}
          dpr={[1, 1.5]}
        >
          <color attach="background" args={['#0a1a1a']} />
          <fog attach="fog" args={['#0a1a1a', 5, 25]} />
          
          <Suspense fallback={null}>
            {/* Enhanced lighting for glassmorphism */}
            <Environment preset="warehouse" background={false} blur={0.8} />
            <ambientLight intensity={0.6} />
            <pointLight position={[-5, 8, 5]} intensity={2} color="#00ffff" />
            <pointLight position={[5, 8, 5]} intensity={2} color="#ff00ff" />
            <pointLight position={[0, -5, 5]} intensity={1.5} color="#ffffff" />
            <spotLight position={[0, 10, 0]} intensity={3} angle={0.5} penumbra={0.3} color="#ffffff" />
            
            <Float speed={0.5} rotationIntensity={0.1} floatIntensity={0.2}>
              <ChemistryLab handState={handStateRef} />
            </Float>
          </Suspense>
        </Canvas>
      </div>

      {/* Glass Control Panel */}
      <div className="absolute top-24 right-8 w-80 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-xl font-bold mb-4 text-emerald-400">EXPERIMENTS</h3>
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <h4 className="font-semibold text-cyan-300 mb-1">Acid-Base Reaction</h4>
            <p className="text-gray-300 text-xs">Mix HCl with NaOH for neutralization</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <h4 className="font-semibold text-pink-300 mb-1">pH Testing</h4>
            <p className="text-gray-300 text-xs">Use indicator to test solutions</p>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <h4 className="font-semibold text-yellow-300 mb-1">Dilution</h4>
            <p className="text-gray-300 text-xs">Mix with water to reduce concentration</p>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <button
        onClick={() => window.history.back()}
        className="absolute top-8 left-8 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-300"
      >
        ← Back
      </button>

      {/* Instructions */}
      <div className="absolute bottom-8 left-8 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 max-w-md">
        <h3 className="text-lg font-bold mb-3 text-emerald-400">CONTROLS</h3>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <span>Pinch to grab test tubes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
            <span>Move hand to position in 3D space</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
            <span>Bring tubes together for reactions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span>Release to place on table</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
          CHEMISTRY LAB
        </h1>
        <p className="text-gray-300 text-sm mt-1">Virtual Chemical Reactions</p>
      </div>
    </div>
  );
};

export default ChemistryPage;
