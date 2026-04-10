"use client";

import CompanyOutlookCard from "@/components/ui/(fmp)/CompanyOutlookCard";
import type { CompanyOutlook, Ticker } from "@/lib/types";

interface SearchPageClientProps {
  symbol: string;
  initialQuote?: Ticker;
  initialOutlook?: CompanyOutlook;
}

export default function SearchPageClient({
  symbol,
  initialQuote,
  initialOutlook,
}: SearchPageClientProps) {
  return (
    <div className="flex flex-col w-full max-w-full overflow-hidden ">
      <div className="flex flex-col">
        <CompanyOutlookCard
          symbol={symbol}
          initialQuote={initialQuote}
          initialCompanyOutlook={initialOutlook}
        />
      </div>
    </div>
  );
}
