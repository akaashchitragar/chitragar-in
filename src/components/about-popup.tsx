'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useWindowManager } from './window-manager';
import { getCenterPosition } from '@/lib/utils';

interface AboutPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutPopup: React.FC<AboutPopupProps> = ({ isOpen, onClose }) => {
  const [position, setPosition] = useState(() => getCenterPosition(600, 500));
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const { getZIndex, bringToFront } = useWindowManager();
  const windowId = 'about-popup';

  const handleMouseDown = (e: React.MouseEvent) => {
    // Bring window to front when clicked
    bringToFront(windowId);
    
    // Don't start dragging if clicking on close button or other interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    
    if (e.target === popupRef.current || (e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart.x, dragStart.y]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle animation states
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: getZIndex(windowId) }}>
      <div
        ref={popupRef}
        className={`absolute pointer-events-auto ${
          isDragging ? '' : 'transition-all duration-200 ease-out'
        } ${
          isAnimating || isDragging
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 translate-y-2'
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="bg-yellow-50/95 backdrop-blur-xl rounded-xl border border-yellow-200/50 shadow-2xl w-[600px] h-[500px] flex flex-col overflow-hidden select-none">
          {/* Header */}
          <div className="drag-handle flex items-center justify-between p-2 border-b border-yellow-200/30 bg-gradient-to-r from-yellow-400 to-amber-400 flex-shrink-0" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
              />
              <button className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 transition-colors" />
              <button className="w-3 h-3 bg-green-500 rounded-full hover:bg-green-600 transition-colors" />
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 relative overflow-hidden rounded-md bg-white/20 flex items-center justify-center">
                <Image
                  src="/icons/notes.png"
                  alt="Notes"
                  width={16}
                  height={16}
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">About Me</h3>
                <p className="text-white/70 text-xs">Notes - Akash Chitragar</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-yellow-50 overflow-hidden relative">
            <div className="w-full h-full p-6 overflow-y-auto">
              {/* Note Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">NICE TO MEET YOU</h1>
                <p className="text-sm text-gray-500 uppercase tracking-wide">FEW WORDS ABOUT MYSELF</p>
              </div>

              {/* Note Content */}
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p className="text-gray-600 italic">
                  It&apos;s a pleasure to meet you!
                </p>
                
                <p>
                  My name is Akash Chitragar, and I&apos;m a wildlife photographer based in Karnataka, India. Ever since I was 12, I&apos;ve been captivated by the world seen through a lens. Years of dedicated practice and immersive experiences in various Indian wildlife forests have refined my skills, enabling me to capture the stunning beauty and diversity of our natural world.
                </p>
                
                <p>
                  Beyond my passion for wildlife, I also enjoy exploring urban landscapes and sharing my perspective through Instagram. Feel free to experience the rest of my website.
                </p>
                
                <p>
                  I invite you to delve deeper into my portfolio and discover the stories behind each image.
                </p>

                {/* Signature */}
                <div className="mt-8 pt-4 border-t border-yellow-200">
                  <p className="text-sm text-gray-500 italic">
                    — Akash Chitragar
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Wildlife Photographer | Karnataka, India
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPopup;
