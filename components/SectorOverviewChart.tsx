'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useTheme } from "next-themes";
import {
  LineSeries,
  createChart,
  type DeepPartial,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type LineSeriesOptions,
  type UTCTimestamp
} from "lightweight-charts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import type { Sector } from "@/lib/types";
import { sectorDefinitions } from "@/lib/sectors";
import { Settings } from "lucide-react";

type Timeframe = "daily" | "weekly" | "monthly";
type ValueMode = "price" | "percent";
type DateRange = "max" | "oneYear" | "ytd";

const sectorConfigs = sectorDefinitions;
const defaultTimeScaleRightOffset = 20;
const storageKey = "sector-overview-chart-selected";

const timeframeOptions: Array<{ label: string; value: Timeframe }> = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" }
];

function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sortAscending(data: Sector[]): Sector[] {
  return [...data].sort((a, b) => (a.date > b.date ? 1 : -1));
}

function toTimestampFromDate(date: Date): UTCTimestamp {
  return Math.floor(date.getTime() / 1000) as UTCTimestamp;
}

function toTimestamp(dateString: string): UTCTimestamp {
  // Parse YYYY-MM-DD as UTC to avoid timezone shifts
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const date = new Date(Date.UTC(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    ));
    return Math.floor(date.getTime() / 1000) as UTCTimestamp;
  }
  // Fallback for other formats
  return toTimestampFromDate(new Date(dateString));
}

function toWeekKey(dateString: string): { key: string; timestamp: UTCTimestamp } {
  // Parse YYYY-MM-DD as UTC
  const parts = dateString.split('-');
  const date = new Date(Date.UTC(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  ));
  const day = date.getUTCDay();
  const diff = (day + 6) % 7; // Monday start
  date.setUTCDate(date.getUTCDate() - diff);
  const weekStart = formatDate(date);
  return { key: weekStart, timestamp: toTimestamp(weekStart) };
}

function toMonthKey(dateString: string): { key: string; timestamp: UTCTimestamp } {
  // Parse YYYY-MM-DD as UTC
  const parts = dateString.split('-');
  const date = new Date(Date.UTC(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  ));
  const labelDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const key = `${labelDate.getUTCFullYear()}-${String(labelDate.getUTCMonth() + 1).padStart(2, "0")}`;
  return { key, timestamp: toTimestampFromDate(labelDate) };
}

function transformData(data: Sector[], timeframe: Timeframe): LineData[] {
  if (!data || data.length === 0) {
    return [];
  }

  const sorted = sortAscending(data);

  const sanitizeValue = (value: number) => (Number.isFinite(value) ? value : null);

  if (timeframe === "daily") {
    return sorted
      .map((point) => {
        const value = sanitizeValue(Number(point.close));
        if (value === null) {
          return null;
        }
        return {
          time: toTimestamp(point.date),
          value
        } as LineData;
      })
      .filter((point): point is LineData => point !== null);
  }

  const aggregator = timeframe === "weekly" ? toWeekKey : toMonthKey;
  const grouped = new Map<string, { time: UTCTimestamp; value: number }>();

  for (const point of sorted) {
    const { key, timestamp } = aggregator(point.date);
    const value = sanitizeValue(Number(point.close));
    if (value !== null) {
      grouped.set(key, {
        time: timestamp,
        value
      });
    }
  }

  return Array.from(grouped.values());
}

function toPercentChangeSeries(data: LineData[]): LineData[] {
  if (!data.length) {
    return [];
  }

  const baseValue = typeof data[0].value === "number" ? data[0].value : null;

  if (baseValue === null || baseValue === 0) {
    return data.map((point) => ({
      time: point.time,
      value: 0
    }));
  }

  return data.map((point) => ({
    time: point.time,
    value: ((point.value as number) - baseValue) / baseValue * 100
  }));
}


interface SectorOverviewChartProps {
  sectorsBySymbol: Record<string, Sector[]>;
  isLoading: boolean;
  error: Error | null;
}

