"use client";
import Link from 'next/link';
import NavLinks from '@/components/navigation/NavLinks';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { electrolize } from '@/lib/fonts';
import { useMobileMenu } from '@/lib/context/MobileMenuContext';

export default function SideNav() {
  const { isExpanded, setIsExpanded, isMobile } = useMobileMenu();
  const [isHovered, setIsHovered] = useState(false);

  const showLabels = isMobile ? isExpanded : isHovered;

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isExpanded && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <div 
        className={cn(
          "flex h-full flex-col border-r border-border bg-muted/40 px-2 py-4 transition-all duration-300",
          "fixed md:relative z-50",
          showLabels ? "w-[240px] translate-x-0" : "w-[70px] md:w-[80px]",
          !isExpanded && isMobile && "-translate-x-full md:translate-x-0"
        )}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
      >
        <Link
          className={cn(
            "mb-4 flex h-16 md:h-20 items-center rounded-md bg-muted px-4 font-medium hover:bg-accent transition-colors",
            showLabels ? "justify-start gap-2" : "justify-center"
          )}
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
            "flex flex-col overflow-hidden transition-all duration-300",
            showLabels ? "opacity-100 w-auto" : "opacity-0 w-0",
            electrolize.className
          )}>
            <span className="text-lg text-foreground">Finance</span>
            <span className="text-lg text-foreground">Guy</span>
          </div>
        </Link>
        
        <div className="flex flex-col flex-1">
          <NavLinks collapsed={!showLabels} />
          <div className="flex-1" />
          {/*<form className="mt-auto">
            <button className={cn(
              "w-full flex items-center rounded-md bg-muted p-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              showLabels ? "justify-start gap-2" : "justify-center"
            )}>
              <div>Sign Out</div>
            </button>
          </form>*/}
        </div>
      </div>
    </>
  );
}
