// hooks/useBacktest.ts
'use client';

import { useState, useEffect, useRef } from 'react';
import type { StockPosition } from '@/hooks/usePortfolio';
import {
  BacktestConfig,
  BacktestTradeInput,
  BacktestTradeResult,
  OHLCBar,
  MABar,
  MAType,
  runBacktest,
  noDataResult,
} from '@/utils/backtestCalculations';

export interface BacktestEntry {
  tradeId: string;
  symbol: string;
  result: BacktestTradeResult | null;
  loading: boolean;
  error: string | null;
}

async function fetchOHLC(symbol: string, from: string, to: string): Promise<OHLCBar[]> {
  const res = await fetch(`/api/fmp/dailyprices?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}`);
  if (!res.ok) throw new Error(`OHLC fetch failed for ${symbol}`);
  const data = await res.json();
  const historical = (data.historical ?? []) as Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  return historical
    .map((b) => ({ date: b.date, open: b.open, high: b.high, low: b.low, close: b.close }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchMA(symbol: string, type: MAType, period: number): Promise<MABar[]> {
  const res = await fetch(
    `/api/fmp/technical/moving-average?symbol=${encodeURIComponent(symbol)}&type=${type}&period=${period}&timeframe=daily`,
  );
  if (!res.ok) throw new Error(`MA fetch failed for ${symbol}`);
  const data = (await res.json()) as Array<Record<string, unknown>>;
  const key = type.toLowerCase() as 'ema' | 'sma';
  return data
    .map((bar) => ({
      date: (bar.date as string).split(' ')[0],
      value: bar[key] as number,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function toTradeInput(position: StockPosition): BacktestTradeInput {
  const openDate = new Date(position.openDate);
  const closedDate = new Date(position.closedDate!);
  const actualDays = Math.round(
    (closedDate.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  return {
    id: position.id,
    symbol: position.symbol,
    cost: position.cost,
    quantity: position.quantity,
    initialStopLoss: position.initialStopLoss,
    realizedGain: position.realizedGain,
    openDate,
    closedDate,
    actualDays,
  };
}

export function useBacktest(
  closedPositions: StockPosition[],
  config: BacktestConfig,
  runKey: number,
): { entries: BacktestEntry[] } {
  const [entries, setEntries] = useState<BacktestEntry[]>([]);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (runKey === 0 || closedPositions.length === 0) return;

    cancelRef.current = false;
    const tradeInputs = closedPositions.map(toTradeInput);

    setEntries(
      tradeInputs.map((t) => ({
        tradeId: t.id,
        symbol: t.symbol,
        result: null,
        loading: true,
        error: null,
      })),
    );

    tradeInputs.forEach(async (trade) => {
      try {
        const fromDate = new Date(trade.openDate);
        fromDate.setDate(fromDate.getDate() - 60);
        const from = fromDate.toISOString().split('T')[0];
        const to = new Date().toISOString().split('T')[0];

        const needStopMA = config.stop.method === 'trailing-ma';

        const [ohlc, trailMA, stopMA] = await Promise.all([
          fetchOHLC(trade.symbol, from, to),
          fetchMA(trade.symbol, config.trim.trailMAType, config.trim.trailMAPeriod),
          needStopMA
            ? fetchMA(trade.symbol, config.stop.maType, config.stop.maPeriod)
            : Promise.resolve<MABar[]>([]),
        ]);

        if (cancelRef.current) return;

        const result = runBacktest(trade, ohlc, stopMA, trailMA, config);

        setEntries((prev) =>
          prev.map((e) => (e.tradeId === trade.id ? { ...e, result, loading: false } : e)),
        );
      } catch {
        if (cancelRef.current) return;
        const result = noDataResult(trade);
        setEntries((prev) =>
          prev.map((e) =>
            e.tradeId === trade.id
              ? { ...e, result, loading: false, error: 'No price data' }
              : e,
          ),
        );
      }
    });

    return () => {
      cancelRef.current = true;
    };
  }, [runKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { entries };
}
