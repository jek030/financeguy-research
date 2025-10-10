"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";
import { InfoIcon } from 'lucide-react';

interface MetricDisplayProps {
  label: string;
  value: string | number;
  subValue?: string | React.ReactNode;
  tooltip?: string | React.ReactNode;
  className?: string;
  valueClassName?: string;
  isLoading?: boolean;
}

export function MetricDisplay({
  label,
  value,
  subValue,
  tooltip,
  className,
  valueClassName,
  isLoading = false
}: MetricDisplayProps) {
  if (isLoading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-4 bg-muted rounded w-16 mb-1"></div>
        <div className="h-3 bg-muted rounded w-12"></div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-1">
        <div className={cn("font-medium text-foreground", valueClassName)}>
          {value}
        </div>
        {tooltip && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="inline-flex">
                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={5}>
                {typeof tooltip === 'string' ? <p>{tooltip}</p> : tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {subValue && (
        <div className="mt-1">
          {typeof subValue === 'string' ? (
            <div className="text-xs text-muted-foreground">{subValue}</div>
          ) : (
            subValue
          )}
        </div>
      )}
    </div>
  );
}

interface MetricRowProps {
  children: React.ReactNode;
  className?: string;
}

export function MetricRow({ children, className }: MetricRowProps) {
  const childArray = React.Children.toArray(children).filter(child => 
    React.isValidElement(child) || (typeof child === 'string' && child.trim() !== '')
  );
  
  return (
    <div className={cn(
      "flex items-center gap-3 sm:gap-6 flex-wrap justify-center sm:justify-start",
      className
    )}>
      {childArray.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          {index < childArray.length - 1 && (
            <div className="mx-1 h-5 w-px bg-border self-center hidden sm:block"></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

interface SectionDividerProps {
  className?: string;
}

export function SectionDivider({ className }: SectionDividerProps) {
  return <div className={cn("border-t border-border/40", className)} />;
}
