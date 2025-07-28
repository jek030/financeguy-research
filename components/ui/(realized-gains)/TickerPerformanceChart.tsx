"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TickerPerformance } from '@/lib/types/trading';
import { formatCurrency } from '@/utils/tradeCalculations';

interface TickerPerformanceChartProps {
  data: TickerPerformance[];
  className?: string;
}

export default function TickerPerformanceChart({ data, className }: TickerPerformanceChartProps) {
  // Take top 20 tickers to avoid overcrowding
  const chartData = data.slice(0, 20);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{label}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Gain/Loss: </span>
            <span className={data.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}>
              {formatCurrency(data.totalGainLoss)}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Trades: </span>
            {data.tradeCount}
          </p>
        </div>
      );
    }
    return null;
  };

  // Color bars based on positive/negative values
  const getBarColor = (value: number) => {
    return value >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)';
  };

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Performance by Ticker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Performance by Ticker</CardTitle>
        <p className="text-sm text-muted-foreground">
          {chartData.length < data.length && 
            `Showing top ${chartData.length} of ${data.length} tickers`
          }
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
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="ticker" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis 
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="totalGainLoss" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry.totalGainLoss)} 
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