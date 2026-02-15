import React, { useRef, Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Float, Environment } from '@react-three/drei';
import { TrackingState } from '../types';
import HandTracker, { HandTrackerRef } from '../components/HandTracker';
import ChemistryLab from '../scenes/ChemistryLab';

interface ChemistryPageProps {}

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
          camera={{ position: [0, 0, 15], fov: 60 }}
          gl={{ 
            antialias: true, 
            alpha: false, 
            toneMappingExposure: 1.3,
            powerPreference: "high-performance"
          }}
          dpr={[1, 1.5]}
        >
          <color attach="background" args={['#1a1a2e']} />
          <fog attach="fog" args={['#1a1a2e', 10, 50]} />
          
          <Suspense fallback={null}>
            {/* Enhanced lighting for glassmorphism */}
            <ambientLight intensity={0.8} />
            <pointLight position={[0, 10, 10]} intensity={3} color="#ffffff" castShadow />
            <pointLight position={[-10, 5, 5]} intensity={2} color="#00ffff" />
            <pointLight position={[10, 5, 5]} intensity={2} color="#ff00ff" />
            <directionalLight position={[0, 10, 5]} intensity={2} castShadow />
            
            <ChemistryLab handState={handStateRef} />
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
