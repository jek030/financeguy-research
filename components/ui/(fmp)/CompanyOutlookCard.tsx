"use client"
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {Building2, Users, DollarSign, PieChart, Activity, ChevronDown, ChevronUp, Calculator, ArrowUp, ArrowDown, InfoIcon} from 'lucide-react';
import { addYears } from 'date-fns';

//UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Financials } from '@/components/ui/(fmp)/Financials';
import { cn } from '@/lib/utils';
import { Skeleton } from "@/components/ui/Skeleton";
import RRCard from '@/components/ui/RRCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";

//FMP Hooks
import { useCompanyOutlook } from '@/hooks/FMP/useCompanyOutlook';
import { calculateRanges } from '@/lib/priceCalculations';
import { safeFormat } from '@/lib/formatters';
import { MovingAverages } from '@/components/ui/(fmp)/MovingAverages';
import { useRSIData } from '@/hooks/FMP/useRSIData';
import { useQuote } from '@/hooks/FMP/useQuote';
import { useFloat } from '@/hooks/FMP/useFloat';
import { useEarnings } from '@/hooks/FMP/useEarnings';
import { useBalanceSheet } from '@/hooks/FMP/useBalanceSheet';
import { useMovingAverageData } from '@/hooks/FMP/useMovingAverage';
import News from '@/components/ui/(fmp)/News';
import KeyMetrics from '@/components/ui/(fmp)/KeyMetrics';
import InsiderActivity from '@/components/ui/(fmp)/InsiderActivity';
import Executives from '@/components/ui/(fmp)/Executives';
import DividendHistory from '@/components/ui/(fmp)/DividendHistory';
import IntradayChart from '@/components/ui/(fmp)/Chart';
import PriceHistoryComponent from '@/components/ui/(fmp)/PriceHistory';
import Earnings from '@/components/ui/(fmp)/Earnings';
import { useDailyPrices } from '@/hooks/FMP/useDailyPrices';

interface CompanyOutlookProps {
  symbol: string;
}

