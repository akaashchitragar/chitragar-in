'use client';

import React, { useEffect, useState, useRef } from 'react';
import Cal, { getCalApi } from "@calcom/embed-react";
import { useWindowManager } from './window-manager';
import { getCenterPosition } from '@/lib/utils';

interface CalPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const CalPopup: React.FC<CalPopupProps> = ({ isOpen, onClose }) => {
  const [calLoaded, setCalLoaded] = useState(false);
  const [position, setPosition] = useState(() => getCenterPosition(800, 600));
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const { getZIndex, bringToFront } = useWindowManager();
  const windowId = 'cal-popup';

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
    if (isOpen) {
      setIsLoading(true);
      (async function () {
        const cal = await getCalApi({"namespace":"30min"});
        cal("ui", {
          "hideEventTypeDetails": false,
          "layout": "month_view",
          "theme": "dark",
          "styles": {
            "branding": {"brandColor": "#059669"}
          }
        });
        setCalLoaded(true);
        setIsLoading(false);
      })();
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
      // Small delay to ensure DOM is ready before animating
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      // Keep rendered during close animation
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
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl border border-gray-600/50 shadow-2xl w-[800px] h-[600px] flex flex-col overflow-hidden select-none">
          {/* Header */}
          <div className="drag-handle flex items-center justify-between p-2 border-b border-gray-600/30 bg-gradient-to-r from-green-600 to-emerald-600 flex-shrink-0" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
              />
              <button className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 transition-colors" />
              <button className="w-3 h-3 bg-green-500 rounded-full hover:bg-green-600 transition-colors" />
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 relative overflow-hidden rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Schedule a Meeting</h3>
                <p className="text-white/70 text-xs">Cal.com - Book with Akash</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-gray-800 overflow-hidden relative">
            {/* Loading Spinner */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-10">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-300 text-sm">Loading calendar...</p>
                </div>
              </div>
            )}
            
            {/* Cal.com Embed */}
            {calLoaded && (
              <div className="w-full h-full">
                <Cal 
                  namespace="30min"
                  calLink="akash-chitragar/30min"
                  style={{width:"100%",height:"100%",overflow:"hidden"}}
                  config={{"layout":"month_view","theme":"dark"}}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalPopup;
