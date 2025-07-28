"use client";

import React from 'react';
import { TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TradeSummary } from '@/lib/types/trading';
import { formatCurrency, formatPercentage } from '@/utils/tradeCalculations';
import { cn } from '@/lib/utils';

interface SummaryCardsProps {
  summary: TradeSummary;
  className?: string;
}

export default function SummaryCards({ summary, className }: SummaryCardsProps) {
  const summaryItems = [
    {
      title: 'Total Gain/Loss',
      value: formatCurrency(summary.totalGainLoss),
      icon: summary.totalGainLoss >= 0 ? TrendingUp : TrendingDown,
      trend: summary.totalGainLoss >= 0 ? 'positive' : 'negative',
      description: 'Net realized gain/loss',
    },
    {
      title: 'Total Trades',
      value: summary.totalTrades.toLocaleString(),
      icon: BarChart3,
      trend: 'neutral',
      description: 'Total number of completed trades',
    },
    {
      title: 'Win Rate',
      value: formatPercentage(summary.winRate),
      icon: Target,
      trend: summary.winRate >= 50 ? 'positive' : 'negative',
      description: `${summary.winningTrades} wins, ${summary.losingTrades} losses`,
    },
    {
      title: 'Average Win',
      value: formatCurrency(summary.averageWin),
      icon: TrendingUp,
      trend: 'positive',
      description: `Avg per winning trade`,
    },
  ];

  const additionalMetrics = [
    {
      label: 'Average Loss',
      value: formatCurrency(summary.averageLoss),
      isNegative: true,
    },
    {
      label: 'Win/Loss Ratio',
      value: summary.averageLoss > 0 ? (summary.averageWin / summary.averageLoss).toFixed(2) : 'N/A',
      isNegative: false,
    },
    {
      label: 'Average Days in Trade',
      value: summary.averageDaysInTrade.toFixed(1) + ' days',
      isNegative: false,
    },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {item.title}
                </CardTitle>
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  item.trend === 'positive' && "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400",
                  item.trend === 'negative' && "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
                  item.trend === 'neutral' && "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold mb-1",
                  item.trend === 'positive' && "text-green-600 dark:text-green-400",
                  item.trend === 'negative' && "text-red-600 dark:text-red-400"
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

      {/* Additional Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {additionalMetrics.map((metric, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{metric.label}:</span>
                <span className={cn(
                  "font-semibold",
                  metric.isNegative && "text-red-600 dark:text-red-400"
                )}>
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 