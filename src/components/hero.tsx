'use client';

import React, { useState, useEffect } from 'react';
import Dock from './dock';
import DraggablePopup from './draggable-popup';
import InstagramPopup from '@/components/instagram-popup';
import AboutPopup from '@/components/about-popup';
import PhotosPopup from '@/components/photos-popup';

const Hero = () => {
  const [isLightroomPopupOpen, setIsLightroomPopupOpen] = useState(false);
  const [isPhotoshopPopupOpen, setIsPhotoshopPopupOpen] = useState(false);
  const [isInstagramPopupOpen, setIsInstagramPopupOpen] = useState(false);
  const [isAboutPopupOpen, setIsAboutPopupOpen] = useState(false);
  const [isPhotosPopupOpen, setIsPhotosPopupOpen] = useState(false);
  const [currentLightroomJoke, setCurrentLightroomJoke] = useState('');
  const [currentPhotoshopJoke, setCurrentPhotoshopJoke] = useState('');

  // Dad jokes for Lightroom popup
  const lightroomJokes = [
    "Why don't photographers ever get lost? Because they always know where to focus! 📸",
    "What do you call a photographer who can't take good pictures? A snap-shot! 🤳",
    "Why did the photographer break up with their camera? It wasn't developing properly! 💔",
    "What's a photographer's favorite type of music? Anything with good exposure! 🎵",
    "Why don't cameras ever lie? Because the truth is always in the frame! 🖼️",
    "What did the photographer say when they dropped their camera? That's a lens-tastrophe! 😱",
    "Why are photographers so good at relationships? They know how to capture the moment! ❤️",
    "What do you call a camera that can sing? A Canon! 🎤",
    "Why did the photo go to therapy? It had too many issues with contrast! 🛋️",
    "What's the difference between a photographer and a large pizza? A large pizza can feed a family of four! 🍕"
  ];

  // Dad jokes for Photoshop popup
  const photoshopJokes = [
    "Why did the graphic designer break up with Photoshop? Too many layers in their relationship! 💔",
    "What do you call a Photoshop expert who's also a magician? A pixel wizard! 🧙‍♂️",
    "Why don't designers ever get hungry? They're always working with layers! 🍰",
    "What's a designer's favorite type of coffee? Blend mode! ☕",
    "Why did the designer go to the eye doctor? They had problems with their resolution! 👓",
    "What do you call it when Photoshop crashes? A brush with disaster! 💥",
    "Why are Photoshop tutorials so popular? Because everyone wants to learn the art of deception! 🎭",
    "What did one layer say to another? 'You're really transparent!' 👻",
    "Why don't graphic designers ever win at poker? They always show their layers! 🃏",
    "What's the most honest tool in Photoshop? The truth brush... oh wait, that doesn't exist! 🤥"
  ];

  // Function to get random joke
  const getRandomJoke = (jokes: string[]) => {
    return jokes[Math.floor(Math.random() * jokes.length)];
  };

  const handleLightroomClick = () => {
    setCurrentLightroomJoke(getRandomJoke(lightroomJokes));
    setIsLightroomPopupOpen(true);
  };

  const handlePhotoshopClick = () => {
    setCurrentPhotoshopJoke(getRandomJoke(photoshopJokes));
    setIsPhotoshopPopupOpen(true);
  };

  const handleInstagramClick = () => {
    setIsInstagramPopupOpen(true);
  };

  const handleNotesClick = () => {
    setIsAboutPopupOpen(true);
  };

  const handlePhotosClick = () => {
    setIsPhotosPopupOpen(true);
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

  const handleCloseAboutPopup = () => {
    setIsAboutPopupOpen(false);
  };

  const handleClosePhotosPopup = () => {
    setIsPhotosPopupOpen(false);
  };

  return (
    <section 
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: 'url(/bg-blur.png)'
      }}
    >
      {/* Website Title */}
      <div className="absolute top-8 left-8 z-40">
        <h1 className="text-white text-4xl md:text-5xl font-light tracking-wider drop-shadow-2xl">
          Chitragar.in
        </h1>
        <p className="text-white/80 text-sm md:text-base font-light mt-2 tracking-wide drop-shadow-lg">
          Portfolio & Photography
        </p>
      </div>

      <Dock 
        onLightroomClick={handleLightroomClick} 
        onPhotoshopClick={handlePhotoshopClick}
        onInstagramClick={handleInstagramClick}
        onNotesClick={handleNotesClick}
        onPhotosClick={handlePhotosClick}
      />
      
      {/* Lightroom Popup */}
      <DraggablePopup
        isOpen={isLightroomPopupOpen}
        onClose={handleCloseLightroomPopup}
        title="Adobe Lightroom Classic"
        appIcon="/icons/photoshop-lightroom-classic.png"
        message={currentLightroomJoke}
      />
      
      {/* Photoshop Popup */}
      <DraggablePopup
        isOpen={isPhotoshopPopupOpen}
        onClose={handleClosePhotoshopPopup}
        title="Adobe Photoshop"
        appIcon="/icons/photoshop.png"
        message={currentPhotoshopJoke}
      />
      
      {/* Instagram Popup */}
      <InstagramPopup
        isOpen={isInstagramPopupOpen}
        onClose={handleCloseInstagramPopup}
      />
      
      {/* About Popup */}
      <AboutPopup
        isOpen={isAboutPopupOpen}
        onClose={handleCloseAboutPopup}
      />
      
      {/* Photos Popup */}
      <PhotosPopup
        isOpen={isPhotosPopupOpen}
        onClose={handleClosePhotosPopup}
      />
    </section>
  );
};

export default Hero;
