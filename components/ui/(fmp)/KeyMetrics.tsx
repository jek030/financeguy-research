"use client"
import React from 'react';
import type { KeyMetrics as KeyMetricsType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useKeyMetrics } from '@/hooks/FMP/useKeyMetrics';

interface KeyMetricsProps {
  symbol: string;
}

function formatLargeNumber(num: number) {
  return new Intl.NumberFormat('en-US').format(num);
}

export const KeyMetrics: React.FC<KeyMetricsProps> = ({ symbol }) => {
  const { annualData: keyMetricsAnnual, quarterlyData: keyMetricsQuarterly, ttmData: keyMetricsTtm } = useKeyMetrics(symbol);

  return (
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
                    keyMetricsAnnual.map((metric: KeyMetricsType) => (
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
                      <TableCell colSpan={13} className="text-center">No annual key metrics data available</TableCell>
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
                    keyMetricsQuarterly.map((metric: KeyMetricsType) => (
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
                    keyMetricsTtm.map((metric: KeyMetricsType) => (
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
                      <TableCell colSpan={10} className="text-center">No TTM key metrics data available</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default KeyMetrics; 