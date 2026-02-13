import React, { useRef, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float, useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { TrackingState } from '../types';
import HandTracker, { HandTrackerRef } from '../components/HandTracker';

interface AnatomyPageProps {}

// Stitch path point
interface StitchPoint {
  position: THREE.Vector3;
  timestamp: number;
  tension: number;
}

// Surgical Needle Component
const SurgicalNeedle = ({ handState }: { handState: React.MutableRefObject<TrackingState> }) => {
  const needleRef = useRef<THREE.Group>(null);
  const [isActive, setIsActive] = useState(false);
  
  useFrame((state) => {
    if (!needleRef.current) return;
    
    const hs = handState.current;
    
    // Enhanced right hand pinch controls with realistic movement
    if (hs.rightHand && hs.rightHand.isPinching) {
      setIsActive(true);
      
      // Map right hand index fingertip to needle tip position
      const targetX = (0.5 - hs.rightHand.pinchPosition.x) * 8;
      const targetY = (0.5 - hs.rightHand.pinchPosition.y) * 6;
      const targetZ = hs.rightHand.pinchPosition.z * 3;
      
      // Ultra-smooth interpolation with adaptive speed
      const currentPos = needleRef.current.position;
      const distance = currentPos.distanceTo(new THREE.Vector3(targetX, targetY, targetZ));
      const adaptiveSpeed = Math.min(0.3, 0.08 + distance * 0.1); // Slower, more realistic
      
      needleRef.current.position.lerp(
        new THREE.Vector3(targetX, targetY, targetZ), 
        adaptiveSpeed
      );
      
      // Calculate needle orientation based on hand rotation with realistic constraints
      const wrist = hs.rightHand.landmarks[0];
      const index = hs.rightHand.landmarks[8];
      const angle = Math.atan2(index.y - wrist.y, index.x - wrist.x);
      
      const targetRotationZ = -(angle + Math.PI/2);
      // Constrain rotation to realistic surgical angles
      const constrainedRotationZ = THREE.MathUtils.clamp(targetRotationZ, -Math.PI/3, Math.PI/3);
      needleRef.current.rotation.z = THREE.MathUtils.lerp(
        needleRef.current.rotation.z, 
        constrainedRotationZ, 
        0.15 // Slower for more realistic movement
      );
      
      // Reduced surgical tremor for more stability
      const tremorIntensity = 0.0015; // Much smaller tremor
      needleRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 4) * tremorIntensity;
      needleRef.current.rotation.y = Math.cos(state.clock.elapsedTime * 3) * tremorIntensity * 0.5;
      
      // Add subtle hand sway
      const swayAmount = 0.002;
      needleRef.current.position.x += Math.sin(state.clock.elapsedTime * 0.8) * swayAmount;
      needleRef.current.position.y += Math.cos(state.clock.elapsedTime * 1.2) * swayAmount;
    } else {
      setIsActive(false);
      // Smooth return to rest position when not pinching
      const restPosition = new THREE.Vector3(4, 2, 2);
      needleRef.current.position.lerp(restPosition, 0.06); // Slower return
      
      const restRotation = new THREE.Euler(0, Math.PI/4, 0);
      needleRef.current.rotation.x = THREE.MathUtils.lerp(needleRef.current.rotation.x, restRotation.x, 0.08);
      needleRef.current.rotation.y = THREE.MathUtils.lerp(needleRef.current.rotation.y, restRotation.y, 0.08);
      needleRef.current.rotation.z = THREE.MathUtils.lerp(needleRef.current.rotation.z, restRotation.z, 0.08);
    }
  });

  return (
    <group ref={needleRef}>
      {/* Needle shaft */}
      <mesh>
        <cylinderGeometry args={[0.02, 0.02, 2.5, 16]} />
        <meshStandardMaterial 
          color="#c0c0c0" 
          roughness={0.1} 
          metalness={0.9}
          emissive={isActive ? "#00ffff" : "#000000"}
          emissiveIntensity={isActive ? 0.3 : 0}
        />
      </mesh>
      
      {/* Sharp needle tip */}
      <mesh position={[0, -1.25, 0]}>
        <coneGeometry args={[0.02, 0.4, 16]} />
        <meshStandardMaterial 
          color="#e0e0e0" 
          roughness={0.05} 
          metalness={0.95}
        />
      </mesh>
      
      {/* Needle hub/handle */}
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.4, 16]} />
        <meshStandardMaterial 
          color="#ff4444" 
          roughness={0.3} 
          metalness={0.2}
        />
      </mesh>
      
      {/* Activation glow */}
      {isActive && (
        <mesh>
          <cylinderGeometry args={[0.03, 0.03, 2.6, 16]} />
          <meshBasicMaterial 
            color="#00ffff" 
            transparent 
            opacity={0.2} 
          />
        </mesh>
      )}
    </group>
  );
};

