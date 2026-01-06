"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";
import { InfoIcon, TrendingUp, BarChart3, DollarSign, Activity, PieChart, Layers } from 'lucide-react';

interface MetricDisplayProps {
  label: string;
  value: string | number;
  subValue?: string | React.ReactNode;
  tooltip?: string | React.ReactNode;
  className?: string;
  valueClassName?: string;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export function MetricDisplay({
  label,
  value,
  subValue,
  tooltip,
  className,
  valueClassName,
  isLoading = false,
  icon
}: MetricDisplayProps) {
  if (isLoading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-1.5"></div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-14"></div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
        <div className={cn(
          "text-base sm:text-lg font-semibold tabular-nums text-slate-900 dark:text-white",
          valueClassName
        )}>
          {value}
        </div>
        {tooltip && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="inline-flex opacity-60 hover:opacity-100 transition-opacity">
                  <InfoIcon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={5} className="max-w-xs">
                {typeof tooltip === 'string' ? <p className="text-xs">{tooltip}</p> : tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </div>
      {subValue && (
        <div className="mt-0.5">
          {typeof subValue === 'string' ? (
            <div className="text-xs text-slate-400 dark:text-slate-500">{subValue}</div>
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
      "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 sm:gap-6",
      className
    )}>
      {childArray.map((child, index) => (
        <div key={index} className="min-w-0">
          {child}
        </div>
      ))}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function MetricCard({ title, icon, children, className }: MetricCardProps) {
  return (
    <div className={cn(
      "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 sm:p-5",
      className
    )}>
      <div className="flex items-center gap-2 mb-4">
        {icon && (
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {icon}
          </div>
        )}
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

interface MetricGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function MetricGrid({ children, className, columns = 3 }: MetricGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4'
  };

  return (
    <div className={cn(
      "grid gap-4 sm:gap-6",
      gridCols[columns],
      className
    )}>
      {children}
    </div>
  );
}

interface SectionDividerProps {
  className?: string;
}

export function SectionDivider({ className }: SectionDividerProps) {
  return <div className={cn("border-t border-slate-200 dark:border-slate-800", className)} />;
}

// Preset Icons for common metric types
export const MetricIcons = {
  trading: <Activity className="w-4 h-4" />,
  market: <BarChart3 className="w-4 h-4" />,
  money: <DollarSign className="w-4 h-4" />,
  growth: <TrendingUp className="w-4 h-4" />,
  ratio: <PieChart className="w-4 h-4" />,
  float: <Layers className="w-4 h-4" />
};
