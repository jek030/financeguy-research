"use client";
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import SearchForm from "@/components/ui/SearchForm";
import { electrolize } from '@/lib/fonts';

import { ThemeToggle } from "@/components/ui/theme-toggle";
import Image from 'next/image';
import Link from 'next/link';

interface PageHeaderProps {
  description?: string;
  className?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export default function Header({ description, className, actions, children }: PageHeaderProps) {

  return (
    <header className={cn('w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60', className)}>
      <div className="px-2 sm:px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/stockF.png" alt="Finance Guy Logo" width={32} height={32} className="rounded" />
              <span className={cn("text-base font-semibold", electrolize.className)}>Finance Guy</span>
            </Link>
          </div>
          <div className="w-[400px]">
            <SearchForm />
          </div>
          <div className="flex-1" />
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