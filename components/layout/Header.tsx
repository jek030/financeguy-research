"use client";
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import SearchForm from '@/components/ui/SearchForm';
import { electrolize } from '@/lib/fonts';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { useMobileMenu } from '@/lib/context/MobileMenuContext';

interface PageHeaderProps {
  title?: string;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  loading?: boolean;
}

export default function Header({ 
  title = 'Welcome to Finance Guy',
  description,
  children,
  actions,
  className,
  loading = false,
}: PageHeaderProps) {
  const { isExpanded, setIsExpanded, isMobile } = useMobileMenu();

  if (loading) {
    return (
      <header className={cn('w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60', className)}>
        <div className="px-2 sm:px-4 py-2">
          <div className="animate-pulse space-y-1">
            <div className="h-3 bg-muted rounded w-1/2 mx-auto"></div>
            <div className="h-2 bg-muted rounded w-3/4 mx-auto"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={cn('w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60', className)}>
      <div className="px-2 sm:px-4 py-2">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <div className="flex items-center w-full sm:w-auto">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="mr-1 sm:mr-2 h-7 w-7 sm:h-8 sm:w-8"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Bars3Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
            )}
            <h1 className={cn("text-sm sm:text-base whitespace-nowrap mr-2 sm:mr-4", electrolize.className)}>{title}</h1>
          </div>
          <div className="w-full sm:w-64 md:w-80 flex-initial">
            <SearchForm />
          </div>
          <div className="flex-1"></div>
          {actions && <div className="flex items-center gap-1 sm:gap-2">{actions}</div>}
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