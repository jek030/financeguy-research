"use client";
import Link from 'next/link';
import NavLinks from '@/components/navigation/NavLinks';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { electrolize } from '@/lib/fonts';
import { useMobileMenu } from '@/lib/context/MobileMenuContext';
import { useAuth } from '@/lib/context/auth-context';
import { LogIn, LogOut } from 'lucide-react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";

export default function SideNav() {
  const { isSidebarOpen, toggleSidebar, isMobile } = useMobileMenu();
  const { user, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);

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
          "w-[240px] z-50 transition-transform duration-300 ease-in-out",
          // Mobile: always fixed positioning
          isMobile && "fixed",
          // Desktop: relative when open, absolute when closed to not take layout space
          !isMobile && isSidebarOpen && "relative",
          !isMobile && !isSidebarOpen && "absolute",
          // Transform when closed
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        {/* Close button when sidebar is open */}
        <div className="flex justify-end mb-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleSidebar}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Close sidebar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Link
          className="mb-4 flex h-16 md:h-20 items-center rounded-md bg-muted px-4 font-medium hover:bg-accent transition-colors duration-200 justify-start gap-2"
          href="/"
        >
          <div className="relative h-12 w-12 md:h-16 md:w-16 flex-shrink-0">
            <Image
              src="/stockF.png"
              alt="Finance Guy Logo"
              fill
              priority={true}
              className="object-contain transform transition-transform duration-200 rounded-md"
            />
          </div>

          <div className={cn(
            "flex flex-col",
            electrolize.className
          )}>
            <span className="text-lg text-foreground whitespace-nowrap">Finance</span>
            <span className="text-lg text-foreground whitespace-nowrap">Guy</span>
          </div>
        </Link>
        
        <div className="flex flex-col flex-1">
          <NavLinks />
          <div className="flex-1" />
          
          {/* Authentication Button */}
          {user ? (
            <button 
              onClick={signOut}
              className="w-full flex items-center rounded-md bg-muted p-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors duration-200 justify-start gap-2"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link href="/login">
              <button 
                className="w-full flex items-center rounded-md bg-muted p-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors duration-200 justify-start gap-2"
              >
                <LogIn className="h-4 w-4 flex-shrink-0" />
                <span>Sign In</span>
              </button>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
