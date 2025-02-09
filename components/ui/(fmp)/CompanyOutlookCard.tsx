"use client"
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PriceHistory, KeyMetrics } from '@/lib/types';
import {Building2, Users, DollarSign, PieChart, TrendingDown, Activity, ChevronDown, ChevronUp} from 'lucide-react';

//UI Components
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/Table";
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/Separator';
import { Financials } from '@/components/ui/(fmp)/Financials';
import { cn } from '@/lib/utils';

//FMP Hooks
import { useCompanyOutlook } from '@/hooks/FMP/useCompanyOutlook';
import { useKeyMetrics } from '@/hooks/FMP/useKeyMetrics';
import { calculateRanges } from '@/lib/priceCalculations';
import { safeFormat, safeFormatVol } from '@/lib/formatters';
import { useInsiderTrading } from '@/hooks/FMP/useInsiderTrading';
import { useDividendHistory } from '@/hooks/FMP/useDividendHistory';
import { useNewsHistory } from '@/hooks/FMP/useNewsHistory';
import { MovingAverages } from '@/components/ui/(fmp)/MovingAverages';
import { useRSIData } from '@/hooks/FMP/useRSIData';
import { useQuote } from '@/hooks/FMP/useQuote';
import { useFloat } from '@/hooks/FMP/useFloat';

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

  /*News History Start and End Dates*/
  const [newsStartDate, setNewsStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [newsEndDate, setNewsEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [newsTrigger, setNewsTrigger] = useState(0);
  /*Company Outlook Data from FMP*/
  const { data: companyData, isLoading, error } = useCompanyOutlook(symbol);
  /*Key Metrics Data from FMP*/
  const { annualData: keyMetricsAnnual, quarterlyData: keyMetricsQuarterly, ttmData: keyMetricsTtm } = useKeyMetrics(symbol);
  
  /*Insider Trading Data from FMP*/
  const { data: insiderTrades, isLoading: insiderLoading, error: insiderError } = useInsiderTrading(symbol);
  /*Dividend History Data from FMP*/
  const { data: dividendHistory, isLoading: dividendLoading, error: dividendError } = useDividendHistory(symbol);
  /*News History Data from FMP*/
  const { data: newsData, isLoading: newsLoading, error: newsError } = useNewsHistory(symbol, newsStartDate, newsEndDate, newsTrigger);
  /*Calculate 5 and 20 ADR/STR with Price History Data from Schwab - TODO - replace schwab API call with FMP*/
  const range5Day = calculateRanges(priceHistory, 5);
  const range20Day = calculateRanges(priceHistory, 20);
  // Prepare quarterly revenue data for chart

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <span className="text-sm text-muted-foreground">Day's Low</span>
                  <div className="border-b border-dashed border-muted-foreground/50 flex-grow mx-2"></div>
                  <span className="font-medium">${safeFormat(quote.dayLow)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Day's High</span>
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="news" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
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
        </TabsList>

        {/* News Tab */}
        <TabsContent value="news">
          <Card>
            <CardHeader>
              <CardTitle>News</CardTitle>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newsStartDate}
                    onChange={(e) => setNewsStartDate(e.target.value)}
                    max={newsEndDate}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newsEndDate}
                    onChange={(e) => setNewsEndDate(e.target.value)}
                    min={newsStartDate}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <Button 
                  onClick={() => setNewsTrigger(prev => prev + 1)}
                  disabled={newsLoading}
                >
                  {newsLoading ? 'Searching...' : 'Search News'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {newsLoading ? (
                <div className="flex items-center justify-center p-4">
                  Loading news...
                </div>
              ) : newsError ? (
                <div className="flex items-center justify-center p-4 text-red-600">
                  Error loading news: {newsError.message}
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {newsData && newsData.length > 0 ? (
                      newsData.map((news) => (
                        <div key={`${news.publishedDate}-${news.title}-${news.site}`} className="flex gap-4 p-4 border rounded-lg">
                          {news.image && (
                            <div className="flex-shrink-0">
                              <Image 
                                src={news.image} 
                                alt={news.title} 
                                width={96}
                                height={96}
                                className="object-cover rounded-md"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold mb-2">
                              <a 
                                href={news.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-blue-600"
                              >
                                {news.title}
                              </a>
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">{news.text}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{news.site}</span>
                              <span>•</span>
                              <span>{new Date(news.publishedDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500">
                        No news available
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financials">
        <Financials companyData={companyData} />
        </TabsContent>

        {/* Key Metrics Tab */}
        <TabsContent value="keymetrics">
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="annual" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="annual">Annual</TabsTrigger>
                  <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                  <TabsTrigger value="ttm">TTM</TabsTrigger>
                </TabsList>

                <TabsContent value="annual">
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead className="text-right">Revenue Per Share</TableHead>
                          <TableHead className="text-right">Dividend Yield</TableHead>
                          <TableHead className="text-right">ROE</TableHead>
                          <TableHead className="text-right">Net Income Per Share</TableHead>
                          <TableHead className="text-right">Operating Cash Flow Per Share</TableHead>
                          <TableHead className="text-right">Free Cash Flow Per Share</TableHead>
                          <TableHead className="text-right">Cash Per Share</TableHead>
                          <TableHead className="text-right">Book Value Per Share</TableHead>
                          <TableHead className="text-right">Market Cap</TableHead>
                          <TableHead className="text-right">Enterprise Value</TableHead>
                          <TableHead className="text-right">PE Ratio</TableHead>                                                  
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {keyMetricsAnnual && keyMetricsAnnual.length > 0 ? (
                          keyMetricsAnnual.map((metric: KeyMetrics) => (
                            <TableRow key={`annual-${metric.date}-${metric.period}`}>
                              <TableCell>{new Date(metric.date).toLocaleDateString()}</TableCell>
                              <TableCell>{metric.period}</TableCell>
                              <TableCell className="text-right">${metric.revenuePerShare?.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{(metric.dividendYield * 100)?.toFixed(2)}%</TableCell>                         
                              <TableCell className="text-right">{(metric.roe * 100)?.toFixed(2)}%</TableCell>
                              <TableCell className="text-right">${metric.netIncomePerShare?.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${metric.operatingCashFlowPerShare?.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${metric.freeCashFlowPerShare?.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${metric.cashPerShare?.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${metric.bookValuePerShare?.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${formatLargeNumber(metric.marketCap)}</TableCell>
                              <TableCell className="text-right">${formatLargeNumber(metric.enterpriseValue)}</TableCell>
                              <TableCell className="text-right">{metric.peRatio?.toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={54} className="text-center">No annual key metrics data available</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="quarterly">
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead className="text-right">Revenue Per Share</TableHead>
                          <TableHead className="text-right">Dividend Yield</TableHead>
                          <TableHead className="text-right">ROE</TableHead>
                          <TableHead className="text-right">Net Income Per Share</TableHead>
                          <TableHead className="text-right">Operating Cash Flow Per Share</TableHead>
                          <TableHead className="text-right">Free Cash Flow Per Share</TableHead>
                          <TableHead className="text-right">Cash Per Share</TableHead>
                          <TableHead className="text-right">Book Value Per Share</TableHead>
                          <TableHead className="text-right">Market Cap</TableHead>
                          <TableHead className="text-right">Enterprise Value</TableHead>
                          <TableHead className="text-right">PE Ratio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {keyMetricsQuarterly && keyMetricsQuarterly.length > 0 ? (
                          keyMetricsQuarterly.map((metric: KeyMetrics) => (
                            <TableRow key={`quarterly-${metric.date}-${metric.period}`}>
                              <TableCell>{new Date(metric.date).toLocaleDateString()}</TableCell>
                              <TableCell>{metric.period}</TableCell>
                              <TableCell className="text-right">${metric.revenuePerShare?.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{(metric.dividendYield * 100)?.toFixed(2)}%</TableCell>
                              <TableCell className="text-right">{(metric.roe * 100)?.toFixed(2)}%</TableCell>
                              <TableCell className="text-right">${metric.netIncomePerShare?.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${metric.operatingCashFlowPerShare?.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${metric.freeCashFlowPerShare?.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${metric.cashPerShare?.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${metric.bookValuePerShare?.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${formatLargeNumber(metric.marketCap)}</TableCell>
                              <TableCell className="text-right">${formatLargeNumber(metric.enterpriseValue)}</TableCell>
                              <TableCell className="text-right">{metric.peRatio?.toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={13} className="text-center">No quarterly key metrics data available</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="ttm">
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">Revenue Per Share TTM</TableHead>
                          <TableHead className="text-right">ROE TTM</TableHead>
                          <TableHead className="text-right">Net Income Per Share TTM</TableHead>
                          <TableHead className="text-right">Operating Cash Flow Per Share TTM</TableHead>
                          <TableHead className="text-right">Free Cash Flow Per Share TTM</TableHead>
                          <TableHead className="text-right">Cash Per Share TTM</TableHead>
                          <TableHead className="text-right">Book Value Per Share TTM</TableHead>
                          <TableHead className="text-right">Market Cap TTM</TableHead>
                          <TableHead className="text-right">Enterprise Value TTM</TableHead>
                          <TableHead className="text-right">PE Ratio TTM</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {keyMetricsTtm && keyMetricsTtm.length > 0 ? (
                          keyMetricsTtm.map((metric: KeyMetrics) => (
                            <TableRow key={`ttm-${metric.date}-${metric.calendarYear}`}>
                              <TableCell className="text-right">${(metric.revenuePerShareTTM ?? 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right">${(metric.roeTTM ?? 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right">${(metric.netIncomePerShareTTM ?? 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right">${(metric.operatingCashFlowPerShareTTM ?? 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right">${(metric.freeCashFlowPerShareTTM ?? 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right">${(metric.cashPerShareTTM ?? 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right">${(metric.bookValuePerShareTTM ?? 0).toFixed(2)}</TableCell>
                              <TableCell className="text-right">${formatLargeNumber(metric.marketCapTTM ?? 0)}</TableCell>
                              <TableCell className="text-right">${formatLargeNumber(metric.enterpriseValueTTM ?? 0)}</TableCell>
                              <TableCell className="text-right">{(metric.peRatioTTM ?? 0).toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={13} className="text-center">No TTM key metrics data available</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Moving Averages Tab */}
        <TabsContent value="movingavgs">
          <MovingAverages companyData={companyData} symbol={companyData.profile.symbol} />
        </TabsContent>
        {/* Statistics Tab */}
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

        {/* Insiders Tab */}
        <TabsContent value="insiders">
          <Card>
            <CardHeader>
              <CardTitle>Recent Insider Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {insiderLoading ? (
                <div className="flex items-center justify-center p-4">
                  Loading insider trading data...
                </div>
              ) : insiderError ? (
                <div className="flex items-center justify-center p-4 text-red-600">
                  Error loading insider trading data: {insiderError.message}
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filing Date</TableHead>
                        <TableHead>Transaction Date</TableHead>
                        <TableHead>Insider Name</TableHead>
                        <TableHead>Transaction Type</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Shares</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right">Shares Total</TableHead>
                        <TableHead>Form</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(insiderTrades) && insiderTrades.length > 0 ? (
                        insiderTrades.map((trade) => (
                          <TableRow key={`${trade.filingDate}-${trade.reportingName}-${trade.transactionDate}-${trade.transactionType}-${trade.securitiesTransacted}-${trade.price}-${trade.securitiesOwned}`}>
                            <TableCell>{new Date(trade.filingDate).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(trade.transactionDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{trade.reportingName}</p>
                                <p className="text-sm text-gray-500">{trade.typeOfOwner}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                trade.acquistionOrDisposition === 'A' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {trade.transactionType} ({trade.acquistionOrDisposition === 'A' ? 'Buy' : 'Sell'})
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{trade.price ? `$${trade.price.toFixed(2)}` : 'N/A'}</TableCell>
                            <TableCell className="text-right">{formatLargeNumber(trade.securitiesTransacted)}</TableCell>
                            <TableCell className="text-right">${formatLargeNumber(trade.securitiesTransacted * (trade.price || 0))}</TableCell>
                            <TableCell className="text-right">${formatLargeNumber(trade.securitiesOwned)}</TableCell>
                            <TableCell>
                              <a 
                                href={trade.link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {trade.formType}
                              </a>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center">No insider trades available</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Executives Tab */}
        <TabsContent value="executives">
          <Card>
            <CardHeader>
              <CardTitle>Key Executives</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="text-right">Pay</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead className="text-right">Year Born</TableHead>
                      <TableHead className="text-right">Title Since</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(companyData.keyExecutives) && companyData.keyExecutives.length > 0 ? (
                      companyData.keyExecutives.map((executive, index) => (
                        <TableRow key={`${executive.name}-${index}`}>
                          <TableCell className="font-medium">{executive.name}</TableCell>
                          <TableCell>{executive.title}</TableCell>
                          <TableCell className="text-right">
                            {executive.pay ? ` $${formatLargeNumber(executive.pay)}` : 'N/A'}
                          </TableCell>
                          <TableCell>{executive.gender || 'N/A'}</TableCell>
                          <TableCell className="text-right">{executive.yearBorn || 'N/A'}</TableCell>
                          <TableCell className="text-right">{executive.titleSince || 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">No executive data available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanyOutlookCard;