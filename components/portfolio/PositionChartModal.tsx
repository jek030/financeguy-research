'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import type { StockPosition } from '@/hooks/usePortfolio';
import {
  addDays,
  differenceInCalendarDays,
  format,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';
import { cn } from '@/lib/utils';
import {
  formatRMultiple,
  getRMultiple,
  getRealizedGain,
  getRemainingShares,
} from '@/utils/portfolioCalculations';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import {
  createChart,
  BarSeries,
  CrosshairMode,
  LineSeries,
  PriceScaleMode,
  LineStyle,
  createSeriesMarkers,
  type IChartApi,
  type IPriceLine,
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
  portfolioValue: number;
}

function formatMoney(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? '-' : ''}$${formatted}`;
}

function formatSignedMoney(value: number): string {
  const sign = value < 0 ? '-' : '+';
  const abs = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}$${abs}`;
}

function formatSignedPercent(value: number): string {
  const sign = value < 0 ? '-' : '+';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function gainClass(value: number): string {
  if (value > 0) return 'text-green-600 dark:text-green-400';
  if (value < 0) return 'text-red-600 dark:text-red-400';
  return '';
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

// 35 calendar days ≈ 25 trading days, comfortably enough to seed the
// 21 EMA before the visible range starts.
const EMA_LOOKBACK_DAYS = 35;

function deriveRange(position: StockPosition, preset: RangePreset): {
  from: string; // visible-window start
  to: string; // visible-window end
  fetchFrom: string; // pulled back to seed the EMA
} {
  const today = new Date();
  let fromDate: Date;
  let toDate: Date;

  if (preset === 'Trade') {
    const datedExits = position.exits.filter((e) => e.exitDate !== null);
    const lastExit = datedExits.length
      ? datedExits.reduce<Date>(
          (max, e) => ((e.exitDate as Date) > max ? (e.exitDate as Date) : max),
          datedExits[0].exitDate as Date
        )
      : null;
    fromDate = subDays(position.openDate, 30);
    toDate = clampToToday(addDays(lastExit ?? today, 30));
  } else {
    const spanMap: Record<Exclude<RangePreset, 'Trade'>, Date> = {
      '3M': subMonths(today, 3),
      '6M': subMonths(today, 6),
      '1Y': subYears(today, 1),
    };
    fromDate = spanMap[preset];
    toDate = today;
  }

  return {
    from: formatDateForFmp(fromDate),
    to: formatDateForFmp(toDate),
    fetchFrom: formatDateForFmp(subDays(fromDate, EMA_LOOKBACK_DAYS)),
  };
}

interface MarkerTooltip {
  kind: 'buy' | 'sell';
  date: string; // yyyy-MM-dd — used as the map key to match chart bar time
  dateLabel: string; // pretty form for display, e.g. "April 24, 2026"
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
    dateLabel: format(position.openDate, 'MMMM d, yyyy'),
    shares: position.quantity,
    price: position.cost,
  });

  const isShort = position.type === 'Short';
  for (const exit of position.exits) {
    if (!exit.exitDate) continue;
    const exitDate = format(exit.exitDate, 'yyyy-MM-dd');
    const exitDateLabel = format(exit.exitDate, 'MMMM d, yyyy');
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
        dateLabel: exitDateLabel,
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
        dateLabel: exitDateLabel,
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
    return `BUY · ${t.dateLabel} · ${t.shares} shares @ ${px}`;
  }
  const dollar = t.pnlDollar ?? 0;
  const percent = t.pnlPercent ?? 0;
  const dollarStr = `${dollar < 0 ? '-' : '+'}$${Math.abs(dollar).toFixed(2)}`;
  const percentStr = `${percent < 0 ? '-' : '+'}${Math.abs(percent).toFixed(2)}%`;
  const pnl = `${dollarStr} (${percentStr})`;
  return `SELL · ${t.dateLabel} · ${t.shares} shares @ ${px} · ${pnl}`;
}

