'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useWindowManager } from './window-manager';
import { getCenterPosition } from '@/lib/utils';

interface InstagramPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstagramPopup: React.FC<InstagramPopupProps> = ({ isOpen, onClose }) => {
  const [position, setPosition] = useState(() => getCenterPosition(500, 600));
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const { getZIndex, bringToFront } = useWindowManager();
  const windowId = 'instagram-popup';

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

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // Reset loading state when popup opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen]);

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
        <div className="bg-background/95 backdrop-blur-xl rounded-xl border border-border shadow-2xl w-[900px] h-[700px] flex flex-col overflow-hidden select-none">
          {/* Header */}
          <div className="drag-handle flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-purple-600 to-pink-600 flex-shrink-0" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
              />
              <button className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 transition-colors" />
              <button className="w-3 h-3 bg-green-500 rounded-full hover:bg-green-600 transition-colors" />
            </div>
            <div className="flex items-center space-x-4 flex-1 justify-center">
              <div className="w-8 h-8 relative overflow-hidden rounded-full ring-2 ring-white/20">
                <Image
                  src="/icons/insta.png"
                  alt="Instagram"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="text-center">
                <h3 className="text-white font-semibold text-base tracking-tight">@lenzofsky</h3>
                <p className="text-white/80 text-sm font-medium">Photography Portfolio</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 bg-white/10 rounded-full px-2 py-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white/90 text-xs font-medium">Live</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-background overflow-hidden relative">
            {/* Loading Spinner */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50/90 to-pink-50/90 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center space-y-6 p-8 bg-card/80 backdrop-blur-md rounded-2xl border border-border shadow-lg">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-muted rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-foreground font-semibold text-lg">Loading Instagram feed</p>
                    <p className="text-muted-foreground text-sm">Fetching latest photography posts...</p>
                    <div className="flex items-center justify-center space-x-1 mt-3">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <iframe
              src="https://widgets.sociablekit.com/instagram-feed/iframe/25596083"
              width="100%"
              height="100%"
              frameBorder="0"
              className="w-full h-full block rounded-b-xl"
              title="Instagram Feed - @lenzofsky Photography Portfolio"
              onLoad={handleIframeLoad}
              loading="eager"
              referrerPolicy="no-referrer-when-downgrade"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramPopup;
