'use client';

import React, { useState, useEffect } from 'react';
import Dock from './dock';
import DraggablePopup from './draggable-popup';
import InstagramPopup from '@/components/instagram-popup';

const Hero = () => {
  const [isLightroomPopupOpen, setIsLightroomPopupOpen] = useState(false);
  const [isPhotoshopPopupOpen, setIsPhotoshopPopupOpen] = useState(false);
  const [isInstagramPopupOpen, setIsInstagramPopupOpen] = useState(false);

  const handleLightroomClick = () => {
    setIsLightroomPopupOpen(true);
  };

  const handlePhotoshopClick = () => {
    setIsPhotoshopPopupOpen(true);
  };

  const handleInstagramClick = () => {
    setIsInstagramPopupOpen(true);
  };

  // Preload Instagram widget when component mounts
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = '//widgets.sociablekit.com';
    document.head.appendChild(link);

    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://widgets.sociablekit.com';
    document.head.appendChild(preconnect);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(preconnect);
    };
  }, []);

  const handleCloseLightroomPopup = () => {
    setIsLightroomPopupOpen(false);
  };

  const handleClosePhotoshopPopup = () => {
    setIsPhotoshopPopupOpen(false);
  };

  const handleCloseInstagramPopup = () => {
    setIsInstagramPopupOpen(false);
  };

  return (
    <section 
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: 'url(/bg-blur.png)'
      }}
    >
      <Dock 
        onLightroomClick={handleLightroomClick} 
        onPhotoshopClick={handlePhotoshopClick}
        onInstagramClick={handleInstagramClick}
      />
      
      {/* Lightroom Popup */}
      <DraggablePopup
        isOpen={isLightroomPopupOpen}
        onClose={handleCloseLightroomPopup}
        title="Adobe Lightroom Classic"
        appIcon="/icons/photoshop-lightroom-classic.png"
        message="Your photo catalog has been optimized! 2,847 RAW files processed and color-graded. Smart previews generated for faster editing workflow."
      />
      
      {/* Photoshop Popup */}
      <DraggablePopup
        isOpen={isPhotoshopPopupOpen}
        onClose={handleClosePhotoshopPopup}
        title="Adobe Photoshop"
        appIcon="/icons/photoshop.png"
        message="Layer composition complete! 47 layers merged with advanced blending modes. Neural filters applied for enhanced portrait retouching."
      />
      
      {/* Instagram Popup */}
      <InstagramPopup
        isOpen={isInstagramPopupOpen}
        onClose={handleCloseInstagramPopup}
      />
    </section>
  );
};

export default Hero;
