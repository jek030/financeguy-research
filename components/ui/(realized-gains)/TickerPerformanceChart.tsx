"use client";

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TickerPerformance } from '@/lib/types/trading';
import { formatCurrency } from '@/utils/tradeCalculations';

interface TickerPerformanceChartProps {
  data: TickerPerformance[];
  onTickerClick?: (ticker: string) => void;
  className?: string;
}

export default function TickerPerformanceChart({ data, onTickerClick, className }: TickerPerformanceChartProps) {
  const [viewType, setViewType] = useState<'gains' | 'losses'>('gains');
  
  // Sort and filter data based on view type
  const sortedData = [...data].sort((a, b) => {
    if (viewType === 'gains') {
      return b.totalGainLoss - a.totalGainLoss; // Highest gains first
    } else {
      return a.totalGainLoss - b.totalGainLoss; // Lowest losses first
    }
  });
  
  // Filter for gains or losses and take top 20
  const filteredData = sortedData.filter(item => 
    viewType === 'gains' ? item.totalGainLoss > 0 : item.totalGainLoss < 0
  );
  
  const chartData = filteredData.slice(0, 20);

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Performance by Ticker</CardTitle>
              <p className="text-sm text-muted-foreground">
                No {viewType} available
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewType === 'gains' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('gains')}
              >
                Top Gains
              </Button>
              <Button
                variant={viewType === 'losses' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('losses')}
              >
                Top Losses
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No {viewType} to display
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleBarClick = (data: any) => {
    if (onTickerClick && data?.activePayload?.[0]?.payload?.ticker) {
      onTickerClick(data.activePayload[0].payload.ticker);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Performance by Ticker</CardTitle>
            <p className="text-sm text-muted-foreground">
              {chartData.length < filteredData.length && 
                `Showing top ${chartData.length} of ${filteredData.length} ${viewType}`
              }
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewType === 'gains' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('gains')}
            >
              Top Gains
            </Button>
            <Button
              variant={viewType === 'losses' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('losses')}
            >
              Top Losses
            </Button>
          </div>
        </div>
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
              style={{ cursor: onTickerClick ? 'pointer' : 'default' }}
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
              <Bar 
                dataKey="totalGainLoss" 
                radius={[2, 2, 0, 0]}
                style={{ cursor: onTickerClick ? 'pointer' : 'default' }}
                maxBarSize={60}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry.totalGainLoss)}
                    style={{ cursor: onTickerClick ? 'pointer' : 'default' }}
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