// Stitch Path Renderer
const StitchPath = ({ points }: { points: StitchPoint[] }) => {
  const lineRef = useRef<THREE.Line>(null);
  
  useFrame(() => {
    if (!lineRef.current || points.length < 2) return;
    
    // Update line geometry with smooth interpolation
    const positions = new Float32Array(points.length * 3);
    points.forEach((point, i) => {
      positions[i * 3] = point.position.x;
      positions[i * 3 + 1] = point.position.y;
      positions[i * 3 + 2] = point.position.z;
    });
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    lineRef.current.geometry = geometry;
  });

  if (points.length < 2) return null;

  return (
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial 
        color="#ffffff" 
        transparent 
        opacity={0.8}
        linewidth={2}
      />
    </line>
  );
};

// Enhanced Heart Model with Surgical Interactions
const HeartModel = ({ handState, onStitch }: { 
  handState: React.MutableRefObject<TrackingState>, 
  onStitch: (point: THREE.Vector3) => void 
}) => {
  const heartRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/heart.glb');
  const [stitchPoints, setStitchPoints] = useState<StitchPoint[]>([]);
  const [surfaceHighlight, setSurfaceHighlight] = useState<THREE.Vector3 | null>(null);
  
  useFrame((state, delta) => {
    if (!heartRef.current) return;

    const hs = handState.current;
    const time = state.clock.getElapsedTime();

    // Ultra-subtle heartbeat animation with organic feel
    const primaryBeat = Math.sin(time * 2.8) * 0.012;
    const secondaryBeat = Math.sin(time * 5.6) * 0.004;
    const organicVariation = Math.sin(time * 1.4) * 0.002;
    const beat = 1 + primaryBeat + secondaryBeat + organicVariation;
    
    // Default zoomed-in position with fluid movement
    const defaultScale = 1.8;
    let targetScale = defaultScale;
    let targetPosition = new THREE.Vector3(0, 0, 0);
    let targetRotation = new THREE.Euler(0, 0, 0);

    // Right hand pinch - model translation ONLY (no rotation)
    if (hs.rightHand && hs.rightHand.isPinching) {
      const moveX = (0.5 - hs.rightHand.pinchPosition.x) * 4;
      const moveY = (0.5 - hs.rightHand.pinchPosition.y) * 3;
      const moveZ = hs.rightHand.pinchPosition.z * 2;
      
      // Apply smooth easing function
      const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const smoothFactor = easeInOutCubic(Math.min(1, state.clock.elapsedTime * 0.2));
      
      targetPosition.x = THREE.MathUtils.clamp(moveX, -3, 3);
      targetPosition.y = THREE.MathUtils.clamp(moveY, -2, 2);
      targetPosition.z = THREE.MathUtils.clamp(moveZ, -2, 2);
      
      // Add subtle floating motion
      targetPosition.y += Math.sin(time * 2) * 0.05;
    }
    // Left hand pinch - model rotation AND translation
    else if (hs.leftHand && hs.leftHand.isPinching) {
      const moveX = (0.5 - hs.leftHand.pinchPosition.x) * 4;
      const moveY = (0.5 - hs.leftHand.pinchPosition.y) * 3;
      const moveZ = hs.leftHand.pinchPosition.z * 2;
      
      // Apply smooth easing function
      const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const smoothFactor = easeInOutCubic(Math.min(1, state.clock.elapsedTime * 0.2));
      
      targetPosition.x = THREE.MathUtils.clamp(moveX, -3, 3);
      targetPosition.y = THREE.MathUtils.clamp(moveY, -2, 2);
      targetPosition.z = THREE.MathUtils.clamp(moveZ, -2, 2);
      
      // Calculate rotation based on hand rotation
      const wrist = hs.leftHand.landmarks[0];
      const index = hs.leftHand.landmarks[8];
      const angle = Math.atan2(index.y - wrist.y, index.x - wrist.x);
      
      const targetRotationY = (hs.leftHand.palmPosition.x - 0.5) * Math.PI * 1.5;
      const targetRotationX = (hs.leftHand.palmPosition.y - 0.5) * Math.PI * 0.8;
      
      // Smooth rotation with momentum
      targetRotation.y = targetRotationY + Math.sin(time * 1.5) * 0.1;
      targetRotation.x = targetRotationX + Math.cos(time * 2) * 0.05;
      
      // Add subtle floating motion
      targetPosition.y += Math.sin(time * 2) * 0.05;
    }
    // Enhanced two-hand stretch gesture - zoom control
    else if (hs.gesture === 'zoom' && hs.leftHand && hs.rightHand) {
      const distance = hs.leftHand.palmPosition.distanceTo(hs.rightHand.palmPosition);
      const smoothZoom = Math.pow(distance, 1.5) * 3; // Exponential zoom curve
      targetScale = defaultScale + smoothZoom;
      targetScale = THREE.MathUtils.clamp(targetScale, 1.0, 3.5);
      
      // Add gentle breathing effect during zoom
      targetScale += Math.sin(time * 3) * 0.02;
    }
    // Check for fist gesture (closed hand) for slow clockwise rotation
    else if (hs.gesture === 'rotate' && (hs.leftHand || hs.rightHand)) {
      const activeHand = hs.leftHand || hs.rightHand;
      if (activeHand && activeHand.gestureType === 'fist') {
        // Very slow clockwise rotation when fist is detected
        const slowRotationSpeed = 0.3; // Very slow rotation
        targetRotation.z += slowRotationSpeed * delta; // Clockwise (positive direction)
        targetRotation.y = Math.sin(time * 0.5) * 0.1; // Subtle breathing
        targetRotation.x = Math.cos(time * 0.8) * 0.05;
      } else if (activeHand && activeHand.gestureType !== 'fist') {
        // Normal rotation for other gestures
        const targetRotationY = (activeHand.palmPosition.x - 0.5) * Math.PI * 1.5;
        const targetRotationX = (activeHand.palmPosition.y - 0.5) * Math.PI * 0.8;
        
        // Smooth rotation with momentum
        targetRotation.y = targetRotationY + Math.sin(time * 1.5) * 0.1;
        targetRotation.x = targetRotationX + Math.cos(time * 2) * 0.05;
      }
    }

    // Apply ultra-smooth transformations
    const positionLerpSpeed = 0.12; // Slower for more fluidity
    const rotationLerpSpeed = 0.08;
    
    heartRef.current.position.lerp(targetPosition, positionLerpSpeed);
    heartRef.current.rotation.x = THREE.MathUtils.lerp(heartRef.current.rotation.x, targetRotation.x, rotationLerpSpeed);
    heartRef.current.rotation.y = THREE.MathUtils.lerp(heartRef.current.rotation.y, targetRotation.y, rotationLerpSpeed);
    
    // Smooth scale transition with elastic feel
    const currentScale = heartRef.current.scale.x;
    const targetScaleWithBeat = targetScale * beat;
    heartRef.current.scale.setScalar(THREE.MathUtils.lerp(currentScale, targetScaleWithBeat, 0.06));

    // Check needle proximity for surface highlighting
    if (hs.rightHand && hs.rightHand.isPinching) {
      const needlePos = new THREE.Vector3(
        (0.5 - hs.rightHand.pinchPosition.x) * 8,
        (0.5 - hs.rightHand.pinchPosition.y) * 6,
        hs.rightHand.pinchPosition.z * 3
      );
      
      const distance = needlePos.distanceTo(heartRef.current.position);
      if (distance < 2.5) {
        setSurfaceHighlight(needlePos.clone());
        
        // Add stitch point when needle moves
        if (stitchPoints.length === 0 || 
            needlePos.distanceTo(stitchPoints[stitchPoints.length - 1].position) > 0.1) {
          const newStitch: StitchPoint = {
            position: needlePos.clone(),
            timestamp: time,
            tension: 0
          };
          setStitchPoints(prev => [...prev, newStitch]);
          onStitch(needlePos);
        }
      } else {
        setSurfaceHighlight(null);
      }
    }

    // Update stitch tensions (tightening animation)
    setStitchPoints(prev => prev.map(point => ({
      ...point,
      tension: Math.min(1, point.tension + delta * 2)
    })));
  });

  return (
    <group ref={heartRef}>
      {/* Main Heart Model */}
      <primitive object={scene.clone()} scale={1.8} />
      
      {/* Surface highlight when needle is close */}
      {surfaceHighlight && (
        <mesh position={surfaceHighlight}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial 
            color="#00ffff" 
            transparent 
            opacity={0.3}
          />
        </mesh>
      )}
      
      {/* Render stitch path */}
      <StitchPath points={stitchPoints} />
    </group>
  );
};

// Tool State Indicator
const ToolStatePanel = ({ handState }: { handState: React.MutableRefObject<TrackingState> }) => {
  const [toolState, setToolState] = useState<string>('Ready');

  useEffect(() => {
    const hs = handState.current;
    let state = 'Ready';
    
    if (hs.rightHand && hs.rightHand.isPinching) {
      state = 'Needle Active';
    } else if (hs.leftHand && hs.leftHand.isPinching) {
      state = 'Heart Control';
    } else if (hs.gesture === 'zoom' && hs.leftHand && hs.rightHand) {
      state = 'Zoom Mode';
    } else if (hs.gesture === 'rotate' && (hs.leftHand || hs.rightHand)) {
      state = 'Inspection Mode';
    }
    
    setToolState(state);
  }, [handState.current]);

  return (
    <div className="absolute top-24 right-8 w-72 bg-black/80 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${
          toolState === 'Needle Active' ? 'bg-cyan-400 animate-pulse' : 'bg-gray-600'
        }`} />
        <h3 className="text-xl font-bold text-cyan-400">SURGICAL MODE</h3>
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Status:</span>
          <span className={`font-mono font-bold ${
            toolState === 'Needle Active' ? 'text-cyan-300' : 
            toolState === 'Move Mode' ? 'text-green-300' :
            toolState === 'Zoom Mode' ? 'text-yellow-300' :
            toolState === 'Inspection Mode' ? 'text-blue-300' : 'text-gray-300'
          }`}>
            {toolState}
          </span>
        </div>
        
        <div className="border-t border-gray-700 pt-3">
          <h4 className="text-xs text-gray-500 mb-2">CONTROLS</h4>
          <div className="space-y-1 text-xs text-gray-400">
            <div>• Right Pinch: Surgical Needle</div>
            <div>• Left Pinch: Move Heart</div>
            <div>• Open Hand: Rotate Model</div>
            <div>• Two Hands: Zoom In/Out</div>
          </div>
        </div>
      </div>
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

  const handleHandUpdate = (newState: TrackingState) => {
    handStateRef.current = newState;
  };

  const handleStitch = (point: THREE.Vector3) => {
    // Visual/audio feedback for stitch placement
    console.log('Stitch placed at:', point);
    // Could add sound effect here
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white overflow-hidden">
      <HandTracker ref={handTrackerRef} onUpdate={handleHandUpdate} />

      {/* Surgical 3D Canvas */}
      <div className="absolute inset-0">
        <Canvas
          shadows
          camera={{ position: [0, 0, 6], fov: 50 }} // Zoomed-in by default
          gl={{ 
            antialias: true, 
            alpha: false, 
            toneMappingExposure: 1.4,
            powerPreference: "high-performance"
          }}
          dpr={[1, 1.5]}
        >
          <color attach="background" args={['#0f0f0f']} />
          <fog attach="fog" args={['#0f0f0f', 3, 15]} />
          
          <Suspense fallback={null}>
            {/* Enhanced surgical lighting */}
            <ambientLight intensity={0.3} />
            <spotLight 
              position={[5, 10, 5]} 
              intensity={2} 
              castShadow 
              angle={0.4} 
              penumbra={0.3} 
              color="#ffffff" 
            />
            <spotLight 
              position={[-5, 10, 5]} 
              intensity={1.5} 
              castShadow 
              angle={0.4} 
              penumbra={0.3} 
              color="#e3f2fd" 
            />
            <pointLight 
              position={[0, -5, 5]} 
              intensity={0.8} 
              color="#fce4ec" 
              distance={15} 
            />
            
            <Float speed={0.3} rotationIntensity={0.02} floatIntensity={0.05}>
              <HeartModel 
                handState={handStateRef} 
                onStitch={handleStitch}
              />
            </Float>
            
            <SurgicalNeedle handState={handStateRef} />
          </Suspense>
        </Canvas>
      </div>

      {/* UI Elements */}
      <ToolStatePanel handState={handStateRef} />

      {/* Back Button */}
      <button
        onClick={() => window.history.back()}
        className="absolute top-8 left-8 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-300"
      >
        ← Back
      </button>

      {/* Title */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          SURGICAL SIMULATION
        </h1>
        <p className="text-gray-400 text-sm mt-1">Interactive Heart Surgery Training</p>
      </div>

      {/* Surgical Instructions */}
      <div className="absolute bottom-8 left-8 bg-black/70 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-4 max-w-md">
        <h3 className="text-lg font-bold mb-3 text-cyan-400">SURGICAL CONTROLS</h3>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
            <span>Right hand pinch: Surgical needle</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Left hand pinch: Move heart</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>Open hand: Rotate for inspection</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span>Two hands stretch: Zoom in/out</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnatomyPage;
