export interface SectorDefinition {
  symbol: string;
  name: string;
  color: string;
}

export const sectorDefinitions: SectorDefinition[] = [
  { symbol: "XLE", name: "Energy", color: "#f97316" },
  { symbol: "XLB", name: "Materials", color: "#8b5cf6" },
  { symbol: "XLV", name: "Health Care", color: "#22c55e" },
  { symbol: "XLU", name: "Utilities", color: "#0ea5e9" },
  { symbol: "XLRE", name: "Real Estate", color: "#ec4899" },
  { symbol: "XLF", name: "Financials", color: "#38bdf8" },
  { symbol: "XLI", name: "Industrials", color: "#facc15" },
  { symbol: "XLP", name: "Consumer Staples", color: "#fb7185" },
  { symbol: "XLK", name: "Technology", color: "#60a5fa" },
  { symbol: "XLC", name: "Communication Services", color: "#a855f7" },
  { symbol: "XLY", name: "Consumer Discretionary", color: "#fbbf24" }
];

export const sectorSymbols = sectorDefinitions.map((sector) => sector.symbol);