export const CompanyOutlookCard: React.FC<CompanyOutlookProps> = ({ symbol }) => {
  const today = new Date();
  const [fromDate] = useState<Date>(addYears(today, -2));
  const [toDate] = useState<Date>(today);

  /** Quote Data from FMP */
  const { data: quote, isLoading: quoteLoading } = useQuote(symbol);
  
  /** RSI Data from FMP */
  const { data: rsiData, isLoading: rsiLoading } = useRSIData(symbol);
  const rsi = rsiData?.rsi;

  /** Moving Averages Data from FMP */
  const { data: twentyEmaData, isLoading: twentyEmaLoading } = useMovingAverageData(symbol, 'ema', '21', '1day');
  const twentyEma = twentyEmaData && twentyEmaData.length > 0 ? twentyEmaData[0].ma : null;

  /** Float Data from FMP */
  const { data: floatData, isLoading: floatLoading } = useFloat(symbol);

  /** Earnings Data from FMP */
  const { quarterlyData: quarterlyEarnings, annualData: annualEarnings } = useEarnings(symbol);
  
  /** Balance Sheet Data from FMP */
  const { annualData: annualBalanceSheet } = useBalanceSheet(symbol);
  
  /** Price History Data from FMP */
  const { data: priceHistory } = useDailyPrices({
    symbol,
    from: fromDate.toISOString().split('T')[0],
    to: toDate.toISOString().split('T')[0],
  });

  /*Company Outlook Data from FMP*/
  const { data: companyData, isLoading, error } = useCompanyOutlook(symbol);
  
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Calculate 5 and 20 day ranges
  const range5Day = React.useMemo(() => {
    if (!priceHistory || priceHistory.length < 5) return null;
    return calculateRanges(priceHistory, 5);
  }, [priceHistory]);

  const range21Day = React.useMemo(() => {
    if (!priceHistory || priceHistory.length < 21) return null;
    return calculateRanges(priceHistory, 21);
  }, [priceHistory]);

  // Calculate YoY EPS % change for the last quarter
  const lastQuarterEpsChange = React.useMemo(() => {
    if (!quarterlyEarnings || quarterlyEarnings.length < 5) return null;
    
    // Get the most recent quarter
    const latestQuarter = quarterlyEarnings[0];
    
    // Find the same quarter from last year (e.g., Q1 2023 vs Q1 2022)
    const sameQuarterLastYear = quarterlyEarnings.find(q => 
      q.period === latestQuarter.period && 
      new Date(q.date).getFullYear() === new Date(latestQuarter.date).getFullYear() - 1
    );
    
    if (!sameQuarterLastYear) return null;
    
    // Calculate YoY change with handling for zero values
    let epsChange = 0;
    
    if (sameQuarterLastYear.epsdiluted === 0) {
      // If previous EPS was 0, check if current is different
      if (latestQuarter.epsdiluted > 0) {
        epsChange = 100; // Positive infinite change (simplified to 100%)
      } else if (latestQuarter.epsdiluted < 0) {
        epsChange = -100; // Negative change from 0
      } else {
        epsChange = 0; // No change
      }
    } else {
      // Normal calculation
      epsChange = ((latestQuarter.epsdiluted - sameQuarterLastYear.epsdiluted) / 
                    Math.abs(sameQuarterLastYear.epsdiluted)) * 100;
    }
    
    return {
      value: epsChange,
      period: latestQuarter.period,
      year: new Date(latestQuarter.date).getFullYear(),
      current: latestQuarter.epsdiluted,
      previous: sameQuarterLastYear.epsdiluted
    };
  }, [quarterlyEarnings]);

  // Calculate YoY Revenue % change for the last quarter
  const lastQuarterRevenueChange = React.useMemo(() => {
    if (!quarterlyEarnings || quarterlyEarnings.length < 5) return null;
    
    // Get the most recent quarter
    const latestQuarter = quarterlyEarnings[0];
    
    // Find the same quarter from last year (e.g., Q1 2023 vs Q1 2022)
    const sameQuarterLastYear = quarterlyEarnings.find(q => 
      q.period === latestQuarter.period && 
      new Date(q.date).getFullYear() === new Date(latestQuarter.date).getFullYear() - 1
    );
    
    if (!sameQuarterLastYear) return null;
    
    // Calculate YoY change with handling for zero values
    let revenueChange = 0;
    
    if (sameQuarterLastYear.revenue === 0) {
      // If previous revenue was 0, check if current is different
      if (latestQuarter.revenue > 0) {
        revenueChange = 100; // Positive infinite change (simplified to 100%)
      } else if (latestQuarter.revenue < 0) {
        revenueChange = -100; // Negative change from 0
      } else {
        revenueChange = 0; // No change
      }
    } else {
      // Normal calculation
      revenueChange = ((latestQuarter.revenue - sameQuarterLastYear.revenue) / 
                      Math.abs(sameQuarterLastYear.revenue)) * 100;
    }
    
    return {
      value: revenueChange,
      period: latestQuarter.period,
      year: new Date(latestQuarter.date).getFullYear(),
      current: latestQuarter.revenue,
      previous: sameQuarterLastYear.revenue
    };
  }, [quarterlyEarnings]);
  
  // Calculate ROE based on Annual Net Income and Shareholders' Equity
  const calculatedROE = React.useMemo(() => {
    if (!annualEarnings || annualEarnings.length < 1 || !annualBalanceSheet || annualBalanceSheet.length < 2) {
      return null;
    }
    
    // Get the most recent annual net income
    const annualNetIncome = annualEarnings[0].netIncome;
    
    // Get the total stockholders' equity from the last two annual balance sheets
    const currentEquity = annualBalanceSheet[0].totalStockholdersEquity;
    const previousEquity = annualBalanceSheet[1].totalStockholdersEquity;
    
    // Calculate average shareholder's equity
    const averageEquity = (currentEquity + previousEquity) / 2;
    
    // Calculate ROE as a percentage
    const roe = (annualNetIncome / averageEquity) * 100;
    
    return {
      value: roe,
      annualNetIncome,
      currentEquity,
      previousEquity,
      averageEquity,
      year: new Date(annualEarnings[0].date).getFullYear()
    };
  }, [annualEarnings, annualBalanceSheet]);

  if (isLoading || quoteLoading) {
    return (
      <div>
        {/* Header Skeleton */}
        <div className="bg-secondary/60">
          <div className="px-6 py-4">
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 justify-between">
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-16 rounded-lg" />
                  <div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-48" />
                      <div className="mx-2 h-5 w-px bg-border"></div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                    <Skeleton className="h-4 w-64 mt-2" />
                  </div>
                </div>
                
                {/* Next Earnings Skeleton */}
                <div className="text-right">
                  <Skeleton className="h-3 w-24 mb-1 ml-auto" />
                  <Skeleton className="h-5 w-32 ml-auto" />
                </div>
              </div>
              
              {/* 5D and 20D ADR/ATR row Skeleton */}
              <div className="mt-4 pt-4 border-t border-border/40">
                <div className="flex items-center gap-6 flex-wrap">
                  <div>
                    <Skeleton className="h-6 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="mx-1 h-5 w-px bg-border/20"></div>
                  <div>
                    <Skeleton className="h-6 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="mx-1 h-5 w-px bg-border/20"></div>
                  <div>
                    <Skeleton className="h-6 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="mx-1 h-5 w-px bg-border/20"></div>
                  <div>
                    <Skeleton className="h-6 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="mx-1 h-5 w-px bg-border/20"></div>
                  <div>
                    <Skeleton className="h-6 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
              
              {/* Market Cap and other metrics Skeleton */}
              <div className="flex items-center gap-6 flex-wrap">
                {[...Array(6)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-6 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Company Info Skeleton in Header */}
            <div className="mt-4 pt-4 border-t border-border/40">
              <div className="flex flex-wrap items-start">
                {[...Array(6)].map((_, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div className="mx-3 h-5 w-px bg-border self-center"></div>}
                    <div className="min-w-[80px] px-3">
                      <Skeleton className="h-3 w-16 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Content Skeleton */}
        <div className="bg-card">
          <div className="p-6 space-y-6">
            <div className="border-b pb-4">
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-lg bg-secondary/50">
                  <div className="space-y-2">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="flex justify-between items-center">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Skeleton className="h-[400px] w-full" />

        <div className="space-y-4">
          <div className="grid w-full grid-cols-8 gap-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    console.error('CompanyOutlookCard: Error state:', error);
    return <div>Error: {error.message}</div>;
  }

  if (!companyData || !quote) {
    console.log('CompanyOutlookCard: No data available');
    return (
      <div>
        <div className="bg-secondary/60 p-6">
          <h2 className="text-xl font-bold">Invalid Symbol</h2>
          <p className="text-muted-foreground mt-2">
            Unable to load data for symbol: {symbol}. Please enter a valid stock or crypto symbol. For example: AAPL, BTCUSD, etc.
          </p>
        </div>
      </div>
    );
  }

  /*Format Market Cap*/
  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    return `$${(value / 1e6).toFixed(2)}M`;
  };
  /*Format Large Numbers*/
  const formatLargeNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div>
      {/* Company Header */}
       
      <div className="bg-secondary/60">
        <div className="px-6 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex gap-3 justify-between">
              <div className="flex gap-3">
                {companyData.profile.image && (
                  <Image
                    src={companyData.profile.image}
                    alt={companyData.profile.companyName || 'Company logo'}
                    width={56}
                    height={56}
                    className="rounded-lg object-cover"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                      {companyData.profile.companyName}
                    </h2>
                    
                    <div className="flex items-center">
                      <div className="mx-2 h-5 w-px bg-border"></div>
                      <span className="text-xl font-bold">
                        ${typeof quote.price === 'number' ? safeFormat(quote.price) : 'N/A'}
                      </span>
                    </div>
                    
                    {quote?.change && (
                      <div className="flex gap-1.5 mt-1 sm:mt-0">
                        <div className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium",
                          quote.change >= 0 
                            ? "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400" 
                            : "bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400"
                        )}>
                          {quote.change >= 0 ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )}
                          ${Math.abs(quote.change).toFixed(2)}
                        </div>
                        <div className={cn(
                          "inline-flex items-center rounded-md px-2 py-1 text-sm font-medium",
                          quote.changesPercentage >= 0 
                            ? "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400" 
                            : "bg-rose-500/10 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400"
                        )}>
                          {quote.changesPercentage ? (
                            `${quote.changesPercentage >= 0 ? '+' : ''}${quote.changesPercentage.toFixed(2)}%`
                          ) : 'N/A'}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {quote?.symbol} • {quote?.exchange || 'N/A'}
                    {quote.timestamp && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="text-xs">Updated: {new Date(quote.timestamp * 1000).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Next Earnings in top right */}
              <div className="text-right">
                <h3 className="text-xs font-medium text-muted-foreground">Next Earnings</h3>
                <p className="text-sm font-medium">
                  {quote.earningsAnnouncement ? 
                    new Date(quote.earningsAnnouncement).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            
            {/* 5D and 20D ADR/ATR row */}
            <div className="mt-4 pt-4 border-t border-border/40">
              <div className="flex items-center gap-6 flex-wrap">
                {range5Day && (
                  <div>
                    <div>
                      {range5Day.averageDailyRange}% / ${safeFormat(range5Day.averageTrueRange)}
                    </div>
                    <div className="text-xs text-muted-foreground">5 Day ADR/ATR</div>
                  </div>
                )}
                
                {range5Day && range21Day && (
                  <div className="mx-1 h-5 w-px bg-border"></div>
                )}
                
                {range21Day && (
                  <div>
                    <div>
                      {range21Day.averageDailyRange}% / ${safeFormat(range21Day.averageTrueRange)}
                    </div>
                    <div className="text-xs text-muted-foreground">21 Day ADR/ATR</div>
                  </div>
                )}
                
                {range21Day && (
                  <div className="mx-1 h-5 w-px bg-border"></div>
                )}

                {range21Day && twentyEma && !twentyEmaLoading && (
                  <div>
                    <div className={cn(
                      "flex items-center gap-1",
                      quote.price > twentyEma ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                    )}>
                      {((quote.price - twentyEma) / range21Day.averageTrueRange).toFixed(2)}x ATR
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="inline-flex">
                              <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={5}>
                            <div className="space-y-1">
                              <p>Current Price: ${safeFormat(quote.price)}</p>
                              <p>21 Day EMA: ${safeFormat(twentyEma)}</p>
                              <p>21 Day ATR: ${safeFormat(range21Day.averageTrueRange)}</p>
                              <p className="text-xs text-muted-foreground mt-1">Shows how many ATR units the price is away from the 21 Day EMA</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="text-xs text-muted-foreground">ATR Units from 21 EMA</div>
                  </div>
                )}
                
                {range21Day && lastQuarterEpsChange && (
                  <div className="mx-1 h-5 w-px bg-border"></div>
                )}
                
                {lastQuarterEpsChange && (
                  <div>
                    <div className={cn(
                      "flex items-center gap-1",
                      lastQuarterEpsChange.value > 0 
                        ? "text-emerald-500 dark:text-emerald-400" 
                        : lastQuarterEpsChange.value < 0 
                          ? "text-rose-500 dark:text-rose-400" 
                          : ""
                    )}>
                      {lastQuarterEpsChange.value > 0 ? "+" : ""}{lastQuarterEpsChange.value.toFixed(2)}%
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="inline-flex">
                              <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={5}>
                            <div className="space-y-1">
                              <p>Current: ${lastQuarterEpsChange.current.toFixed(6)}</p>
                              <p>Previous: ${lastQuarterEpsChange.previous.toFixed(6)}</p>
                              <p className="text-xs text-muted-foreground mt-1">Year-over-year comparison for the most recent quarter</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      YoY EPS % Change ({lastQuarterEpsChange.period} {lastQuarterEpsChange.year})
                    </div>
                  </div>
                )}
                
                {lastQuarterEpsChange && lastQuarterRevenueChange && (
                  <div className="mx-1 h-5 w-px bg-border"></div>
                )}
                
                {lastQuarterRevenueChange && (
                  <div>
                    <div className={cn(
                      "flex items-center gap-1",
                      lastQuarterRevenueChange.value > 0 
                        ? "text-emerald-500 dark:text-emerald-400" 
                        : lastQuarterRevenueChange.value < 0 
                          ? "text-rose-500 dark:text-rose-400" 
                          : ""
                    )}>
                      {lastQuarterRevenueChange.value > 0 ? "+" : ""}{lastQuarterRevenueChange.value.toFixed(2)}%
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="inline-flex">
                              <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={5}>
                            <div className="space-y-1">
                              <p>Current: ${(lastQuarterRevenueChange.current / 1000000).toFixed(2)}M</p>
                              <p>Previous: ${(lastQuarterRevenueChange.previous / 1000000).toFixed(2)}M</p>
                              <p className="text-xs text-muted-foreground mt-1">Year-over-year comparison for the most recent quarter</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      YoY Revenue % Change ({lastQuarterRevenueChange.period} {lastQuarterRevenueChange.year})
                    </div>
                  </div>
                )}
                
                {lastQuarterRevenueChange && calculatedROE && (
                  <div className="mx-1 h-5 w-px bg-border"></div>
                )}
                
                {calculatedROE && (
                  <div>
                    <div className={cn(
                      "flex items-center gap-1",
                      calculatedROE.value > 15 
                        ? "text-emerald-500 dark:text-emerald-400" 
                        : calculatedROE.value < 5 
                          ? "text-rose-500 dark:text-rose-400" 
                          : ""
                    )}>
                      {calculatedROE.value.toFixed(2)}%
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="inline-flex">
                              <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={5}>
                            <div className="space-y-1">
                              <p>Annual Net Income ({calculatedROE.year}): ${(calculatedROE.annualNetIncome / 1000000).toFixed(2)}M</p>
                              <p>Current Equity: ${(calculatedROE.currentEquity / 1000000).toFixed(2)}M</p>
                              <p>Previous Equity: ${(calculatedROE.previousEquity / 1000000).toFixed(2)}M</p>
                              <p>Average Equity: ${(calculatedROE.averageEquity / 1000000).toFixed(2)}M</p>
                              <p className="text-xs text-muted-foreground mt-1">ROE = (Annual Net Income / Average Equity) × 100</p>
                              <p className="text-xs mt-1">
                                <span className="text-emerald-500 dark:text-emerald-400 font-medium">Above 15%</span>: Excellent |  
                                <span className="text-rose-500 dark:text-rose-400 font-medium"> Below 5%</span>: Poor
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ROE ({calculatedROE.year})
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Market Cap and other metrics */}
            <div className="mt-4 pt-4 border-t border-border/40">
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                {quote.marketCap ? formatMarketCap(quote.marketCap) : 'N/A'}
                <div className="text-xs text-muted-foreground">Market Cap</div>
              </div>
              <div className="mx-1 h-5 w-px bg-border"></div>
              <div>
                {formatLargeNumber(quote.volume || 0)}
                <div className="text-xs text-muted-foreground">Volume</div>
              </div>
              <div className="mx-1 h-5 w-px bg-border"></div>
              <div>
                {formatLargeNumber(quote.avgVolume)}
                <div className="text-xs text-muted-foreground">50 Day Avg Volume</div>
              </div>
              <div className="mx-1 h-5 w-px bg-border"></div>
              {/* Float information moved to header */}
              {!floatLoading && floatData?.[0] && (
                <>
                  
                  <div>
                      {((quote.volume / floatData[0].floatShares) * 100).toFixed(2)}%
                    <div className="text-xs text-muted-foreground">% Float Traded</div>
                  </div>
                  <div className="mx-1 h-5 w-px bg-border"></div>
                  <div>
                      {floatData[0].freeFloat.toFixed(2)}%
                    <div className="text-xs text-muted-foreground">Free Float</div>
                  </div>          
                  <div className="mx-1 h-5 w-px bg-border"></div>
                  <div>
                      {formatLargeNumber(floatData[0].floatShares)}
                    <div className="text-xs text-muted-foreground">Float</div>
                  </div>
                  <div className="mx-1 h-5 w-px bg-border"></div>
                  <div>
                      {formatLargeNumber(floatData[0].outstandingShares)}
                    <div className="text-xs text-muted-foreground">Shares Outstanding</div>
                  </div>
                </>
              )}
            </div>
          </div>
          </div>
          
          {/* Company Info - Moved from grid to header */}
          {(companyData.profile.sector || companyData.profile.industry || companyData.profile.ceo || 
            companyData.profile.fullTimeEmployees || companyData.profile.address || companyData.profile.website) && (
            <div className="mt-4 pt-4 border-t border-border/40">
              <div className="flex flex-wrap items-start">
                {companyData.profile.sector && (
                  <div className="min-w-[80px]">
                    <h3 className="text-xs font-medium text-muted-foreground">Sector</h3>
                    <Link
                    href={`/scans/sectors/${encodeURIComponent(companyData.profile.sector)}`}
                    className="hover:underline text-blue-600 dark:text-blue-400 text-xs font-medium">
                      {companyData.profile.sector}
                    </Link>
                  </div>
                )}
                
                {companyData.profile.sector && companyData.profile.industry && (
                  <div className="mx-3 h-5 w-px bg-border self-center"></div>
                )}
                
                {companyData.profile.industry && (
                  <div className="min-w-[80px] px-3">
                    <h3 className="text-xs font-medium text-muted-foreground">Industry</h3>
                    <Link
                    href={`/scans/sectors/${encodeURIComponent(companyData.profile.sector)}/industry/${encodeURIComponent(companyData.profile.industry)}`}
                    className="hover:underline text-blue-600 dark:text-blue-400 text-xs font-medium">
                      {companyData.profile.industry}
                    </Link>
                  </div>
                )}
                
                {(companyData.profile.industry && companyData.profile.ceo) && (
                  <div className="mx-3 h-5 w-px bg-border self-center"></div>
                )}
                
                {companyData.profile.ceo && (
                  <div className="min-w-[80px] px-3">
                    <h3 className="text-xs font-medium text-muted-foreground">CEO</h3>
                    <p className="text-xs font-medium">{companyData.profile.ceo}</p>
                  </div>
                )}
                
                {(companyData.profile.ceo && companyData.profile.fullTimeEmployees) && (
                  <div className="mx-3 h-5 w-px bg-border self-center"></div>
                )}
                
                {companyData.profile.fullTimeEmployees && (
                  <div className="min-w-[80px] px-3">
                    <h3 className="text-xs font-medium text-muted-foreground">Employees</h3>
                    <p className="text-xs font-medium">{companyData.profile.fullTimeEmployees}</p>
                  </div>
                )}
                
                {(companyData.profile.fullTimeEmployees && (companyData.profile.address || companyData.profile.city)) && (
                  <div className="mx-3 h-5 w-px bg-border self-center"></div>
                )}
                
                {(companyData.profile.address || companyData.profile.city) && (
                  <div className="min-w-[120px] px-3">
                    <h3 className="text-xs font-medium text-muted-foreground">Address</h3>
                    <p className="text-xs">
                      {companyData.profile.city && (
                        <>{companyData.profile.city}, {companyData.profile.state}</>
                      )}
                    </p>
                  </div>
                )}
                
                {((companyData.profile.address || companyData.profile.city) && companyData.profile.website) && (
                  <div className="mx-3 h-5 w-px bg-border self-center"></div>
                )}
                
                {companyData.profile.website && (
                  <div className="min-w-[120px] px-3">
                    <h3 className="text-xs font-medium text-muted-foreground">Website</h3>             
                    <Link 
                      className="hover:underline text-blue-600 dark:text-blue-400 text-xs"
                      href={companyData.profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {companyData.profile.website}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Content Section */}
      <div className="bg-card">
        <div className="p-6 space-y-6">
          {/* Company Description */}
          {companyData.profile.description && (
            <div className="border-b pb-4">
              <div className="relative">
                <p className={cn(
                  "text-sm text-muted-foreground",
                  !isDescriptionExpanded && "line-clamp-2"
                )}>
                  {companyData.profile.description}
                </p>
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="mt-2 flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {isDescriptionExpanded ? (
                    <>
                      Show Less <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Read More <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Trading Stats, Moving Averages, and Risk Calculator Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trading Stats Card */}
            <Card className="w-full border bg-card">
              <CardHeader>
                <CardTitle>Trading Stats</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Previous Close</span>
                    <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                    <span className="font-medium">${safeFormat(quote.previousClose)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Open</span>
                    <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                    <span className="font-medium">${safeFormat(quote.open)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Day&apos;s Low</span>
                    <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                    <span className="font-medium">${safeFormat(quote.dayLow)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Day&apos;s High</span>
                    <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                    <span className="font-medium">${safeFormat(quote.dayHigh)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">52 Week Low</span>
                    <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                    <div className="text-right">
                      <span className="font-medium">${safeFormat(quote.yearLow)}</span>
                      <div className={cn(
                        "text-xs font-medium px-1.5 py-0.5 rounded-full inline-block mt-1",
                        "bg-positive/10 text-positive"
                      )}>
                        +{((quote.price - quote.yearLow) / quote.yearLow * 100).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">52 Week High</span>
                    <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                    <div className="text-right">
                      <span className="font-medium">${safeFormat(quote.yearHigh)}</span>
                      <div className={cn(
                        "text-xs font-medium px-1.5 py-0.5 rounded-full inline-block mt-1",
                        "bg-negative/10 text-negative"
                      )}>
                        {((quote.price - quote.yearHigh) / quote.yearHigh * 100).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">RSI (14)</span>
                    <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                    <span className={cn("font-medium", {
                      "text-emerald-500 dark:text-emerald-400": rsi && rsi >= 70,
                      "text-rose-500 dark:text-rose-400": rsi && rsi <= 30
                    })}>
                      {rsiLoading ? "Loading..." : (rsi ? `${safeFormat(rsi)}` : 'N/A')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">P/E Ratio</span>
                    <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                    <span className="font-medium">{quote.pe ? safeFormat(quote.pe) : 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Moving Averages Card */}
            <MovingAverages companyData={companyData} symbol={companyData.profile.symbol} />
            
            {/* Risk Calculator Card */}
            <RRCard price={quote.price || 0} />
          </div>

          <IntradayChart symbol={symbol} />
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="earnings" className="space-y-4 px-6 bg-card">
        <div className="relative">
          <TabsList className="flex w-full overflow-x-auto scrollbar-hide pb-1 md:grid md:grid-cols-8 lg:grid-cols-8">
            <TabsTrigger value="earnings" className="flex items-center gap-1.5 whitespace-nowrap">
              <Calculator className="w-4 h-4" /> 
              <span className="hidden md:inline">Earnings</span>
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-1.5 whitespace-nowrap">
              <Building2 className="w-4 h-4" /> 
              <span className="hidden md:inline">News</span>
            </TabsTrigger>
            <TabsTrigger value="financials" className="flex items-center gap-1.5 whitespace-nowrap">
              <DollarSign className="w-4 h-4" /> 
              <span className="hidden md:inline">Financials</span>
            </TabsTrigger>
            <TabsTrigger value="keymetrics" className="flex items-center gap-1.5 whitespace-nowrap">
              <PieChart className="w-4 h-4" /> 
              <span className="hidden md:inline">Key Metrics</span>
            </TabsTrigger>
            <TabsTrigger value="insiders" className="flex items-center gap-1.5 whitespace-nowrap">
              <Users className="w-4 h-4" /> 
              <span className="hidden md:inline">Insider Activity</span>
            </TabsTrigger>
            <TabsTrigger value="executives" className="flex items-center gap-1.5 whitespace-nowrap">
              <Users className="w-4 h-4" /> 
              <span className="hidden md:inline">Executives</span>
            </TabsTrigger>
            <TabsTrigger value="dividends" className="flex items-center gap-1.5 whitespace-nowrap">
              <DollarSign className="w-4 h-4" /> 
              <span className="hidden md:inline">Dividends</span>
            </TabsTrigger>
            <TabsTrigger value="pricehistory" className="flex items-center gap-1.5 whitespace-nowrap">
              <Activity className="w-4 h-4" /> 
              <span className="hidden md:inline">Price History</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="earnings" className="py-4">
          <Earnings symbol={symbol} />
        </TabsContent>
        <TabsContent value="news" className="py-4">
          <News symbol={symbol} />
        </TabsContent>
        <TabsContent value="financials" className="py-4">
          <Financials companyData={companyData} />
        </TabsContent>
        <TabsContent value="keymetrics" className="py-4">
          <KeyMetrics symbol={symbol} />
        </TabsContent>
        <TabsContent value="insiders" className="py-4">
          <InsiderActivity symbol={symbol} />
        </TabsContent>
        <TabsContent value="executives" className="py-4">
          <Executives companyData={companyData} />
        </TabsContent>
        <TabsContent value="dividends" className="py-4">
          <DividendHistory symbol={symbol} />
        </TabsContent>
        <TabsContent value="pricehistory" className="py-4">
          <PriceHistoryComponent symbol={symbol} priceHistory={priceHistory} />
        </TabsContent>
      </Tabs>
    </div>

  );
};

export default CompanyOutlookCard;