"use client";
import {  useState } from 'react';
import { use } from 'react';
//import { PriceHistoryCard } from '@/app/components/PriceHistoryCard';
//import { Suspense } from 'react';
//import { getFirstBusinessDay, PriceHistory, Ticker } from '@/app/lib/utils';
//import Header from '@/app/components/Header';
import RRCard from '@/components/ui/RRCard';
import CompanyOutlookCard from '@/components/ui/(fmp)/CompanyOutlookCard';
//import { useRSIData } from '@/app/FMP/hooks/useRSIData';
//import { Ticker } from '@/lib/types';

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

  //const { rsi, isLoading: rsiLoading } = useRSIData(ticker, apiKey);


  //const isValidDate = (dateStr: string) => {
  //  const date = new Date(dateStr);
  //  return date instanceof Date && !isNaN(date.getTime());
  //};
 
  //const fetchPriceHistory = useCallback(async () => {    
    //if (!isValidDate(startDate) || !isValidDate(endDate)) {
    //  setError('Invalid dates provided');
    //  setPriceHistory([]);
    //  return;
    //}

    //if (new Date(startDate) > new Date(endDate)) {
    //  setError('Start date must be before end date');
    //  return;
    //}

    //setIsLoading(true);
    //setError(null);
//
    //try {
    //  //const response = await fetch(`/api/schwab/price-history?ticker=${ticker}&startDate=${startDate}&endDate=${endDate}`);
    //  
    //  if (!response.ok) {
    //    const errorText = await response.text();
    //    console.error('Price history error:', {
    //      status: response.status,
    //      statusText: response.statusText,
    //      errorText
    //    });
    //    throw new Error(`Failed to fetch price history: ${response.statusText}`);
    //  }
    //  
    //  const formattedPriceHistory = await response.json();
//
    //  if (formattedPriceHistory.error) {
    //    throw new Error(formattedPriceHistory.error);
    //  }
//
    //  if (!Array.isArray(formattedPriceHistory)) {
    //    throw new Error('Expected array of price history data but received: ' + typeof formattedPriceHistory);
    //  }
//
    //  const sortedPriceHistory = formattedPriceHistory.sort((a: PriceHistory, b: PriceHistory) => 
    //    new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    //  );
    //  
    //  setPriceHistory(sortedPriceHistory);
    //} catch (error) {
    //  console.error('Error fetching price history:', error);
    //  setError(error instanceof Error ? error.message : 'Failed to fetch price history');
    //  setPriceHistory([]);
    //} finally {
    //  setIsLoading(false);
    //}
  //},// [ticker, startDate, endDate]);

  // Initial data fetch
  //useEffect(() => {
  //  const fetchData = async () => {
  //    await fetchTickerData();
  //    await fetchPriceHistory();
  //  };
  //  fetchData();
  //}, [ticker]); // Only re-fetch when ticker changes
//
  //useEffect(() => {
  //  if (tickerData.mark) {
  //    setCurrentPrice(Number(tickerData.mark));
  //  }
  //}, [tickerData]);

  return (
    <div className="flex flex-col w-full gap-2">
      {/*<PageHeader title={`Welcome to Finance Guy.`} description={`This is the ticker page.`} ></PageHeader> */}
      <div className="flex flex-col gap-2">
        <CompanyOutlookCard symbol={symbol} priceHistory={[]} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 w-full">
          <RRCard price={currentPrice} />
        </div>
        {/*TODO - re-add price history card <div className="w-full">
          <Suspense fallback={<div>Loading price history...</div>}>
            <PriceHistoryCard 
              ticker={ticker}
              priceHistory={priceHistory}
              isLoading={isLoading}
              error={error}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onUpdate={fetchPriceHistory}
            />
          </Suspense>
        </div> */}
      </div>
    </div>
  );
}