function buildMarkers(
  position: StockPosition,
  markerColor: string
): {
  markers: SeriesMarker<Time>[];
  undatedExitCount: number;
} {
  const markers: SeriesMarker<Time>[] = [
    {
      time: format(position.openDate, 'yyyy-MM-dd') as Time,
      position: 'belowBar',
      color: markerColor,
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
      color: markerColor,
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

// Standard EMA: seed with the SMA of the first `period` closes, then
// iterate. Bars before the seed are omitted from the result so the line
// only starts where it has a real value.
function calculateEMA(
  bars: { time: Time; close: number }[],
  period: number
): { time: Time; value: number }[] {
  if (bars.length < period) return [];
  const multiplier = 2 / (period + 1);
  const out: { time: Time; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += bars[i].close;
  let prev = sum / period;
  out.push({ time: bars[period - 1].time, value: prev });
  for (let i = period; i < bars.length; i++) {
    const ema = (bars[i].close - prev) * multiplier + prev;
    out.push({ time: bars[i].time, value: ema });
    prev = ema;
  }
  return out;
}

export function PositionChartModal({
  position,
  isOpen,
  onClose,
  portfolioValue,
}: PositionChartModalProps) {
  const [preset, setPreset] = useState<RangePreset>('Trade');

  const { resolvedTheme } = useTheme();

  const range = useMemo(
    () => (position ? deriveRange(position, preset) : null),
    [position, preset]
  );

  const markerColor = resolvedTheme === 'light' ? '#000000' : '#9CA3AF';

  const { markers } = useMemo(
    () =>
      position
        ? buildMarkers(position, markerColor)
        : { markers: [], undatedExitCount: 0 },
    [position, markerColor]
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Bar'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const [chartReady, setChartReady] = useState(false);

  const { data: historical, isLoading, isError, refetch } = useDailyPrices({
    symbol: position?.symbol ?? '',
    from: range?.fetchFrom ?? '',
    to: range?.to ?? '',
    enabled: isOpen && !!position && !!range,
  });

  // Create / destroy chart on modal open/close.
  // We defer chart creation by one frame so Radix Dialog has time to paint
  // and the container has real dimensions — otherwise lightweight-charts
  // reads 0×0 at construction and never grows.
  useEffect(() => {
    if (!isOpen) return;

    let chart: IChartApi | null = null;
    let handleCrosshair:
      | ((param: Parameters<Parameters<IChartApi['subscribeCrosshairMove']>[0]>[0]) => void)
      | null = null;

    const raf = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;

      const isLight = resolvedTheme === 'light';
      chart = createChart(container, {
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
        crosshair: { mode: CrosshairMode.Normal },
      });
      const series = chart.addSeries(BarSeries, {
        upColor: isLight ? '#16A34A' : '#22C55E',
        downColor: isLight ? '#DC2626' : '#EF4444',
        thinBars: false,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const emaSeries = chart.addSeries(LineSeries, {
        color: isLight ? '#000000' : '#9CA3AF',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      chartRef.current = chart;
      seriesRef.current = series;
      emaSeriesRef.current = emaSeries;

      handleCrosshair = (param) => {
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
      setChartReady(true);
    });

    return () => {
      cancelAnimationFrame(raf);
      if (chart && handleCrosshair) {
        chart.unsubscribeCrosshairMove(handleCrosshair);
      }
      chart?.remove();
      chartRef.current = null;
      seriesRef.current = null;
      emaSeriesRef.current = null;
      markersRef.current = null;
      priceLinesRef.current = [];
      setChartReady(false);
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
    emaSeriesRef.current?.applyOptions({
      color: isLight ? '#000000' : '#9CA3AF',
    });
  }, [resolvedTheme]);

  // Push data into the series when it arrives, the chart is ready, or
  // markers/position change. `chartReady` is what triggers the push when
  // data loaded before the deferred chart-creation finished.
  useEffect(() => {
    if (!chartReady) return;
    const series = seriesRef.current;
    if (!series || !historical || historical.length === 0) return;
    const bars = toBarData(historical);
    series.setData(bars);

    if (emaSeriesRef.current) {
      emaSeriesRef.current.setData(calculateEMA(bars, 21));
    }

    if (!markersRef.current) {
      markersRef.current = createSeriesMarkers(series, markers);
    } else {
      markersRef.current.setMarkers(markers);
    }

    // Rebuild horizontal price lines for buy + each dated exit. Dedupe
    // by (kind, price) so two same-price exits don't stack.
    for (const line of priceLinesRef.current) {
      series.removePriceLine(line);
    }
    priceLinesRef.current = [];
    if (position) {
      const seen = new Set<string>();
      const colorMap = {
        buy: '#22C55E',
        sell: '#EF4444',
        stop: '#EAB308',
      } as const;
      const addLine = (price: number, kind: 'buy' | 'sell' | 'stop') => {
        const key = `${kind}:${price}`;
        if (seen.has(key)) return;
        seen.add(key);
        const line = series.createPriceLine({
          price,
          color: colorMap[kind],
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: '',
        });
        priceLinesRef.current.push(line);
      };
      addLine(position.cost, 'buy');
      if (position.initialStopLoss > 0) {
        addLine(position.initialStopLoss, 'stop');
      }
      for (const exit of position.exits) {
        if (exit.exitDate) addLine(exit.price, 'sell');
      }
    }

    if (range) {
      chartRef.current
        ?.timeScale()
        .setVisibleRange({ from: range.from as Time, to: range.to as Time });
    } else {
      chartRef.current?.timeScale().fitContent();
    }
  }, [historical, markers, chartReady, position, range]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1100px] p-0 gap-0 max-h-[90vh] overflow-y-auto">
        {position && (
          <div className="flex flex-col">
            <DialogHeader className="flex flex-row items-center justify-between px-5 py-3 border-b">
              <div className="flex flex-col gap-0.5">
                <DialogTitle className="font-mono text-base">
                  {position.symbol}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  {position.type} · opened {format(position.openDate, 'MMMM d, yyyy')}
                </p>
              </div>
              <div className="flex gap-1 mr-8">
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
            </div>
            <TradeSummary position={position} portfolioValue={portfolioValue} />
            <ExitsSection position={position} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function normalizeToLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Mirrors `calculateDaysInTrade` in app/portfolio/page.tsx so the
// modal's "Days" matches the positions table exactly.
function daysInTrade(position: StockPosition): number {
  const start = normalizeToLocalMidnight(position.openDate);
  const end = normalizeToLocalMidnight(position.closedDate ?? new Date());
  const diff = differenceInCalendarDays(end, start);
  return diff < 0 ? 0 : diff;
}

function TradeSummary({
  position,
  portfolioValue,
}: {
  position: StockPosition;
  portfolioValue: number;
}) {
  const realized = getRealizedGain(position);
  const rMultiple = getRMultiple(position);
  const portfolioGainPercent =
    portfolioValue > 0 ? (realized / portfolioValue) * 100 : 0;
  const remaining = getRemainingShares(position);
  const days = daysInTrade(position);

  return (
    <div className="px-5 pb-3">
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground pb-1">
        Trade summary
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Stop loss</TableHead>
            <TableHead>R</TableHead>
            <TableHead>Gain/Loss</TableHead>
            <TableHead>Portfolio Gain</TableHead>
            <TableHead>Net Cost</TableHead>
            <TableHead>Initial Shares</TableHead>
            <TableHead>Remaining Shares</TableHead>
            <TableHead>Days</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-mono">{position.symbol}</TableCell>
            <TableCell className="font-mono">{formatMoney(position.cost)}</TableCell>
            <TableCell className="font-mono">{formatMoney(position.initialStopLoss)}</TableCell>
            <TableCell className={cn('font-mono font-medium', gainClass(rMultiple ?? 0))}>
              {formatRMultiple(rMultiple)}
            </TableCell>
            <TableCell className={cn('font-mono font-medium', gainClass(realized))}>
              {formatSignedMoney(realized)}
            </TableCell>
            <TableCell
              className={cn('font-mono font-medium', gainClass(portfolioGainPercent))}
            >
              {portfolioValue > 0 ? formatSignedPercent(portfolioGainPercent) : '—'}
            </TableCell>
            <TableCell className="font-mono">{formatMoney(position.netCost)}</TableCell>
            <TableCell className="font-mono">{position.quantity}</TableCell>
            <TableCell className="font-mono">{remaining}</TableCell>
            <TableCell className="font-mono">{days}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function ExitsSection({ position }: { position: StockPosition }) {
  const sortedExits = [...position.exits].sort((a, b) => {
    if (a.exitDate && b.exitDate) return a.exitDate.getTime() - b.exitDate.getTime();
    if (a.exitDate) return -1;
    if (b.exitDate) return 1;
    return a.sortOrder - b.sortOrder;
  });

  return (
    <div className="px-5 pb-5">
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground pb-1">
        Exits
      </p>
      {sortedExits.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3">No exits recorded.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Price</TableHead>
              <TableHead>Shares</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Gain $</TableHead>
              <TableHead>Gain %</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedExits.map((exit) => {
              const isShort = position.type === 'Short';
              const perShareGain = isShort
                ? position.cost - exit.price
                : exit.price - position.cost;
              const gainDollar = perShareGain * exit.shares;
              const gainPercent = position.cost !== 0
                ? (perShareGain / position.cost) * 100
                : 0;
              return (
                <TableRow key={exit.id}>
                  <TableCell className="font-mono">{formatMoney(exit.price)}</TableCell>
                  <TableCell className="font-mono">{exit.shares}</TableCell>
                  <TableCell className="font-mono">
                    {exit.exitDate ? format(exit.exitDate, 'MMMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell className={cn('font-mono font-medium', gainClass(gainDollar))}>
                    {formatSignedMoney(gainDollar)}
                  </TableCell>
                  <TableCell className={cn('font-mono font-medium', gainClass(gainPercent))}>
                    {formatSignedPercent(gainPercent)}
                  </TableCell>
                  <TableCell className="text-xs">{exit.notes ?? ''}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