export default function SectorOverviewChart({ sectorsBySymbol, isLoading, error }: SectorOverviewChartProps): ReactElement {
  const { resolvedTheme } = useTheme();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<Record<string, ISeriesApi<"Line">>>({});
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const [valueMode, setValueMode] = useState<ValueMode>("percent");
  const [dateRange, setDateRange] = useState<DateRange>("max");
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(() => sectorConfigs.map((sector) => sector.symbol));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pendingSymbols, setPendingSymbols] = useState<string[]>(sectorConfigs.map((sector) => sector.symbol));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as string[];
      const validSymbols = parsed.filter((symbol) => sectorConfigs.some((sector) => sector.symbol === symbol));
      if (validSymbols.length > 0) {
        setSelectedSymbols(validSymbols);
        setPendingSymbols(validSymbols);
      }
    } catch (error) {
      console.error("Failed to parse stored sector selections", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(selectedSymbols));
  }, [selectedSymbols]);

  useEffect(() => {
    if (isSettingsOpen) {
      setPendingSymbols(selectedSymbols);
    }
  }, [isSettingsOpen, selectedSymbols]);

  const selectedSet = useMemo(() => new Set(selectedSymbols), [selectedSymbols]);
  const activeSectorConfigs = useMemo(() => sectorConfigs.filter((sector) => selectedSet.has(sector.symbol)), [selectedSet]);

  const pendingSet = useMemo(() => new Set(pendingSymbols), [pendingSymbols]);

  const togglePendingSymbol = useCallback((symbol: string) => {
    setPendingSymbols((prev) => {
      if (prev.includes(symbol)) {
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((entry) => entry !== symbol);
      }

      const nextSet = new Set([...prev, symbol]);
      return sectorConfigs.map((sector) => sector.symbol).filter((entry) => nextSet.has(entry));
    });
  }, []);

  const handleSaveSelections = useCallback(() => {
    setSelectedSymbols(pendingSymbols);
    setIsSettingsOpen(false);
  }, [pendingSymbols]);

  const applyThemeToChart = useCallback(
    (chart: IChartApi | null) => {
      if (!chart) {
        return;
      }

      const isLight = resolvedTheme === "light";
      chart.applyOptions({
        layout: {
          background: { color: isLight ? "#ffffff" : "#0F0F0F" },
          textColor: isLight ? "#0F172A" : "#E2E8F0"
        },
        grid: {
          horzLines: { color: isLight ? "#E2E8F0" : "#1E293B" },
          vertLines: { color: isLight ? "#E2E8F0" : "#1E293B" }
        },
        rightPriceScale: {
          borderColor: isLight ? "#CBD5F5" : "#1E293B"
        },
        timeScale: {
          borderColor: isLight ? "#CBD5F5" : "#1E293B"
        },
        crosshair: {
          vertLine: {
            color: isLight ? "#1f2937" : "#E2E8F0",
            labelBackgroundColor: isLight ? "#1f2937" : "#E2E8F0"
          },
          horzLine: {
            color: isLight ? "#1f2937" : "#E2E8F0",
            labelBackgroundColor: isLight ? "#1f2937" : "#E2E8F0"
          }
        }
      });
    },
    [resolvedTheme]
  );

  useEffect(() => {
    const container = chartContainerRef.current;

    // Don't initialize while loading or if already initialized
    if (isLoading || !container || chartRef.current) {
      return;
    }

    const chart = createChart(container, {
      layout: {
        background: { color: "#ffffff" },
        textColor: "#0F172A"
      },
      rightPriceScale: {
        borderVisible: true,
        autoScale: true
      },
      timeScale: {
        borderVisible: true,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: defaultTimeScaleRightOffset,
        barSpacing: 3,
        minBarSpacing: 0.5
      },
      crosshair: {
        mode: 0
      },
      grid: {
        horzLines: {
          color: "#E2E8F0"
        },
        vertLines: {
          color: "#E2E8F0"
        }
      },
      localization: {
        timeFormatter: (businessDayOrTimestamp: number | string) => {
          if (typeof businessDayOrTimestamp === "string") {
            return businessDayOrTimestamp;
          }
          const date = new Date(businessDayOrTimestamp * 1000);
          return date.toLocaleDateString();
        }
      }
    });

    const initialRect = container.getBoundingClientRect();
    chart.resize(
      Math.max(320, Math.floor(initialRect.width || container.clientWidth || 320)),
      420
    );

    sectorConfigs.forEach((sector) => {
      const series = chart.addSeries(
        LineSeries,
        {
          color: sector.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: `${sector.symbol}`
        } as DeepPartial<LineSeriesOptions>
      );
      seriesRef.current[sector.symbol] = series;
    });

    chartRef.current = chart;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && chartRef.current) {
        const { width, height } = entry.contentRect;
        const newWidth = Math.max(320, Math.floor(width));
        const newHeight = Math.max(320, Math.floor(height));
        
        if (newWidth > 0 && newHeight > 0) {
          chartRef.current.resize(newWidth, newHeight);
          
          requestAnimationFrame(() => {
            if (chartRef.current) {
              chartRef.current.timeScale().fitContent();
            }
          });
        }
      }
    });

    resizeObserver.observe(container);
    resizeObserverRef.current = resizeObserver;

    return () => {
      resizeObserver.disconnect();
      resizeObserverRef.current = null;
      chart.remove();
      chartRef.current = null;
      seriesRef.current = {};
    };
  }, [isLoading]);

  useEffect(() => {
    applyThemeToChart(chartRef.current);
  }, [applyThemeToChart, resolvedTheme]);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    let hasData = false;
    let earliestTimestamp: UTCTimestamp | null = null;
    let latestTimestamp: UTCTimestamp | null = null;

    let globalLatestTimestamp: UTCTimestamp | null = null;

    activeSectorConfigs.forEach((sector) => {
      const history = sectorsBySymbol[sector.symbol] ?? [];
      history.forEach((point) => {
        const timestamp = toTimestamp(point.date);
        if (globalLatestTimestamp === null || timestamp > globalLatestTimestamp) {
          globalLatestTimestamp = timestamp;
        }
      });
    });

    const rangeStartGoal: UTCTimestamp | null = (() => {
      if (!globalLatestTimestamp) {
        return null;
      }

      const secondsInDay = 86_400;
      const latestSeconds = Number(globalLatestTimestamp);

      if (dateRange === "oneYear") {
        return Math.max(latestSeconds - secondsInDay * 365, 0) as UTCTimestamp;
      }

      if (dateRange === "ytd") {
        const latestDate = new Date(latestSeconds * 1000);
        const yearStartSeconds = Math.floor(Date.UTC(latestDate.getUTCFullYear(), 0, 1) / 1000);
        return yearStartSeconds as UTCTimestamp;
      }

      return null;
    })();

    sectorConfigs.forEach((sector) => {
      const series = seriesRef.current[sector.symbol];
      const isSelected = selectedSet.has(sector.symbol);
      const history = sectorsBySymbol[sector.symbol] ?? [];

      if (!series) {
        return;
      }

      if (!isSelected) {
        series.setData([]);
        series.applyOptions({ visible: false });
        return;
      }

      if (history.length > 0) {
        const filteredHistory = rangeStartGoal
          ? history.filter((point) => toTimestamp(point.date) >= rangeStartGoal)
          : history;

        const effectiveHistory = filteredHistory.length > 0 ? filteredHistory : history;

        const formatted = transformData(effectiveHistory, timeframe);

        if (formatted.length > 0) {
          const seriesData = valueMode === "percent" ? toPercentChangeSeries(formatted) : formatted;

          series.setData(seriesData);
          series.applyOptions({ visible: true });
          series.applyOptions({
            priceFormat: valueMode === "percent"
              ? { type: "percent", precision: 2, minMove: 0.01 }
              : { type: "price", precision: 2, minMove: 0.01 }
          });
          hasData = true;

          const firstPoint = formatted[0];
          const lastPoint = formatted[formatted.length - 1];
          if (firstPoint && typeof firstPoint.time === "number") {
            earliestTimestamp = earliestTimestamp === null || (firstPoint.time as number) < Number(earliestTimestamp)
              ? (firstPoint.time as UTCTimestamp)
              : earliestTimestamp;
          }
          if (lastPoint && typeof lastPoint.time === "number") {
            latestTimestamp = latestTimestamp === null || (lastPoint.time as number) > Number(latestTimestamp)
              ? (lastPoint.time as UTCTimestamp)
              : latestTimestamp;
          }
        }
      }
    });

    if (hasData) {
      requestAnimationFrame(() => {
        if (chartRef.current) {
          const timeScale = chartRef.current.timeScale();

          if (latestTimestamp !== null && earliestTimestamp !== null) {
            let fromTimestamp: UTCTimestamp;

            if (rangeStartGoal !== null) {
              const candidate = Math.max(Number(rangeStartGoal), Number(earliestTimestamp)) as UTCTimestamp;
              fromTimestamp = candidate;
            } else {
              fromTimestamp = earliestTimestamp;
            }

            timeScale.setVisibleRange({
              from: fromTimestamp,
              to: latestTimestamp
            });
          } else {
            timeScale.fitContent();
          }

          timeScale.applyOptions({ rightOffset: defaultTimeScaleRightOffset });

          // Apply autoscale to the price axis
          chartRef.current.priceScale("right").applyOptions({ autoScale: true });
        } else {
          // Chart was disposed between data update and frame execution
          // (for example, due to component unmount). No action required.
        }
      });
    }
  }, [activeSectorConfigs, dateRange, sectorsBySymbol, selectedSet, timeframe, valueMode]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-foreground/90">Sector Price Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[420px] rounded-lg bg-muted/30 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-foreground/90">Sector Price Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load sector price data. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg font-medium text-foreground/90">Sector Price Trends</CardTitle>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            {timeframeOptions.map((option) => (
              <Button
                key={option.value}
                variant={timeframe === option.value ? "default" : "outline"}
                size="sm"
                className={cn("px-3", timeframe === option.value ? "shadow-sm" : "")}
                onClick={() => setTimeframe(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Y Axis:</span>
            <Button
              variant={valueMode === "price" ? "default" : "outline"}
              size="sm"
              className={cn("px-3", valueMode === "price" ? "shadow-sm" : "")}
              onClick={() => setValueMode("price")}
            >
              Price
            </Button>
            <Button
              variant={valueMode === "percent" ? "default" : "outline"}
              size="sm"
              className={cn("px-3", valueMode === "percent" ? "shadow-sm" : "")}
              onClick={() => setValueMode("percent")}
            >
              % Change
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Date Range:</span>
            <Button
              variant={dateRange === "max" ? "default" : "outline"}
              size="sm"
              className={cn("px-3", dateRange === "max" ? "shadow-sm" : "")}
              onClick={() => setDateRange("max")}
            >
              Max
            </Button>
            <Button
              variant={dateRange === "oneYear" ? "default" : "outline"}
              size="sm"
              className={cn("px-3", dateRange === "oneYear" ? "shadow-sm" : "")}
              onClick={() => setDateRange("oneYear")}
            >
              1 Year
            </Button>
            <Button
              variant={dateRange === "ytd" ? "default" : "outline"}
              size="sm"
              className={cn("px-3", dateRange === "ytd" ? "shadow-sm" : "")}
              onClick={() => setDateRange("ytd")}
            >
              YTD
            </Button>
          </div>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="px-3">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Sectors</DialogTitle>
                <DialogDescription>Choose which sectors appear on the chart.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-3">
                {sectorConfigs.map((sector) => {
                  const checked = pendingSet.has(sector.symbol);
                  const disableUncheck = checked && pendingSymbols.length === 1;

                  return (
                    <label
                      key={sector.symbol}
                      className={cn(
                        "flex items-center gap-3 rounded-md border border-border/40 px-3 py-2 transition-colors",
                        checked ? "bg-primary/5" : "bg-background"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disableUncheck}
                        onChange={() => togglePendingSymbol(sector.symbol)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <div className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-6 rounded-full" style={{ backgroundColor: sector.color }} />
                        <span className="font-medium text-foreground/90">{sector.symbol}</span>
                        <span className="text-muted-foreground">{sector.name}</span>
                      </div>
                    </label>
                  );
                })}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSettingsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveSelections}
                    disabled={pendingSymbols.length === 0}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[420px] w-full">
          <div ref={chartContainerRef} className="h-full w-full" />
        </div>
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2 lg:grid-cols-3">
          {activeSectorConfigs.map((sector) => (
            <div key={sector.symbol} className="flex items-center gap-2">
              <span className="h-2 w-6 rounded-full" style={{ backgroundColor: sector.color }} />
              <span className="font-medium text-foreground/80">{sector.symbol}</span>
              <span>{sector.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

