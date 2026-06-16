'use client';

import { useEffect, useMemo, useState } from 'react';
import { subDays, format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useDailyPrices } from '@/hooks/FMP/useDailyPrices';
import { useQuote } from '@/hooks/FMP/useQuote';
import { calculateRanges } from '@/lib/priceCalculations';

const POSITION_SIZING_SYMBOL_STORAGE_KEY = 'financeguy-position-sizing-symbol';

function readStoredSizingSymbol(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.localStorage.getItem(POSITION_SIZING_SYMBOL_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeStoredSizingSymbol(symbol: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(POSITION_SIZING_SYMBOL_STORAGE_KEY, symbol);
  } catch {
    // Ignore storage write errors
  }
}

const formatCurrencyTwoDecimals = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatDecimalInput = (value: string, maxDecimals = 2) => {
  const sanitized = value.replace(/[^0-9.]/g, '');
  const parts = sanitized.split('.');
  const formattedValue = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
  if (parts.length === 2 && parts[1].length > maxDecimals) {
    return null;
  }
  return formattedValue;
};

const getMaxPositionFromAdr = (adrPercent: number, balance: number) => {
  if (adrPercent <= 0 || balance <= 0) {
    return null;
  }

  return {
    maxPositionPercent: (1 / adrPercent) * 100,
    maxAmount: balance * (1 / adrPercent),
  };
};

const getRBasedSizing = (
  entry: number,
  stop: number,
  portfolioBalance: number,
  riskPercent: number,
) => {
  if (entry <= 0 || stop <= 0 || portfolioBalance <= 0 || riskPercent <= 0) {
    return null;
  }

  const riskPerShare = Math.abs(entry - stop);
  if (riskPerShare <= 0) {
    return null;
  }

  const riskDollars = portfolioBalance * (riskPercent / 100);
  const shares = Math.floor(riskDollars / riskPerShare);
  if (shares <= 0) {
    return null;
  }

  const positionAmount = shares * entry;
  const positionPercent = (positionAmount / portfolioBalance) * 100;

  return {
    shares,
    positionAmount,
    positionPercent,
    riskDollars,
  };
};

type AdrSizingRowProps = {
  label: string;
  adrPercent: number | null;
  portfolioBalance: number;
};

function AdrSizingRow({ label, adrPercent, portfolioBalance }: AdrSizingRowProps) {
  const sizing = adrPercent !== null ? getMaxPositionFromAdr(adrPercent, portfolioBalance) : null;

  return (
    <div className="rounded-md border border-border/30 bg-background/40 p-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
        <p className="text-[10px] font-mono font-semibold">
          {adrPercent !== null ? `${adrPercent.toFixed(2)}%` : '—'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="space-y-0.5">
          <p className="text-[10px] font-medium text-muted-foreground">Max %</p>
          <p className="text-xs font-bold font-mono">
            {sizing ? `${sizing.maxPositionPercent.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-medium text-muted-foreground">Max $</p>
          <p className="text-xs font-bold font-mono">
            {sizing ? formatCurrencyTwoDecimals(sizing.maxAmount) : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

type AdrSizingPanelProps = {
  trimmedSymbol: string;
  portfolioBalance: number;
  range5Day: ReturnType<typeof calculateRanges> | null;
  range21Day: ReturnType<typeof calculateRanges> | null;
  isLoading: boolean;
  error: Error | null;
  hasNoPriceData: boolean;
  hasInsufficientHistory: boolean;
};

function AdrSizingPanel({
  trimmedSymbol,
  portfolioBalance,
  range5Day,
  range21Day,
  isLoading,
  error,
  hasNoPriceData,
  hasInsufficientHistory,
}: AdrSizingPanelProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold">ADR</p>
      {trimmedSymbol.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">Enter a symbol.</p>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading...
        </div>
      ) : error ? (
        <p className="text-[10px] text-muted-foreground">No ADR data for {trimmedSymbol}.</p>
      ) : hasNoPriceData ? (
        <p className="text-[10px] text-muted-foreground">No price data for {trimmedSymbol}.</p>
      ) : hasInsufficientHistory ? (
        <p className="text-[10px] text-muted-foreground">Not enough history.</p>
      ) : (
        <div className="space-y-2">
          <AdrSizingRow
            label="5D ADR"
            adrPercent={range5Day?.averageDailyRange ?? null}
            portfolioBalance={portfolioBalance}
          />
          <AdrSizingRow
            label="21D ADR"
            adrPercent={range21Day?.averageDailyRange ?? null}
            portfolioBalance={portfolioBalance}
          />
        </div>
      )}
    </div>
  );
}

type RSizingPanelProps = {
  trimmedSymbol: string;
  portfolioBalance: number;
  entryPrice: string;
  stopLoss: string;
  riskPercent: string;
  onEntryPriceChange: (value: string) => void;
  onStopLossChange: (value: string) => void;
  onRiskPercentChange: (value: string) => void;
  isQuoteLoading: boolean;
};

function RSizingPanel({
  trimmedSymbol,
  portfolioBalance,
  entryPrice,
  stopLoss,
  riskPercent,
  onEntryPriceChange,
  onStopLossChange,
  onRiskPercentChange,
  isQuoteLoading,
}: RSizingPanelProps) {
  const parsedEntry = parseFloat(entryPrice);
  const parsedStop = parseFloat(stopLoss);
  const parsedRisk = parseFloat(riskPercent);

  const sizing = useMemo(() => {
    if (Number.isNaN(parsedEntry) || Number.isNaN(parsedStop) || Number.isNaN(parsedRisk)) {
      return null;
    }
    return getRBasedSizing(parsedEntry, parsedStop, portfolioBalance, parsedRisk);
  }, [parsedEntry, parsedStop, parsedRisk, portfolioBalance]);

  const hasInvalidStop =
    !Number.isNaN(parsedEntry) &&
    !Number.isNaN(parsedStop) &&
    parsedEntry > 0 &&
    parsedStop > 0 &&
    parsedEntry === parsedStop;

  return (
    <div className="space-y-2 border-t border-border/30 pt-4">
      <p className="text-xs font-semibold">R-Based</p>
      {trimmedSymbol.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">Enter a symbol.</p>
      ) : (
        <>
          <div className="space-y-1.5">
            <div className="space-y-0.5">
              <label className="text-[10px] font-medium text-muted-foreground">Entry</label>
              <Input
                type="text"
                inputMode="decimal"
                value={entryPrice}
                onChange={(e) => {
                  const formatted = formatDecimalInput(e.target.value);
                  if (formatted !== null) onEntryPriceChange(formatted);
                }}
                className="h-7 text-xs font-mono bg-background/50"
              />
              {isQuoteLoading && (
                <p className="text-[10px] text-muted-foreground">Loading quote...</p>
              )}
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] font-medium text-muted-foreground">Stop</label>
              <Input
                type="text"
                inputMode="decimal"
                value={stopLoss}
                onChange={(e) => {
                  const formatted = formatDecimalInput(e.target.value);
                  if (formatted !== null) onStopLossChange(formatted);
                }}
                className="h-7 text-xs font-mono bg-background/50"
              />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] font-medium text-muted-foreground">Risk %</label>
              <Input
                type="text"
                inputMode="decimal"
                value={riskPercent}
                onChange={(e) => {
                  const formatted = formatDecimalInput(e.target.value);
                  if (formatted !== null) onRiskPercentChange(formatted);
                }}
                className="h-7 text-xs font-mono bg-background/50"
              />
            </div>
          </div>
          <div className="rounded-md border border-border/30 bg-background/40 p-2 space-y-1.5">
            {hasInvalidStop ? (
              <p className="text-[10px] text-muted-foreground">Entry and stop must differ.</p>
            ) : sizing ? (
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground">Position %</p>
                  <p className="text-xs font-bold font-mono">{sizing.positionPercent.toFixed(1)}%</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground">Position $</p>
                  <p className="text-xs font-bold font-mono">
                    {formatCurrencyTwoDecimals(sizing.positionAmount)}
                  </p>
                </div>
                <div className="space-y-0.5 col-span-2">
                  <p className="text-[10px] font-medium text-muted-foreground">Shares</p>
                  <p className="text-xs font-bold font-mono">{sizing.shares.toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">Enter entry, stop, and risk %.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

type PositionSizingCalculatorProps = {
  portfolioBalance: number;
  isBalanceLoading?: boolean;
};

export function PositionSizingCalculator({
  portfolioBalance,
  isBalanceLoading = false,
}: PositionSizingCalculatorProps) {
  const [symbol, setSymbol] = useState(() => readStoredSizingSymbol());
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [riskPercent, setRiskPercent] = useState('1');

  useEffect(() => {
    writeStoredSizingSymbol(symbol.trim());
  }, [symbol]);

  const trimmedSymbol = symbol.trim().toUpperCase();
  const toDate = format(new Date(), 'yyyy-MM-dd');
  const fromDate = format(subDays(new Date(), 60), 'yyyy-MM-dd');

  const { data: priceHistory, isLoading, isFetching, error } = useDailyPrices({
    symbol: trimmedSymbol,
    from: fromDate,
    to: toDate,
    enabled: trimmedSymbol.length > 0,
  });

  const { data: quote, isLoading: isQuoteLoading } = useQuote(trimmedSymbol);

  useEffect(() => {
    setEntryPrice('');
    setStopLoss('');
  }, [trimmedSymbol]);

  useEffect(() => {
    if (quote?.price && !entryPrice) {
      setEntryPrice(quote.price.toFixed(2));
    }
  }, [quote?.price, entryPrice]);

  const range5Day = useMemo(() => {
    if (!priceHistory || priceHistory.length < 5) return null;
    return calculateRanges(priceHistory, 5);
  }, [priceHistory]);

  const range21Day = useMemo(() => {
    if (!priceHistory || priceHistory.length < 21) return null;
    return calculateRanges(priceHistory, 21);
  }, [priceHistory]);

  const isAdrLoading = trimmedSymbol.length > 0 && (isLoading || isFetching);
  const hasBalance = portfolioBalance > 0;
  const hasNoPriceData =
    trimmedSymbol.length > 0 &&
    !isAdrLoading &&
    !error &&
    (!priceHistory || priceHistory.length === 0);
  const hasInsufficientHistory =
    trimmedSymbol.length > 0 &&
    !isAdrLoading &&
    !error &&
    priceHistory !== undefined &&
    priceHistory.length > 0 &&
    priceHistory.length < 5;

  return (
    <section className="rounded-lg border border-border/35 bg-background/70 p-3">
      <div className="text-sm font-semibold">Position Sizing</div>
      <div className="space-y-3 pt-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Symbol</label>
          <Input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="h-8 w-full text-sm font-mono bg-background/50"
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Portfolio Balance</p>
          {isBalanceLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Calculating balance...
            </div>
          ) : (
            <p className="text-sm font-bold font-mono">
              {hasBalance ? formatCurrencyTwoDecimals(portfolioBalance) : '—'}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <AdrSizingPanel
            trimmedSymbol={trimmedSymbol}
            portfolioBalance={portfolioBalance}
            range5Day={range5Day}
            range21Day={range21Day}
            isLoading={isAdrLoading}
            error={error}
            hasNoPriceData={hasNoPriceData}
            hasInsufficientHistory={hasInsufficientHistory}
          />
          <RSizingPanel
            trimmedSymbol={trimmedSymbol}
            portfolioBalance={portfolioBalance}
            entryPrice={entryPrice}
            stopLoss={stopLoss}
            riskPercent={riskPercent}
            onEntryPriceChange={setEntryPrice}
            onStopLossChange={setStopLoss}
            onRiskPercentChange={setRiskPercent}
            isQuoteLoading={isQuoteLoading}
          />
        </div>
      </div>
    </section>
  );
}
