'use client';

import { memo, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { useTheme } from "next-themes";

interface ChartProps {
  symbol: string;
  exchange?: string | null;
  height?: number;
}

function Chart({ symbol, exchange, height = 480 }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const widgetContainer = widgetContainerRef.current;
    if (!widgetContainer || !symbol) {
      return;
    }

    widgetContainer.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    const normalizedSymbol = symbol.toUpperCase();
    const normalizedExchange = exchange ? exchange.toUpperCase() : "";
    const formattedSymbol = normalizedExchange
      ? `${normalizedExchange}:${normalizedSymbol}`
      : normalizedSymbol;

    const theme = (resolvedTheme ?? "dark") === "light" ? "light" : "dark";
    const backgroundColor = theme === "light" ? "#FFFFFF" : "#0F0F0F";
    const gridColor = theme === "light" ? "rgba(15, 23, 42, 0.08)" : "rgba(242, 242, 242, 0.06)";

    const config = {
      autosize: true,
      height,
      width: "100%",
      allow_symbol_change: false,
      calendar: false,
      details: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: true,
      hide_volume: false,
      hotlist: false,
      interval: "D",
      locale: "en",
      save_image: false,
      style: "0",
      symbol: formattedSymbol,
      theme,
      timezone: "Etc/UTC",
      backgroundColor,
      gridColor,
      watchlist: [],
      withdateranges: false,
      range: "12M",
      compareSymbols: [],
      studies: ["STD;RSI"]
    } satisfies Record<string, unknown>;

    script.innerHTML = JSON.stringify(config);
    widgetContainer.appendChild(script);

    return () => {
      widgetContainer.innerHTML = "";
    };
  }, [exchange, height, resolvedTheme, symbol]);

  const tradingViewLink = `https://www.tradingview.com/symbols/${symbol ? symbol.toUpperCase().replace(/\./g, '-') : ""}/`;
  const containerStyle = useMemo<CSSProperties>(() => ({
    width: "100%",
    minHeight: height,
    height,
    display: "flex",
    flexDirection: "column"
  }), [height]);

  return (
    <div className="tradingview-widget-container w-full" ref={containerRef} style={containerStyle}>
      <div ref={widgetContainerRef} className="tradingview-widget-container__widget flex-1" style={{ width: "100%", minHeight: 0 }} />
      <div className="tradingview-widget-copyright text-xs text-muted-foreground">
        <a href={tradingViewLink} rel="noopener nofollow" target="_blank" className="text-primary hover:underline">
          {symbol?.toUpperCase()} stock chart
        </a>
        <span className="ml-1">by TradingView</span>
      </div>
    </div>
  );
}

export default memo(Chart);

/*
// Previous lightweight-charts implementation retained for reference.

import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries, Time, MouseEventParams, SeriesDataItemTypeMap } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import { useIntradayChart } from '@/hooks/FMP/useIntradayChart';
import { useDailyPrices } from '@/hooks/FMP/useDailyPrices';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { DatePicker } from '@/components/ui/date-picker';
import { addDays, format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';

const timeframes = [
  { value: '1D', label: '1D' },
  { value: '4hour', label: '4H' },
  { value: '1hour', label: '1H' },
  { value: '30min', label: '30M' },
  { value: '15min', label: '15M' },
  { value: '5min', label: '5M' },
  { value: '1min', label: '1M' },
] as const;

type TimeframeType = typeof timeframes[number]['value'];

interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface MAData {
  time: Time;
  value?: number;
}

function calculateEMA(data: CandleData[], period: number): MAData[] {
  if (!data || data.length === 0 || data.length < period) {
    return [];
  }

  const emaData: MAData[] = [];
  const multiplier = 2 / (period + 1);

  let initialSum = 0;
  // Calculate first SMA for initial EMA
  for (let i = 0; i < period; i++) {
    if (data[i] && typeof data[i].close === 'number') {
      initialSum += data[i].close;
    } else {
      return [];
    }
    emaData.push({ time: data[i].time });
  }

  let previousEMA = initialSum / period;
  emaData[period - 1] = {
    time: data[period - 1].time,
    value: previousEMA,
  };

  for (let i = period; i < data.length; i++) {
    if (data[i] && typeof data[i].close === 'number') {
      const currentClose = data[i].close;
      const currentEMA = (currentClose - previousEMA) * multiplier + previousEMA;
      previousEMA = currentEMA;

      emaData.push({
        time: data[i].time,
        value: currentEMA,
      });
    } else {
      emaData.push({ time: data[i].time });
    }
  }

  return emaData;
}

function calculateSMA(data: CandleData[], period: number): MAData[] {
  if (!data || data.length === 0 || data.length < period) {
    return [];
  }

  const smaData: MAData[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      smaData.push({ time: data[i].time });
    } else {
      let sum = 0;
      let validPoints = 0;

      for (let j = 0; j < period; j++) {
        if (data[i - j] && typeof data[i - j].close === 'number') {
          sum += data[i - j].close;
          validPoints++;
        }
      }

      if (validPoints === period) {
        smaData.push({
          time: data[i].time,
          value: sum / period,
        });
      } else {
        smaData.push({ time: data[i].time });
      }
    }
  }

  return smaData;
}

export default function Chart({ symbol }: ChartProps) {
  // ... original implementation ...
}
*/ 