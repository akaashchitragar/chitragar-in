'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import CalPopup from './cal-popup';
import TrashPopup from './trash-popup';
import MailPopup from './mail-popup';
import SafariPopup from './safari-popup';

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
  onPhotosClick?: () => void;
}

const Dock: React.FC<DockProps> = ({ onLightroomClick, onPhotoshopClick, onInstagramClick, onNotesClick, onPhotosClick }) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showCalPopup, setShowCalPopup] = useState(false);
  const [showTrashPopup, setShowTrashPopup] = useState(false);
  const [showMailPopup, setShowMailPopup] = useState(false);
  const [showSafariPopup, setShowSafariPopup] = useState(false);

  const handleItemClick = (item: DockItem) => {
    if (item.id === 'lightroom' && onLightroomClick) {
      onLightroomClick();
    } else if (item.id === 'photoshop' && onPhotoshopClick) {
      onPhotoshopClick();
    } else if (item.id === 'instagram' && onInstagramClick) {
      onInstagramClick();
    } else if (item.id === 'facetime') {
      // Open Cal.com popup
      setShowCalPopup(true);
    } else if (item.id === 'safari') {
      // Open Safari popup with approved feedbacks
      setShowSafariPopup(true);
    } else if (item.id === 'notes' && onNotesClick) {
      onNotesClick();
    } else if (item.id === 'photos' && onPhotosClick) {
      onPhotosClick();
    } else if (item.id === 'mail') {
      // Open mail popup
      setShowMailPopup(true);
    } else if (item.id === 'trash') {
      // Open feedback trash popup
      setShowTrashPopup(true);
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
              onClick={() => handleItemClick(item)}
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
              {isHovered && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gray-800/90 text-white text-xs rounded-md whitespace-nowrap backdrop-blur-sm">
                  {item.name}
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
      
      {/* Trash Feedback Popup */}
      <TrashPopup 
        isOpen={showTrashPopup} 
        onClose={() => setShowTrashPopup(false)} 
      />
      
      {/* Mail Popup */}
      <MailPopup 
        isOpen={showMailPopup} 
        onClose={() => setShowMailPopup(false)} 
      />
      
      {/* Safari Popup */}
      <SafariPopup 
        isOpen={showSafariPopup} 
        onClose={() => setShowSafariPopup(false)} 
      />
    </>
  );
};

export default Dock;
