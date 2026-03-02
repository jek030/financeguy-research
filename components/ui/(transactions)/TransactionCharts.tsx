"use client";

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DailyVolume, ActionSummary, getActionCategory } from '@/lib/types/transactions';
import { formatCurrency, formatCompactCurrency } from '@/utils/transactionCalculations';
import { cn } from '@/lib/utils';

interface TransactionChartsProps {
  dailyVolume: DailyVolume[];
  actionSummary: ActionSummary[];
  className?: string;
}

// Colors for pie chart
const CATEGORY_COLORS = {
  trade: '#3b82f6',
  option: '#a855f7',
  income: '#10b981',
  expense: '#ef4444',
  other: '#6b7280',
};

// Custom tooltip for bar chart
function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  
  return (
    <div className="rounded-md border border-border bg-background p-3 shadow-sm">
      <p className="mb-2 text-[11px] font-semibold text-foreground">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="font-mono text-[11px]" style={{ color: entry.color }}>
          {entry.dataKey === 'buyVolume' ? 'Buy' : entry.dataKey === 'sellVolume' ? 'Sell' : 'Net'}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

// Custom tooltip for pie chart
function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { action: string; value: number; count: number } }> }) {
  if (!active || !payload || !payload[0]) return null;
  
  const data = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-background p-3 shadow-sm">
      <p className="text-[11px] font-semibold text-foreground">{data.action}</p>
      <p className="text-[11px] text-muted-foreground">{data.count} transactions</p>
      <p className="font-mono text-[11px]">{formatCurrency(Math.abs(data.value))}</p>
    </div>
  );
}

export default function TransactionCharts({ dailyVolume, actionSummary, className }: TransactionChartsProps) {
  // Prepare pie chart data - group by category
  const pieData = useMemo(() => {
    const categoryMap = new Map<string, { value: number; count: number }>();
    
    actionSummary.forEach((item) => {
      const category = getActionCategory(item.action);
      const existing = categoryMap.get(category) || { value: 0, count: 0 };
      existing.value += Math.abs(item.totalAmount);
      existing.count += item.transactionCount;
      categoryMap.set(category, existing);
    });
    
    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      action: category.charAt(0).toUpperCase() + category.slice(1),
      value: data.value,
      count: data.count,
      fill: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS],
    }));
  }, [actionSummary]);

  // Format date for chart
  const formattedDailyVolume = useMemo(() => {
    return dailyVolume.map((d) => ({
      ...d,
      date: d.date.split('/').slice(0, 2).join('/'), // MM/DD format
    }));
  }, [dailyVolume]);

  return (
    <div className={cn("grid grid-cols-1 gap-4 lg:grid-cols-2", className)}>
      {/* Daily Volume Chart */}
      <Card className="border-border bg-background">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium tracking-wide">Daily Volume</CardTitle>
            <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              LIVE
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {formattedDailyVolume.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedDailyVolume} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.55} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => formatCompactCurrency(value)}
                    width={60}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="buyVolume" name="Buy" fill="#ef4444" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="sellVolume" name="Sell" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-xs text-muted-foreground">
              No volume data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Distribution Pie Chart */}
      <Card className="border-border bg-background">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium tracking-wide">Volume by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="action"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value: string) => (
                      <span className="font-mono text-[11px] text-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-xs text-muted-foreground">
              No category data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
