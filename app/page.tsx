'use client';

import { useQuote } from "@/hooks/FMP/useQuote";
import { TerminalTicker } from "@/components/home/TerminalTicker";
import { marketInstruments } from "@/components/home/marketInstruments";
import { FearGreedCard } from "@/components/home/FearGreedCard";
import { NaaimCard } from "@/components/home/NaaimCard";
import SectorReturns from "@/components/SectorReturns";
import SectorOverviewChart from "@/components/SectorOverviewChart";
import { useSupabaseSectorData } from "@/hooks/useSupabaseSectorData";
import { pageStyles } from "@/components/ui/CompanyHeader";

export default function Home() {
  const { data: spyData, isLoading: isSpyLoading } = useQuote("SPY");
  const { data: qqqData, isLoading: isQqqLoading } = useQuote("QQQ");
  const { data: diaData, isLoading: isDiaLoading } = useQuote("DIA");
  const { data: slvData, isLoading: isSlvLoading } = useQuote("SLV");
  const { data: gldData, isLoading: isGldLoading } = useQuote("GLD");
  const { data: vixData, isLoading: isVixLoading } = useQuote("^VIX");
  const { sectorsBySymbol, latestDate, isLoading: sectorsLoading, error: sectorsError } = useSupabaseSectorData();

  const instrumentDataBySymbol = {
    SPY: { data: spyData, isLoading: isSpyLoading },
    QQQ: { data: qqqData, isLoading: isQqqLoading },
    DIA: { data: diaData, isLoading: isDiaLoading },
    SLV: { data: slvData, isLoading: isSlvLoading },
    GLD: { data: gldData, isLoading: isGldLoading },
    "^VIX": { data: vixData, isLoading: isVixLoading }
  } as const;

  const getInstrumentSnapshot = (symbol: string) => {
    const snapshot = instrumentDataBySymbol[symbol as keyof typeof instrumentDataBySymbol];
    if (!snapshot) return { data: undefined, isLoading: false };
    return snapshot;
  };

  return (
    <div className={`min-h-screen ${pageStyles.gradientBg}`}>
      <main className="w-full px-1 pb-3 pt-2 sm:px-2 sm:pb-4 sm:pt-3 lg:px-2">
        <div className="mb-2 grid grid-cols-1 gap-1.5 md:grid-cols-2">
          <FearGreedCard />
          <NaaimCard />
        </div>

        <div className="-mx-2 mb-2 grid grid-flow-col auto-cols-[minmax(285px,1fr)] gap-1.5 overflow-x-auto px-2 pb-1 md:mx-0 md:grid-flow-row md:auto-cols-auto md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3 2xl:grid-cols-4">
          {marketInstruments.map((instrument) => {
            const snapshot = getInstrumentSnapshot(instrument.symbol);
            return (
              <TerminalTicker
                key={instrument.symbol}
                label={instrument.label}
                symbol={instrument.symbol}
                data={snapshot.data}
                isLoading={snapshot.isLoading}
              />
            );
          })}
        </div>

        <div className="mt-3">
          <SectorReturns
            sectorsBySymbol={sectorsBySymbol}
            latestDate={latestDate}
            isLoading={sectorsLoading}
            error={sectorsError}
          />
        </div>

        <div className="mt-3">
          <SectorOverviewChart
            sectorsBySymbol={sectorsBySymbol}
            isLoading={sectorsLoading}
            error={sectorsError}
          />
        </div>
      </main>
    </div>
  );
}
