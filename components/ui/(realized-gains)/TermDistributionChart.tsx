"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TermDistribution } from '@/lib/types/trading';
import { formatCurrency } from '@/utils/tradeCalculations';

interface TermDistributionChartProps {
  data: TermDistribution[];
  className?: string;
}

export default function TermDistributionChart({ data, className }: TermDistributionChartProps) {
  // Define colors for the chart
  const COLORS = {
    'Short': 'hsl(25, 95%, 53%)',  // Orange
    'Long': 'hsl(142, 71%, 45%)',  // Green
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{data.term} Term</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Gain/Loss: </span>
            <span className={data.gainLoss >= 0 ? "text-green-600" : "text-red-600"}>
              {formatCurrency(data.gainLoss)}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Trades: </span>
            {data.count}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Short vs Long Term Distribution</CardTitle>
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
        <CardTitle>Short vs Long Term Distribution</CardTitle>
        <p className="text-sm text-muted-foreground">
          Breakdown of gains by holding period
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={CustomLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="gainLoss"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[entry.term as keyof typeof COLORS] || COLORS['Short']} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry: any) => (
                  <span style={{ color: entry.color }}>
                    {value} ({entry.payload.count} trades)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary below chart */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          {data.map((item, index) => (
            <div key={index} className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">{item.term} Term</div>
              <div className={`text-lg font-semibold ${
                item.gainLoss >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                {formatCurrency(item.gainLoss)}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.count} trades
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 