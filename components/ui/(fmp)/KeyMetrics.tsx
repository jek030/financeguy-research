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
            <div className="relative border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead className="w-[90px]">Period</TableHead>
                    <TableHead className="w-[100px] text-right">Revenue/Share</TableHead>
                    <TableHead className="w-[90px] text-right">Div Yield</TableHead>
                    <TableHead className="w-[70px] text-right">ROE</TableHead>
                    <TableHead className="w-[100px] text-right">Net Inc/Share</TableHead>
                    <TableHead className="w-[100px] text-right">Op CF/Share</TableHead>
                    <TableHead className="w-[100px] text-right">FCF/Share</TableHead>
                    <TableHead className="w-[90px] text-right">Cash/Share</TableHead>
                    <TableHead className="w-[100px] text-right">Book Value/Share</TableHead>
                    <TableHead className="w-[100px] text-right">Market Cap</TableHead>
                    <TableHead className="w-[100px] text-right">Enterprise Value</TableHead>
                    <TableHead className="w-[80px] text-right">PE Ratio</TableHead>                                                  
                  </TableRow>
                </TableHeader>
              </Table>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableBody>
                    {keyMetricsAnnual && keyMetricsAnnual.length > 0 ? (
                      keyMetricsAnnual.map((metric: KeyMetricsType) => (
                        <TableRow key={`annual-${metric.date}-${metric.period}`}>
                          <TableCell className="w-[100px]">{new Date(metric.date).toLocaleDateString()}</TableCell>
                          <TableCell className="w-[90px]">{metric.period}</TableCell>
                          <TableCell className="w-[100px] text-right">${metric.revenuePerShare?.toFixed(2)}</TableCell>
                          <TableCell className="w-[90px] text-right">{(metric.dividendYield * 100)?.toFixed(2)}%</TableCell>                         
                          <TableCell className="w-[70px] text-right">{(metric.roe * 100)?.toFixed(2)}%</TableCell>
                          <TableCell className="w-[100px] text-right">${metric.netIncomePerShare?.toFixed(2)}</TableCell>
                          <TableCell className="w-[100px] text-right">${metric.operatingCashFlowPerShare?.toFixed(2)}</TableCell>
                          <TableCell className="w-[100px] text-right">${metric.freeCashFlowPerShare?.toFixed(2)}</TableCell>
                          <TableCell className="w-[90px] text-right">${metric.cashPerShare?.toFixed(2)}</TableCell>
                          <TableCell className="w-[100px] text-right">${metric.bookValuePerShare?.toFixed(2)}</TableCell>
                          <TableCell className="w-[100px] text-right">${formatLargeNumber(metric.marketCap)}</TableCell>
                          <TableCell className="w-[100px] text-right">${formatLargeNumber(metric.enterpriseValue)}</TableCell>
                          <TableCell className="w-[80px] text-right">{metric.peRatio?.toFixed(2)}</TableCell>
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
            </div>
          </TabsContent>

          <TabsContent value="quarterly">
            <div className="relative border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead className="w-[90px]">Period</TableHead>
                    <TableHead className="w-[100px] text-right">Revenue/Share</TableHead>
                    <TableHead className="w-[90px] text-right">Div Yield</TableHead>
                    <TableHead className="w-[70px] text-right">ROE</TableHead>
                    <TableHead className="w-[100px] text-right">Net Inc/Share</TableHead>
                    <TableHead className="w-[100px] text-right">Op CF/Share</TableHead>
                    <TableHead className="w-[100px] text-right">FCF/Share</TableHead>
                    <TableHead className="w-[90px] text-right">Cash/Share</TableHead>
                    <TableHead className="w-[100px] text-right">Book Value/Share</TableHead>
                    <TableHead className="w-[100px] text-right">Market Cap</TableHead>
                    <TableHead className="w-[100px] text-right">Enterprise Value</TableHead>
                    <TableHead className="w-[80px] text-right">PE Ratio</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableBody>
                    {keyMetricsQuarterly && keyMetricsQuarterly.length > 0 ? (
                      keyMetricsQuarterly.map((metric: KeyMetricsType) => (
                        <TableRow key={`quarterly-${metric.date}-${metric.period}`}>
                          <TableCell className="w-[100px]">{new Date(metric.date).toLocaleDateString()}</TableCell>
                          <TableCell className="w-[90px]">{metric.period}</TableCell>
                          <TableCell className="w-[100px] text-right">${metric.revenuePerShare?.toFixed(2)}</TableCell>
                          <TableCell className="w-[90px] text-right">{(metric.dividendYield * 100)?.toFixed(2)}%</TableCell>
                          <TableCell className="w-[70px] text-right">{(metric.roe * 100)?.toFixed(2)}%</TableCell>
                          <TableCell className="w-[100px] text-right">${metric.netIncomePerShare?.toFixed(2)}</TableCell>
                          <TableCell className="w-[100px] text-right">${metric.operatingCashFlowPerShare?.toFixed(2)}</TableCell>
                          <TableCell className="w-[100px] text-right">${metric.freeCashFlowPerShare?.toFixed(2)}</TableCell>
                          <TableCell className="w-[90px] text-right">${metric.cashPerShare?.toFixed(2)}</TableCell>
                          <TableCell className="w-[100px] text-right">${metric.bookValuePerShare?.toFixed(2)}</TableCell>
                          <TableCell className="w-[100px] text-right">${formatLargeNumber(metric.marketCap)}</TableCell>
                          <TableCell className="w-[100px] text-right">${formatLargeNumber(metric.enterpriseValue)}</TableCell>
                          <TableCell className="w-[80px] text-right">{metric.peRatio?.toFixed(2)}</TableCell>
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
            </div>
          </TabsContent>

          <TabsContent value="ttm">
            <div className="relative border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] text-right">Revenue TTM</TableHead>
                    <TableHead className="w-[70px] text-right">ROE TTM</TableHead>
                    <TableHead className="w-[100px] text-right">Net Inc TTM</TableHead>
                    <TableHead className="w-[100px] text-right">Op CF TTM</TableHead>
                    <TableHead className="w-[100px] text-right">FCF TTM</TableHead>
                    <TableHead className="w-[90px] text-right">Cash TTM</TableHead>
                    <TableHead className="w-[100px] text-right">Book Value TTM</TableHead>
                    <TableHead className="w-[100px] text-right">Market Cap</TableHead>
                    <TableHead className="w-[100px] text-right">Enterprise Value</TableHead>
                    <TableHead className="w-[80px] text-right">PE Ratio</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableBody>
                    {keyMetricsTtm && keyMetricsTtm.length > 0 ? (
                      keyMetricsTtm.map((metric: KeyMetricsType) => (
                        <TableRow key={`ttm-${metric.date}-${metric.calendarYear}`}>
                          <TableCell className="w-[100px] text-right">${(metric.revenuePerShareTTM ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="w-[70px] text-right">${(metric.roeTTM ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="w-[100px] text-right">${(metric.netIncomePerShareTTM ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="w-[100px] text-right">${(metric.operatingCashFlowPerShareTTM ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="w-[100px] text-right">${(metric.freeCashFlowPerShareTTM ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="w-[90px] text-right">${(metric.cashPerShareTTM ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="w-[100px] text-right">${(metric.bookValuePerShareTTM ?? 0).toFixed(2)}</TableCell>
                          <TableCell className="w-[100px] text-right">${formatLargeNumber(metric.marketCapTTM ?? 0)}</TableCell>
                          <TableCell className="w-[100px] text-right">${formatLargeNumber(metric.enterpriseValueTTM ?? 0)}</TableCell>
                          <TableCell className="w-[80px] text-right">{(metric.peRatioTTM ?? 0).toFixed(2)}</TableCell>
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
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default KeyMetrics; 