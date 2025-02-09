"use client"
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PriceHistory } from '@/lib/types';
import {Building2, Users, DollarSign, PieChart, TrendingDown, Activity, ChevronDown, ChevronUp} from 'lucide-react';

//UI Components
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Financials } from '@/components/ui/(fmp)/Financials';
import { cn } from '@/lib/utils';

//FMP Hooks
import { useCompanyOutlook } from '@/hooks/FMP/useCompanyOutlook';
import { calculateRanges } from '@/lib/priceCalculations';
import { safeFormat, safeFormatVol } from '@/lib/formatters';
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

interface CompanyOutlookProps {
  symbol: string;
  priceHistory?: PriceHistory[];
}

export const CompanyOutlookCard: React.FC<CompanyOutlookProps> = ({ symbol, priceHistory = [] }) => {
  /** Quote Data from FMP */
  const { data: quote, isLoading: quoteLoading } = useQuote(symbol);
  
  /** RSI Data from FMP */
  const { data: rsiData, isLoading: rsiLoading } = useRSIData(symbol);
  const rsi = rsiData?.rsi;

  /** Float Data from FMP */
  const { data: floatData, isLoading: floatLoading } = useFloat(symbol);

  /*Company Outlook Data from FMP*/
  const { data: companyData, isLoading, error } = useCompanyOutlook(symbol);
  
  /*Calculate 5 and 20 ADR/STR with Price History Data*/
  const range5Day = calculateRanges(priceHistory, 5);
  const range20Day = calculateRanges(priceHistory, 20);

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  if (isLoading || quoteLoading) {
    return <div>Loading company outlook...</div>;
  }

  if (error) {
    console.error('CompanyOutlookCard: Error state:', error);
    return <div>Error: {error.message}</div>;
  }

  if (!companyData || !quote) {
    console.log('CompanyOutlookCard: No data available');
    return <div>No outlook data available</div>;
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
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="flex gap-4">
              {companyData.profile.image && (
                <Image
                  src={companyData.profile.image}
                  alt={companyData.profile.companyName || 'Company logo'}
                  width={64}
                  height={64}
                  className="rounded-lg object-cover"
                />
              )}
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {companyData.profile.companyName}
                  </h2>
                  {quote?.change && (
                    <div className="flex gap-2">
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

            <div className="lg:text-right">
              <div className="text-3xl font-bold">
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

          {/* Key Company Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b pb-4">
            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Sector</h3>
                  <p className="text-sm font-medium">{companyData.profile.sector}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Industry</h3>
                  <p className="text-sm font-medium">{companyData.profile.industry}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">CEO</h3>
                  <p className="text-sm font-medium">{companyData.profile.ceo}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Employees</h3>
                  <p className="text-sm font-medium">{companyData.profile.fullTimeEmployees}</p>
                </div>
    
                
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm text-muted-foreground">Address</h3>
                <p className="text-sm">
                  {companyData.profile.address}<br />
                  {companyData.profile.city}, {companyData.profile.state} {companyData.profile.zip}<br />
                  {companyData.profile.country}

                </p>
              </div>
            </div>

            {/* Links and Website */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Website</h3>
                <a 
                  href={companyData.profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  {companyData.profile.website}
                </a>
              </div>
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

          {/* Trading Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

          <div className="flex flex-col md:flex-row justify-between text-sm text-muted-foreground mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
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
      <Tabs defaultValue="news" className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="news" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" /> News
          </TabsTrigger>
          <TabsTrigger value="financials" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Financials
          </TabsTrigger>
          <TabsTrigger value="keymetrics" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" /> Key Metrics
          </TabsTrigger>
          <TabsTrigger value="movingavgs" className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4" /> Moving Avgs
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <Activity className="w-4 h-4" /> Statistics
          </TabsTrigger>
          <TabsTrigger value="insiders" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Insider Activity
          </TabsTrigger>
          <TabsTrigger value="executives" className="flex items-center gap-2">
            <Users className="w-4 h-4" /> Executives
          </TabsTrigger>
          <TabsTrigger value="dividends" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Dividends
          </TabsTrigger>
        </TabsList>

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
        <TabsContent value="statistics">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>       
            </CardHeader>
            <CardContent>
              <div className="py-2 border-b border-dotted border-gray-300">
                5 Day ADR: <span style={{ color: range5Day.averageDailyRange > 5 ? 'green' : 'red' }}>
                  {range5Day.averageDailyRange}%
                </span> <br />
                5 Day ATR: ${safeFormat(range5Day.averageTrueRange)}
              </div>
                        
              <div className="py-2 border-b border-dotted border-gray-300">
                20 Day ADR: <span style={{ color: range20Day.averageDailyRange > 5 ? 'green' : 'red' }}>
                  {range20Day.averageDailyRange}%
                </span> <br />
                20 Day ATR: ${safeFormat(range20Day.averageTrueRange)}
              </div>
                        
              <div className="py-2 border-b border-dotted border-gray-300">
                52 week high: ${safeFormat(quote.yearHigh)} <br />
                52 week low: ${safeFormat(quote.yearLow)}
              </div>
                     
              <div className="py-2">
                Volume: {safeFormatVol(quote.volume)} <br />      
                Avg Volume: {safeFormatVol(quote.avgVolume)}
              </div>
            </CardContent>
            <CardFooter className="text-sm text-gray-500"> 
              ADR = Average Daily Range<br />
              ATR = Average True Range           
            </CardFooter>
          </Card>
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
      </Tabs>
    </div>

  );
};

export default CompanyOutlookCard;