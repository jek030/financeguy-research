'use client';

import { memo, useEffect, useMemo, useRef, type ReactElement } from "react";
import { useTheme } from "next-themes";

interface TradingViewWidgetConfig {
  lineWidth: number;
  lineType: number;
  chartType: string;
  fontColor: string;
  gridLineColor: string;
  volumeUpColor: string;
  volumeDownColor: string;
  backgroundColor: string;
  widgetFontColor: string;
  upColor: string;
  downColor: string;
  borderUpColor: string;
  borderDownColor: string;
  wickUpColor: string;
  wickDownColor: string;
  colorTheme: "light" | "dark";
  isTransparent: boolean;
  locale: string;
  chartOnly: boolean;
  scalePosition: string;
  scaleMode: string;
  fontFamily: string;
  valuesTracking: string;
  changeMode: string;
  symbols: string[][];
  dateRanges: string[];
  fontSize: string;
  headerFontSize: string;
  autosize: boolean;
  width: string;
  height: string;
  noTimeScale: boolean;
  hideDateRanges: boolean;
  hideMarketStatus: boolean;
  hideSymbolLogo: boolean;
}

function TVWSymbolOverviewComponent(): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  const widgetConfig = useMemo<TradingViewWidgetConfig>(() => {
    const isLightTheme = (resolvedTheme ?? "dark") === "light";

    const baseConfig: TradingViewWidgetConfig = {
      lineWidth: 2,
      lineType: 0,
      chartType: "area",
      fontColor: "rgb(106, 109, 120)",
      gridLineColor: "rgba(242, 242, 242, 0.06)",
      volumeUpColor: "rgba(34, 171, 148, 0.5)",
      volumeDownColor: "rgba(247, 82, 95, 0.5)",
      backgroundColor: "#0F0F0F",
      widgetFontColor: "#DBDBDB",
      upColor: "#22ab94",
      downColor: "#f7525f",
      borderUpColor: "#22ab94",
      borderDownColor: "#f7525f",
      wickUpColor: "#22ab94",
      wickDownColor: "#f7525f",
      colorTheme: "dark",
      isTransparent: false,
      locale: "en",
      chartOnly: false,
      scalePosition: "right",
      scaleMode: "Normal",
      fontFamily: "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      valuesTracking: "1",
      changeMode: "price-and-percent",
      symbols: [
        ["AMEX:SPY|1D"],
        ["NASDAQ:QQQ|1D"],
        ["AMEX:DIA|1D"],    
        ["AMEX:RSP|1D"],
        ["AMEX:IWM|1D"],  
        ["AMEX:SLV|1D"],
        ["AMEX:GLD|1D"],
        ["TVC:VIX|1D"]
      ],
      dateRanges: ["1d|1", "1m|30", "3m|60", "12m|1D", "60m|1W", "all|1M"],
      fontSize: "10",
      headerFontSize: "medium",
      autosize: true,
      width: "100%",
      height: "100%",
      noTimeScale: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false
    };

    if (isLightTheme) {
      return {
        ...baseConfig,
        colorTheme: "light",
        fontColor: "rgb(106, 109, 120)",
        gridLineColor: "rgba(46, 46, 46, 0.06)",
        volumeUpColor: "rgba(34, 171, 148, 0.5)",
        volumeDownColor: "rgba(247, 82, 95, 0.5)",
        backgroundColor: "#ffffff",
        widgetFontColor: "#0F0F0F",
        upColor: "#22ab94",
        downColor: "#f7525f",
        borderUpColor: "#22ab94",
        borderDownColor: "#f7525f",
        wickUpColor: "#22ab94",
        wickDownColor: "#f7525f"
      };
    }

    return baseConfig;
  }, [resolvedTheme]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !widgetConfig) {
      return;
    }

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify(widgetConfig);

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [widgetConfig]);

  return (
    <div className="tradingview-widget-container h-full w-full" ref={containerRef}>
      <div className="tradingview-widget-container__widget h-full w-full" />
      <div className="tradingview-widget-copyright text-xs text-muted-foreground">
        <a
          href="https://www.tradingview.com/symbols/NASDAQ-AAPL/"
          rel="noopener nofollow"
          target="_blank"
          className="text-primary"
        >
          <span>Apple</span>
        </a>
        <span className="comma">,</span>&nbsp;
        <a
          href="https://www.tradingview.com/symbols/NASDAQ-GOOGL/"
          rel="noopener nofollow"
          target="_blank"
          className="text-primary"
        >
          <span>Google</span>
        </a>
        <span className="comma">,</span>
        <span className="and">&nbsp;and&nbsp;</span>
        <a
          href="https://www.tradingview.com/symbols/NASDAQ-MSFT/"
          rel="noopener nofollow"
          target="_blank"
          className="text-primary"
        >
          <span>Microsoft stock price</span>
        </a>
        <span className="trademark">&nbsp;by TradingView</span>
      </div>
    </div>
  );
}

const TVWSymbolOverview = memo(TVWSymbolOverviewComponent);

export default TVWSymbolOverview;

