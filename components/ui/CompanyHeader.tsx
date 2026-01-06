"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PriceChange, PercentageChange } from '@/components/ui/PriceIndicator';
import { safeFormat } from '@/lib/formatters';
import { Calendar, MapPin, Globe, Users, Building2, Briefcase } from 'lucide-react';
import type { Ticker } from '@/lib/types';

interface CompanyHeaderProps {
  companyName: string;
  symbol: string;
  exchange: string;
  image?: string;
  quote: Ticker;
  aftermarketChange?: {
    change: number;
    changePercentage: number;
    price: number;
    timestamp: number;
  } | null;
  nextEarnings?: string;
}

export function CompanyHeader({
  companyName,
  symbol,
  exchange,
  image,
  quote,
  aftermarketChange,
  nextEarnings
}: CompanyHeaderProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-800" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.1),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)]" />
      
      <div className="relative px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-4 lg:gap-8">
          {/* Left Section: Company Info */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
            {/* Company Logo */}
            {image && (
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-xl blur-sm opacity-50" />
                <Image
                  src={image}
                  alt={companyName || 'Company logo'}
                  width={64}
                  height={64}
                  className="relative rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shadow-md"
                />
              </div>
            )}
            
            {/* Company Details */}
            <div className="flex-1 min-w-0">
              {/* Company Name & Symbol */}
              <div className="flex flex-col gap-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  {companyName}
                </h1>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{symbol}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-400" />
                  <span>{exchange || 'N/A'}</span>
                  {quote.timestamp && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-400 hidden sm:block" />
                      <span className="text-xs hidden sm:inline">
                        Updated: {new Date(quote.timestamp * 1000).toLocaleString()}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Price Section */}
              <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-3">
                {/* Current Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                    ${typeof quote.price === 'number' ? safeFormat(quote.price) : 'N/A'}
                  </span>
                  
                  {/* Price Changes */}
                  {quote?.change !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <PriceChange value={quote.change} showArrow={true} size="md" />
                      <PercentageChange value={quote.changesPercentage || 0} size="md" />
                    </div>
                  )}
                </div>
                
                {/* After Hours */}
                {aftermarketChange && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      After Hours
                    </span>
                    <span className="text-base font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                      ${aftermarketChange.price.toFixed(2)}
                    </span>
                    <PriceChange value={aftermarketChange.change} showArrow={false} size="sm" />
                    <PercentageChange value={aftermarketChange.changePercentage} size="sm" />
                  </div>
                )}
              </div>
              
              {/* After Hours Timestamp - Mobile */}
              {aftermarketChange && (
                <div className="mt-2 text-xs text-slate-400 dark:text-slate-500 sm:hidden">
                  After Hours: {new Date(aftermarketChange.timestamp).toLocaleString()}
                </div>
              )}
            </div>
          </div>
          
          {/* Right Section: Next Earnings */}
          {nextEarnings && (
            <div className="lg:text-right flex lg:flex-col items-center lg:items-end gap-2 lg:gap-1 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-700/50 mt-2 lg:mt-0">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <Calendar className="w-3.5 h-3.5" />
                <span>Next Earnings</span>
              </div>
              <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                {new Date(nextEarnings).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CompanyInfoSectionProps {
  sector?: string;
  industry?: string;
  ceo?: string;
  employees?: string;
  city?: string;
  state?: string;
  website?: string;
}

export function CompanyInfoSection({
  sector,
  industry,
  ceo,
  employees,
  city,
  state,
  website
}: CompanyInfoSectionProps) {
  const hasAnyInfo = sector || industry || ceo || employees || city || website;
  
  if (!hasAnyInfo) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
      {sector && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <Building2 className="w-3.5 h-3.5" />
            <span>Sector</span>
          </div>
          <Link
            href={`/scans/sectors/${encodeURIComponent(sector)}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline underline-offset-2 transition-colors"
          >
            {sector}
          </Link>
        </div>
      )}
      
      {industry && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Industry</span>
          </div>
          <Link
            href={`/scans/sectors/${encodeURIComponent(sector || '')}/industry/${encodeURIComponent(industry)}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline underline-offset-2 transition-colors line-clamp-2"
          >
            {industry}
          </Link>
        </div>
      )}
      
      {ceo && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <Users className="w-3.5 h-3.5" />
            <span>CEO</span>
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {ceo}
          </span>
        </div>
      )}
      
      {employees && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <Users className="w-3.5 h-3.5" />
            <span>Employees</span>
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 tabular-nums">
            {new Intl.NumberFormat('en-US').format(Number(employees) || 0)}
          </span>
        </div>
      )}
      
      {(city || state) && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <MapPin className="w-3.5 h-3.5" />
            <span>Location</span>
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {city && state ? `${city}, ${state}` : city || state}
          </span>
        </div>
      )}
      
      {website && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <Globe className="w-3.5 h-3.5" />
            <span>Website</span>
          </div>
          <Link 
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline underline-offset-2 transition-colors truncate"
            href={website}
            target="_blank"
            rel="noopener noreferrer"
          >
            {website.replace(/^https?:\/\//, '')}
          </Link>
        </div>
      )}
    </div>
  );
}
