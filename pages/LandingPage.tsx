import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const experiences = [
    {
      id: 'solar-system',
      title: 'SOLAR SYSTEM',
      description: 'Explore the cosmos with gesture-controlled navigation through planets',
      gradient: 'from-purple-600 via-blue-600 to-cyan-600',
      icon: '🌌',
      route: '/solar-system'
    },
    {
      id: 'anatomy',
      title: 'ANATOMY LAB',
      description: 'Interactive 3D heart model with surgical simulation',
      gradient: 'from-red-600 via-pink-600 to-rose-600',
      icon: '🫀',
      route: '/anatomy'
    },
    {
      id: 'chemistry',
      title: 'CHEMISTRY LAB',
      description: 'Virtual laboratory with interactive chemical reactions',
      gradient: 'from-green-600 via-emerald-600 to-teal-600',
      icon: '🧪',
      route: '/chemistry'
    }
  ];

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
      
      {/* Animated Particles Background */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.5 + 0.2
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-8">
        {/* Title */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-8xl font-bold mb-4 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            TOUCHLESS
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 font-light tracking-wider">
            INTERACTIVE LEARNING EXPERIENCES
          </p>
        </div>

        {/* Experience Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
          {experiences.map((exp, index) => (
            <div
              key={exp.id}
              className="group relative cursor-pointer transform transition-all duration-500 hover:scale-105"
              onClick={() => navigate(exp.route)}
            >
              {/* Card Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${exp.gradient} rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-300`} />
              
              {/* Card Content */}
              <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 h-64 flex flex-col justify-between hover:border-white/20 transition-all duration-300">
                
                {/* Icon and Title */}
                <div>
                  <div className="text-4xl mb-4">{exp.icon}</div>
                  <h2 className="text-2xl font-bold mb-2 tracking-wider">
                    {exp.title}
                  </h2>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-sm leading-relaxed">
                  {exp.description}
                </p>

                {/* Hover Effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Glow Effect */}
              <div className={`absolute -inset-1 bg-gradient-to-r ${exp.gradient} rounded-2xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300 -z-10`} />
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm font-mono">
            CLICK ANY EXPERIENCE TO BEGIN • ENABLE CAMERA FOR HAND TRACKING
          </p>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
      <div className="absolute top-40 right-32 w-3 h-3 bg-purple-400 rounded-full animate-ping animation-delay-2000" />
      <div className="absolute bottom-32 left-40 w-2 h-2 bg-pink-400 rounded-full animate-ping animation-delay-4000" />
    </div>
  );
};

export default LandingPage;
