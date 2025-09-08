'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useWindowManager } from './window-manager';
import { getCenterPosition } from '@/lib/utils';

interface DraggablePopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  appIcon: string;
  message: string;
}

const DraggablePopup: React.FC<DraggablePopupProps> = ({
  isOpen,
  onClose,
  title,
  appIcon,
  message
}) => {
  const [position, setPosition] = useState(() => getCenterPosition(400, 300));
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const { getZIndex, bringToFront } = useWindowManager();
  const windowId = `draggable-popup-${title.toLowerCase().replace(/\s+/g, '-')}`;

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
        <div className="bg-gray-800/95 backdrop-blur-xl rounded-xl border border-gray-600/50 shadow-2xl min-w-[320px] max-w-[400px] select-none">
          {/* Header */}
          <div className="drag-handle flex items-center justify-between p-2 border-b border-gray-600/30" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
              />
              <button className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 transition-colors" />
              <button className="w-3 h-3 bg-green-500 rounded-full hover:bg-green-600 transition-colors" />
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 relative overflow-hidden rounded-md">
                <Image
                  src={appIcon}
                  alt={title}
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="text-white font-medium text-sm">{title}</h3>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              {message}
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600/50 text-gray-300 rounded-md text-sm hover:bg-gray-600/70 transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors">
                {title.includes('Lightroom') ? 'View Catalog' : 'Open Project'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraggablePopup;
