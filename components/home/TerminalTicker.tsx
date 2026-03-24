'use client';

import { ArrowDown, ArrowUp } from "lucide-react";

import type { Ticker } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMovingAveragesSnapshot } from "@/hooks/FMP/useMovingAveragesSnapshot";
import {
  calculatePercentDiff,
  formatDollarChange,
  formatNumber,
  formatPercentage
} from "@/components/home/marketFormatters";

interface TerminalTickerProps {
  label: string;
  symbol: string;
  data: Ticker | undefined;
  isLoading: boolean;
}

interface MetricRow {
  name: string;
  percentChange: number | null;
  dollarChange: number | null;
}

function DeltaCell({ value, isDollar }: { value: number | null; isDollar: boolean }) {
  if (value === null) {
    return <span className="text-slate-400">--</span>;
  }

  const isPositive = value >= 0;
  const toneClassName = isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
  const Icon = isPositive ? ArrowUp : ArrowDown;

  return (
    <span className={cn("inline-flex items-center justify-end gap-0.5 text-right tabular-nums", toneClassName)}>
      <Icon className="h-3 w-3" />
      {isDollar ? formatDollarChange(value) : formatPercentage(value)}
    </span>
  );
}

export function TerminalTicker({ label, symbol, data, isLoading }: TerminalTickerProps) {
  const currentPrice = data?.price || 0;
  const movingAverages = useMovingAveragesSnapshot(symbol, currentPrice);

  const rows: MetricRow[] = data
    ? [
        {
          name: movingAverages.ema21.isLoading
            ? "21EMA ..."
            : `21EMA $${formatNumber(movingAverages.ema21.snapshot.value)}`,
          percentChange: movingAverages.ema21.isLoading ? null : movingAverages.ema21.snapshot.percentDiff,
          dollarChange: movingAverages.ema21.isLoading ? null : movingAverages.ema21.snapshot.dollarDiff
        },
        {
          name: movingAverages.ema50.isLoading
            ? "50EMA ..."
            : `50EMA $${formatNumber(movingAverages.ema50.snapshot.value)}`,
          percentChange: movingAverages.ema50.isLoading ? null : movingAverages.ema50.snapshot.percentDiff,
          dollarChange: movingAverages.ema50.isLoading ? null : movingAverages.ema50.snapshot.dollarDiff
        },
        {
          name: movingAverages.sma200.isLoading
            ? "200SMA ..."
            : `200SMA $${formatNumber(movingAverages.sma200.snapshot.value)}`,
          percentChange: movingAverages.sma200.isLoading ? null : movingAverages.sma200.snapshot.percentDiff,
          dollarChange: movingAverages.sma200.isLoading ? null : movingAverages.sma200.snapshot.dollarDiff
        },
        {
          name: `52W LOW $${formatNumber(data.yearLow)}`,
          percentChange: calculatePercentDiff(currentPrice, data.yearLow),
          dollarChange: currentPrice - data.yearLow
        },
        {
          name: `52W HIGH $${formatNumber(data.yearHigh)}`,
          percentChange: calculatePercentDiff(currentPrice, data.yearHigh),
          dollarChange: currentPrice - data.yearHigh
        }
      ]
    : [];

  return (
    <div className="min-w-[285px] shrink-0 rounded border border-slate-300/80 bg-white/95 px-2 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-950/70">
      <div className="mb-1.5 border-b border-slate-200 pb-1.5 dark:border-slate-800">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="truncate rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {symbol}
          </span>
          <span className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">{label}</span>
        </div>

        {isLoading ? (
          <div className="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        ) : data ? (
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[15px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              ${formatNumber(data.price)}
            </span>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <DeltaCell value={data.changesPercentage} isDollar={false} />
              <DeltaCell value={data.change} isDollar={true} />
            </div>
          </div>
        ) : (
          <div className="font-mono text-[11px] text-rose-600 dark:text-rose-400">Unable to load {symbol}</div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-1.5 pb-0.5">
          <div className="grid grid-cols-[1fr,72px,72px] gap-2 border-b border-slate-200 pb-1 font-mono text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>Name</span>
            <span className="text-right">% Chg</span>
            <span className="text-right">$ Chg</span>
          </div>
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="grid grid-cols-[1fr,72px,72px] items-center gap-2">
              <div className="h-3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="space-y-1 pb-0.5">
          <div className="grid grid-cols-[1fr,72px,72px] gap-2 border-b border-slate-200 pb-1 font-mono text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>Name</span>
            <span className="text-right">% Chg</span>
            <span className="text-right">$ Chg</span>
          </div>
          {rows.map((row, index) => (
            <div
              key={row.name}
              className={cn(
                "grid grid-cols-[1fr,72px,72px] items-center gap-2 rounded px-1 py-0.5 font-mono text-[11px]",
                index % 2 === 0 ? "bg-slate-100/70 dark:bg-slate-900/55" : "bg-transparent"
              )}
            >
              <span className="truncate text-slate-800 dark:text-slate-200">{row.name}</span>
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
