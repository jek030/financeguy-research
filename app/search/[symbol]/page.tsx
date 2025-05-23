"use client";
import { use, useEffect } from 'react';
import CompanyOutlookCard from '@/components/ui/(fmp)/CompanyOutlookCard';
import { useQuote } from '@/hooks/FMP/useQuote';

export default function Page({ params }: { params: Promise<{ symbol: string }> }) {
  const resolvedParams = use(params);
  const symbol = resolvedParams.symbol.toUpperCase();
  
  // Get quote data for the browser title
  const { data: quote, isLoading: quoteLoading } = useQuote(symbol);

  // Update document title when quote data changes
  useEffect(() => {
    if (quote && !quoteLoading) {
      const price = quote.price ? `$${quote.price.toFixed(2)}` : 'N/A';
      const changePercent = quote.changesPercentage !== undefined 
        ? `${quote.changesPercentage >= 0 ? '+' : ''}${quote.changesPercentage.toFixed(2)}%`
        : 'N/A';
      
      document.title = `${symbol} ${price} (${changePercent}) - Finance Guy`;
    } else if (!quoteLoading) {
      // If no data or loading failed, just show the symbol
      document.title = `${symbol} - Finance Guy`;
    }
    
    // Cleanup: Reset title when component unmounts
    return () => {
      document.title = 'Finance Guy';
    };
  }, [quote, quoteLoading, symbol]);

  return (
    <div className="flex flex-col w-full max-w-full overflow-hidden ">
      <div className="flex flex-col">
        <CompanyOutlookCard symbol={symbol} />
      </div>
    </div>
  );
}