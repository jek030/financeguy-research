"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { PeriodStats } from '@/utils/aggregateByPeriod';
import { formatCurrency, formatPercentage } from '@/utils/tradeCalculations';
import { cn } from '@/lib/utils';

interface TimePeriodStatsTableProps {
  data: PeriodStats[];
  type: 'monthly' | 'weekly';
  onPeriodClick?: (periodKey: string) => void;
  selectedPeriod?: string;
  className?: string;
}

export default function TimePeriodStatsTable({ 
  data, 
  type, 
  onPeriodClick, 
  selectedPeriod,
  className 
}: TimePeriodStatsTableProps) {
  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{type === 'monthly' ? 'Monthly' : 'Weekly'} Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No {type} data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{type === 'monthly' ? 'Monthly' : 'Weekly'} Performance Details</CardTitle>
        <p className="text-sm text-muted-foreground">
          {data.length} {type === 'monthly' ? 'months' : 'weeks'} of trading data
          {onPeriodClick && ' • Click rows to filter trades'}
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="px-3 py-3 text-xs font-semibold whitespace-nowrap">
                  Period
                </TableHead>
                <TableHead className="px-3 py-3 text-xs font-semibold whitespace-nowrap text-center">
                  Trades
                </TableHead>
                <TableHead className="px-3 py-3 text-xs font-semibold whitespace-nowrap text-right">
                  Net P&L
                </TableHead>
                <TableHead className="px-3 py-3 text-xs font-semibold whitespace-nowrap text-center">
                  Win Rate
                </TableHead>
                <TableHead className="px-3 py-3 text-xs font-semibold whitespace-nowrap text-right">
                  Avg Gain
                </TableHead>
                <TableHead className="px-3 py-3 text-xs font-semibold whitespace-nowrap text-right">
                  Avg Loss
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((period) => (
                <TableRow
                  key={period.periodKey}
                  className={cn(
                    "transition-colors",
                    onPeriodClick && "cursor-pointer hover:bg-muted/50",
                    selectedPeriod === period.periodKey && "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                  )}
                  onClick={() => onPeriodClick?.(period.periodKey)}
                >
                  <TableCell className="px-3 py-2 text-xs font-medium whitespace-nowrap">
                    {period.period}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-center">
                    {period.tradeCount}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-right">
                    <span className={cn(
                      "font-semibold",
                      period.netGainLoss >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(period.netGainLoss)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-center">
                    <span className={cn(
                      "font-medium",
                      period.winRate >= 50 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatPercentage(period.winRate)}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-right">
                    <span className="text-green-600 font-medium">
                      {period.averageGain > 0 ? formatCurrency(period.averageGain) : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-right">
                    <span className="text-red-600 font-medium">
                      {period.averageLoss > 0 ? formatCurrency(period.averageLoss) : '-'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Summary Row */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <p className="text-muted-foreground">Total Periods</p>
              <p className="font-semibold">{data.length}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Total Trades</p>
              <p className="font-semibold">{data.reduce((sum, p) => sum + p.tradeCount, 0)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Total P&L</p>
              <p className={cn(
                "font-semibold",
                data.reduce((sum, p) => sum + p.netGainLoss, 0) >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(data.reduce((sum, p) => sum + p.netGainLoss, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Profitable Periods</p>
              <p className="font-semibold">
                {data.filter(p => p.netGainLoss > 0).length} of {data.length}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 