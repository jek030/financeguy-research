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
    <div className={cn("space-y-4", className)}>
      {/* Main Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card key={index} className="relative overflow-hidden bg-card/80 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {item.title}
                </CardTitle>
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  item.trend === 'positive' && "bg-emerald-500/20 text-emerald-400",
                  item.trend === 'negative' && "bg-red-500/20 text-red-400",
                  item.trend === 'neutral' && "bg-blue-500/20 text-blue-400"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold font-mono mb-1",
                  item.trend === 'positive' && "text-emerald-400",
                  item.trend === 'negative' && "text-red-400"
                )}>
                  {item.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Secondary Metrics */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {volumeMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-muted/50", metric.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className={cn("font-semibold font-mono text-sm", metric.color)}>
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
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
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
                    className="px-3 py-1.5 rounded-full bg-muted/50 border border-border/50"
                  >
                    <span className="text-xs font-medium">{action}</span>
                    <span className="text-xs text-muted-foreground ml-2">({count})</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
