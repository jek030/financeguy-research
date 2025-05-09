"use client";
import { use } from 'react';
import CompanyOutlookCard from '@/components/ui/(fmp)/CompanyOutlookCard';

export default function Page({ params }: { params: Promise<{ symbol: string }> }) {
  const resolvedParams = use(params);
  const symbol = resolvedParams.symbol.toUpperCase();

  return (
    <div className="flex flex-col w-full max-w-full overflow-hidden -m-4">
      <div className="flex flex-col">
        <CompanyOutlookCard symbol={symbol} />
      </div>
    </div>
  );
}