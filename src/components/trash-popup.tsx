'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useWindowManager } from './window-manager';
import { getCenterPosition } from '@/lib/utils';

interface TrashPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FeedbackCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

const feedbackCategories: FeedbackCategory[] = [
  { id: 'general', name: 'General', icon: '💬', color: '#6B7280', description: 'General feedback about anything' },
  { id: 'portfolio', name: 'Portfolio', icon: '📸', color: '#3B82F6', description: 'Feedback about photography work' },
  { id: 'website', name: 'Website', icon: '🌐', color: '#10B981', description: 'Feedback about this website' },
  { id: 'collaboration', name: 'Collaboration', icon: '🤝', color: '#8B5CF6', description: 'Interest in working together' },
  { id: 'suggestion', name: 'Suggestion', icon: '💡', color: '#F59E0B', description: 'Ideas for improvement' },
  { id: 'compliment', name: 'Compliment', icon: '❤️', color: '#EF4444', description: 'Positive feedback and praise' },
  { id: 'critique', name: 'Critique', icon: '🎯', color: '#F97316', description: 'Constructive criticism' },
];

const moodEmojis = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😍', label: 'Love it' },
  { emoji: '🤔', label: 'Thinking' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😕', label: 'Concerned' },
  { emoji: '🤩', label: 'Amazed' },
  { emoji: '👍', label: 'Thumbs up' },
  { emoji: '💡', label: 'Idea' },
];

