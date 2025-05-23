"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  isSidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  toggleSidebar: () => void;
  isMobile: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default to open
  const [isMobile, setIsMobile] = useState(false);
  const [hasUserToggled, setHasUserToggled] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // Use lg breakpoint (1024px)
      const wasMobile = isMobile;
      setIsMobile(mobile);
      
      // Only auto-adjust if user hasn't manually toggled, or on device type change
      if (!hasUserToggled || wasMobile !== mobile) {
        if (mobile) {
          setIsSidebarOpen(false); // Close on mobile
        } else {
          setIsSidebarOpen(true); // Open on desktop
        }
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile, hasUserToggled]);

  const toggleSidebar = () => {
    setHasUserToggled(true); // Mark that user has manually toggled
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <SidebarContext.Provider value={{ 
      isSidebarOpen, 
      setSidebarOpen: setIsSidebarOpen,
      toggleSidebar,
      isMobile
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useMobileMenu() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useMobileMenu must be used within a MobileMenuProvider');
  }
  return context;
} 