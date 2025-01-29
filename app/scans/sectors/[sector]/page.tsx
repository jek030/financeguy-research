"use client";
import SectorStocks from '@/components/ui/(fmp)/SectorStocks';
import { use } from 'react';

export default function SectorStocksPage({ params }: { params: Promise<{ sector: string }> }) {
  const resolvedParams = use(params);
  const sector = decodeURIComponent(resolvedParams.sector);

  return (
    <div className="flex flex-col space-y-4">
      <div className="container px-4 py-4 mx-auto">
        <SectorStocks sector={sector} />
      </div>
    </div>
  );
} 