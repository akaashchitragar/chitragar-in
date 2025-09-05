'use client';

import React, { useState, useEffect } from 'react';
import MacPreloader from './mac-preloader';

interface PreloaderWrapperProps {
  children: React.ReactNode;
}

const PreloaderWrapper: React.FC<PreloaderWrapperProps> = ({ children }) => {
  const [showPreloader, setShowPreloader] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if this is the first visit
    const hasVisited = localStorage.getItem('hasVisited');
    
    if (!hasVisited) {
      // First time visit - show preloader
      setIsFirstVisit(true);
      setShowPreloader(true);
      // Mark as visited after showing preloader
      localStorage.setItem('hasVisited', 'true');
    } else {
      // Not first visit - skip preloader
      setIsFirstVisit(false);
    }
  }, []);

  const handlePreloaderComplete = () => {
    setShowPreloader(false);
  };

  // Still checking first visit status
  if (isFirstVisit === null) {
    return null;
  }

  // Show preloader on first visit
  if (isFirstVisit && showPreloader) {
    return <MacPreloader onComplete={handlePreloaderComplete} />;
  }

  // Show children for subsequent visits or after preloader completes
  return <>{children}</>;
};

export default PreloaderWrapper;
