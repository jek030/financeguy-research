'use client';

import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

import { useDailyPrices, type DailyPriceData } from "@/hooks/FMP/useDailyPrices";

interface TickerSparklineProps {
  symbol: string;
  isPositive: boolean;
  height?: number;
}

interface SparklinePoint {
  close: number;
}

const LOOKBACK_DAYS = 90;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDateWindow(lookbackDays: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - lookbackDays);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

function prepareSparklineData(rawData: DailyPriceData[] | undefined): SparklinePoint[] {
  if (!rawData || rawData.length === 0) return [];

  // FMP historical prices come back newest-first — reverse so the line flows left-to-right by date.
  const ascending = [...rawData].reverse();

  return ascending.map((point) => ({ close: point.close }));
}

export function TickerSparkline({ symbol, isPositive, height = 40 }: TickerSparklineProps) {
  const window = useMemo(() => getDateWindow(LOOKBACK_DAYS), []);

  const { data, isLoading } = useDailyPrices({
    symbol,
    from: window.from,
    to: window.to
  });

  const points = useMemo(() => prepareSparklineData(data), [data]);

  if (isLoading) {
    return (
      <div
        className="w-full animate-pulse rounded bg-neutral-200/70 dark:bg-neutral-800/70"
        style={{ height }}
      />
    );
  }

  if (points.length < 2) {
    return <div style={{ height }} aria-hidden />;
  }

  const strokeColor = isPositive ? "hsl(var(--positive))" : "hsl(var(--negative))";

  return (
    <div style={{ height }} aria-label={`${symbol} daily price trend`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="close"
            stroke={strokeColor}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
