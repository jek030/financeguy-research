'use client';

import { useQuote } from "@/hooks/FMP/useQuote";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMovingAverageData } from '@/hooks/FMP/useMovingAverage';
import type { Ticker } from "@/lib/types";
import SectorReturns from "@/components/SectorReturns";
import { CompactWatchlist } from "@/components/watchlist/CompactWatchlist";

interface MovingAverageData {
  ma: number;
  date: string;
}

export default function Home() {
  const { data: spyData, isLoading: isSpyLoading } = useQuote("SPY");
  const { data: qqqData, isLoading: isQqqLoading } = useQuote("QQQ");
  const { data: diaData, isLoading: isDiaLoading } = useQuote("DIA");

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      style: 'percent',
      signDisplay: 'always'
    }).format(value / 100);
  };

  const calculatePercentDiff = (current: number, target: number) => {
    if (!current || !target) return 0;
    return ((current - target) / target) * 100;
  };

  const useMovingAverages = (symbol: string, currentPrice: number) => {
    const twentyOneEmaData = useMovingAverageData(symbol, 'ema', '21', '1day');
    const fiftyEmaData = useMovingAverageData(symbol, 'ema', '50', '1day');
    const twoHundredSmaData = useMovingAverageData(symbol, 'sma', '200', '1day');

    const getMovingAverageValue = (data: MovingAverageData[] | undefined) => 
      data && data.length > 0 && data[0]?.ma ? data[0].ma : 0;

    const calculateData = (maValue: number) => {
      const isAbove = currentPrice > maValue;
      
      return {
        value: maValue,
        isAbove,
        percentDiff: calculatePercentDiff(currentPrice, maValue)
      };
    };

    return {
      ema21: {
        data: calculateData(getMovingAverageValue(twentyOneEmaData.data)),
        isLoading: twentyOneEmaData.isLoading
      },
      ema50: {
        data: calculateData(getMovingAverageValue(fiftyEmaData.data)),
        isLoading: fiftyEmaData.isLoading
      },
      sma200: {
        data: calculateData(getMovingAverageValue(twoHundredSmaData.data)),
        isLoading: twoHundredSmaData.isLoading
      }
    };
  };

  const MarketCard = ({ 
    title, 
    symbol, 
    data, 
    isLoading 
  }: { 
    title: string; 
    symbol: string; 
    data: Ticker | undefined; 
    isLoading: boolean 
  }) => {
    const movingAverages = useMovingAverages(symbol, data?.price || 0);

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-medium text-foreground/90">{title} ({symbol})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center space-x-4 h-16">
              <div className="h-6 w-24 bg-muted animate-pulse rounded"></div>
              <div className="h-6 w-16 bg-muted animate-pulse rounded"></div>
            </div>
          ) : data ? (
            <div className="flex flex-col space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-3xl font-bold">${formatNumber(data.price)}</span>
                <div className={cn(
                  "inline-flex items-center space-x-1 text-lg font-medium rounded-full px-2 py-1 whitespace-nowrap",
                  data.change >= 0 ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
                )}>
                  {data.change >= 0 ? (
                    <ArrowUp className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ArrowDown className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span>${formatNumber(Math.abs(data.change))}</span>
                  <span>({formatPercentage(data.changesPercentage)})</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-background/50 p-2 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground font-medium">52-Week High</p>
                    <span className={cn(
                      "text-xs font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap",
                      data.price >= data.yearHigh ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
                    )}>
                      {formatPercentage(calculatePercentDiff(data.price, data.yearHigh))}
                    </span>
                  </div>
                  <p className="font-medium mt-1">${formatNumber(data.yearHigh)}</p>
                </div>
                <div className="bg-background/50 p-2 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground font-medium">52-Week Low</p>
                    <span className={cn(
                      "text-xs font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap",
                      data.price >= data.yearLow ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
                    )}>
                      {formatPercentage(calculatePercentDiff(data.price, data.yearLow))}
                    </span>
                  </div>
                  <p className="font-medium mt-1">${formatNumber(data.yearLow)}</p>
                </div>
              </div>
              
              {/* Moving Averages */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground border-b pb-1">Moving Averages</p>
                <div className="grid grid-cols-3 gap-2">
                  {/* 21 EMA */}
                  {movingAverages.ema21.isLoading ? (
                    <div className="bg-muted/30 rounded-lg p-2 animate-pulse h-16"></div>
                  ) : (
                    <div className={cn(
                      "rounded-lg p-2",
                      movingAverages.ema21.data.isAbove 
                        ? "bg-positive/5 border border-positive/10" 
                        : "bg-negative/5 border border-negative/10"
                    )}>
                      <div className="text-xs text-muted-foreground font-medium">21 EMA</div>
                      <div className="font-medium">${formatNumber(movingAverages.ema21.data.value)}</div>
                      <div className={cn(
                        "flex items-center gap-1 text-xs mt-1 whitespace-nowrap",
                        movingAverages.ema21.data.isAbove ? "text-positive" : "text-negative"
                      )}>
                        {movingAverages.ema21.data.isAbove ? (
                          <ArrowUp className="h-3 w-3 flex-shrink-0" />
                        ) : (
                          <ArrowDown className="h-3 w-3 flex-shrink-0" />
                        )}
                        {formatPercentage(Math.abs(movingAverages.ema21.data.percentDiff))}
                      </div>
                    </div>
                  )}
                  
                  {/* 50 EMA */}
                  {movingAverages.ema50.isLoading ? (
                    <div className="bg-muted/30 rounded-lg p-2 animate-pulse h-16"></div>
                  ) : (
                    <div className={cn(
                      "rounded-lg p-2",
                      movingAverages.ema50.data.isAbove 
                        ? "bg-positive/5 border border-positive/10" 
                        : "bg-negative/5 border border-negative/10"
                    )}>
                      <div className="text-xs text-muted-foreground font-medium">50 EMA</div>
                      <div className="font-medium">${formatNumber(movingAverages.ema50.data.value)}</div>
                      <div className={cn(
                        "flex items-center gap-1 text-xs mt-1 whitespace-nowrap",
                        movingAverages.ema50.data.isAbove ? "text-positive" : "text-negative"
                      )}>
                        {movingAverages.ema50.data.isAbove ? (
                          <ArrowUp className="h-3 w-3 flex-shrink-0" />
                        ) : (
                          <ArrowDown className="h-3 w-3 flex-shrink-0" />
                        )}
                        {formatPercentage(Math.abs(movingAverages.ema50.data.percentDiff))}
                      </div>
                    </div>
                  )}
                  
                  {/* 200 SMA */}
                  {movingAverages.sma200.isLoading ? (
                    <div className="bg-muted/30 rounded-lg p-2 animate-pulse h-16"></div>
                  ) : (
                    <div className={cn(
                      "rounded-lg p-2",
                      movingAverages.sma200.data.isAbove 
                        ? "bg-positive/5 border border-positive/10" 
                        : "bg-negative/5 border border-negative/10"
                    )}>
                      <div className="text-xs text-muted-foreground font-medium">200 SMA</div>
                      <div className="font-medium">${formatNumber(movingAverages.sma200.data.value)}</div>
                      <div className={cn(
                        "flex items-center gap-1 text-xs mt-1 whitespace-nowrap",
                        movingAverages.sma200.data.isAbove ? "text-positive" : "text-negative"
                      )}>
                        {movingAverages.sma200.data.isAbove ? (
                          <ArrowUp className="h-3 w-3 flex-shrink-0" />
                        ) : (
                          <ArrowDown className="h-3 w-3 flex-shrink-0" />
                        )}
                        {formatPercentage(Math.abs(movingAverages.sma200.data.percentDiff))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">Unable to load {symbol} data</div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-screen">
      <main className="flex-1">
        <div className="flex h-full">
          {/* Main Content */}
          <div className="flex-1 min-w-0 p-4 md:p-6 overflow-auto">
            {/* Market Data Cards */}
            <div className="max-w-7xl space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <MarketCard title="S&P 500 ETF" symbol="SPY" data={spyData} isLoading={isSpyLoading} />
                <MarketCard title="Nasdaq 100 ETF" symbol="QQQ" data={qqqData} isLoading={isQqqLoading} />
                <MarketCard title="Dow Jones ETF" symbol="DIA" data={diaData} isLoading={isDiaLoading} />
              </div>
            </div>
              
            {/* Sector Performance */}
            <div className="mt-8">
              <SectorReturns />
            </div>
          </div>

          {/* Right Panel - Watchlist */}
          <div className="hidden lg:block w-48 flex-shrink-0 border-l border-border">
            <CompactWatchlist />
          </div>
        </div>
      </main>
    </div>
  );
}
