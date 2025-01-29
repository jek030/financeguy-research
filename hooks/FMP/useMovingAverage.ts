import { useState, useEffect, useRef } from 'react';

interface MovingAverageDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma: number;
}

const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';

export const useMovingAverageData = (symbol: string, type: string, period: string, timeframe: string) => {
  const [maData, setMAData] = useState<MovingAverageDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!symbol || !type || !period || !timeframe || !apiKey || hasFetched.current) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `https://financialmodelingprep.com/api/v3/technical_indicator/${timeframe}/${symbol}?type=${type}&period=${period}&apikey=${apiKey}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch moving average data');
        }
        
        const result = await response.json();
        
        const normalizedResult = result?.map((item: any) => ({
          ...item,
          ma: item.ema || item.sma || item.ma
        }));
        
        setMAData(normalizedResult?.length > 0 ? normalizedResult : []);
        hasFetched.current = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setMAData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [symbol, type, period, timeframe, apiKey]);

  return { 
    currentValue: maData.length > 0 ? maData[0].ma : null,
    data: maData,
    isLoading, 
    error 
  };
}; 