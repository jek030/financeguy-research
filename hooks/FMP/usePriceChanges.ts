import { useQuery } from '@tanstack/react-query';
import { DailyPriceData } from './useDailyPrices';

export interface PriceChangeData {
  period: '1Y' | '3Y' | '5Y';
  changePercent: number;
  currentPrice: number;
  historicalPrice: number;
  currentDate: string;
  historicalDate: string;
}

interface PriceChangesResult {
  oneYear: PriceChangeData | null;
  threeYear: PriceChangeData | null;
  fiveYear: PriceChangeData | null;
}

interface DailyPriceResponse {
  symbol: string;
  historical: DailyPriceData[];
}

// Helper function to calculate business days ago
function getBusinessDateAgo(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  
  // If it's a weekend, move to previous Friday
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) { // Sunday
    date.setDate(date.getDate() - 2);
  } else if (dayOfWeek === 6) { // Saturday
    date.setDate(date.getDate() - 1);
  }
  
  return date.toISOString().split('T')[0];
}

// Helper function to get today's date
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper function to get cache key for today
function getCacheKey(symbol: string): string {
  const today = getTodayDate();
  return `price-changes-${symbol}-${today}`;
}

// Helper function to get cached data from localStorage
function getCachedPriceChanges(symbol: string): PriceChangesResult | null {
  try {
    // Check if localStorage is available (client-side)
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    
    const cacheKey = getCacheKey(symbol);
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (error) {
    console.warn('Failed to read from localStorage cache:', error);
  }
  
  return null;
}

// Helper function to cache data in localStorage
function setCachedPriceChanges(symbol: string, data: PriceChangesResult): void {
  try {
    // Check if localStorage is available (client-side)
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    const cacheKey = getCacheKey(symbol);
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to write to localStorage cache:', error);
  }
}

// Helper function to clear old cache entries
function clearOldCacheEntries(): void {
  try {
    // Check if localStorage is available (client-side)
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    const today = getTodayDate();
    const keysToRemove: string[] = [];
    
    // Check all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('price-changes-') && !key.includes(today)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove old entries
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clear old cache entries:', error);
  }
}

// Helper function to find the closest available price data
function findClosestPrice(historical: DailyPriceData[], targetDate: string): DailyPriceData | null {
  if (!historical || historical.length === 0) return null;
  
  const target = new Date(targetDate);
  let closest = historical[0];
  let minDiff = Math.abs(new Date(closest.date).getTime() - target.getTime());
  
  for (const price of historical) {
    const diff = Math.abs(new Date(price.date).getTime() - target.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = price;
    }
  }
  
  return closest;
}

async function fetchPriceChanges(symbol: string): Promise<PriceChangesResult> {
  console.log(`Making API call for fresh price changes: ${symbol}`);
  
  // Clear old cache entries when making a new request
  clearOldCacheEntries();

  const today = getTodayDate();
  const fiveYearsAgo = getBusinessDateAgo(5);
  
  const response = await fetch(
    `/api/fmp/dailyprices?symbol=${symbol}&from=${fiveYearsAgo}&to=${today}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch price change data');
  }

  const data: DailyPriceResponse = await response.json();
  const historical = data.historical;
  
  if (!historical || historical.length === 0) {
    return {
      oneYear: null,
      threeYear: null,
      fiveYear: null,
    };
  }

  // Sort by date descending (most recent first)
  const sortedHistorical = historical.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Get current price (most recent available)
  const currentData = sortedHistorical[0];
  
  // Calculate target dates
  const oneYearAgo = getBusinessDateAgo(1);
  const threeYearsAgo = getBusinessDateAgo(3);
  const fiveYearsAgoTarget = getBusinessDateAgo(5);
  
  // Find closest prices for each period
  const oneYearData = findClosestPrice(sortedHistorical, oneYearAgo);
  const threeYearData = findClosestPrice(sortedHistorical, threeYearsAgo);
  const fiveYearData = findClosestPrice(sortedHistorical, fiveYearsAgoTarget);
  
  // Calculate percentage changes
  const createPriceChangeData = (
    period: '1Y' | '3Y' | '5Y',
    historicalData: DailyPriceData | null
  ): PriceChangeData | null => {
    if (!historicalData || !currentData) return null;
    
    const changePercent = ((currentData.close - historicalData.close) / historicalData.close) * 100;
    
    return {
      period,
      changePercent,
      currentPrice: currentData.close,
      historicalPrice: historicalData.close,
      currentDate: currentData.date,
      historicalDate: historicalData.date,
    };
  };

  const result = {
    oneYear: createPriceChangeData('1Y', oneYearData),
    threeYear: createPriceChangeData('3Y', threeYearData),
    fiveYear: createPriceChangeData('5Y', fiveYearData),
  };

  // Cache the result for future requests on the same day
  setCachedPriceChanges(symbol, result);

  return result;
}

interface UsePriceChangesProps {
  symbol: string;
  enabled?: boolean;
}

export function usePriceChanges({ symbol, enabled = true }: UsePriceChangesProps) {
  // Get cached data outside the query
  const cachedData = getCachedPriceChanges(symbol);
  
  if (cachedData) {
    console.log(`Using cached price changes for ${symbol} - NO API CALL`);
  } else {
    console.log(`No cache found for ${symbol} - Will make API call`);
  }
  
  return useQuery({
    queryKey: ['price-changes', symbol], // Remove date from query key to maintain cache
    queryFn: () => fetchPriceChanges(symbol),
    enabled: enabled && !!symbol, // Always enable the query if symbol is provided
    staleTime: 24 * 60 * 60 * 1000, // Keep data fresh for 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep unused data in cache for 7 days
    refetchOnMount: false, // Don't refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    initialData: cachedData, // Use cached data as initial data
    initialDataUpdatedAt: cachedData ? () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today.getTime();
    } : undefined,
  });
}
