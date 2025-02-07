"use client";

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

interface ChartProps {
  symbol: string;
}

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
      return []; // Return empty array if any required data is missing
    }
    // Add empty points for the initial period
    emaData.push({ time: data[i].time });
  }

  // Calculate first EMA
  let previousEMA = initialSum / period;
  emaData[period - 1] = {
    time: data[period - 1].time,
    value: previousEMA
  };

  // Calculate subsequent EMAs
  for (let i = period; i < data.length; i++) {
    if (data[i] && typeof data[i].close === 'number') {
      const currentClose = data[i].close;
      const currentEMA = (currentClose - previousEMA) * multiplier + previousEMA;
      previousEMA = currentEMA;
      
      emaData.push({
        time: data[i].time,
        value: currentEMA
      });
    } else {
      emaData.push({ time: data[i].time }); // Add point without value if data is invalid
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
      // Add empty points until we have enough data
      smaData.push({ time: data[i].time });
    } else {
      // Calculate SMA
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
          value: sum / period
        });
      } else {
        smaData.push({ time: data[i].time }); // Add point without value if not enough valid data
      }
    }
  }

  return smaData;
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

  const { data: intradayData, isLoading: isIntradayLoading } = useIntradayChart({
    symbol,
    timeframe: timeframe as Exclude<TimeframeType, '1D'>,
    from: formattedFromDate,
    to: formattedToDate,
    enabled: !isDaily,
  });

  const { data: dailyData, isLoading: isDailyLoading } = useDailyPrices({
    symbol,
    from: formattedFromDate,
    to: formattedToDate,
    enabled: isDaily,
  });

  const isLoading = isDaily ? isDailyLoading : isIntradayLoading;
  const data = isDaily ? dailyData : intradayData;

  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (isLoading) return;
    if (!data || data.length === 0) return;

    const handleResize = () => {
      const container = chartContainerRef.current!;
      chart.applyOptions({ 
        width: container.clientWidth,
        height: 480,
      });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a1a' },
        textColor: '#d1d4dc',
        fontSize: 12,
      },
      width: chartContainerRef.current.clientWidth,
      height: 480,
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.6)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.6)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(42, 46, 57, 0.6)',
        barSpacing: 6,
        minBarSpacing: 4,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
          });
        },
      },
      rightPriceScale: {
        mode: 1,
        borderColor: 'rgba(42, 46, 57, 0.6)',
        autoScale: true,
        scaleMargins: {
          top: 0.3, // Increased top margin for legend
          bottom: 0.1,
        },
        entireTextOnly: true,
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: 'rgba(224, 227, 235, 0.1)',
          width: 1,
          style: 3,
        },
        horzLine: {
          color: 'rgba(224, 227, 235, 0.1)',
          width: 1,
          style: 3,
        },
      },
    });

    // Format and set data based on timeframe
    const formattedCandlestickData = data
      .filter(item => item && typeof item.open === 'number' && typeof item.high === 'number' && 
                      typeof item.low === 'number' && typeof item.close === 'number')
      .map((item) => ({
        time: (new Date(item.date).getTime() / 1000) as Time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    if (formattedCandlestickData.length === 0) return; // Exit if no valid data

    const formattedVolumeData = data
      .filter(item => item && typeof item.volume === 'number')
      .map((item) => ({
        time: (new Date(item.date).getTime() / 1000) as Time,
        value: item.volume,
        color: item.close >= item.open ? '#26a69a' : '#ef5350',
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    // Calculate moving average data only if we have enough points
    const ema10Data = calculateEMA(formattedCandlestickData, 10);
    const ema20Data = calculateEMA(formattedCandlestickData, 20);
    const sma50Data = calculateSMA(formattedCandlestickData, 50);

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

    // Add EMA-10 series
    const ema10Series = chart.addSeries(LineSeries, {
      color: '#FFD700', // Gold color
      lineWidth: 1,
    });

    // Add EMA-20 series
    const ema20Series = chart.addSeries(LineSeries, {
      color: '#00CED1', // Cyan color
      lineWidth: 1,
    });

    // Add SMA-50 series
    const sma50Series = chart.addSeries(LineSeries, {
      color: '#9370DB', // Medium purple
      lineWidth: 1,
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

    // Set the data for all series
    candlestickSeries.setData(formattedCandlestickData);
    volumeSeries.setData(formattedVolumeData);
    ema10Series.setData(ema10Data);
    ema20Series.setData(ema20Data);
    sma50Series.setData(sma50Data);

    // Create and add legend elements
    const mainLegend = document.createElement('div');
    mainLegend.style.position = 'absolute';
    mainLegend.style.left = '12px';
    mainLegend.style.top = '12px';
    mainLegend.style.zIndex = '2';
    mainLegend.style.fontSize = '12px';
    mainLegend.style.fontFamily = 'sans-serif';
    mainLegend.style.lineHeight = '18px';
    mainLegend.style.color = '#d1d4dc';
    mainLegend.style.padding = '8px';
    mainLegend.style.backgroundColor = 'rgba(26, 26, 26, 0.9)';
    mainLegend.style.borderRadius = '4px';
    mainLegend.style.pointerEvents = 'none';
    mainLegend.style.width = '100px'; // Fixed width for main legend

    const maLegend = document.createElement('div');
    maLegend.style.position = 'absolute';
    maLegend.style.left = '120px'; // Position right after main legend
    maLegend.style.top = '12px';
    maLegend.style.zIndex = '2';
    maLegend.style.fontSize = '10px'; // Smaller font size
    maLegend.style.fontFamily = 'sans-serif';
    maLegend.style.lineHeight = '16px'; // Reduced line height
    maLegend.style.color = '#d1d4dc';
    maLegend.style.padding = '8px';
    maLegend.style.backgroundColor = 'rgba(26, 26, 26, 0.9)';
    maLegend.style.borderRadius = '4px';
    maLegend.style.pointerEvents = 'none';
    maLegend.style.display = 'flex';
    maLegend.style.gap = '12px'; // Slightly increased gap
    maLegend.style.whiteSpace = 'nowrap'; // Prevent wrapping

    // Add media query for desktop screens
    const mediaQuery = window.matchMedia('(min-width: 640px)');
    
    function handleScreenChange(e: MediaQueryListEvent | MediaQueryList) {
      if (e.matches) {
        // Desktop layout
        maLegend.style.left = '80px';
      } else {
        // Mobile layout - still next to main legend but with adjusted position
        maLegend.style.left = '80';
      }
    }

    // Initial check
    handleScreenChange(mediaQuery);
    
    // Listen for screen size changes
    mediaQuery.addEventListener('change', handleScreenChange);

    // Make sure the chart container has relative positioning
    chartContainerRef.current.style.position = 'relative';
    chartContainerRef.current.appendChild(mainLegend);
    chartContainerRef.current.appendChild(maLegend);

    const formatPrice = (price: number) => price.toFixed(2);

    const updateLegends = (param: MouseEventParams | undefined) => {
      if (!data || data.length === 0) return;

      let price, ema10, ema20, sma50;
      if (param?.time && param?.seriesData) {
        const candleData = param.seriesData.get(candlestickSeries) as SeriesDataItemTypeMap['Candlestick'] | undefined;
        const ema10Data = param.seriesData.get(ema10Series) as SeriesDataItemTypeMap['Line'] | undefined;
        const ema20Data = param.seriesData.get(ema20Series) as SeriesDataItemTypeMap['Line'] | undefined;
        const sma50Data = param.seriesData.get(sma50Series) as SeriesDataItemTypeMap['Line'] | undefined;
        
        price = candleData && 'close' in candleData ? candleData.close : undefined;
        ema10 = ema10Data && 'value' in ema10Data ? ema10Data.value : undefined;
        ema20 = ema20Data && 'value' in ema20Data ? ema20Data.value : undefined;
        sma50 = sma50Data && 'value' in sma50Data ? sma50Data.value : undefined;
      }
      
      if (!price || !ema10 || !ema20 || !sma50) {
        // If no crosshair point, use the last values
        const lastBar = data[data.length - 1];
        if (!lastBar) return; // Guard against empty data

        price = lastBar.close;
        ema10 = ema10Data[ema10Data.length - 1]?.value;
        ema20 = ema20Data[ema20Data.length - 1]?.value;
        sma50 = sma50Data[sma50Data.length - 1]?.value;
      }

      // Update main legend with symbol and price
      mainLegend.innerHTML = `
        <div style="font-size: 20px; margin: 0px; font-weight: 500; white-space: nowrap;">${symbol.toUpperCase()}</div>
        <div style="font-size: 18px; margin: 0px; font-weight: 500;">$${formatPrice(price)}</div>
      `;

      // Update MA legend with more compact layout
      maLegend.innerHTML = `
        <div style="color: #FFD700">EMA10:$${ema10 ? formatPrice(ema10) : 'N/A'}</div>
        <div style="color: #00CED1">EMA20:$${ema20 ? formatPrice(ema20) : 'N/A'}</div>
        <div style="color: #9370DB">SMA50:$${sma50 ? formatPrice(sma50) : 'N/A'}</div>
      `;
    };

    // Subscribe to crosshair moves
    chart.subscribeCrosshairMove(updateLegends);

    // Initial legend update - only if we have data
    if (data && data.length > 0) {
      updateLegends(undefined);
    }

    chart.timeScale().fitContent();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mediaQuery.removeEventListener('change', handleScreenChange);
      chart.remove();
    };
  }, [intradayData, dailyData, isDaily, symbol, isLoading, data]);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full sm:w-auto">
              <DatePicker
                fromDate={fromDate}
                toDate={toDate}
                onRangeChange={({ from, to }) => {
                  setFromDate(from);
                  setToDate(to);
                }}
                label="Select date range"
              />
            </div>
            <div className="w-full sm:w-auto">
              <Tabs 
                value={timeframe} 
                onValueChange={(v) => setTimeframe(v as TimeframeType)}
                className="w-full sm:w-auto"
              >
                <TabsList className="w-full sm:w-auto grid grid-cols-7 sm:flex">
                  {timeframes.map((tf) => (
                    <TabsTrigger 
                      key={tf.value} 
                      value={tf.value}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      {tf.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
        <div 
          ref={chartContainerRef} 
          className="w-full h-[480px] relative"
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          )}
        </div>
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