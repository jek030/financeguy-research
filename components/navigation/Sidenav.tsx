"use client";
import NavLinks from '@/components/navigation/NavLinks';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useMobileMenu } from '@/lib/context/MobileMenuContext';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";
import { ProfileMenu } from '@/components/navigation/ProfileMenu';

export default function SideNav() {
  const { isSidebarOpen, toggleSidebar, isMobile } = useMobileMenu();
  const [mounted, setMounted] = useState(false);

  // Desktop collapsed state is when we are not on mobile and sidebar is not open
  const isCollapsed = !isMobile && !isSidebarOpen;

  // Only run on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until client-side
  if (!mounted) {
    return <div className="w-0 h-0" aria-hidden="true" />;
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && (
        <div 
          className={cn(
            "fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity duration-300",
            isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={toggleSidebar}
        />
      )}

      <div 
        className={cn(
          "flex h-full flex-col border-r border-border bg-muted/40 px-2 py-4",
          "z-50 transition-all duration-300 ease-in-out",
          // Width handling
          isCollapsed ? "w-[60px]" : "w-[240px]",
          // Mobile: always fixed positioning
          isMobile && "fixed",
          // Desktop: relative positioning so it takes up layout space
          !isMobile && "relative",
          // Mobile transform when closed
          isMobile && !isSidebarOpen && "-translate-x-full"
        )}
      >
        {/* Toggle button */}
        <div className="flex mb-2">
          <div className="flex items-center justify-center shrink-0 w-[44px]">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleSidebar}
                  >
                    <Bars3Icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isSidebarOpen ? "Close sidebar" : "Open sidebar"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="flex flex-col flex-1">
          <NavLinks isCollapsed={isCollapsed} />
          <div className="flex-1" />

          {/* Profile Menu (replaces Settings, Theme, Auth buttons) */}
          <div className="w-full block mb-1">
             <ProfileMenu isCollapsed={isCollapsed} />
          </div>
        </div>
      </div>
    </>
  );
}