const TrashPopup: React.FC<TrashPopupProps> = ({ isOpen, onClose }) => {
  // Window management
  const [position, setPosition] = useState(() => getCenterPosition(700, 600));
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const { getZIndex, bringToFront } = useWindowManager();
  const windowId = 'trash-popup';

  // Form state
  const [currentStep, setCurrentStep] = useState<'welcome' | 'category' | 'mood' | 'message' | 'submitting' | 'success'>('welcome');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animation states
  const [trashAnimation, setTrashAnimation] = useState<'idle' | 'opening' | 'eating' | 'satisfied'>('idle');

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    bringToFront(windowId);
    
    // Don't start dragging if clicking on close button or other interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'TEXTAREA') {
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

  // Reset form when popup opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('welcome');
    setSelectedCategory('');
    setSelectedMood('');
    setMessage('');
      setTrashAnimation('idle');
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = async () => {
    if (message.trim().length < 10) {
      toast.error('Please write at least 10 characters');
      return;
    }

    setIsSubmitting(true);
    setCurrentStep('submitting');
    setTrashAnimation('eating');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          feedbackType: selectedCategory,
          moodEmoji: selectedMood
        })
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentStep('success');
        setTrashAnimation('satisfied');
        toast.success('Feedback submitted successfully!', {
          description: 'Thank you! Your feedback will be reviewed before being displayed.'
        });
        
        // Auto close after success
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        throw new Error(data.error || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit feedback');
      setCurrentStep('message'); // Go back to message step
      setTrashAnimation('idle');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation functions
  const nextStep = () => {
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('category');
        setTrashAnimation('opening');
        break;
      case 'category':
        if (selectedCategory) setCurrentStep('mood');
        break;
      case 'mood':
        setCurrentStep('message');
        break;
      case 'message':
        handleSubmit();
        break;
    }
  };

  const prevStep = () => {
    switch (currentStep) {
      case 'category':
        setCurrentStep('welcome');
        setTrashAnimation('idle');
        break;
      case 'mood':
        setCurrentStep('category');
        break;
      case 'message':
        setCurrentStep('mood');
        break;
    }
  };

  const getTrashIcon = () => {
    switch (trashAnimation) {
      case 'opening':
        return '🗑️';
      case 'eating':
        return '😋';
      case 'satisfied':
        return '😌';
      default:
        return '🗑️';
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="flex items-center space-x-8 h-full">
            <div className="flex-1 text-center space-y-6">
              <div className="text-8xl">{getTrashIcon()}</div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Throw Your Thoughts Here!</h3>
                <p className="text-gray-600 leading-relaxed">
                  Got feedback, ideas, or just want to say something? 
                  <br />Toss it in the trash - I promise I&apos;ll fish it out and read it! 🎣
                </p>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">What you can share:</h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex items-center space-x-2">
                    <span>📸</span><span>Feedback on my photography work</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>🌐</span><span>Website suggestions or issues</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>🤝</span><span>Collaboration opportunities</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>💡</span><span>Ideas for improvement</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>❤️</span><span>Compliments and encouragement</span>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-green-800 text-sm">
                  ✨ Your feedback is completely anonymous
                </p>
              </div>
            </div>
          </div>
        );

      case 'category':
        return (
          <div className="flex items-start space-x-8 h-full">
            <div className="flex-shrink-0 text-center">
              <div className="text-6xl mb-4">{getTrashIcon()}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">What&apos;s on your mind?</h3>
              <p className="text-gray-600">Pick a category that fits best</p>
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-4">
                {feedbackCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`
                      p-4 rounded-xl border-2 transition-all text-left hover:scale-105 hover:shadow-lg
                      ${selectedCategory === category.id 
                        ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{category.icon}</span>
                      <span className="font-semibold text-gray-800">{category.name}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{category.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'mood':
        return (
          <div className="flex items-center space-x-8 h-full">
            <div className="flex-shrink-0 text-center">
              <div className="text-6xl mb-4">{getTrashIcon()}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">How are you feeling?</h3>
              <p className="text-gray-600">Pick an emoji that matches your mood</p>
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-3">
                {moodEmojis.map((mood) => (
                  <button
                    key={mood.emoji}
                    onClick={() => setSelectedMood(mood.emoji)}
                    className={`
                      p-4 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-lg flex items-center space-x-4 text-left
                      ${selectedMood === mood.emoji 
                        ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                      }
                    `}
                  >
                    <div className="text-3xl">{mood.emoji}</div>
                    <div className="text-base font-medium text-gray-700">{mood.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'message':
        return (
          <div className="flex items-start space-x-8 h-full">
            <div className="flex-shrink-0 text-center">
              <div className="text-6xl mb-4">{getTrashIcon()}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Share your thoughts</h3>
              <p className="text-gray-600">What would you like to tell me?</p>
              
              {/* Show selected options summary */}
              <div className="mt-6 space-y-2 text-sm">
                {selectedCategory && (
                  <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    <span className="text-blue-800">
                      {feedbackCategories.find(c => c.id === selectedCategory)?.icon} {feedbackCategories.find(c => c.id === selectedCategory)?.name}
                    </span>
                  </div>
                )}
                {selectedMood && (
                  <div className="bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
                    <span className="text-yellow-800">{selectedMood} {moodEmojis.find(m => m.emoji === selectedMood)?.label}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your feedback here... Share your thoughts, ideas, suggestions, or just say hello! (minimum 10 characters)"
                className="min-h-[200px] resize-none text-base"
                maxLength={1000}
              />
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{message.length}/1000 characters</span>
                <span className={`font-medium ${message.length >= 10 ? 'text-green-600' : 'text-red-500'}`}>
                  {message.length >= 10 ? '✅ Ready to submit' : '❌ Need at least 10 characters'}
                </span>
              </div>
              
              {/* Tips */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-2">💡 Tips for great feedback:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Be specific about what you liked or didn&apos;t like</li>
                  <li>• Share ideas for improvement or new features</li>
                  <li>• Ask questions about my work or process</li>
                  <li>• Tell me about collaboration opportunities</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'submitting':
        return (
          <div className="text-center space-y-4">
            <div className="text-6xl animate-pulse">{getTrashIcon()}</div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Nom nom nom...</h3>
              <p className="text-gray-600 text-sm">The trash is digesting your feedback!</p>
            </div>
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-4">
            <div className="text-6xl">{getTrashIcon()}</div>
            <div>
              <h3 className="text-lg font-bold text-green-800 mb-2">Feedback Received! 🎉</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Thank you for your feedback! It&apos;s been safely stored and will be reviewed soon.
                <br />
                <span className="text-xs text-gray-500 mt-2 block">This window will close automatically...</span>
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-green-800 text-xs">
                ✨ Your feedback helps make this portfolio better!
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
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
        <div className="bg-white/95 backdrop-blur-xl rounded-xl border border-gray-300/50 shadow-2xl w-[700px] min-h-[600px] flex flex-col overflow-hidden select-none">
          {/* macOS Header */}
          <div className="drag-handle flex items-center justify-between p-2 border-b border-gray-300/30 bg-gradient-to-r from-gray-100 to-gray-200 flex-shrink-0" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
              />
              <button className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 transition-colors" />
              <button className="w-3 h-3 bg-green-500 rounded-full hover:bg-green-600 transition-colors" />
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 relative overflow-hidden rounded-md">
                <Image
                  src="/icons/bin.png"
                  alt="Trash"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-gray-800 font-semibold text-sm">Feedback Trash</h3>
                <p className="text-gray-600 text-xs">Anonymous Feedback Collection</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-8 flex flex-col">
            <div className="flex-1 min-h-0">
              {renderStepContent()}
            </div>

            {/* Navigation */}
            {!['submitting', 'success'].includes(currentStep) && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <Button
                  onClick={prevStep}
                  variant="outline"
                  disabled={currentStep === 'welcome'}
                  className="text-gray-600"
                >
                  ← Back
                </Button>
                
                <div className="flex space-x-1">
                  {['welcome', 'category', 'mood', 'message'].map((step, index) => (
                    <div
                      key={step}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        ['welcome', 'category', 'mood', 'message'].indexOf(currentStep) >= index
                          ? 'bg-blue-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>

                <Button
                  onClick={nextStep}
                  disabled={
                    (currentStep === 'category' && !selectedCategory) ||
                    (currentStep === 'message' && message.trim().length < 10) ||
                    isSubmitting
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {currentStep === 'message' ? 'Submit 🗑️' : 'Next →'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrashPopup;
