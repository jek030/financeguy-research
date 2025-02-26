"use client";
import { use } from 'react';
import CompanyOutlookCard from '@/components/ui/(fmp)/CompanyOutlookCard';

export default function Page({ params }: { params: Promise<{ symbol: string }> }) {
  const resolvedParams = use(params);
  const symbol = resolvedParams.symbol.toUpperCase();

  return (
    <div className="flex flex-col w-full max-w-full overflow-hidden">
      <div className="flex flex-col gap-4">
        <CompanyOutlookCard symbol={symbol} />
      </div>
    </div>
  );
}