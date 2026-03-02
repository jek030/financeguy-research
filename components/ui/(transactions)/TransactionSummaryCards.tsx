"use client";

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  BarChart3, 
  Coins,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TransactionSummary } from '@/lib/types/transactions';
import { formatCurrency, formatCompactCurrency } from '@/utils/transactionCalculations';
import { cn } from '@/lib/utils';

interface TransactionSummaryCardsProps {
  summary: TransactionSummary;
  className?: string;
}

export default function TransactionSummaryCards({ summary, className }: TransactionSummaryCardsProps) {
  const summaryItems = [
    {
      title: 'Net Cash Flow',
      value: formatCurrency(summary.netCashFlow),
      icon: summary.netCashFlow >= 0 ? TrendingUp : TrendingDown,
      trend: summary.netCashFlow >= 0 ? 'positive' : 'negative',
      description: 'Total money in/out',
    },
    {
      title: 'Total Volume',
      value: formatCompactCurrency(summary.totalVolume),
      icon: DollarSign,
      trend: 'neutral',
      description: 'Sum of all transaction amounts',
    },
    {
      title: 'Total Transactions',
      value: summary.totalTransactions.toLocaleString(),
      icon: Receipt,
      trend: 'neutral',
      description: `${summary.uniqueSymbols} unique symbols`,
    },
    {
      title: 'Total Fees',
      value: formatCurrency(summary.totalFees),
      icon: Coins,
      trend: 'negative',
      description: 'Commissions & fees paid',
    },
  ];

  const volumeMetrics = [
    {
      label: 'Buy Volume',
      value: formatCompactCurrency(summary.totalBuyVolume),
      icon: ArrowDownRight,
      color: 'text-red-400',
    },
    {
      label: 'Sell Volume',
      value: formatCompactCurrency(summary.totalSellVolume),
      icon: ArrowUpRight,
      color: 'text-emerald-400',
    },
    {
      label: 'Date Range',
      value: `${summary.dateRange.from} - ${summary.dateRange.to}`,
      icon: BarChart3,
      color: 'text-muted-foreground',
    },
  ];

  return (
    <div className={cn("space-y-3 font-mono", className)}>
      {/* Main Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaryItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card key={index} className="relative overflow-hidden border-border bg-background">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {item.title}
                </CardTitle>
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-sm border",
                  item.trend === 'positive' && "bg-emerald-500/20 text-emerald-400",
                  item.trend === 'negative' && "bg-red-500/20 text-red-400",
                  item.trend === 'neutral' && "bg-blue-500/20 text-blue-400"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "mb-1 text-xl font-bold",
                  item.trend === 'positive' && "text-emerald-400",
                  item.trend === 'negative' && "text-red-400"
                )}>
                  {item.value}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Secondary Metrics */}
      <Card className="border-border bg-background">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {volumeMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className={cn("rounded-sm border border-border bg-muted/40 p-2", metric.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                    <p className={cn("text-sm font-semibold", metric.color)}>
                      {metric.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Breakdown */}
      {Object.keys(summary.actionBreakdown).length > 0 && (
        <Card className="border-border bg-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Transaction Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.actionBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([action, count]) => (
                  <div 
                    key={action} 
                    className="rounded-sm border border-border bg-muted/30 px-2 py-1"
                  >
                    <span className="text-[11px] font-medium">{action}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">({count})</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
