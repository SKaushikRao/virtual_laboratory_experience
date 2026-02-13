import React from 'react';
import { SCENES } from '../constants';
import { SceneType } from '../types';

interface NavbarProps {
  currentScene: SceneType;
  onSetScene: (scene: SceneType) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentScene, onSetScene }) => {
  return (
    <nav className="fixed top-6 left-0 w-full z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex gap-4 p-2 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
        {SCENES.map((scene) => (
          <button
            key={scene.id}
            onClick={() => onSetScene(scene.id as SceneType)}
            className={`
              relative px-6 py-3 rounded-xl text-[10px] font-mono font-bold tracking-[0.2em] transition-all duration-300 overflow-hidden group
              ${currentScene === scene.id 
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                : 'bg-transparent text-white/50 hover:text-white hover:bg-white/5'}
            `}
          >
            <span className="relative z-10">{scene.label}</span>
            {currentScene === scene.id && (
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-50" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;