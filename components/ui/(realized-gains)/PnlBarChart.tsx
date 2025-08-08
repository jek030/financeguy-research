"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PeriodStats } from '@/utils/aggregateByPeriod';
import { formatCurrency } from '@/utils/tradeCalculations';

interface PnlBarChartProps {
  data: PeriodStats[];
  type: 'monthly' | 'weekly';
  onPeriodClick?: (periodKey: string) => void;
  selectedPeriod?: string;
  className?: string;
}

export default function PnlBarChart({ 
  data, 
  type, 
  onPeriodClick, 
  selectedPeriod,
  className 
}: PnlBarChartProps) {
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload?: PeriodStats }>; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data) return null;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-4 max-w-xs">
          <p className="font-semibold text-sm mb-2">{data.period}</p>
          <div className="space-y-1 text-xs">
            <p>
              <span className="text-muted-foreground">Net P&L: </span>
              <span className={(data.netGainLoss ?? 0) >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                {formatCurrency(data.netGainLoss ?? 0)}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Trades: </span>
              <span className="font-medium">{data.tradeCount ?? 0}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Win Rate: </span>
              <span className="font-medium">{(data.winRate ?? 0).toFixed(1)}%</span>
            </p>
            <p>
              <span className="text-muted-foreground">Avg Gain: </span>
              <span className="text-green-600 font-medium">{formatCurrency(data.averageGain ?? 0)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Avg Loss: </span>
              <span className="text-red-600 font-medium">{formatCurrency(data.averageLoss ?? 0)}</span>
            </p>
          </div>
          {onPeriodClick && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              Click to filter trades
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const getBarColor = (period: PeriodStats) => {
    if (selectedPeriod === period.periodKey) {
      return period.netGainLoss >= 0 ? 'hsl(142, 71%, 35%)' : 'hsl(0, 84%, 50%)'; // Darker when selected
    }
    return period.netGainLoss >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'; // Standard colors
  };

  const handleBarClick = (data: { activePayload?: Array<{ payload?: { periodKey?: string } }> }) => {
    if (onPeriodClick && data?.activePayload?.[0]?.payload?.periodKey) {
      onPeriodClick(data.activePayload[0].payload.periodKey);
    }
  };

  // Prepare chart data with shorter labels for x-axis
  const chartData = data.map(period => ({
    ...period,
    shortLabel: type === 'monthly' 
      ? period.period.split(' ')[0] // "Jan" from "Jan 2025"
      : period.period.split(' - ')[0].replace(/\w+ /, '') // "15" from "Jan 15 - Jan 21, 2025"
  }));

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Performance Over Time ({type})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No {type} data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Performance Over Time ({type})</CardTitle>
        <p className="text-sm text-muted-foreground">
          {chartData.length} {type === 'monthly' ? 'months' : 'weeks'} • 
          Click bars to filter trades
          {selectedPeriod && ' • Period filter active'}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
              onClick={handleBarClick}
              style={{ cursor: onPeriodClick ? 'pointer' : 'default' }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="shortLabel"
                fontSize={12}
                angle={type === 'weekly' ? -45 : 0}
                textAnchor={type === 'weekly' ? 'end' : 'middle'}
                height={type === 'weekly' ? 60 : 30}
                interval={0}
              />
              <YAxis 
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
              <Bar 
                dataKey="netGainLoss" 
                radius={[2, 2, 0, 0]}
                style={{ cursor: onPeriodClick ? 'pointer' : 'default' }}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry)}
                    stroke={selectedPeriod === entry.periodKey ? '#333' : 'none'}
                    strokeWidth={selectedPeriod === entry.periodKey ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 