"use client";
import Link from 'next/link';
import NavLinks from '@/components/navigation/NavLinks';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useMobileMenu } from '@/lib/context/MobileMenuContext';
import { useAuth } from '@/lib/context/auth-context';
import { LogIn, LogOut, Settings } from 'lucide-react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";

export default function SideNav() {
  const { isSidebarOpen, toggleSidebar, isMobile } = useMobileMenu();
  const { user, signOut } = useAuth();
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
          
          {/* Authentication Button */}
          {user ? (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/settings" className="w-full block mb-1">
                      <button 
                        className="w-full flex items-center rounded-md bg-muted text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors duration-200 justify-start h-10 px-0"
                      >
                        <div className="flex items-center justify-center shrink-0 w-[44px]">
                          <Settings className="h-4 w-4" />
                        </div>
                        {!isCollapsed && <span className="truncate">Settings</span>}
                      </button>
                    </Link>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent>
                      <p>Settings</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={signOut}
                      className="w-full flex items-center rounded-md bg-muted text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors duration-200 justify-start h-10 px-0"
                    >
                      <div className="flex items-center justify-center shrink-0 w-[44px]">
                        <LogOut className="h-4 w-4" />
                      </div>
                      {!isCollapsed && <span className="truncate">Sign Out</span>}
                    </button>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent>
                      <p>Sign Out</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </>
          ) : (
            <Link href="/login" className="w-full">
               <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className="w-full flex items-center rounded-md bg-muted text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors duration-200 justify-start h-10 px-0"
                    >
                      <div className="flex items-center justify-center shrink-0 w-[44px]">
                        <LogIn className="h-4 w-4" />
                      </div>
                      {!isCollapsed && <span className="truncate">Sign In</span>}
                    </button>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent>
                      <p>Sign In</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
