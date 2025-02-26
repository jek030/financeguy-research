"use client"
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {Building2, Users, DollarSign, PieChart, TrendingDown, Activity, ChevronDown, ChevronUp, Calculator} from 'lucide-react';
import { addYears } from 'date-fns';

//UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Financials } from '@/components/ui/(fmp)/Financials';
import { cn } from '@/lib/utils';
import { Skeleton } from "@/components/ui/Skeleton";

//FMP Hooks
import { useCompanyOutlook } from '@/hooks/FMP/useCompanyOutlook';
import { calculateRanges } from '@/lib/priceCalculations';
import { safeFormat } from '@/lib/formatters';
import { MovingAverages } from '@/components/ui/(fmp)/MovingAverages';
import { useRSIData } from '@/hooks/FMP/useRSIData';
import { useQuote } from '@/hooks/FMP/useQuote';
import { useFloat } from '@/hooks/FMP/useFloat';
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

  /** Float Data from FMP */
  const { data: floatData, isLoading: floatLoading } = useFloat(symbol);

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

  const range20Day = React.useMemo(() => {
    if (!priceHistory || priceHistory.length < 20) return null;
    return calculateRanges(priceHistory, 20);
  }, [priceHistory]);

  if (isLoading || quoteLoading) {
    return (
      <div className="space-y-6">
        <Card className="w-full bg-card border shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row justify-between gap-6">
              <div className="flex gap-4">
                <Skeleton className="h-16 w-16 rounded-lg" />
                <div>
                  <Skeleton className="h-8 w-64 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="lg:text-right">
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-b pb-4">
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b pb-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[...Array(4)].map((_, j) => (
                      <div key={j}>
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
          </CardContent>
        </Card>

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
      <div className="space-y-6">
        <Card className="w-full bg-card border shadow-lg">
          <CardHeader>
            <CardTitle>Invalid Symbol</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Unable to load data for symbol: {symbol}. Please enter a valid stock or crypto symbol. For example: AAPL, BTCUSD, etc.
            </p>
          </CardContent>
        </Card>
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
    <div className="space-y-6">
      {/* Company Header Card */}
      <Card className="w-full bg-card border shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
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
                  {quote?.change && (
                    <div className="flex gap-1.5 mt-1 sm:mt-0">
                      <Badge variant={quote.change >= 0 ? "positive" : "destructive"}>
                        {quote.change >= 0 ? '+' : ''}{safeFormat(quote.change)}
                      </Badge>
                      <Badge variant={quote.changesPercentage ? (quote.changesPercentage >= 0 ? "positive" : "destructive") : "secondary"}>
                        {quote.changesPercentage ? (quote.changesPercentage >= 0 ? '+' : '') : ''}
                        {quote.changesPercentage ? safeFormat(quote.changesPercentage) : 'N/A'}%
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {quote?.symbol} • {quote?.exchange || 'N/A'}
                </div>
              </div>
            </div>

            <div className="lg:text-right mt-2 lg:mt-0">
              <div className="text-2xl sm:text-3xl font-bold">
                ${typeof quote.price === 'number' ? safeFormat(quote.price) : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Market Cap: {quote.marketCap ? formatMarketCap(quote.marketCap) : 'N/A'}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
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

          {/* Key Company Info Grid - Only show if any company data exists */}
          {(companyData.profile.sector || companyData.profile.industry || companyData.profile.ceo || 
            companyData.profile.fullTimeEmployees || companyData.profile.address || companyData.profile.website) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 border-b pb-4">
              {/* Quick Stats */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {companyData.profile.sector && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Sector</h3>
                      <p className="text-sm font-medium">{companyData.profile.sector}</p>
                    </div>
                  )}
                  {companyData.profile.industry && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Industry</h3>
                      <p className="text-sm font-medium">{companyData.profile.industry}</p>
                    </div>
                  )}
                  {companyData.profile.ceo && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">CEO</h3>
                      <p className="text-sm font-medium">{companyData.profile.ceo}</p>
                    </div>
                  )}
                  {companyData.profile.fullTimeEmployees && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Employees</h3>
                      <p className="text-sm font-medium">{companyData.profile.fullTimeEmployees}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              {(companyData.profile.address || companyData.profile.city) && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm text-muted-foreground">Address</h3>
                    <p className="text-sm">
                      {companyData.profile.address && <>{companyData.profile.address}<br /></>}
                      {companyData.profile.city && (
                        <>{companyData.profile.city}, {companyData.profile.state} {companyData.profile.zip}<br /></>
                      )}
                      {companyData.profile.country}
                    </p>
                  </div>
                </div>
              )}

              {/* Links and Website */}
              <div className="space-y-4">
                {companyData.profile.website && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Website</h3>
                    <a 
                      href={companyData.profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm break-all"
                    >
                      {companyData.profile.website}
                    </a>
                  </div>
                )}
                <div className="flex gap-2">
                  <Link 
                    className="inline-flex items-center justify-center rounded-md bg-purple-500 px-4 py-2 text-sm font-medium text-white hover:bg-purple-400 transition-colors"
                    href={`https://finance.yahoo.com/quote/${symbol}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Yahoo Finance
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Trading Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-secondary/50">
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
                    <div className="text-xs text-green-600">
                      +{((quote.price - quote.yearLow) / quote.yearLow * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">52 Week High</span>
                  <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                  <div className="text-right">
                    <span className="font-medium">${safeFormat(quote.yearHigh)}</span>
                    <div className="text-xs text-red-600">
                      {((quote.price - quote.yearHigh) / quote.yearHigh * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Volume</span>
                  <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                  <span className="font-medium">{formatLargeNumber(quote.volume)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg. Volume</span>
                  <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                  <span className="font-medium">{formatLargeNumber(quote.avgVolume)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">RSI (14)</span>
                  <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                  <span className={cn("font-medium", {
                    "text-positive": rsi && rsi >= 70,
                    "text-negative": rsi && rsi <= 30
                  })}>
                    {rsiLoading ? "Loading..." : (rsi ? `${safeFormat(rsi)}` : 'N/A')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">P/E Ratio</span>
                  <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                  <span className="font-medium">{quote.pe ? safeFormat(quote.pe) : 'N/A'}</span>
                </div>
                {range5Day && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">5D ADR/ATR</span>
                    <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                    <div className="text-right">
                      <span className={cn("font-medium", {
                        "text-positive": range5Day.averageDailyRange > 5,
                        "text-negative": range5Day.averageDailyRange <= 5
                      })}>
                        {range5Day.averageDailyRange}% / ${safeFormat(range5Day.averageTrueRange)}
                      </span>
                    </div>
                  </div>
                )}
                {range20Day && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">20D ADR/ATR</span>
                    <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                    <div className="text-right">
                      <span className={cn("font-medium", {
                        "text-positive": range20Day.averageDailyRange > 5,
                        "text-negative": range20Day.averageDailyRange <= 5
                      })}>
                        {range20Day.averageDailyRange}% / ${safeFormat(range20Day.averageTrueRange)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50">
              <div className="space-y-2">
                {!floatLoading && floatData?.[0] && (
                  <>
                  <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Shares Outstanding</span>
                      <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                      <span className="font-medium">{formatLargeNumber(floatData[0].outstandingShares)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Float</span>
                      <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                      <span className="font-medium">{formatLargeNumber(floatData[0].floatShares)}</span>
                    </div>                   
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Free Float</span>
                      <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                      <span className="font-medium">{floatData[0].freeFloat.toFixed(2)}%</span>
                    </div>                                  
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">% Float Traded</span>
                      <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                      <span className="font-medium">{((quote.volume / floatData[0].floatShares) * 100).toFixed(2)}%</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between text-sm text-muted-foreground mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 mb-2 sm:mb-0">
              <span className="font-medium">Next Earnings:</span>
              {quote.earningsAnnouncement ? 
                new Date(quote.earningsAnnouncement).toLocaleDateString() : 'N/A'}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Last Updated:</span>
              {quote.timestamp ? 
                new Date(quote.timestamp * 1000).toLocaleString() : 'N/A'}
            </div>
          </div>
        </CardContent>
      </Card>


      <IntradayChart symbol={symbol} />
      

      {/* Main Content Tabs */}
      <Tabs defaultValue="earnings" className="space-y-4">
        <div className="relative">
          <TabsList className="flex w-full overflow-x-auto scrollbar-hide pb-1 md:grid md:grid-cols-3 lg:grid-cols-5">
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
            <TabsTrigger value="movingavgs" className="flex items-center gap-1.5 whitespace-nowrap">
              <TrendingDown className="w-4 h-4" /> 
              <span className="hidden md:inline">Moving Avgs</span>
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

        <TabsContent value="earnings">
          <Earnings symbol={symbol} />
        </TabsContent>
        <TabsContent value="news">
          <News symbol={symbol} />
        </TabsContent>
        <TabsContent value="financials">
          <Financials companyData={companyData} />
        </TabsContent>
        <TabsContent value="keymetrics">
          <KeyMetrics symbol={symbol} />
        </TabsContent>
        <TabsContent value="movingavgs">
          <MovingAverages companyData={companyData} symbol={companyData.profile.symbol} />
        </TabsContent>
        <TabsContent value="insiders">
          <InsiderActivity symbol={symbol} />
        </TabsContent>
        <TabsContent value="executives">
          <Executives companyData={companyData} />
        </TabsContent>
        <TabsContent value="dividends">
          <DividendHistory symbol={symbol} />
        </TabsContent>
        <TabsContent value="pricehistory">
          <PriceHistoryComponent symbol={symbol} priceHistory={priceHistory} />
        </TabsContent>
      </Tabs>
    </div>

  );
};

export default CompanyOutlookCard;