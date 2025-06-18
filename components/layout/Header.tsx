"use client";
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import SearchForm from "@/components/ui/SearchForm";
import { electrolize } from '@/lib/fonts';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";
import { useMobileMenu } from '@/lib/context/MobileMenuContext';
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface PageHeaderProps {
  title?: string;
  description?: string;
  className?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export default function Header({ title, description, className, actions, children }: PageHeaderProps) {
  const { isSidebarOpen, toggleSidebar } = useMobileMenu();

  return (
    <header className={cn('w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60', className)}>
      <div className="px-2 sm:px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            {!isSidebarOpen && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mr-1 sm:mr-2 h-7 w-7 sm:h-8 sm:w-8"
                      onClick={toggleSidebar}
                    >
                      <Bars3Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Open sidebar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <h1 className={cn("text-sm sm:text-base whitespace-nowrap", electrolize.className)}>{title}</h1>
          </div>
          <div className="flex-1">
            <SearchForm />
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <ThemeToggle />
          </div>
        </div>
        {(description || children) && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {description || children}
          </p>
        )}
      </div>
    </header>
  );
} 