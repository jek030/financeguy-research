"use client"
import React, { useState } from 'react';

import {Building2, Users, DollarSign, PieChart, Activity, ChevronDown, ChevronUp, Calculator} from 'lucide-react';
import { addYears } from 'date-fns';

//UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Financials } from '@/components/ui/(fmp)/Financials';
import { cn } from '@/lib/utils';
import { Skeleton } from "@/components/ui/Skeleton";
import RRCard from '@/components/ui/RRCard';
import {  PercentageChange } from "@/components/ui/PriceIndicator";
import { MetricDisplay, MetricRow, SectionDivider } from "@/components/ui/MetricDisplay";
import { CompanyHeader, CompanyInfoSection } from "@/components/ui/CompanyHeader";
import { FetchErrorDisplay, InvalidSymbolDisplay } from "@/components/ui/ErrorDisplay";

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
import { useAftermarketTrade } from '@/hooks/FMP/useAftermarketTrade';
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
  
  /** Aftermarket Trade Data from FMP */
  const { data: aftermarketTrade } = useAftermarketTrade(symbol);
  
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

  // Calculate Previous Week's % Change
  const previousWeekChange = React.useMemo(() => {
    if (!priceHistory || priceHistory.length < 7) return null;

    // Get today and set to local midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find last Friday
    const lastFriday = new Date(today);
    // If today is Sunday (0) or Saturday (6), go back to previous Friday
    if (lastFriday.getDay() === 0) {
      lastFriday.setDate(lastFriday.getDate() - 2);
    } else if (lastFriday.getDay() === 6) {
      lastFriday.setDate(lastFriday.getDate() - 1);
    } else {
      // For any other day, go back to the previous Friday
      lastFriday.setDate(lastFriday.getDate() - ((lastFriday.getDay() + 2) % 7));
    }

    // Find the Monday of that week (4 days before Friday)
    const lastMonday = new Date(lastFriday);
    lastMonday.setDate(lastFriday.getDate() - 4);

    // Format dates to match the API date format (YYYY-MM-DD)
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    const mondayStr = formatDate(lastMonday);
    const fridayStr = formatDate(lastFriday);

    // Sort price history by date to ensure chronological order
    const sortedHistory = [...priceHistory].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Find Monday's data (or next trading day)
    const mondayData = sortedHistory.find(p => p.date >= mondayStr);
    
    // Find Friday's data (or last trading day of the week)
    const fridayData = sortedHistory.reverse().find(p => p.date <= fridayStr);

    if (!mondayData || !fridayData) return null;

    const percentChange = ((fridayData.close - mondayData.open) / mondayData.open) * 100;

    // Adjust dates for timezone offset
    const adjustDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() + userTimezoneOffset);
    };

    return {
      value: percentChange,
      startDate: adjustDate(mondayData.date),
      endDate: adjustDate(fridayData.date),
      startPrice: mondayData.open,
      endPrice: fridayData.close
    };
  }, [priceHistory]);

  // Check if current time is during market hours (9:30 AM - 4:00 PM EST)
  const isMarketHours = React.useMemo(() => {
    const now = new Date();
    
    // Convert current time to EST
    const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const currentHour = estTime.getHours();
    const currentMinute = estTime.getMinutes();
    const currentDay = estTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Check if it's a weekday (Monday = 1, Friday = 5)
    const isWeekday = currentDay >= 1 && currentDay <= 5;
    
    if (!isWeekday) return false;
    
    // Market hours: 9:30 AM (9.5) to 4:00 PM (16.0) EST
    const currentTimeDecimal = currentHour + (currentMinute / 60);
    const marketOpen = 9.5; // 9:30 AM
    const marketClose = 16.0; // 4:00 PM
    
    return currentTimeDecimal >= marketOpen && currentTimeDecimal < marketClose;
  }, []);

  // Calculate aftermarket price change and percentage change
  const aftermarketChange = React.useMemo(() => {
    if (!aftermarketTrade || !quote || isMarketHours) return null;
    
    const change = aftermarketTrade.price - quote.price;
    const changePercentage = (change / quote.price) * 100;
    
    return {
      change,
      changePercentage,
      price: aftermarketTrade.price,
      timestamp: aftermarketTrade.timestamp
    };
  }, [aftermarketTrade, quote, isMarketHours]);

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
    
    // Check if it's a fetch error
    if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
      return <FetchErrorDisplay symbol={symbol} onRetry={() => window.location.reload()} />;
    }
    
    // For other errors, show invalid symbol display
    return <InvalidSymbolDisplay symbol={symbol} onRetry={() => window.location.reload()} />;
  }

  if (!companyData || !quote) {
    console.log('CompanyOutlookCard: No data available');
    return <InvalidSymbolDisplay symbol={symbol} onRetry={() => window.location.reload()} />;
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
      <CompanyHeader
        companyName={companyData.profile.companyName}
        symbol={quote?.symbol}
        exchange={quote?.exchange}
        image={companyData.profile.image}
        quote={quote}
        aftermarketChange={aftermarketChange}
        nextEarnings={quote.earningsAnnouncement}
      />
      
      {/* Technical Metrics Section */}
      <div className="bg-secondary/60">
        <div className="px-4 sm:px-6 py-4">
          <SectionDivider className="mb-4" />
          
          {/* Technical Analysis Metrics */}
          <MetricRow className="mb-4">
            {range5Day && (
              <MetricDisplay
                value={`${range5Day.averageDailyRange}% / $${safeFormat(range5Day.averageTrueRange)}`}
                label="5 Day ADR/ATR"
              />
            )}
            
            {range21Day && (
              <MetricDisplay
                value={`${range21Day.averageDailyRange}% / $${safeFormat(range21Day.averageTrueRange)}`}
                label="21 Day ADR/ATR"
              />
            )}

            {range21Day && twentyEma && !twentyEmaLoading && (
              <MetricDisplay
                value={`${((quote.price - twentyEma) / range21Day.averageTrueRange).toFixed(2)}x 21 ATR`}
                label="ATR Units from 21 EMA"
                valueClassName={cn(
                  quote.price > twentyEma ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                )}
                tooltip={
                  <div className="space-y-1">
                    <p>Current Price: ${safeFormat(quote.price)}</p>
                    <p>21 Day EMA: ${safeFormat(twentyEma)}</p>
                    <p>21 Day ATR: ${safeFormat(range21Day.averageTrueRange)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Shows how many ATR units the price is away from the 21 Day EMA</p>
                  </div>
                }
              />
            )}
          </MetricRow>
          
          <SectionDivider className="my-4" />
          
          {/* Fundamental Metrics */}
          <MetricRow>
            {lastQuarterEpsChange && (
              <MetricDisplay
                value={`${lastQuarterEpsChange.value > 0 ? "+" : ""}${lastQuarterEpsChange.value.toFixed(2)}%`}
                label={`YoY EPS % Change (${lastQuarterEpsChange.period} ${lastQuarterEpsChange.year})`}
                valueClassName={cn(
                  lastQuarterEpsChange.value > 0 
                    ? "text-emerald-500 dark:text-emerald-400" 
                    : lastQuarterEpsChange.value < 0 
                      ? "text-rose-500 dark:text-rose-400" 
                      : ""
                )}
                tooltip={
                  <div className="space-y-1">
                    <p>Current: ${lastQuarterEpsChange.current.toFixed(6)}</p>
                    <p>Previous: ${lastQuarterEpsChange.previous.toFixed(6)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Year-over-year comparison for the most recent quarter</p>
                  </div>
                }
              />
            )}
            
            {lastQuarterRevenueChange && (
              <MetricDisplay
                value={`${lastQuarterRevenueChange.value > 0 ? "+" : ""}${lastQuarterRevenueChange.value.toFixed(2)}%`}
                label={`YoY Revenue % Change (${lastQuarterRevenueChange.period} ${lastQuarterRevenueChange.year})`}
                valueClassName={cn(
                  lastQuarterRevenueChange.value > 0 
                    ? "text-emerald-500 dark:text-emerald-400" 
                    : lastQuarterRevenueChange.value < 0 
                      ? "text-rose-500 dark:text-rose-400" 
                      : ""
                )}
                tooltip={
                  <div className="space-y-1">
                    <p>Current: ${(lastQuarterRevenueChange.current / 1000000).toFixed(2)}M</p>
                    <p>Previous: ${(lastQuarterRevenueChange.previous / 1000000).toFixed(2)}M</p>
                    <p className="text-xs text-muted-foreground mt-1">Year-over-year comparison for the most recent quarter</p>
                  </div>
                }
              />
            )}
            
            {calculatedROE && (
              <MetricDisplay
                value={`${calculatedROE.value.toFixed(2)}%`}
                label={`ROE (${calculatedROE.year})`}
                valueClassName={cn(
                  calculatedROE.value > 15 
                    ? "text-emerald-500 dark:text-emerald-400" 
                    : calculatedROE.value < 5 
                      ? "text-rose-500 dark:text-rose-400" 
                      : ""
                )}
                tooltip={
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
                }
              />
            )}

            {previousWeekChange && (
              <MetricDisplay
                value={`${previousWeekChange.value > 0 ? "+" : ""}${previousWeekChange.value.toFixed(2)}%`}
                label="Previous Week % Change"
                valueClassName={cn(
                  previousWeekChange.value > 0 
                    ? "text-emerald-500 dark:text-emerald-400" 
                    : previousWeekChange.value < 0 
                      ? "text-rose-500 dark:text-rose-400" 
                      : ""
                )}
                tooltip={
                  <div className="space-y-1">
                    <p>Start Date: {previousWeekChange.startDate.toLocaleDateString()}</p>
                    <p>Opening Price: ${previousWeekChange.startPrice.toFixed(2)}</p>
                    <p>End Date: {previousWeekChange.endDate.toLocaleDateString()}</p>
                    <p>Closing Price: ${previousWeekChange.endPrice.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Calculated from Monday&apos;s open to Friday&apos;s close of the previous week. If market was closed, uses the next/previous trading day.</p>
                  </div>
                }
              />
            )}
          </MetricRow>
        </div>
      </div>
      
      {/* Market Data Section */}
      <div className="bg-secondary/60">
        <div className="px-4 sm:px-6 py-4">
          <SectionDivider className="mb-4" />
          
          <MetricRow>
            <MetricDisplay
              value={quote.marketCap ? formatMarketCap(quote.marketCap) : 'N/A'}
              label="Market Cap"
            />
            
            <MetricDisplay
              value={formatLargeNumber(quote.volume || 0)}
              label="Volume"
            />
            
            <MetricDisplay
              value={formatLargeNumber(quote.avgVolume)}
              label="50 Day Avg Volume"
            />
            
            {!floatLoading && floatData?.[0] && (
              <MetricDisplay
                value={`${((quote.volume / floatData[0].floatShares) * 100).toFixed(2)}%`}
                label="% Float Traded"
              />
            )}
            
            {!floatLoading && floatData?.[0] && (
              <MetricDisplay
                value={`${floatData[0].freeFloat.toFixed(2)}%`}
                label="Free Float"
              />
            )}
            
            {!floatLoading && floatData?.[0] && (
              <MetricDisplay
                value={formatLargeNumber(floatData[0].floatShares)}
                label="Float"
              />
            )}
            
            {!floatLoading && floatData?.[0] && (
              <MetricDisplay
                value={formatLargeNumber(floatData[0].outstandingShares)}
                label="Shares Outstanding"
              />
            )}
          </MetricRow>
        </div>
      </div>
      
      {/* Company Info Section */}
      <div className="bg-secondary/60">
        <div className="px-4 sm:px-6 py-4">
          <CompanyInfoSection
            sector={companyData.profile.sector}
            industry={companyData.profile.industry}
            ceo={companyData.profile.ceo}
            employees={companyData.profile.fullTimeEmployees}
            city={companyData.profile.city}
            state={companyData.profile.state}
            website={companyData.profile.website}
          />
        </div>
      </div>
      
      {/* Content Section */}
      <div className="bg-card">
        <div className="p-4 sm:p-6 space-y-6">
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
                      <div className="font-medium">${safeFormat(quote.yearLow)}</div>
                      <div className="mt-1">
                        <PercentageChange 
                          value={((quote.price - quote.yearLow) / quote.yearLow * 100)} 
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">52 Week High</span>
                    <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                    <div className="text-right">
                      <div className="font-medium">${safeFormat(quote.yearHigh)}</div>
                      <div className="mt-1">
                        <PercentageChange 
                          value={((quote.price - quote.yearHigh) / quote.yearHigh * 100)} 
                          size="sm"
                        />
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
            <RRCard price={quote.price || 0} dayLow={quote.dayLow || 0} />
          </div>

          {/* Previous IntradayChart implementation preserved within the component file */}
          <div className="relative mt-6 w-full overflow-hidden rounded-xl border border-border/40 bg-card/60 shadow-sm" style={{ minHeight: 480 }}>
            <IntradayChart symbol={symbol} exchange={quote?.exchange ?? undefined} />
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="earnings" className="space-y-4 px-4 sm:px-6 bg-card">
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