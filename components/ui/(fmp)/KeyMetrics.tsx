"use client"
import React from 'react';
import type { KeyMetrics as KeyMetricsType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { useKeyMetrics } from '@/hooks/FMP/useKeyMetrics';

interface KeyMetricsProps {
  symbol: string;
}

function formatLargeNumber(num: number) {
  return new Intl.NumberFormat('en-US').format(num);
}

const AnnualTable: React.FC<{ data: KeyMetricsType[] | undefined }> = ({ data = [] }) => (
  <div className="relative border rounded-lg">
    <div className="h-[600px] overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-20">
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Revenue/Share</TableHead>
            <TableHead>Div Yield</TableHead>
            <TableHead>ROE</TableHead>
            <TableHead>Net Inc/Share</TableHead>
            <TableHead>Op CF/Share</TableHead>
            <TableHead>FCF/Share</TableHead>
            <TableHead>Cash/Share</TableHead>
            <TableHead>Book Value/Share</TableHead>
            <TableHead>Market Cap</TableHead>
            <TableHead>Enterprise Value</TableHead>
            <TableHead>PE Ratio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data && data.length > 0 ? (
            data.map((metric: KeyMetricsType) => (
              <TableRow key={`annual-${metric.date}-${metric.period}`}>
                <TableCell>{new Date(metric.date).toLocaleDateString()}</TableCell>
                <TableCell>{metric.period}</TableCell>
                <TableCell>${metric.revenuePerShare?.toFixed(2)}</TableCell>
                <TableCell>{(metric.dividendYield * 100)?.toFixed(2)}%</TableCell>
                <TableCell>{(metric.roe * 100)?.toFixed(2)}%</TableCell>
                <TableCell>${metric.netIncomePerShare?.toFixed(2)}</TableCell>
                <TableCell>${metric.operatingCashFlowPerShare?.toFixed(2)}</TableCell>
                <TableCell>${metric.freeCashFlowPerShare?.toFixed(2)}</TableCell>
                <TableCell>${metric.cashPerShare?.toFixed(2)}</TableCell>
                <TableCell>${metric.bookValuePerShare?.toFixed(2)}</TableCell>
                <TableCell>${formatLargeNumber(metric.marketCap)}</TableCell>
                <TableCell>${formatLargeNumber(metric.enterpriseValue)}</TableCell>
                <TableCell>{metric.peRatio?.toFixed(2)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={13} className="text-center">No annual key metrics data available</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  </div>
);

const QuarterlyTable: React.FC<{ data: KeyMetricsType[] | undefined }> = ({ data = [] }) => (
  <div className="relative border rounded-lg">
    <div className="h-[600px] overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-20">
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Revenue/Share</TableHead>
            <TableHead>Div Yield</TableHead>
            <TableHead>ROE</TableHead>
            <TableHead>Net Inc/Share</TableHead>
            <TableHead>Op CF/Share</TableHead>
            <TableHead>FCF/Share</TableHead>
            <TableHead>Cash/Share</TableHead>
            <TableHead>Book Value/Share</TableHead>
            <TableHead>Market Cap</TableHead>
            <TableHead>Enterprise Value</TableHead>
            <TableHead>PE Ratio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data && data.length > 0 ? (
            data.map((metric: KeyMetricsType) => (
              <TableRow key={`quarterly-${metric.date}-${metric.period}`}>
                <TableCell>{new Date(metric.date).toLocaleDateString()}</TableCell>
                <TableCell>{metric.period}</TableCell>
                <TableCell>${metric.revenuePerShare?.toFixed(2)}</TableCell>
                <TableCell>{(metric.dividendYield * 100)?.toFixed(2)}%</TableCell>
                <TableCell>{(metric.roe * 100)?.toFixed(2)}%</TableCell>
                <TableCell>${metric.netIncomePerShare?.toFixed(2)}</TableCell>
                <TableCell>${metric.operatingCashFlowPerShare?.toFixed(2)}</TableCell>
                <TableCell>${metric.freeCashFlowPerShare?.toFixed(2)}</TableCell>
                <TableCell>${metric.cashPerShare?.toFixed(2)}</TableCell>
                <TableCell>${metric.bookValuePerShare?.toFixed(2)}</TableCell>
                <TableCell>${formatLargeNumber(metric.marketCap)}</TableCell>
                <TableCell>${formatLargeNumber(metric.enterpriseValue)}</TableCell>
                <TableCell>{metric.peRatio?.toFixed(2)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={13} className="text-center">No quarterly key metrics data available</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  </div>
);

const TTMTable: React.FC<{ data: KeyMetricsType[] | undefined }> = ({ data = [] }) => (
  <div className="relative border rounded-lg">
    <div className="h-[600px] overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-20">
          <TableRow>
            <TableHead>Revenue TTM</TableHead>
            <TableHead>ROE TTM</TableHead>
            <TableHead>Net Inc TTM</TableHead>
            <TableHead>Op CF TTM</TableHead>
            <TableHead>FCF TTM</TableHead>
            <TableHead>Cash TTM</TableHead>
            <TableHead>Book Value TTM</TableHead>
            <TableHead>Market Cap</TableHead>
            <TableHead>Enterprise Value</TableHead>
            <TableHead>PE Ratio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data && data.length > 0 ? (
            data.map((metric: KeyMetricsType) => (
              <TableRow key={`ttm-${metric.date}-${metric.calendarYear}`}>
                <TableCell>${(metric.revenuePerShareTTM ?? 0).toFixed(2)}</TableCell>
                <TableCell>${(metric.roeTTM ?? 0).toFixed(2)}</TableCell>
                <TableCell>${(metric.netIncomePerShareTTM ?? 0).toFixed(2)}</TableCell>
                <TableCell>${(metric.operatingCashFlowPerShareTTM ?? 0).toFixed(2)}</TableCell>
                <TableCell>${(metric.freeCashFlowPerShareTTM ?? 0).toFixed(2)}</TableCell>
                <TableCell>${(metric.cashPerShareTTM ?? 0).toFixed(2)}</TableCell>
                <TableCell>${(metric.bookValuePerShareTTM ?? 0).toFixed(2)}</TableCell>
                <TableCell>${formatLargeNumber(metric.marketCapTTM ?? 0)}</TableCell>
                <TableCell>${formatLargeNumber(metric.enterpriseValueTTM ?? 0)}</TableCell>
                <TableCell>{(metric.peRatioTTM ?? 0).toFixed(2)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={10} className="text-center">No TTM key metrics data available</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  </div>
);

export const KeyMetrics: React.FC<KeyMetricsProps> = ({ symbol }) => {
  const { annualData, quarterlyData, ttmData } = useKeyMetrics(symbol);

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
            <AnnualTable data={annualData} />
          </TabsContent>
          <TabsContent value="quarterly">
            <QuarterlyTable data={quarterlyData} />
          </TabsContent>
          <TabsContent value="ttm">
            <TTMTable data={ttmData} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default KeyMetrics; 