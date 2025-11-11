'use client';

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
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
import { cn } from "@/lib/utils";
import type { Sector } from "@/lib/types";
import { sectorDefinitions } from "@/lib/sectors";

type Timeframe = "daily" | "weekly" | "monthly";

const sectorConfigs = sectorDefinitions;

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
        rightOffset: 12,
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

    sectorConfigs.forEach((sector) => {
      const series = seriesRef.current[sector.symbol];
      const history = sectorsBySymbol[sector.symbol] ?? [];
      if (series && history.length > 0) {
        const formatted = transformData(history, timeframe);
        if (formatted.length > 0) {
          series.setData(formatted);
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
            const secondsInDay = 86400;
            const targetSpanSeconds = timeframe === "daily"
              ? secondsInDay * 180 // ~6 months
              : timeframe === "weekly"
                ? secondsInDay * 7 * 156 // ~3 years
                : secondsInDay * 30 * 120; // ~10 years

            const desiredFrom = (latestTimestamp as number) - targetSpanSeconds;
            const clampedFrom = desiredFrom > (earliestTimestamp as number)
              ? (desiredFrom as UTCTimestamp)
              : earliestTimestamp;

            timeScale.setVisibleRange({
              from: clampedFrom,
              to: latestTimestamp
            });
          } else {
            timeScale.fitContent();
          }

          // Apply autoscale to the price axis
          chartRef.current.priceScale("right").applyOptions({ autoScale: true });
        } else {
          // Chart was disposed between data update and frame execution
          // (for example, due to component unmount). No action required.
        }
      });
    }
  }, [sectorsBySymbol, timeframe]);

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
          <p className="text-sm text-muted-foreground">Relative price movements across major US equity sectors</p>
        </div>
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
      </CardHeader>
      <CardContent>
        <div className="h-[420px] w-full">
          <div ref={chartContainerRef} className="h-full w-full" />
        </div>
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2 lg:grid-cols-3">
          {sectorConfigs.map((sector) => (
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

