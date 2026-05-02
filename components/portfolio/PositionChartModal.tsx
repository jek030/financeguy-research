'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import type { StockPosition } from '@/hooks/usePortfolio';
import { addDays, format, subDays, subMonths, subYears } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  createChart,
  BarSeries,
  PriceScaleMode,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts';
import { useTheme } from 'next-themes';
import { useDailyPrices, type DailyPriceData } from '@/hooks/FMP/useDailyPrices';

export interface PositionChartModalProps {
  position: StockPosition | null;
  isOpen: boolean;
  onClose: () => void;
}

type RangePreset = 'Trade' | '3M' | '6M' | '1Y';

const RANGE_PRESETS: RangePreset[] = ['Trade', '3M', '6M', '1Y'];

function formatDateForFmp(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function clampToToday(d: Date): Date {
  const today = new Date();
  return d > today ? today : d;
}

function deriveRange(position: StockPosition, preset: RangePreset): {
  from: string;
  to: string;
} {
  const today = new Date();

  if (preset === 'Trade') {
    const datedExits = position.exits.filter((e) => e.exitDate !== null);
    const lastExit = datedExits.length
      ? datedExits.reduce<Date>(
          (max, e) => ((e.exitDate as Date) > max ? (e.exitDate as Date) : max),
          datedExits[0].exitDate as Date
        )
      : null;
    const from = subDays(position.openDate, 30);
    const to = clampToToday(addDays(lastExit ?? today, 30));
    return { from: formatDateForFmp(from), to: formatDateForFmp(to) };
  }

  const spanMap: Record<Exclude<RangePreset, 'Trade'>, Date> = {
    '3M': subMonths(today, 3),
    '6M': subMonths(today, 6),
    '1Y': subYears(today, 1),
  };
  return {
    from: formatDateForFmp(spanMap[preset]),
    to: formatDateForFmp(today),
  };
}

interface MarkerTooltip {
  kind: 'buy' | 'sell';
  date: string; // yyyy-MM-dd
  shares: number;
  price: number;
  pnlDollar?: number;
  pnlPercent?: number;
}

function buildTooltipMap(position: StockPosition): Map<string, MarkerTooltip> {
  const map = new Map<string, MarkerTooltip>();
  const buyDate = format(position.openDate, 'yyyy-MM-dd');
  map.set(buyDate, {
    kind: 'buy',
    date: buyDate,
    shares: position.quantity,
    price: position.cost,
  });

  const isShort = position.type === 'Short';
  for (const exit of position.exits) {
    if (!exit.exitDate) continue;
    const exitDate = format(exit.exitDate, 'yyyy-MM-dd');
    const perShareGain = isShort
      ? position.cost - exit.price
      : exit.price - position.cost;
    const pnlDollar = perShareGain * exit.shares;
    const existing = map.get(exitDate);
    if (existing && existing.kind === 'sell') {
      // Aggregate same-date partial exits: sum shares + dollar P&L,
      // recompute weighted-average price and percent from the totals.
      const shares = existing.shares + exit.shares;
      const dollar = (existing.pnlDollar ?? 0) + pnlDollar;
      const cost = position.cost * shares;
      const price = (existing.price * existing.shares + exit.price * exit.shares) / shares;
      map.set(exitDate, {
        kind: 'sell',
        date: exitDate,
        shares,
        price,
        pnlDollar: dollar,
        pnlPercent: cost !== 0 ? (dollar / cost) * 100 : 0,
      });
    } else {
      const pnlPercent = position.cost !== 0
        ? (perShareGain / position.cost) * 100
        : 0;
      map.set(exitDate, {
        kind: 'sell',
        date: exitDate,
        shares: exit.shares,
        price: exit.price,
        pnlDollar,
        pnlPercent,
      });
    }
  }
  return map;
}

function formatTooltip(t: MarkerTooltip): string {
  const px = `$${t.price.toFixed(2)}`;
  if (t.kind === 'buy') {
    return `BUY · ${t.date} · ${t.shares} sh @ ${px}`;
  }
  const dollar = t.pnlDollar ?? 0;
  const percent = t.pnlPercent ?? 0;
  const dollarStr = `${dollar < 0 ? '-' : '+'}$${Math.abs(dollar).toFixed(2)}`;
  const percentStr = `${percent < 0 ? '-' : '+'}${Math.abs(percent).toFixed(2)}%`;
  const pnl = `${dollarStr} (${percentStr})`;
  return `SELL · ${t.date} · ${t.shares} sh @ ${px} · ${pnl}`;
}

function buildMarkers(position: StockPosition): {
  markers: SeriesMarker<Time>[];
  undatedExitCount: number;
} {
  const markers: SeriesMarker<Time>[] = [
    {
      time: format(position.openDate, 'yyyy-MM-dd') as Time,
      position: 'belowBar',
      color: '#22C55E',
      shape: 'arrowUp',
      text: '',
    },
  ];

  let undated = 0;
  for (const exit of position.exits) {
    if (!exit.exitDate) {
      undated += 1;
      continue;
    }
    markers.push({
      time: format(exit.exitDate, 'yyyy-MM-dd') as Time,
      position: 'aboveBar',
      color: '#EF4444',
      shape: 'arrowDown',
      text: '',
    });
  }

  // lightweight-charts requires markers sorted ascending by time.
  markers.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  return { markers, undatedExitCount: undated };
}

function toBarData(historical: DailyPriceData[]): {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}[] {
  // FMP returns newest-first; lightweight-charts needs ascending time.
  return [...historical]
    .reverse()
    .map((d) => ({
      time: d.date as Time, // YYYY-MM-DD strings are valid BusinessDay-equivalent Time values
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
}

export function PositionChartModal({
  position,
  isOpen,
  onClose,
}: PositionChartModalProps) {
  const [preset, setPreset] = useState<RangePreset>('Trade');

  const range = useMemo(
    () => (position ? deriveRange(position, preset) : null),
    [position, preset]
  );

  const { markers, undatedExitCount } = useMemo(
    () => (position ? buildMarkers(position) : { markers: [], undatedExitCount: 0 }),
    [position]
  );

  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const tooltipMap = useMemo(
    () => (position ? buildTooltipMap(position) : new Map<string, MarkerTooltip>()),
    [position]
  );

  const tooltipMapRef = useRef(tooltipMap);
  useEffect(() => {
    tooltipMapRef.current = tooltipMap;
  }, [tooltipMap]);

  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Bar'> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  const { data: historical, isLoading, isError, refetch } = useDailyPrices({
    symbol: position?.symbol ?? '',
    from: range?.from ?? '',
    to: range?.to ?? '',
    enabled: isOpen && !!position && !!range,
  });

  // Create / destroy chart on modal open/close
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const isLight = resolvedTheme === 'light';
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: isLight ? '#FFFFFF' : '#0F0F0F' },
        textColor: isLight ? '#0F172A' : '#F2F2F2',
      },
      grid: {
        vertLines: { color: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(242,242,242,0.06)' },
        horzLines: { color: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(242,242,242,0.06)' },
      },
      rightPriceScale: { mode: PriceScaleMode.Logarithmic, borderVisible: false },
      timeScale: { borderVisible: false },
    });
    const series = chart.addSeries(BarSeries, {
      upColor: isLight ? '#16A34A' : '#22C55E',
      downColor: isLight ? '#DC2626' : '#EF4444',
      thinBars: false,
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const handleCrosshair = (
      param: Parameters<Parameters<IChartApi['subscribeCrosshairMove']>[0]>[0]
    ) => {
      if (!param.point || !param.time) {
        setTooltip(null);
        return;
      }
      const timeStr = typeof param.time === 'string' ? param.time : null;
      if (!timeStr) {
        setTooltip(null);
        return;
      }
      const hit = tooltipMapRef.current.get(timeStr);
      if (!hit) {
        setTooltip(null);
        return;
      }
      setTooltip({
        text: formatTooltip(hit),
        x: param.point.x,
        y: param.point.y,
      });
    };
    chart.subscribeCrosshairMove(handleCrosshair);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshair);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
    };
    // We deliberately recreate the chart only on open toggle; theme handled in Task 7.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Apply theme on theme change
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const isLight = resolvedTheme === 'light';
    chart.applyOptions({
      layout: {
        background: { color: isLight ? '#FFFFFF' : '#0F0F0F' },
        textColor: isLight ? '#0F172A' : '#F2F2F2',
      },
      grid: {
        vertLines: { color: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(242,242,242,0.06)' },
        horzLines: { color: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(242,242,242,0.06)' },
      },
    });
  }, [resolvedTheme]);

  // Push data into the series when it arrives or range changes
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !historical || historical.length === 0) return;
    series.setData(toBarData(historical));

    if (!markersRef.current) {
      markersRef.current = createSeriesMarkers(series, markers);
    } else {
      markersRef.current.setMarkers(markers);
    }

    chartRef.current?.timeScale().fitContent();
  }, [historical, markers]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1100px] p-0 gap-0">
        {position && (
          <div className="flex flex-col">
            <DialogHeader className="flex flex-row items-center justify-between px-5 py-3 border-b">
              <div className="flex flex-col gap-0.5">
                <DialogTitle className="font-mono text-base">
                  {position.symbol}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  {position.type} · opened {format(position.openDate, 'yyyy-MM-dd')}
                </p>
              </div>
              <div className="flex gap-1">
                {RANGE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreset(p)}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-mono rounded border',
                      preset === p
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </DialogHeader>
            <div className="px-5 py-4">
              <div className="relative h-[600px] w-full">
                <div ref={containerRef} className="absolute inset-0" />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-full w-full animate-pulse bg-muted/30 rounded" />
                  </div>
                )}
                {isError && !isLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm">
                    <p>Could not load price data for {position.symbol}.</p>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="px-3 py-1 text-xs border rounded hover:bg-muted"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {!isLoading && !isError && historical && historical.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    No price history available for {position.symbol}.
                  </div>
                )}
                {tooltip && (() => {
                  // Estimated tooltip width — wide enough for a long SELL
                  // line on a Short with multi-share P&L.
                  const TOOLTIP_WIDTH = 320;
                  const containerWidth = containerRef.current?.clientWidth ?? 1060;
                  const placeRight = tooltip.x + 12 + TOOLTIP_WIDTH <= containerWidth;
                  const left = placeRight
                    ? tooltip.x + 12
                    : Math.max(tooltip.x - 12 - TOOLTIP_WIDTH, 0);
                  return (
                    <div
                      className="pointer-events-none absolute z-10 px-2 py-1 text-[11px] font-mono bg-popover border border-border rounded shadow-md whitespace-nowrap"
                      style={{
                        left,
                        top: Math.max(tooltip.y - 30, 0),
                      }}
                    >
                      {tooltip.text}
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center justify-between pt-2 text-[10px] text-muted-foreground">
                <span>
                  {undatedExitCount > 0 &&
                    `${undatedExitCount} undated exit${undatedExitCount === 1 ? '' : 's'} not shown`}
                </span>
                <span>
                  Data by{' '}
                  <a
                    href="https://financialmodelingprep.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Financial Modeling Prep
                  </a>
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
