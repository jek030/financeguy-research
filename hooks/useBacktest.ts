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
    .map((bar) => {
      const value = bar[key];
      if (typeof value !== 'number') throw new Error(`MA field '${key}' missing in FMP response for ${symbol}`);
      return {
        date: (bar.date as string).split(' ')[0],
        value,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function toTradeInput(position: StockPosition): BacktestTradeInput {
  if (!position.closedDate) throw new Error(`toTradeInput called with open position: ${position.id}`);
  const openDate = position.openDate;
  const closedDate = position.closedDate;
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
  const runGenRef = useRef(0);

  useEffect(() => {
    if (runKey === 0 || closedPositions.length === 0) return;

    const gen = ++runGenRef.current;
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

    void Promise.all(tradeInputs.map(async (trade) => {
      try {
        const fromDate = new Date(trade.openDate);
        fromDate.setDate(fromDate.getDate() - 60);
        const from = fromDate.toISOString().split('T')[0];
        const toDate = new Date(trade.closedDate);
        toDate.setDate(toDate.getDate() + 30);
        const to = toDate.toISOString().split('T')[0];

        const needStopMA = config.stop.method === 'trailing-ma';

        const [ohlc, trailMA, stopMA] = await Promise.all([
          fetchOHLC(trade.symbol, from, to),
          fetchMA(trade.symbol, config.trim.trailMAType, config.trim.trailMAPeriod),
          needStopMA
            ? fetchMA(trade.symbol, config.stop.maType, config.stop.maPeriod)
            : Promise.resolve<MABar[]>([]),
        ]);

        if (runGenRef.current !== gen) return;

        const result = runBacktest(trade, ohlc, stopMA, trailMA, config);

        setEntries((prev) =>
          prev.map((e) => (e.tradeId === trade.id ? { ...e, result, loading: false } : e)),
        );
      } catch {
        if (runGenRef.current !== gen) return;
        const result = noDataResult(trade);
        setEntries((prev) =>
          prev.map((e) =>
            e.tradeId === trade.id
              ? { ...e, result, loading: false, error: 'No price data' }
              : e,
          ),
        );
      }
    }));

    return () => {};
  // runKey is the sole trigger; config and closedPositions are intentionally
  // read at run-time (snapshot semantics — submittedConfig in parent ensures consistency)
  }, [runKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { entries };
}
