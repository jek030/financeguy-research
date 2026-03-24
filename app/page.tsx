'use client';

import { useQuote } from "@/hooks/FMP/useQuote";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMovingAverageData } from '@/hooks/FMP/useMovingAverage';
import type { Ticker } from "@/lib/types";
import SectorReturns from "@/components/SectorReturns";
import SectorOverviewChart from "@/components/SectorOverviewChart";
import { useSupabaseSectorData } from "@/hooks/useSupabaseSectorData";
import { pageStyles } from "@/components/ui/CompanyHeader";

interface MovingAverageData {
  ma: number;
  date: string;
}

export default function Home() {
  const { data: spyData, isLoading: isSpyLoading } = useQuote("SPY");
  const { data: qqqData, isLoading: isQqqLoading } = useQuote("QQQ");
  const { data: diaData, isLoading: isDiaLoading } = useQuote("DIA");
  const { data: slvData, isLoading: isSlvLoading } = useQuote("SLV");
  const { data: gldData, isLoading: isGldLoading } = useQuote("GLD");
  const { data: vixData, isLoading: isVixLoading } = useQuote("^VIX");
  const { data: rspData, isLoading: isRspLoading } = useQuote("RSP");
  const { sectorsBySymbol, latestDate, isLoading: sectorsLoading, error: sectorsError } = useSupabaseSectorData();

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      style: 'percent',
      signDisplay: 'always'
    }).format(value / 100);
  };

  const calculatePercentDiff = (current: number, target: number) => {
    if (!current || !target) return 0;
    return ((current - target) / target) * 100;
  };

  const formatDollarChange = (value: number) => {
    const sign = value >= 0 ? "+" : "-";
    return `${sign}$${formatNumber(Math.abs(value))}`;
  };

  const useMovingAverages = (symbol: string, currentPrice: number) => {
    const twentyOneEmaData = useMovingAverageData(symbol, 'ema', '21', '1day');
    const fiftyEmaData = useMovingAverageData(symbol, 'ema', '50', '1day');
    const twoHundredSmaData = useMovingAverageData(symbol, 'sma', '200', '1day');

    const getMovingAverageValue = (data: MovingAverageData[] | undefined) => 
      data && data.length > 0 && data[0]?.ma ? data[0].ma : 0;

    const calculateData = (maValue: number) => {
      const isAbove = currentPrice > maValue;
      
      return {
        value: maValue,
        isAbove,
        percentDiff: calculatePercentDiff(currentPrice, maValue)
      };
    };

    return {
      ema21: {
        data: calculateData(getMovingAverageValue(twentyOneEmaData.data)),
        isLoading: twentyOneEmaData.isLoading
      },
      ema50: {
        data: calculateData(getMovingAverageValue(fiftyEmaData.data)),
        isLoading: fiftyEmaData.isLoading
      },
      sma200: {
        data: calculateData(getMovingAverageValue(twoHundredSmaData.data)),
        isLoading: twoHundredSmaData.isLoading
      }
    };
  };

  const TerminalTicker = ({
    label,
    symbol,
    data,
    isLoading
  }: {
    label: string;
    symbol: string;
    data: Ticker | undefined;
    isLoading: boolean;
  }) => {
    const movingAverages = useMovingAverages(symbol, data?.price || 0);
    const currentPrice = data?.price || 0;

    const rows = data ? [
      {
        name: movingAverages.ema21.isLoading
          ? "21EMA ..."
          : `21EMA $${formatNumber(movingAverages.ema21.data.value)}`,
        percentChange: movingAverages.ema21.isLoading ? null : movingAverages.ema21.data.percentDiff,
        dollarChange: movingAverages.ema21.isLoading ? null : currentPrice - movingAverages.ema21.data.value
      },
      {
        name: movingAverages.ema50.isLoading
          ? "50EMA ..."
          : `50EMA $${formatNumber(movingAverages.ema50.data.value)}`,
        percentChange: movingAverages.ema50.isLoading ? null : movingAverages.ema50.data.percentDiff,
        dollarChange: movingAverages.ema50.isLoading ? null : currentPrice - movingAverages.ema50.data.value
      },
      {
        name: movingAverages.sma200.isLoading
          ? "200SMA ..."
          : `200SMA $${formatNumber(movingAverages.sma200.data.value)}`,
        percentChange: movingAverages.sma200.isLoading ? null : movingAverages.sma200.data.percentDiff,
        dollarChange: movingAverages.sma200.isLoading ? null : currentPrice - movingAverages.sma200.data.value
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
    ] : [];

    return (
      <div className="min-w-[285px] shrink-0 rounded border border-slate-300/80 bg-white/95 px-2 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-950/70">
        <div className="mb-1.5 border-b border-slate-200 pb-1.5 dark:border-slate-800">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-slate-700 dark:bg-slate-800 dark:text-slate-200">{symbol}</span>
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
                <span className={cn(
                  "inline-flex items-center gap-0.5 tabular-nums",
                  data.changesPercentage >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}>
                  {data.changesPercentage >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {formatPercentage(data.changesPercentage)}
                </span>
                <span className={cn(
                  "inline-flex items-center gap-0.5 tabular-nums",
                  data.change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}>
                  {data.change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {formatDollarChange(data.change)}
                </span>
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
                <span className={cn(
                  "inline-flex items-center justify-end gap-0.5 text-right tabular-nums",
                  row.percentChange === null
                    ? "text-slate-400"
                    : row.percentChange >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                )}>
                  {row.percentChange !== null && (
                    row.percentChange >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                  {row.percentChange === null ? "--" : formatPercentage(row.percentChange)}
                </span>
                <span className={cn(
                  "inline-flex items-center justify-end gap-0.5 text-right tabular-nums",
                  row.dollarChange === null
                    ? "text-slate-400"
                    : row.dollarChange >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                )}>
                  {row.dollarChange !== null && (
                    row.dollarChange >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                  {row.dollarChange === null ? "--" : formatDollarChange(row.dollarChange)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="pb-0.5 font-mono text-[11px] text-rose-600 dark:text-rose-400">Unable to load {symbol}</div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${pageStyles.gradientBg}`}>
      <main className="w-full px-1 pb-3 pt-2 sm:px-2 sm:pb-4 sm:pt-3 lg:px-2">
        <section className="rounded-lg border border-slate-300/80 bg-slate-50/90 p-2 shadow-[0_0_0_1px_rgba(100,116,139,0.1)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-[0_0_0_1px_rgba(100,116,139,0.18)]">
          <div className="-mx-2 mb-2 grid grid-flow-col auto-cols-[minmax(285px,1fr)] gap-1.5 overflow-x-auto px-2 pb-1 md:mx-0 md:grid-flow-row md:auto-cols-auto md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3 2xl:grid-cols-4">
            <TerminalTicker label="S&P 500 ETF" symbol="SPY" data={spyData} isLoading={isSpyLoading} />
            <TerminalTicker label="Nasdaq 100 ETF" symbol="QQQ" data={qqqData} isLoading={isQqqLoading} />
            <TerminalTicker label="Dow Jones ETF" symbol="DIA" data={diaData} isLoading={isDiaLoading} />
            <TerminalTicker label="Equal Weight S&P" symbol="RSP" data={rspData} isLoading={isRspLoading} />
            <TerminalTicker label="Silver ETF" symbol="SLV" data={slvData} isLoading={isSlvLoading} />
            <TerminalTicker label="Gold ETF" symbol="GLD" data={gldData} isLoading={isGldLoading} />
            <TerminalTicker label="VIX" symbol="^VIX" data={vixData} isLoading={isVixLoading} />
          </div>
        </section>

        <section className="mt-3 rounded-lg border border-slate-300/80 bg-slate-50/85 p-2 shadow-[0_0_0_1px_rgba(100,116,139,0.08)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/75 dark:shadow-[0_0_0_1px_rgba(100,116,139,0.16)] sm:p-3">
          <SectorReturns
            sectorsBySymbol={sectorsBySymbol}
            latestDate={latestDate}
            isLoading={sectorsLoading}
            error={sectorsError}
          />
        </section>

        <section className="mt-3 rounded-lg border border-slate-300/80 bg-slate-50/85 p-2 shadow-[0_0_0_1px_rgba(100,116,139,0.08)] backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/75 dark:shadow-[0_0_0_1px_rgba(100,116,139,0.16)] sm:p-3">
          <SectorOverviewChart
            sectorsBySymbol={sectorsBySymbol}
            isLoading={sectorsLoading}
            error={sectorsError}
          />
        </section>
      </main>
    </div>
  );
}
