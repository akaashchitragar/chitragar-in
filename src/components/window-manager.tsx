'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface WindowManagerContextType {
  getZIndex: (windowId: string) => number;
  bringToFront: (windowId: string) => void;
}

const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined);

export const useWindowManager = () => {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error('useWindowManager must be used within a WindowManagerProvider');
  }
  return context;
};

interface WindowManagerProviderProps {
  children: React.ReactNode;
}

export const WindowManagerProvider: React.FC<WindowManagerProviderProps> = ({ children }) => {
  const [windowStack, setWindowStack] = useState<string[]>([]);
  const baseZIndex = 100;

  const getZIndex = useCallback((windowId: string) => {
    const index = windowStack.indexOf(windowId);
    if (index === -1) {
      return baseZIndex;
    }
    return baseZIndex + index;
  }, [windowStack, baseZIndex]);

  const bringToFront = useCallback((windowId: string) => {
    setWindowStack(prev => {
      // Remove the window if it exists
      const filtered = prev.filter(id => id !== windowId);
      // Add it to the end (top of stack)
      return [...filtered, windowId];
    });
  }, []);

  const value = {
    getZIndex,
    bringToFront,
  };

  return (
    <WindowManagerContext.Provider value={value}>
      {children}
    </WindowManagerContext.Provider>
  );
};

export default WindowManagerProvider;
