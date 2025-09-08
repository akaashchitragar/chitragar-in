'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useWindowManager } from './window-manager';
import { getCenterPosition } from '@/lib/utils';
import { Mail, Copy, Zap, Star } from 'lucide-react';

interface MailPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const MailPopup: React.FC<MailPopupProps> = ({ isOpen, onClose }) => {
  // Window management
  const [position, setPosition] = useState(() => getCenterPosition(450, 500));
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const { getZIndex, bringToFront } = useWindowManager();
  const windowId = 'mail-popup';

  // Form state
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const emailAddress = 'akash@chitragar.in';

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    bringToFront(windowId);
    
    // Don't start dragging if clicking on close button or other interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'INPUT') {
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
      setEmail('');
    }
  }, [isOpen]);

  // Platform detection
  const getPlatform = () => {
    if (typeof window === 'undefined') return 'unknown';
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/android/.test(userAgent)) return 'android';
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/mac/.test(userAgent)) return 'mac';
    if (/win/.test(userAgent)) return 'windows';
    return 'unknown';
  };

  // Handle mail app opening based on platform
  const openMailApp = () => {
    const platform = getPlatform();
    const mailtoLink = `mailto:${emailAddress}`;
    
    switch (platform) {
      case 'android':
      case 'ios':
        // On mobile, try Gmail app first, fallback to default mail
        const gmailLink = `googlegmail://co?to=${emailAddress}`;
        try {
          window.location.href = gmailLink;
          // Fallback to default mail app after a short delay
          setTimeout(() => {
            window.location.href = mailtoLink;
          }, 500);
        } catch {
          window.location.href = mailtoLink;
        }
        break;
      case 'mac':
      case 'windows':
      default:
        // Desktop: open default mail app
        window.location.href = mailtoLink;
        break;
    }
    
    toast.success('Opening mail app...', {
      description: `Composing email to ${emailAddress}`
    });
  };

  // Copy email to clipboard
  const copyEmailToClipboard = () => {
    // Create a temporary input element
    const tempInput = document.createElement('input');
    tempInput.value = emailAddress;
    document.body.appendChild(tempInput);
    
    // Select and copy the text
    tempInput.select();
    tempInput.setSelectionRange(0, 99999); // For mobile devices
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success('Email copied to clipboard!', {
          description: emailAddress,
        });
      } else {
        throw new Error('Copy failed');
      }
    } catch {
      toast.error('Failed to copy email');
    } finally {
      // Clean up - remove the temporary input
      document.body.removeChild(tempInput);
    }
  };

  // Handle newsletter subscription
  const handleSubscribe = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubscribing(true);

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message, {
          description: data.reactivated 
            ? 'Welcome back! Check your email for confirmation.' 
            : 'Check your email for a welcome message.'
        });
        setEmail('');
      } else {
        toast.error(data.error || 'Failed to subscribe');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubscribing(false);
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
        <div className="bg-white/95 backdrop-blur-xl rounded-xl border border-gray-300/50 shadow-2xl w-[450px] flex flex-col overflow-hidden select-none">
          {/* macOS Header */}
          <div className="drag-handle flex items-center justify-between p-2 border-b border-gray-300/30 bg-gradient-to-r from-blue-100 to-blue-200 flex-shrink-0" style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
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
                  src="/icons/mail.png"
                  alt="Mail"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-gray-800 font-semibold text-sm">Mail</h3>
                <p className="text-gray-600 text-xs">Contact & Newsletter</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Newsletter Subscription */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">Monthly Newsletter</h4>
                  <p className="text-sm text-gray-600">Get updates about my latest photography work</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleSubscribe()}
                />
                <Button
                  onClick={handleSubscribe}
                  disabled={isSubscribing || !email.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                >
                  {isSubscribing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Subscribe'
                  )}
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 flex items-center space-x-2">
                <div className="w-6 h-6 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-3 h-3 text-yellow-600" />
                </div>
                <span>Quick Actions</span>
              </h4>
              
              <div className="space-y-2">
                {/* Copy Email */}
                <button
                  onClick={copyEmailToClipboard}
                  className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center group-hover:bg-gray-600 transition-colors">
                      <Copy className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Copy Email Address</div>
                      <div className="text-sm text-gray-500">{emailAddress}</div>
                    </div>
                  </div>
                </button>

                {/* Open Mail App */}
                <button
                  onClick={openMailApp}
                  className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Open Mail App</div>
                      <div className="text-sm text-gray-500">Compose a new email</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-green-800 text-xs text-center flex items-center justify-center space-x-1">
                <Star className="w-3 h-3 text-green-600" />
                <span>I typically respond within 24 hours</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MailPopup;
