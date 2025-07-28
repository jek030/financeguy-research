"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CumulativeGainData } from '@/lib/types/trading';
import { formatCurrency } from '@/utils/tradeCalculations';
import { format, parseISO } from 'date-fns';

interface CumulativeGainsChartProps {
  data: CumulativeGainData[];
  className?: string;
}

export default function CumulativeGainsChart({ data, className }: CumulativeGainsChartProps) {
  // Process data for better chart display
  const chartData = data.map((item, index) => ({
    ...item,
    index,
    formattedDate: (() => {
      try {
        // Try to parse the date and format it
        const date = parseISO(item.date);
        return format(date, 'MMM dd, yyyy');
      } catch {
        // If parsing fails, return the original date
        return item.date;
      }
    })(),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{data.formattedDate}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Cumulative Gain: </span>
            <span className={data.cumulativeGain >= 0 ? "text-green-600" : "text-red-600"}>
              {formatCurrency(data.cumulativeGain)}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Cumulative Gains Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine line color based on final value
  const finalValue = chartData[chartData.length - 1]?.cumulativeGain || 0;
  const lineColor = finalValue >= 0 ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)';

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Cumulative Gains Over Time</CardTitle>
        <p className="text-sm text-muted-foreground">
          Track your running profit/loss across all trades
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
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
                dataKey="index"
                fontSize={12}
                tickFormatter={(value) => {
                  const item = chartData[value];
                  if (!item) return '';
                  try {
                    const date = parseISO(item.date);
                    return format(date, 'MMM dd');
                  } catch {
                    return item.date.slice(0, 6); // Fallback to first 6 chars
                  }
                }}
                interval="preserveStartEnd"
              />
              <YAxis 
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
              <Line 
                type="monotone" 
                dataKey="cumulativeGain" 
                stroke={lineColor}
                strokeWidth={2}
                dot={{ fill: lineColor, strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: lineColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 