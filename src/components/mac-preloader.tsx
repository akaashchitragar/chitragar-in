'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface MacPreloaderProps {
  onComplete: () => void;
}

const MacPreloader: React.FC<MacPreloaderProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [showLogo, setShowLogo] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Show logo after a brief delay
    const logoTimer = setTimeout(() => {
      setShowLogo(true);
    }, 500);

    // Start progress bar after logo appears
    const progressTimer = setTimeout(() => {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            // Start fade out
            setTimeout(() => {
              setFadeOut(true);
              // Complete after fade out
              setTimeout(onComplete, 800);
            }, 300);
            return 100;
          }
          
          // Mac-like progress: slower at start, faster in middle, slower at end
          let increment;
          if (prev < 20) {
            // Slow start
            increment = Math.random() * 3 + 1;
          } else if (prev < 80) {
            // Fast middle
            increment = Math.random() * 8 + 4;
          } else {
            // Slow end
            increment = Math.random() * 2 + 0.5;
          }
          
          return Math.min(prev + increment, 100);
        });
      }, 120);

      return () => clearInterval(interval);
    }, 800);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(progressTimer);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-opacity duration-800 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      {/* Apple Logo */}
      <div className={`mb-8 transition-all duration-1000 ${showLogo ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        <div className="relative w-32 h-32">
          <Image
            src="/sign.png"
            alt="Logo"
            fill
            className="object-contain filter brightness-0 invert"
            priority
          />
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className={`w-80 transition-all duration-1000 delay-500 ${showLogo ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Progress Bar Background - Mac style */}
        <div className="relative w-full h-2 bg-gray-700/60 rounded-full overflow-hidden border border-gray-600/40">
          {/* Progress Bar Fill - Mac style with gradient */}
          <div 
            className="h-full bg-gradient-to-r from-gray-200 via-white to-gray-200 rounded-full transition-all duration-200 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            {/* Inner glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full"></div>
            {/* Animated shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-full animate-pulse"></div>
          </div>
          
          {/* Subtle inner shadow */}
          <div className="absolute inset-0 rounded-full shadow-inner pointer-events-none" style={{
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)'
          }}></div>
        </div>
        
        {/* Loading Text */}
        <div className="text-center mt-6">
          <p className="text-gray-300 text-sm font-light tracking-wide">
            Loading...
          </p>
        </div>
      </div>

      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-radial from-gray-900/10 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};

export default MacPreloader;
