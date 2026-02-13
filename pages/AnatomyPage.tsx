import React, { useRef, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float, useGLTF, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { TrackingState } from '../types';
import HandTracker, { HandTrackerRef } from '../components/HandTracker';

interface AnatomyPageProps {}

// Heart Model Component with Advanced Interactions
const HeartModel = ({ handState }: { handState: React.MutableRefObject<TrackingState> }) => {
  const heartRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/heart.glb');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  
  // Anatomy regions data
  const anatomyRegions = [
    { id: 'left-ventricle', name: 'Left Ventricle', position: new THREE.Vector3(-0.5, -0.3, 0.2), color: '#ff6b6b' },
    { id: 'right-ventricle', name: 'Right Ventricle', position: new THREE.Vector3(0.5, -0.3, 0.2), color: '#4ecdc4' },
    { id: 'left-atrium', name: 'Left Atrium', position: new THREE.Vector3(-0.3, 0.3, 0.1), color: '#45b7d1' },
    { id: 'right-atrium', name: 'Right Atrium', position: new THREE.Vector3(0.3, 0.3, 0.1), color: '#96ceb4' },
    { id: 'aorta', name: 'Aorta', position: new THREE.Vector3(0, 0.8, 0), color: '#ffeaa7' },
  ];

  useFrame((state, delta) => {
    if (!heartRef.current) return;

    const hs = handState.current;
    const time = state.clock.getElapsedTime();

    // Heartbeat animation
    const beat = 1 + Math.sin(time * 3) * 0.02 + Math.sin(time * 6) * 0.01;
    
    // Single-hand rotation control
    if (hs.gesture === 'rotate' && (hs.leftHand || hs.rightHand)) {
      const activeHand = hs.leftHand || hs.rightHand;
      if (activeHand) {
        const targetRotationY = (activeHand.palmPosition.x - 0.5) * Math.PI * 2;
        const targetRotationX = (activeHand.palmPosition.y - 0.5) * Math.PI;
        
        heartRef.current.rotation.y = THREE.MathUtils.lerp(heartRef.current.rotation.y, targetRotationY, 0.05);
        heartRef.current.rotation.x = THREE.MathUtils.lerp(heartRef.current.rotation.x, targetRotationX, 0.05);
      }
    }

    // Two-hand zoom control
    if (hs.gesture === 'zoom' && hs.leftHand && hs.rightHand) {
      const distance = hs.leftHand.palmPosition.distanceTo(hs.rightHand.palmPosition);
      const targetScale = 0.5 + (distance * 2); // Base scale + zoom factor
      const clampedScale = THREE.MathUtils.clamp(targetScale, 0.3, 2.0);
      heartRef.current.scale.setScalar(clampedScale);
    } else {
      // Apply heartbeat scale
      const currentScale = heartRef.current.scale.x;
      heartRef.current.scale.setScalar(currentScale * beat);
    }

    // Pinch to grab and reposition
    if (hs.gesture === 'pinch_drag' && (hs.leftHand || hs.rightHand)) {
      const activeHand = hs.leftHand || hs.rightHand;
      if (activeHand) {
        const targetX = (0.5 - activeHand.pinchPosition.x) * 8;
        const targetY = (0.5 - activeHand.pinchPosition.y) * 6;
        const targetZ = activeHand.pinchPosition.z * 3;
        
        heartRef.current.position.lerp(
          new THREE.Vector3(targetX, targetY, targetZ), 
          0.1
        );
      }
    }

    // Check proximity to anatomy regions
    anatomyRegions.forEach(region => {
      const worldPosition = region.position.clone().applyMatrix4(heartRef.current.matrixWorld);
      
      const activeHand = hs.leftHand || hs.rightHand;
      if (activeHand) {
        const handPosition = new THREE.Vector3(
          (0.5 - activeHand.pinchPosition.x) * 8,
          (0.5 - activeHand.pinchPosition.y) * 6,
          activeHand.pinchPosition.z * 3
        );
        const distance = handPosition.distanceTo(worldPosition);
        
        if (distance < 1.5) {
          setHoveredRegion(region.id);
          if (activeHand.isPinching) {
            setSelectedRegion(region.id);
          }
        }
      }
    });
  });

  return (
    <group ref={heartRef}>
      {/* Main Heart Model */}
      <primitive object={scene.clone()} scale={0.5} />
      
      {/* Anatomy Region Highlighters */}
      {anatomyRegions.map(region => (
        <group key={region.id} position={region.position}>
          {/* Highlight when hovered */}
          {hoveredRegion === region.id && (
            <mesh>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshBasicMaterial 
                color={region.color} 
                transparent 
                opacity={0.3}
              />
            </mesh>
          )}
          
          {/* Floating Labels */}
          <Text
            position={[0, 0.5, 0]}
            fontSize={0.15}
            color={hoveredRegion === region.id ? region.color : '#ffffff'}
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {region.name}
          </Text>
        </group>
      ))}
      
      {/* Glow effect when region is selected */}
      {selectedRegion && (
        <mesh>
          <sphereGeometry args={[1.5, 32, 32]} />
          <meshBasicMaterial 
            color="#00ffff" 
            transparent 
            opacity={0.1}
          />
        </mesh>
      )}
    </group>
  );
};

// UI Panel for Selected Anatomy Info
const InfoPanel = ({ selectedRegion }: { selectedRegion: string | null }) => {
  const regionInfo = {
    'left-ventricle': {
      title: 'Left Ventricle',
      description: 'Pumps oxygenated blood to the body through the aorta.',
      function: 'Systemic Circulation',
      facts: 'Largest and strongest chamber of the heart.'
    },
    'right-ventricle': {
      title: 'Right Ventricle',
      description: 'Pumps deoxygenated blood to the lungs.',
      function: 'Pulmonary Circulation',
      facts: 'Thinner walls than left ventricle.'
    },
    'left-atrium': {
      title: 'Left Atrium',
      description: 'Receives oxygenated blood from the lungs.',
      function: 'Receiving Chamber',
      facts: 'Contains the mitral valve.'
    },
    'right-atrium': {
      title: 'Right Atrium',
      description: 'Receives deoxygenated blood from the body.',
      function: 'Receiving Chamber',
      facts: 'Contains the tricuspid valve.'
    },
    'aorta': {
      title: 'Aorta',
      description: 'Largest artery that carries blood from heart to body.',
      function: 'Main Artery',
      facts: 'Can be over 1 inch in diameter.'
    }
  };

  const info = selectedRegion ? regionInfo[selectedRegion as keyof typeof regionInfo] : null;

  return (
    <div className={`absolute top-24 right-8 w-80 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 transition-all duration-500 ${selectedRegion ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
      {info && (
        <>
          <h3 className="text-xl font-bold mb-3 text-cyan-400">{info.title}</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-400">Function:</span>
              <p className="text-white mt-1">{info.function}</p>
            </div>
            <div>
              <span className="text-gray-400">Description:</span>
              <p className="text-white mt-1">{info.description}</p>
            </div>
            <div>
              <span className="text-gray-400">Quick Fact:</span>
              <p className="text-cyan-300 mt-1">{info.facts}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const AnatomyPage: React.FC<AnatomyPageProps> = () => {
  const handTrackerRef = useRef<HandTrackerRef>(null);
  const handStateRef = useRef<TrackingState>({
    leftHand: null,
    rightHand: null,
    gesture: 'none',
    interactionStrength: 0,
  });
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const handleHandUpdate = (newState: TrackingState) => {
    handStateRef.current = newState;
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-hidden">
      <HandTracker ref={handTrackerRef} onUpdate={handleHandUpdate} />

      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Canvas
          shadows
          camera={{ position: [0, 0, 8], fov: 45 }}
          gl={{ 
            antialias: true, 
            alpha: false, 
            toneMappingExposure: 1.2,
            powerPreference: "high-performance"
          }}
          dpr={[1, 1.5]}
        >
          <color attach="background" args={['#0a0a0a']} />
          <fog attach="fog" args={['#0a0a0a', 5, 20]} />
          
          <Suspense fallback={null}>
            {/* Medical-style ambient lighting */}
            <Environment preset="studio" background={false} blur={0.5} />
            <ambientLight intensity={0.4} />
            <spotLight position={[5, 8, 5]} intensity={1.5} castShadow angle={0.3} penumbra={0.5} color="#ffffff" />
            <spotLight position={[-5, 8, 5]} intensity={1} castShadow angle={0.3} penumbra={0.5} color="#e3f2fd" />
            <pointLight position={[0, -5, 5]} intensity={0.5} color="#fce4ec" />
            
            <Float speed={1} rotationIntensity={0.05} floatIntensity={0.1}>
              <HeartModel handState={handStateRef} />
            </Float>
          </Suspense>

          <OrbitControls 
            enableZoom={false} 
            enablePan={false}
            enableRotate={false} // Disabled since we use hand gestures
            dampingFactor={0.05}
          />
        </Canvas>
      </div>

      {/* UI Elements */}
      <InfoPanel selectedRegion={selectedRegion} />

      {/* Back Button */}
      <button
        onClick={() => window.history.back()}
        className="absolute top-8 left-8 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-300"
      >
        ← Back
      </button>

      {/* Instructions */}
      <div className="absolute bottom-8 left-8 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 max-w-md">
        <h3 className="text-lg font-bold mb-3 text-cyan-400">CONTROLS</h3>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
            <span>Single hand movement to rotate heart</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span>Two hands distance to zoom in/out</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
            <span>Pinch to grab and reposition</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span>Hover near regions for highlighting</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          ANATOMY LAB
        </h1>
        <p className="text-gray-400 text-sm mt-1">Interactive 3D Heart Model</p>
      </div>
    </div>
  );
};

export default AnatomyPage;
