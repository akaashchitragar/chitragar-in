'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import CalPopup from './cal-popup';

interface DockItem {
  id: string;
  name: string;
  icon?: string;
  iconPath?: string;
  isImage?: boolean;
  onClick?: () => void;
}

const dockItems: DockItem[] = [
  { id: 'lightroom', name: 'Adobe Lightroom Classic', iconPath: '/icons/photoshop-lightroom-classic.png', isImage: true },
  { id: 'photoshop', name: 'Adobe Photoshop', iconPath: '/icons/photoshop.png', isImage: true },
  { id: 'facetime', name: 'FaceTime', iconPath: '/icons/facetime.png', isImage: true },
  { id: 'safari', name: 'Safari', iconPath: '/icons/safari.png', isImage: true },
  { id: 'notes', name: 'About Me', iconPath: '/icons/notes.png', isImage: true },
  { id: 'photos', name: 'Photos', iconPath: '/icons/photo.png', isImage: true },
  { id: 'instagram', name: 'Instagram', iconPath: '/icons/insta.png', isImage: true },
  { id: 'mail', name: 'Mail', iconPath: '/icons/mail.png', isImage: true },
  { id: 'trash', name: 'Trash', iconPath: '/icons/bin.png', isImage: true },
];

interface DockProps {
  onLightroomClick?: () => void;
  onPhotoshopClick?: () => void;
  onInstagramClick?: () => void;
  onNotesClick?: () => void;
}

const Dock: React.FC<DockProps> = ({ onLightroomClick, onPhotoshopClick, onInstagramClick, onNotesClick }) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showMailDropdown, setShowMailDropdown] = useState(false);
  const [showCalPopup, setShowCalPopup] = useState(false);
  const mailDropdownRef = useRef<HTMLDivElement>(null);
  const emailAddress = 'akash@chitragar.in';

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
  };

  // Copy email to clipboard - Simple and reliable method
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
        toast.success('Email copied to clipboard', {
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

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mailDropdownRef.current && !mailDropdownRef.current.contains(event.target as Node)) {
        setShowMailDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleItemClick = (item: DockItem, event?: React.MouseEvent) => {
    if (item.id === 'lightroom' && onLightroomClick) {
      onLightroomClick();
    } else if (item.id === 'photoshop' && onPhotoshopClick) {
      onPhotoshopClick();
    } else if (item.id === 'instagram' && onInstagramClick) {
      onInstagramClick();
    } else if (item.id === 'facetime') {
      // Open Cal.com popup
      setShowCalPopup(true);
    } else if (item.id === 'notes' && onNotesClick) {
      onNotesClick();
    } else if (item.id === 'mail') {
      // Default behavior: show dropdown
      event?.preventDefault();
      setShowMailDropdown(!showMailDropdown);
    }
  };


  return (
    <>
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex items-end space-x-1 px-2 py-1 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
          {dockItems.map((item) => {
          const isHovered = hoveredItem === item.id;
          
          return (
            <div
              key={item.id}
              className="relative flex items-center justify-center cursor-pointer w-14 h-14"
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={(event) => handleItemClick(item, event)}
            >
              {item.isImage && item.iconPath ? (
                <div className={`
                  relative overflow-hidden rounded-md transition-all duration-200 ease-out
                  ${isHovered ? 'w-13 h-13' : 'w-11 h-11'}
                `}>
                  <Image
                    src={item.iconPath}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className={`
                  flex items-center justify-center rounded-md bg-gradient-to-br from-gray-100 to-gray-300 transition-all duration-200 ease-out
                  ${isHovered ? 'w-13 h-13' : 'w-11 h-11'}
                `}>
                  <span 
                    className={`
                      select-none transition-all duration-200
                      ${isHovered ? 'text-xl' : 'text-lg'}
                    `}
                  >
                    {item.icon}
                  </span>
                </div>
              )}
              
              {/* Tooltip */}
              {isHovered && !showMailDropdown && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gray-800/90 text-white text-xs rounded-md whitespace-nowrap backdrop-blur-sm">
                  {item.name}
                </div>
              )}

              {/* Mail Dropdown Menu */}
              {item.id === 'mail' && showMailDropdown && (
                <div 
                  ref={mailDropdownRef}
                  className="absolute -top-32 left-0 w-48 bg-white/95 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-2xl overflow-hidden z-60"
                  style={{
                    animation: 'fadeInUp 0.2s ease-out'
                  }}
                >
                  <div className="py-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openMailApp();
                        setShowMailDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 transition-colors duration-150 flex items-center space-x-3"
                    >
                      <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                      </div>
                      <span>Open Mail App</span>
                    </button>
                    
                    <div className="border-t border-gray-200/50 my-1"></div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyEmailToClipboard();
                        setShowMailDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-3"
                    >
                      <div className="w-4 h-4 bg-gray-500 rounded-sm flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                      </div>
                      <div>
                        <div>Copy Email Address</div>
                        <div className="text-xs text-gray-500">{emailAddress}</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
      
      {/* Cal.com Popup */}
      <CalPopup 
        isOpen={showCalPopup} 
        onClose={() => setShowCalPopup(false)} 
      />
    </>
  );
};

export default Dock;
