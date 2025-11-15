'use client';

import { memo, useEffect, useMemo, useRef, type ReactElement } from "react";
import { useTheme } from "next-themes";

interface TradingViewTicker {
  proName: string;
  title: string;
}

interface TradingViewTickerConfig {
  symbols: TradingViewTicker[];
  colorTheme: "light" | "dark";
  locale: string;
  largeChartUrl: string;
  isTransparent: boolean;
  showSymbolLogo: boolean;
}

function TVWTickersComponent(): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  const tickers = useMemo<TradingViewTicker[]>(() => ([
    { proName: "AMEX:SPY", title: "S&P 500 ETF" },
    { proName: "NASDAQ:QQQ", title: "NASDAQ 100 ETF" },
    { proName: "AMEX:DIA", title: "Dow Jones Industrial" },
    { proName: "AMEX:RSP", title: "Equal Weight S&P" },
    { proName: "AMEX:SLV", title: "Silver" },
    { proName: "AMEX:GLD", title: "Gold" },
    { proName: "TVC:VIX", title: "VIX Volatility" }
  ]), []);

  const widgetConfig = useMemo<TradingViewTickerConfig>(() => {
    const colorTheme: "light" | "dark" = (resolvedTheme ?? "dark") === "light" ? "light" : "dark";

    return {
      symbols: tickers,
      colorTheme,
      locale: "en",
      largeChartUrl: "",
      isTransparent: true,
      showSymbolLogo: false
    };
  }, [resolvedTheme, tickers]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-tickers.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify(widgetConfig);

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [widgetConfig]);

  return (
    <div className="rounded-lg border border-border/40 bg-background/80 shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-[480px] px-2 py-2">
          <div className="tradingview-widget-container" ref={containerRef} />
        </div>
      </div>
      <div className="px-3 pb-2 text-xs text-muted-foreground">
        <a
          href="https://www.tradingview.com/markets/"
          rel="noopener nofollow"
          target="_blank"
          className="text-primary"
        >
          <span>Markets today by TradingView</span>
        </a>
      </div>
    </div>
  );
}

const TVWTickers = memo(TVWTickersComponent);

export default TVWTickers;

