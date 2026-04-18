'use client';

import type { Ticker } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMovingAveragesSnapshot } from "@/hooks/FMP/useMovingAveragesSnapshot";
import { calculatePercentDiff, formatNumber } from "@/components/home/marketFormatters";
import { DeltaCell } from "@/components/home/DeltaCell";
import { TickerSparkline } from "@/components/home/TickerSparkline";

interface TerminalTickerProps {
  label: string;
  symbol: string;
  data: Ticker | undefined;
  isLoading: boolean;
}

interface MetricRow {
  name: string;
  referenceValue: string;
  percentChange: number | null;
  dollarChange: number | null;
}

export function TerminalTicker({ label, symbol, data, isLoading }: TerminalTickerProps) {
  const currentPrice = data?.price || 0;
  const movingAverages = useMovingAveragesSnapshot(symbol, currentPrice);

  const isPositive = (data?.changesPercentage ?? 0) >= 0;

  const rows: MetricRow[] = data
    ? [
        {
          name: "21EMA",
          referenceValue: movingAverages.ema21.isLoading
            ? "--"
            : `$${formatNumber(movingAverages.ema21.snapshot.value)}`,
          percentChange: movingAverages.ema21.isLoading ? null : movingAverages.ema21.snapshot.percentDiff,
          dollarChange: movingAverages.ema21.isLoading ? null : movingAverages.ema21.snapshot.dollarDiff
        },
        {
          name: "50EMA",
          referenceValue: movingAverages.ema50.isLoading
            ? "--"
            : `$${formatNumber(movingAverages.ema50.snapshot.value)}`,
          percentChange: movingAverages.ema50.isLoading ? null : movingAverages.ema50.snapshot.percentDiff,
          dollarChange: movingAverages.ema50.isLoading ? null : movingAverages.ema50.snapshot.dollarDiff
        },
        {
          name: "200SMA",
          referenceValue: movingAverages.sma200.isLoading
            ? "--"
            : `$${formatNumber(movingAverages.sma200.snapshot.value)}`,
          percentChange: movingAverages.sma200.isLoading ? null : movingAverages.sma200.snapshot.percentDiff,
          dollarChange: movingAverages.sma200.isLoading ? null : movingAverages.sma200.snapshot.dollarDiff
        },
        {
          name: "52W LOW",
          referenceValue: `$${formatNumber(data.yearLow)}`,
          percentChange: calculatePercentDiff(currentPrice, data.yearLow),
          dollarChange: currentPrice - data.yearLow
        },
        {
          name: "52W HIGH",
          referenceValue: `$${formatNumber(data.yearHigh)}`,
          percentChange: calculatePercentDiff(currentPrice, data.yearHigh),
          dollarChange: currentPrice - data.yearHigh
        }
      ]
    : [];

  return (
    <div
      className="min-w-[285px] shrink-0 rounded border border-neutral-300/80 bg-white/95 px-2.5 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-950/70"
    >
      <div className="mb-2 border-b border-neutral-200 pb-2 dark:border-neutral-800">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="truncate rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
            {symbol}
          </span>
          <span className="truncate font-mono text-[10px] text-neutral-500 dark:text-neutral-400">{label}</span>
        </div>

        {isLoading ? (
          <div className="h-8 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        ) : data ? (
          <div className="flex items-end justify-between gap-3">
            <span className="font-mono text-2xl font-semibold leading-none tabular-nums text-neutral-900 dark:text-neutral-50 sm:text-[26px]">
              ${formatNumber(data.price)}
            </span>
            <div className="flex flex-col items-end gap-0.5 font-mono text-[11px]">
              <DeltaCell value={data.changesPercentage} isDollar={false} />
              <DeltaCell value={data.change} isDollar={true} />
            </div>
          </div>
        ) : (
          <div className="font-mono text-[11px] text-rose-600 dark:text-rose-400">Unable to load {symbol}</div>
        )}

        {data && (
          <div className="mt-2">
            <TickerSparkline symbol={symbol} isPositive={isPositive} />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-1.5 pb-0.5">
          <div className="grid grid-cols-[1fr,72px,72px] gap-2 border-b border-neutral-200 pb-1 font-mono text-[10px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
            <span>Name</span>
            <span className="text-right">% Chg</span>
            <span className="text-right">$ Chg</span>
          </div>
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="grid grid-cols-[1fr,72px,72px] items-center gap-2">
              <div className="h-3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="space-y-0.5 pb-0.5">
          <div className="grid grid-cols-[1fr,72px,72px] gap-2 border-b border-neutral-200 pb-1 font-mono text-[10px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
            <span>Name</span>
            <span className="text-right">% Chg</span>
            <span className="text-right">$ Chg</span>
          </div>
          {rows.map((row, index) => (
            <div
              key={row.name}
              className={cn(
                "grid grid-cols-[1fr,72px,72px] items-center gap-2 rounded px-1 py-1 font-mono text-[11px]",
                index % 2 === 0 ? "bg-neutral-100/50 dark:bg-neutral-900/40" : "bg-transparent"
              )}
            >
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate text-neutral-500 dark:text-neutral-400">{row.name}</span>
                <span className="flex-shrink-0 tabular-nums text-[10px] text-neutral-400 dark:text-neutral-500">
                  {row.referenceValue}
                </span>
              </span>
              <DeltaCell value={row.percentChange} isDollar={false} />
              <DeltaCell value={row.dollarChange} isDollar={true} />
            </div>
          ))}
        </div>
      ) : (
        <div className="pb-0.5 font-mono text-[11px] text-rose-600 dark:text-rose-400">Unable to load {symbol}</div>
      )}
    </div>
  );
}
