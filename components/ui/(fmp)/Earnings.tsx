"use client"
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { useEarnings } from '@/hooks/FMP/useEarnings';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";
import { InfoIcon } from "lucide-react";

// Using the same interface as defined in the useEarnings hook
interface IncomeStatement {
  date: string;
  fillingDate: string;
  revenue: number;
  netIncome: number;
  epsdiluted: number;
  period?: string;
  weightedAverageShsOutDil: number;
}

interface EarningsProps {
  symbol: string;
}

function formatLargeNumber(num: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
}

function formatEPS(num: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 6,
  }).format(num);
}

function formatShares(num: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(num);
}

function calculatePercentageChange(current: number, previous: number): number {
  if (!previous) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

const AnnualTable: React.FC<{ data: IncomeStatement[] | undefined }> = ({ data = [] }) => (
  <div className="relative border rounded-lg">
      <div className="h-[600px] overflow-auto">
    <Table>
      <TableHeader className="sticky top-0 bg-background z-20">
        <TableRow>
          <TableHead>Filing Date</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Revenue</TableHead>
          <TableHead>Revenue % Chg</TableHead>
          <TableHead>Net Income</TableHead>
          <TableHead>Shares (Diluted)</TableHead>
          <TableHead>
            <div className="flex items-center gap-1">
              EPS
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>EPS (Diluted) = Net Income ÷ Weighted Average Shares Outstanding (Diluted)</p>
                    <p className="text-xs text-muted-foreground mt-1">Rounded to 6 decimal places</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </TableHead>
          <TableHead>EPS % Chg</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((statement, index) => {
          // Find previous year's data for percentage change calculation
          const previousStatement = index < data.length - 1 ? data[index + 1] : null;
          const previousRevenue = previousStatement ? previousStatement.revenue : 0;
          const previousEps = previousStatement ? previousStatement.epsdiluted : 0;
          
          // Calculate percentage changes
          const revenueChange = previousRevenue ? calculatePercentageChange(statement.revenue, previousRevenue) : 0;
          const epsChange = previousEps ? calculatePercentageChange(statement.epsdiluted, previousEps) : 0;
          
          return (
            <TableRow key={statement.date}>
              <TableCell>{format(new Date(statement.fillingDate), 'MM/dd/yyyy')}</TableCell>
              <TableCell>{format(new Date(statement.date), 'MM/dd/yyyy')}</TableCell>
              <TableCell>{formatLargeNumber(statement.revenue)}</TableCell>
              <TableCell className={cn(
                "",
                revenueChange > 0 ? "text-positive" : revenueChange < 0 ? "text-negative" : ""
              )}>
                {revenueChange ? `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(2)}%` : 'N/A'}
              </TableCell>
              <TableCell>{formatLargeNumber(statement.netIncome)}</TableCell>
              <TableCell>{formatShares(statement.weightedAverageShsOutDil)}</TableCell>
              <TableCell>{formatEPS(statement.epsdiluted)}</TableCell>
              <TableCell className={cn(
                "",
                epsChange > 0 ? "text-positive" : epsChange < 0 ? "text-negative" : ""
              )}>
                {epsChange ? `${epsChange > 0 ? '+' : ''}${epsChange.toFixed(2)}%` : 'N/A'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
  </div>
);

const QuarterlyTable: React.FC<{ data: IncomeStatement[] | undefined }> = ({ data = [] }) => (
  <div className="relative border rounded-lg">
      <div className="h-[600px] overflow-auto">
    <Table>
      <TableHeader className="sticky top-0 bg-background z-20">
        <TableRow>
          <TableHead>Filing Date</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Revenue</TableHead>
          <TableHead>Revenue % Chg</TableHead>
          <TableHead>Net Income</TableHead>
          <TableHead>Shares (Diluted)</TableHead>
          <TableHead>
            <div className="flex items-center gap-1">
              EPS
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>EPS (Diluted) = Net Income ÷ Weighted Average Shares Outstanding (Diluted)</p>
                    <p className="text-xs text-muted-foreground mt-1">Rounded to 6 decimal places</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </TableHead>
          <TableHead>EPS % Chg</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((statement, index) => {
          // Find same quarter last year for % change calculation
          const sameQuarterLastYear = data.find(s => 
            s.period === statement.period && 
            new Date(s.date).getFullYear() === new Date(statement.date).getFullYear() - 1
          );
          
          const previousRevenue = sameQuarterLastYear ? sameQuarterLastYear.revenue : 0;
          const previousEps = sameQuarterLastYear ? sameQuarterLastYear.epsdiluted : 0;
          
          // Calculate percentage changes
          const revenueChange = previousRevenue ? calculatePercentageChange(statement.revenue, previousRevenue) : 0;
          const epsChange = previousEps ? calculatePercentageChange(statement.epsdiluted, previousEps) : 0;
          
          return (
            <TableRow key={statement.date}>
              <TableCell>{format(new Date(statement.fillingDate), 'MM/dd/yyyy')}</TableCell>
              <TableCell>{statement.period}</TableCell>
              <TableCell>{format(new Date(statement.date), 'MM/dd/yyyy')}</TableCell>
              <TableCell>{formatLargeNumber(statement.revenue)}</TableCell>
              <TableCell className={cn(
                "",
                revenueChange > 0 ? "text-positive" : revenueChange < 0 ? "text-negative" : ""
              )}>
                {revenueChange ? `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(2)}%` : 'N/A'}
              </TableCell>
              <TableCell>{formatLargeNumber(statement.netIncome)}</TableCell>
              <TableCell>{formatShares(statement.weightedAverageShsOutDil)}</TableCell>
              <TableCell>{formatEPS(statement.epsdiluted)}</TableCell>
              <TableCell className={cn(
                "",
                epsChange > 0 ? "text-positive" : epsChange < 0 ? "text-negative" : ""
              )}>
                {epsChange ? `${epsChange > 0 ? '+' : ''}${epsChange.toFixed(2)}%` : 'N/A'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
  </div>
);

export const Earnings: React.FC<EarningsProps> = ({ symbol }) => {
  const { annualData, quarterlyData, isLoading, error } = useEarnings(symbol);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Statements</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            Loading income statement data...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-4 text-red-600">
            Error loading income statement data: {error.message}
          </div>
        ) : (
          <Tabs defaultValue="annual" className="space-y-4">
            <TabsList>
              <TabsTrigger value="annual">Annual</TabsTrigger>
              <TabsTrigger value="quarter">Quarterly</TabsTrigger>
            </TabsList>
            <TabsContent value="annual">
              <AnnualTable data={annualData} />
            </TabsContent>
            <TabsContent value="quarter">
              <QuarterlyTable data={quarterlyData} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default Earnings; 