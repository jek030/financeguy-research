"use client";
import { useState } from 'react';
import { use } from 'react';
//import { PriceHistoryCard } from '@/app/components/PriceHistoryCard';
//import { Suspense } from 'react';
//import { getFirstBusinessDay, PriceHistory, Ticker } from '@/app/lib/utils';
//import Header from '@/app/components/Header';
import RRCard from '@/components/ui/RRCard';
import CompanyOutlookCard from '@/components/ui/(fmp)/CompanyOutlookCard';
import { useIntradayChart } from '@/hooks/FMP/useIntradayChart';
import IntradayChart from '@/components/ui/(fmp)/Chart';
//import { useRSIData } from '@/app/FMP/hooks/useRSIData';
//import { Ticker } from '@/lib/types';

function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Page({ params }: { params: Promise<{ symbol: string }> }) {
  const resolvedParams = use(params);
  const symbol = resolvedParams.symbol.toUpperCase();
  //const [tickerData, setTickerData] = useState<Ticker>({} as Ticker);
  //const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [currentPrice] = useState<number>(0);
  //const [startDate, setStartDate] = useState(getFirstBusinessDay());
  //const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  //const [isLoading, setIsLoading] = useState(false);
  //const [error, setError] = useState<string | null>(null);

  const today = formatDateToYYYYMMDD(new Date());
  
  const { data: intradayData } = useIntradayChart({
    symbol,
    timeframe: '1hour',
    from: today,
    to: today
  });

  // Log intraday data when it changes
  console.log('Intraday Chart Data:', intradayData);


  return (
    <div className="flex flex-col w-full gap-2">
      {/*<PageHeader title={`Welcome to Finance Guy.`} description={`This is the ticker page.`} ></PageHeader> */}
      <div className="flex flex-col gap-2">
        <CompanyOutlookCard symbol={symbol} priceHistory={[]} />
        <IntradayChart symbol={symbol} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 w-full">
          <RRCard price={currentPrice} />
        </div>
      </div>
    </div>
  );
}