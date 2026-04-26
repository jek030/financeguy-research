"use client";
import { useEffect, useState } from 'react';
import SectorPerformance from '@/components/ui/(fmp)/SectorPerformance';
import MarketMostActive from '@/components/ui/(fmp)/MarketMostActive';
import MarketGainers from '@/components/ui/(fmp)/MarketGainers';
import CompanyScreener from '@/components/ui/(fmp)/CompanyScreener';
import { Button } from '@/components/ui/Button';
import { pageStyles } from '@/components/ui/CompanyHeader';
import { useSectorPerformance } from '@/hooks/FMP/useSectorPerformance';

type ScreenerView = 'company' | 'active' | 'gainers' | 'sectors';
const SCREENER_VIEW_STORAGE_KEY = 'financeguy-screener-active-view';

const VIEWS: { id: ScreenerView; label: string }[] = [
  { id: 'company', label: 'Company Screener' },
  { id: 'active', label: 'Most Active' },
  { id: 'gainers', label: 'Top Gainers' },
  { id: 'sectors', label: 'Sectors' },
];

export default function ScreenerPage() {
  const [activeView, setActiveView] = useState<ScreenerView>('company');
  const { data: sectorData = [] } = useSectorPerformance();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SCREENER_VIEW_STORAGE_KEY);
      if (
        stored === 'company' ||
        stored === 'active' ||
        stored === 'gainers' ||
        stored === 'sectors'
      ) {
        setActiveView(stored);
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  const handleViewChange = (view: ScreenerView) => {
    setActiveView(view);
    try {
      localStorage.setItem(SCREENER_VIEW_STORAGE_KEY, view);
    } catch {
      // Ignore localStorage write errors
    }
  };

  const positiveSectors = sectorData.filter(
    (sector) => parseFloat(sector.changesPercentage) > 0
  ).length;

  const topSector = [...sectorData].sort(
    (a, b) => parseFloat(b.changesPercentage) - parseFloat(a.changesPercentage)
  )[0];

  return (
    <div className={`flex flex-col min-h-screen ${pageStyles.gradientBg}`}>
      <main className="flex-1 px-2 md:px-3 py-2 md:py-3">
        <div className="w-full space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-3">
              <h1 className="text-lg md:text-xl font-semibold tracking-tight">Screener</h1>
              <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Sectors Up: <span className="text-foreground font-medium tabular-nums">{positiveSectors}</span>
                </span>
                <span>
                  Top: <span className="text-foreground font-medium">{topSector?.sector || 'N/A'}</span>
                </span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-card p-0.5">
              {VIEWS.map((view) => (
                <Button
                  key={view.id}
                  variant={activeView === view.id ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => handleViewChange(view.id)}
                >
                  {view.label}
                </Button>
              ))}
            </div>
          </div>

          {activeView === 'company' && <CompanyScreener />}
          {activeView === 'active' && <MarketMostActive />}
          {activeView === 'gainers' && <MarketGainers />}
          {activeView === 'sectors' && <SectorPerformance />}
        </div>
      </main>
    </div>
  );
}
