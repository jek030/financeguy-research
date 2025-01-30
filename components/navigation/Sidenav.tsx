"use client";
import Link from 'next/link';
import NavLinks from '@/components/navigation/NavLinks';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function SideNav() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={cn(
        "flex h-full flex-col border-r border-border bg-muted/40 px-2 py-4 transition-all duration-300",
        isHovered ? "w-[240px]" : "w-[80px]"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        className={cn(
          "mb-4 flex h-20 items-center rounded-md bg-muted px-4 font-medium hover:bg-accent transition-colors",
          isHovered ? "justify-start gap-2" : "justify-center"
        )}
        href="/"
      >
        <div className="relative h-16 w-16 flex-shrink-0">
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
          isHovered ? "opacity-100 w-auto" : "opacity-0 w-0"
        )}>
          <span className="text-lg font-bold text-foreground">Finance</span>
          <span className="text-lg font-bold text-foreground">Guy</span>
        </div>
      </Link>
      
      <div className="flex flex-col flex-1">
        <NavLinks collapsed={!isHovered} />
        <div className="flex-1" />
        <form className="mt-auto">
          <button className={cn(
            "w-full flex items-center rounded-md bg-muted p-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
            isHovered ? "justify-start gap-2" : "justify-center"
          )}>
            <div>Sign Out</div>
          </button>
        </form>
      </div>
    </div>
  );
}
