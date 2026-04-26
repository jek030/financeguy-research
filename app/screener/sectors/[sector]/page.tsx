"use client";
import SectorStocks from '@/components/ui/(fmp)/SectorStocks';
import { use } from 'react';
import { pageStyles } from '@/components/ui/CompanyHeader';

export default function SectorStocksPage({ params }: { params: Promise<{ sector: string }> }) {
  const resolvedParams = use(params);
  const sector = decodeURIComponent(resolvedParams.sector);

  return (
    <div className={`flex flex-col min-h-screen ${pageStyles.gradientBg}`}>
      <main className="flex-1 px-2 md:px-3 py-2 md:py-3">
        <div className="w-full space-y-2">
          <SectorStocks sector={sector} />
        </div>
      </main>
    </div>
  );
}
