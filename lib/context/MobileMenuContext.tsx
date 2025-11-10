"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface SidebarContextType {
  isSidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  toggleSidebar: () => void;
  isMobile: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const SIDEBAR_STORAGE_KEY = 'financeguy-sidebar-open';

export function MobileMenuProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default to open
  const [isMobile, setIsMobile] = useState(false);
  const [hasUserToggled, setHasUserToggled] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (storedValue !== null) {
        const parsedValue = storedValue === 'true';
        setIsSidebarOpen(parsedValue);
        setHasUserToggled(true);
      }
    } catch {
      // Ignore storage read errors (e.g., privacy mode)
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // Use lg breakpoint (1024px)
      setIsMobile((prev) => {
        if (prev !== mobile) {
          return mobile;
        }
        return prev;
      });

      if (!hasHydrated) {
        return;
      }

      if (!hasUserToggled) {
        setIsSidebarOpen(mobile ? false : true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [hasHydrated, hasUserToggled]);

  useEffect(() => {
    if (!hasHydrated || typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarOpen));
    } catch {
      // Ignore storage write errors
    }
  }, [hasHydrated, isSidebarOpen]);

  const setSidebarOpenState = useCallback((value: boolean) => {
    setHasUserToggled(true);
    setIsSidebarOpen(value);
  }, []);

  const toggleSidebar = useCallback(() => {
    setHasUserToggled(true); // Mark that user has manually toggled
    setIsSidebarOpen((prev) => !prev);
  }, []);

  return (
    <SidebarContext.Provider value={{ 
      isSidebarOpen, 
      setSidebarOpen: setSidebarOpenState,
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