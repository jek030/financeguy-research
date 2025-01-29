import { ReactNode } from 'react';
import { cn } from '@/components/lib/utils';
import SearchForm from '@/components/ui/SearchForm';

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
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <h1 className="text-base font-bold whitespace-nowrap">{title}</h1>
          <div className="flex-1 w-full sm:max-w-2xl">
            <SearchForm />
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
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