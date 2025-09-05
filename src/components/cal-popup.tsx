'use client';

import React, { useEffect, useState } from 'react';
import Cal, { getCalApi } from "@calcom/embed-react";

interface CalPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const CalPopup: React.FC<CalPopupProps> = ({ isOpen, onClose }) => {
  const [calLoaded, setCalLoaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      (async function () {
        const cal = await getCalApi({"namespace":"30min"});
        cal("ui", {"hideEventTypeDetails":false,"layout":"month_view"});
        setCalLoaded(true);
      })();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Schedule a Meeting</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Cal.com Embed */}
        <div className="h-full pb-16">
          {calLoaded && (
            <Cal 
              namespace="30min"
              calLink="akash-chitragar/30min"
              style={{width:"100%",height:"100%",overflow:"scroll"}}
              config={{"layout":"month_view"}}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CalPopup;
