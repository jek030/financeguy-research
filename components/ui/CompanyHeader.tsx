"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriceChange, PercentageChange } from '@/components/ui/PriceIndicator';
import { safeFormat } from '@/lib/formatters';
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
    <div className="bg-secondary/60">
      <div className="px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-4">
          {/* Main Header Row */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            {/* Company Info and Price */}
            <div className="flex gap-3 items-start">
              {image && (
                <Image
                  src={image}
                  alt={companyName || 'Company logo'}
                  width={56}
                  height={56}
                  className="rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                {/* Company Name and Price Row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                    {companyName}
                  </h2>
                  
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:block mx-2 h-5 w-px bg-border"></div>
                    <span className="text-xl font-bold">
                      ${typeof quote.price === 'number' ? safeFormat(quote.price) : 'N/A'}
                    </span>
                  </div>
                  
                  {/* Price Changes - Same Line */}
                  {quote?.change && (
                    <div className="flex gap-1.5 flex-wrap items-center">
                      <PriceChange value={quote.change} />
                      <PercentageChange value={quote.changesPercentage || 0} />
                      
                      {/* After Hours Price Change - Same Line */}
                      {aftermarketChange && (
                        <>
                          <div className="text-xs text-muted-foreground self-center px-1">After Hours:</div>
                          <div className="inline-flex items-center rounded-md px-2 py-1 text-sm font-medium border bg-muted/50 text-foreground border-border">
                            ${aftermarketChange.price.toFixed(2)}
                          </div>
                          <PriceChange value={aftermarketChange.change} />
                          <PercentageChange value={aftermarketChange.changePercentage} />
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Symbol and Exchange Info */}
                <div className="text-sm text-muted-foreground mt-2">
                  {symbol} • {exchange || 'N/A'}
                  {quote.timestamp && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="text-xs">Updated: {new Date(quote.timestamp * 1000).toLocaleString()}</span>
                    </>
                  )}
                  {aftermarketChange && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="text-xs">After Hours: {new Date(aftermarketChange.timestamp).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Next Earnings */}
            {nextEarnings && (
              <div className="text-right flex-shrink-0">
                <h3 className="text-xs font-medium text-muted-foreground">Next Earnings</h3>
                <p className="text-sm font-medium">
                  {new Date(nextEarnings).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
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

  const infoItems = [];
  
  if (sector) {
    infoItems.push(
      <div key="sector" className="flex flex-col">
        <Link
          href={`/scans/sectors/${encodeURIComponent(sector)}`}
          className="hover:underline text-blue-600 dark:text-blue-400 font-medium"
        >
          {sector}
        </Link>
        <div className="text-xs text-muted-foreground">Sector</div>
      </div>
    );
  }
  
  if (industry) {
    infoItems.push(
      <div key="industry" className="flex flex-col">
        <Link
          href={`/scans/sectors/${encodeURIComponent(sector || '')}/industry/${encodeURIComponent(industry)}`}
          className="hover:underline text-blue-600 dark:text-blue-400 font-medium"
        >
          {industry}
        </Link>
        <div className="text-xs text-muted-foreground">Industry</div>
      </div>
    );
  }
  
  if (ceo) {
    infoItems.push(
      <div key="ceo" className="flex flex-col">
        <div className="font-medium">{ceo}</div>
        <div className="text-xs text-muted-foreground">CEO</div>
      </div>
    );
  }
  
  if (employees) {
    infoItems.push(
      <div key="employees" className="flex flex-col">
        <div className="font-medium">{employees}</div>
        <div className="text-xs text-muted-foreground">Employees</div>
      </div>
    );
  }
  
  if (city || state) {
    infoItems.push(
      <div key="location" className="flex flex-col">
        <div className="font-medium">
          {city && state ? `${city}, ${state}` : city || state}
        </div>
        <div className="text-xs text-muted-foreground">Location</div>
      </div>
    );
  }
  
  if (website) {
    infoItems.push(
      <div key="website" className="flex flex-col">
        <Link 
          className="hover:underline text-blue-600 dark:text-blue-400 font-medium truncate"
          href={website}
          target="_blank"
          rel="noopener noreferrer"
        >
          {website.replace(/^https?:\/\//, '')}
        </Link>
        <div className="text-xs text-muted-foreground">Website</div>
      </div>
    );
  }

  return (
    <div className="border-t border-border/40 pt-4">
      <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-center sm:justify-start">
        {infoItems.map((item, index) => (
          <React.Fragment key={item.key}>
            {item}
            {index < infoItems.length - 1 && (
              <div className="mx-1 h-5 w-px bg-border self-center hidden sm:block"></div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
