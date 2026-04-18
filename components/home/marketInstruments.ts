export interface MarketInstrument {
  label: string;
  symbol: string;
}

export const marketInstruments: MarketInstrument[] = [
  { label: "S&P 500 ETF", symbol: "SPY" },
  { label: "Nasdaq 100 ETF", symbol: "QQQ" },
  { label: "Dow Jones ETF", symbol: "DIA" },
  { label: "Silver ETF", symbol: "SLV" },
  { label: "Gold ETF", symbol: "GLD" },
  { label: "VIX", symbol: "^VIX" }
];
