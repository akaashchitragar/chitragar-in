'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useWindowManager } from './window-manager';

interface InstagramPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstagramPopup: React.FC<InstagramPopupProps> = ({ isOpen, onClose }) => {
  const [position, setPosition] = useState({ x: 150, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const popupRef = useRef<HTMLDivElement>(null);
  const { getZIndex, bringToFront } = useWindowManager();
  const windowId = 'instagram-popup';

  const handleMouseDown = (e: React.MouseEvent) => {
    // Bring window to front when clicked
    bringToFront(windowId);
    
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: getZIndex(windowId) }}>
      <div
        ref={popupRef}
        className="absolute pointer-events-auto"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl border border-gray-600/50 shadow-2xl w-[400px] h-[700px] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="drag-handle flex items-center justify-between p-4 border-b border-gray-600/30 bg-gradient-to-r from-purple-600 to-pink-600 flex-shrink-0">
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
              />
              <button className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 transition-colors" />
              <button className="w-3 h-3 bg-green-500 rounded-full hover:bg-green-600 transition-colors" />
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 relative overflow-hidden rounded-full">
                <Image
                  src="/icons/insta.png"
                  alt="Instagram"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">@lenzofsky</h3>
                <p className="text-white/70 text-xs">Instagram Profile</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white overflow-hidden relative">
            {/* Loading Spinner */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-600 text-sm">Loading Instagram feed...</p>
                </div>
              </div>
            )}
            
            <iframe
              src="https://widgets.sociablekit.com/instagram-feed/iframe/25596083"
              width="100%"
              height="100%"
              frameBorder="0"
              className="w-full h-full block"
              title="Instagram Feed - @lenzofsky"
              onLoad={handleIframeLoad}
              loading="eager"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramPopup;
