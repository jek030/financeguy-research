"use client";

import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceIndicatorProps {
  value: number | string;
  isPositive: boolean;
  showArrow?: boolean;
  showSign?: boolean;
  prefix?: string;
  suffix?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export function PriceIndicator({
  value,
  isPositive,
  showArrow = false,
  showSign = false,
  prefix = '',
  suffix = '',
  size = 'md',
  className,
  children
}: PriceIndicatorProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  const arrowSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  const baseClasses = cn(
    "inline-flex items-center gap-1 rounded-md font-medium border",
    sizeClasses[size],
    isPositive 
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-800" 
      : "bg-rose-500/10 text-rose-600 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-800",
    className
  );

  const formatValue = () => {
    let formattedValue = String(value);
    
    if (showSign && typeof value === 'number') {
      formattedValue = `${value >= 0 ? '+' : ''}${value}`;
    }
    
    return `${prefix}${formattedValue}${suffix}`;
  };

  return (
    <div className={baseClasses}>
      {showArrow && (
        isPositive ? (
          <ArrowUp className={arrowSizes[size]} />
        ) : (
          <ArrowDown className={arrowSizes[size]} />
        )
      )}
      {children || formatValue()}
    </div>
  );
}

// Convenience components for common use cases
export function PriceChange({ 
  value, 
  showArrow = true, 
  size = 'md',
  className 
}: { 
  value: number; 
  showArrow?: boolean; 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <PriceIndicator
      value={Math.abs(value).toFixed(2)}
      isPositive={value >= 0}
      showArrow={showArrow}
      prefix="$"
      size={size}
      className={className}
    />
  );
}

export function PercentageChange({ 
  value, 
  showSign = true, 
  size = 'md',
  className 
}: { 
  value: number; 
  showSign?: boolean; 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <PriceIndicator
      value={value.toFixed(2)}
      isPositive={value >= 0}
      showSign={showSign}
      suffix="%"
      size={size}
      className={className}
    />
  );
}

export function StatusIndicator({ 
  isPositive, 
  positiveText = 'Above', 
  negativeText = 'Below',
  size = 'sm',
  className 
}: { 
  isPositive: boolean; 
  positiveText?: string; 
  negativeText?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <PriceIndicator
      value={isPositive ? positiveText : negativeText}
      isPositive={isPositive}
      size={size}
      className={className}
    />
  );
}
