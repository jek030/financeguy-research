"use client";
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import SearchForm from '@/components/ui/SearchForm';
import { electrolize } from '@/lib/fonts';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { useMobileMenu } from '@/lib/context/MobileMenuContext';
import { useAuth } from '@/lib/context/auth-context';
import Link from 'next/link';

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
  const { user, signOut } = useAuth();

  if (loading) {
    return (
      <header className={cn('w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60', className)}>
        <div className="px-4 py-3">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
            <div className="h-2 bg-muted rounded w-3/4 mx-auto"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={cn('w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60', className)}>
      <div className="px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center w-full sm:w-auto">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="mr-2 h-8 w-8"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <XMarkIcon className="h-5 w-5" />
                ) : (
                  <Bars3Icon className="h-5 w-5" />
                )}
              </Button>
            )}
            <h1 className={cn("text-base whitespace-nowrap", electrolize.className)}>{title}</h1>
          </div>
          <div className="flex-1 w-full sm:max-w-2xl mx-4">
            <SearchForm />
          </div>
          <div className="flex items-center ml-auto gap-2">
            {user ? (
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        </div>
        {(description || children) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {description || children}
          </p>
        )}
      </div>
    </header>
  );
} 