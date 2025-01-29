"use client"
import React, { useState } from 'react';
import Link from 'next/link';
import { PriceHistory } from '@/lib/types';
import {Building2, TrendingUp, Users, Newspaper, AlertCircle, DollarSign, Calendar, PieChart, TrendingDown, Activity} from 'lucide-react';

//UI Components
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/Table";
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';

import { Financials } from '@/components/ui/(fmp)/Financials';

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

  const getRSIStatus = (value: number | null) => {
    if (!value) return { color: 'black', label: 'N/A' };
    if (value >= 70) return { color: 'red', label: '- OVERBOUGHT' };
    if (value <= 30) return { color: 'green', label: '- OVERSOLD' };
    return { color: 'black', label: '' };
  };
  const rsiStatus = getRSIStatus(rsi);
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
  const { annualData: keyMetricsAnnual, quarterlyData: keyMetricsQuarterly, ttmData: keyMetricsTtm, isLoading: keyMetricsLoading } = useKeyMetrics(symbol);
  
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
  const quarterlyData = React.useMemo(() => {
    if (!companyData?.financialsQuarter?.income) {
      return [];
    }

    return companyData.financialsQuarter.income
      .filter(quarter => quarter && quarter.date)
      .map(quarter => ({
        date: new Date(quarter.date).toLocaleDateString('en-US', { 
          month: 'short', 
          year: '2-digit' 
        }),
        revenue: (quarter.revenue || 0) / 1e9,
        profit: (quarter.netIncome || 0) / 1e9
      }))
      .reverse();
  }, [companyData?.financialsQuarter?.income]);

  const annualData = React.useMemo(() => {
    if (!companyData?.financialsAnnual?.income) {
      return [];
    }
  
    return companyData.financialsAnnual.income
      .filter(year => year && year.date)
      .map(year => ({
        date: new Date(year.date).toLocaleDateString('en-US', { 
          year: '2-digit'
        }),
        revenue: (year.revenue || 0) / 1e9,
        profit: (year.netIncome || 0) / 1e9
      }))
      .reverse();
  }, [companyData?.financialsAnnual?.income]);


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
      <Card className="border-2">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              {companyData.profile.image && (
                <img
                  src={companyData.profile.image}
                  alt={companyData.profile.companyName || 'Company logo'}
                  className="w-16 h-16 rounded-full"
                />
              )}
              <div>
                <CardTitle className="text-3xl font-bold">
                  {companyData.profile.companyName}
                  {quote.change && (
                    <span className="ml-2">
                      <Badge variant={quote.change >= 0 ? "positive" : "destructive"}>
                        {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)}
                      </Badge>
                      <span className="mx-1" />
                      <Badge variant={quote.changesPercentage ? (quote.changesPercentage >= 0 ? "positive" : "destructive") : "default"}>
                        {quote.changesPercentage ? (quote.changesPercentage >= 0 ? '+' : '') : ''}
                        {quote.changesPercentage ? quote.changesPercentage.toFixed(2) : 'N/A'}%
                      </Badge>
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-lg">
                  {quote.symbol} • {quote.exchange || 'N/A'}
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">
                ${typeof quote.price === 'number' ? quote.price.toFixed(2) : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">
                Market Cap: {quote.marketCap ? formatMarketCap(quote.marketCap) : 'N/A'}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-secondary rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground">Volume</h3>
              <p className="text-2xl font-bold">{formatLargeNumber(quote.volume)}</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground">RSI (14)</h3>
                {rsiLoading ? (<span className="text-gray-400">Loading...</span>):(
                  <span className="text-2xl font-bold" style={{ color: rsiStatus.color }}>
                    {rsi ? `${safeFormat(rsi)} ${rsiStatus.label}` : 'N/A'}
                  </span>
                )}        
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground">Exchange</h3>
              <p className="text-2xl font-bold">{quote.exchange}</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground">P/E Ratio</h3>
              <p className="text-2xl font-bold">{quote.pe ? quote.pe.toFixed(2) : 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Overview
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
            <DollarSign className="w-4 h-4" /> Dividend History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {companyData.profile.description}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div key="ceo">
                    <h3 className="font-medium text-sm text-muted-foreground">CEO</h3>
                    <p className="font-medium">{companyData.profile.ceo}</p>
                  </div>
                  <div key="employees">
                    <h3 className="font-medium text-sm text-muted-foreground">Employees</h3>
                    <p className="font-medium">{companyData.profile.fullTimeEmployees}</p>
                  </div>
                  <div key="industry">
                    <h3 className="font-medium text-sm text-muted-foreground">Industry</h3>
                    <p className="font-medium">{companyData.profile.industry}</p>
                  </div>
                  <div key="sector">
                    <h3 className="font-medium text-sm text-muted-foreground">Sector</h3>
                    <p className="font-medium">{companyData.profile.sector}</p>
                  </div>
                  <div className="space-y-4">
                    <div key="address">
                      <h3 className="font-medium text-sm text-muted-foreground">Address</h3>
                      <p className="font-medium">
                        {companyData.profile.address}<br />
                        {companyData.profile.city}, {companyData.profile.state} {companyData.profile.zip}<br />
                        {companyData.profile.country}
                      </p>
                    </div>
                    <div key="phone">
                      <h3 className="font-medium text-sm text-muted-foreground">Phone</h3>
                      <p className="font-medium">{companyData.profile.phone}</p>
                    </div>
                    <div key="website">
                      <h3 className="font-medium text-sm text-muted-foreground">Website</h3>
                      <a 
                        href={companyData.profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {companyData.profile.website}
                      </a>
                    </div>          
                  </div>
                  <div>
                    <Link 
                      className="mt-4 inline-block rounded-md bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-400"
                      href={`https://finance.yahoo.com/quote/${symbol}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Yahoo Finance
                    </Link>
                  </div> 
                </div>
                
              </CardContent>
            </Card>

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
                        newsData.map((news, index) => (
                          <div key={`${news.publishedDate}-${news.title}-${news.site}`} className="flex gap-4 p-4 border rounded-lg">
                            {news.image && (
                              <div className="flex-shrink-0">
                                <img 
                                  src={news.image} 
                                  alt={news.title} 
                                  className="w-24 h-24 object-cover rounded-md"
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
          </div>
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
                          keyMetricsAnnual.map((metric) => (
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
                          keyMetricsQuarterly.map((metric) => (
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
                          keyMetricsTtm.map((metric) => (
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

        {/* Dividends Tab */}
        <TabsContent value="dividends">
          <Card>
            <CardHeader>
              <CardTitle>Dividend History</CardTitle>
            </CardHeader>
            <CardContent>
              {dividendLoading ? (
                <div className="flex items-center justify-center p-4">
                  Loading dividend history...
                </div>
              ) : dividendError ? (
                <div className="flex items-center justify-center p-4 text-red-600">
                  Error loading dividend history: {dividendError.message}
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Declaration Date</TableHead>
                        <TableHead>Record Date</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead className="text-right">Dividend</TableHead>
                        <TableHead className="text-right">Adjusted Dividend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dividendHistory && dividendHistory.length > 0 ? (
                        dividendHistory.map((dividend) => (
                          <TableRow key={`${dividend.date}-${dividend.dividend}`}>
                            <TableCell>{new Date(dividend.declarationDate).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(dividend.recordDate).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(dividend.paymentDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">${dividend.dividend.toFixed(4)}</TableCell>
                            <TableCell className="text-right">${dividend.adjDividend.toFixed(4)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">No dividend history available</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanyOutlookCard;