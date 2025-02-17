"use client";
import { useState } from 'react';
import { use } from 'react';
import RRCard from '@/components/ui/RRCard';
import CompanyOutlookCard from '@/components/ui/(fmp)/CompanyOutlookCard';

export default function Page({ params }: { params: Promise<{ symbol: string }> }) {
  const resolvedParams = use(params);
  const symbol = resolvedParams.symbol.toUpperCase();
  const [currentPrice] = useState<number>(0);

  return (
    <div className="flex flex-col w-full gap-2">
      <div className="flex flex-col gap-2">
        <CompanyOutlookCard symbol={symbol} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 w-full">
          <RRCard price={currentPrice} />
        </div>
      </div>
    </div>
  );
}