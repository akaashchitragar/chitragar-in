'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, ArrowLeft, ArrowRight, Star, MessageCircle } from 'lucide-react';
import { useWindowManager } from './window-manager';
import { getCenterPosition } from '@/lib/utils';

interface Feedback {
  id: number;
  message: string;
  feedback_type: string;
  mood_emoji?: string;
  rating?: number;
  created_at: string;
  is_featured: boolean;
}

interface SafariPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to get category info based on feedback_type
const getCategoryInfo = (feedbackType: string) => {
  const categories: Record<string, { name: string; icon_emoji: string; color_hex: string }> = {
    general: { name: 'General', icon_emoji: '💬', color_hex: '#6b7280' },
    portfolio: { name: 'Portfolio', icon_emoji: '🎨', color_hex: '#3b82f6' },
    website: { name: 'Website', icon_emoji: '🌐', color_hex: '#10b981' },
    collaboration: { name: 'Collaboration', icon_emoji: '🤝', color_hex: '#f59e0b' },
    suggestion: { name: 'Suggestion', icon_emoji: '💡', color_hex: '#8b5cf6' },
    compliment: { name: 'Compliment', icon_emoji: '❤️', color_hex: '#ef4444' },
    critique: { name: 'Critique', icon_emoji: '🔍', color_hex: '#f97316' }
  };
  return categories[feedbackType] || categories.general;
};

const SafariPopup: React.FC<SafariPopupProps> = ({ isOpen, onClose }) => {
  // Window management
  const [position, setPosition] = useState(() => getCenterPosition(900, 700));
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const { getZIndex, bringToFront } = useWindowManager();
  const windowId = 'safari-popup';

  // App state
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl] = useState('chitragar.in/feedback');
  const [filterType, setFilterType] = useState<string>('all');

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    bringToFront(windowId);
    
    // Don't start dragging if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'INPUT' || target.tagName === 'SELECT') {
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

  // Load feedbacks when popup opens
  useEffect(() => {
    if (isOpen) {
      loadFeedbacks();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, filterType]);

  const loadFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        limit: '50'
      });
      
      if (filterType !== 'all') {
        params.append('type', filterType);
      }

      const response = await fetch(`/api/feedback?${params}`);
      const data = await response.json();

      if (response.ok) {
        setFeedbacks(data.feedback || []);
      } else {
        setError(data.error || 'Failed to load feedback');
      }
    } catch (err) {
      setError('Failed to load feedback');
      console.error('Error loading feedback:', err);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

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
        <div className="bg-gray-100/95 backdrop-blur-xl rounded-xl border border-gray-300/50 shadow-2xl w-[900px] h-[700px] flex flex-col overflow-hidden select-none">
          {/* Safari Header */}
          <div className="drag-handle flex items-center justify-between p-3 border-b border-gray-300/30 bg-gradient-to-r from-gray-200 to-gray-300 flex-shrink-0" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
              />
              <button className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 transition-colors" />
              <button className="w-3 h-3 bg-green-500 rounded-full hover:bg-green-600 transition-colors" />
            </div>
            
            <div className="flex items-center space-x-2 flex-1 mx-4">
              <div className="flex items-center space-x-1">
                <button 
                  className="p-1.5 rounded-md transition-colors bg-white border border-gray-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled
                  title="Back"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-400" />
                </button>
                <button 
                  className="p-1.5 rounded-md transition-colors bg-white border border-gray-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                  disabled
                  title="Forward"
                >
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
                <button 
                  onClick={loadFeedbacks}
                  className="p-1.5 hover:bg-gray-50 rounded-md transition-colors bg-white border border-gray-300 shadow-sm"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              
              {/* Address Bar */}
              <div className="flex-1 bg-white rounded-md px-3 py-1.5 text-sm text-gray-700 border border-gray-300 shadow-sm">
                🔒 https://{currentUrl}
              </div>
            </div>
            
            <div className="w-16"></div> {/* Spacer for balance */}
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">Community Feedback</h2>
              <span className="text-sm text-gray-500">
                {feedbacks.length} {feedbacks.length === 1 ? 'review' : 'reviews'}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white"
              >
                <option value="all">All Types</option>
                <option value="portfolio">Portfolio</option>
                <option value="website">Website</option>
                <option value="collaboration">Collaboration</option>
                <option value="compliment">Compliments</option>
                <option value="suggestion">Suggestions</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-white">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={loadFeedbacks}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && feedbacks.length === 0 && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No feedback available yet</p>
                </div>
              </div>
            )}

            {!loading && !error && feedbacks.length > 0 && (
              <div className="p-6 space-y-4">
                {feedbacks.map((feedback) => {
                  const categoryInfo = getCategoryInfo(feedback.feedback_type);
                  return (
                    <div
                      key={feedback.id}
                      className={`bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ${
                        feedback.is_featured ? 'ring-2 ring-yellow-200 bg-yellow-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: categoryInfo.color_hex + '20',
                              color: categoryInfo.color_hex
                            }}
                          >
                            {categoryInfo.icon_emoji} {categoryInfo.name}
                          </div>
                          
                          {feedback.mood_emoji && (
                            <span className="text-xl">{feedback.mood_emoji}</span>
                          )}
                          
                          {feedback.is_featured && (
                            <div className="flex items-center space-x-1 text-yellow-600">
                              <Star className="w-4 h-4 fill-current" />
                              <span className="text-xs font-medium">Featured</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-500">
                          {formatDate(feedback.created_at)}
                        </div>
                      </div>

                      <p className="text-gray-800 leading-relaxed mb-4">
                        {feedback.message}
                      </p>

                      {feedback.rating && (
                        <div className="flex items-center space-x-1">
                          {renderStars(feedback.rating)}
                          <span className="text-sm text-gray-600 ml-2">
                            {feedback.rating}/5
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafariPopup;
