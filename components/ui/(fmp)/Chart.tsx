"use client";

import { createChart, ColorType, CandlestickSeries, HistogramSeries, Time } from 'lightweight-charts';
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

interface ChartProps {
  symbol: string;
}

export default function Chart({ symbol }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // Get today's date and format it
  const today = new Date();
  const [fromDate, setFromDate] = useState<Date>(addDays(today, -365));
  const [toDate, setToDate] = useState<Date>(today);
  const [timeframe, setTimeframe] = useState<TimeframeType>('1D');

  // Fetch data based on timeframe
  const isDaily = timeframe === '1D';
  const formattedFromDate = format(fromDate, 'yyyy-MM-dd');
  const formattedToDate = format(toDate, 'yyyy-MM-dd');

  const { data: intradayData } = useIntradayChart({
    symbol,
    timeframe: timeframe as Exclude<TimeframeType, '1D'>,
    from: formattedFromDate,
    to: formattedToDate,
    enabled: !isDaily,
  });

  const { data: dailyData } = useDailyPrices({
    symbol,
    from: formattedFromDate,
    to: formattedToDate,
    enabled: isDaily,
  });

  useEffect(() => {
    if (!chartContainerRef.current) return;
    if ((!intradayData && !isDaily) || (!dailyData && isDaily)) return;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current!.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgb(156 163 175)',
        fontSize: 12,
      },
      width: chartContainerRef.current.clientWidth,
      height: 480,
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.2)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(42, 46, 57, 0.2)',
        barSpacing: 6,
        minBarSpacing: 4,
      },
      rightPriceScale: {
        mode: 1, // 1 represents logarithmic price scale
        borderColor: 'rgba(42, 46, 57, 0.2)',
        autoScale: true,
        scaleMargins: {
          top: 0.2, // Increased top margin
          bottom: 0.1,
        },
        entireTextOnly: true,
      },
      crosshair: {
        mode: 0, // 0 represents normal crosshair mode
        vertLine: {
          color: 'rgba(42, 46, 57, 0.5)',
          width: 1,
          style: 3, // 3 represents dotted line
        },
        horzLine: {
          color: 'rgba(42, 46, 57, 0.5)',
          width: 1,
          style: 3, // 3 represents dotted line
        },
      },
    });

    // Create candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    // Set candlestick series margins
    candlestickSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.2,
        bottom: 0.2,
      },
    });

    // Create volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Set as overlay
    });

    // Set volume series margins
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // Position volume at bottom 20% of chart
        bottom: 0,
      },
    });

    // Format and set data based on timeframe
    const data = isDaily ? dailyData : intradayData;
    if (!data) return;

    const formattedCandlestickData = data
      .map((item) => ({
        time: (new Date(item.date).getTime() / 1000) as Time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    const formattedVolumeData = data
      .map((item) => ({
        time: (new Date(item.date).getTime() / 1000) as Time,
        value: item.volume,
        color: item.close >= item.open ? '#26a69a' : '#ef5350', // Green if up, red if down
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    candlestickSeries.setData(formattedCandlestickData);
    volumeSeries.setData(formattedVolumeData);
    chart.timeScale().fitContent();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [intradayData, dailyData, isDaily]);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <DatePicker
                date={fromDate}
                onDateChange={setFromDate}
                label="From Date"
              />
              <DatePicker
                date={toDate}
                onDateChange={setToDate}
                label="To Date"
              />
            </div>
            <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as TimeframeType)}>
              <TabsList>
                {timeframes.map((tf) => (
                  <TabsTrigger key={tf.value} value={tf.value}>
                    {tf.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
        <div 
          ref={chartContainerRef} 
          className="w-full h-[480px]"
        />
      </CardContent>
      <CardFooter className="text-xs">
        <p>
          TradingView Lightweight Charts™ <br />
          Copyright (с) 2025 TradingView, Inc. <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">https://www.tradingview.com/</a>
        </p>
      </CardFooter>
    </Card>
  );
} 