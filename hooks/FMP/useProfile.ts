import { useQuery } from '@tanstack/react-query';
import type { CompanyProfile } from '@/lib/types';

// Helper function to get today's date
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper function to get cache key for today
function getCacheKey(symbol: string): string {
  const today = getTodayDate();
  return `company-profile-${symbol}-${today}`;
}

// Helper function to get cached data from localStorage
function getCachedProfile(symbol: string): CompanyProfile | null {
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
function setCachedProfile(symbol: string, data: CompanyProfile): void {
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
      if (key && key.startsWith('company-profile-') && !key.includes(today)) {
        keysToRemove.push(key);
      }
    }
    
    // Remove old entries
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clear old cache entries:', error);
  }
}

async function fetchProfile(symbol: string): Promise<CompanyProfile[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  console.log(`Making API call for company profile: ${symbol}`);
  clearOldCacheEntries();

  const response = await fetch(`/api/fmp/profile?symbol=${symbol}`);

  if (!response.ok) {
    throw new Error('Failed to fetch profile data');
  }

  const data = await response.json();
  
  // Cache the first profile if it exists
  if (data && data[0]) {
    setCachedProfile(symbol, data[0]);
  }

  return data;
}

export function useProfile(symbol: string) {
  // Get cached data outside the query
  const cachedData = getCachedProfile(symbol);
  
  if (cachedData) {
    console.log(`Using cached company profile for ${symbol} - NO API CALL`);
  } else {
    console.log(`No profile cache found for ${symbol} - Will make API call`);
  }
  
  return useQuery({
    queryKey: ['profile', symbol, getTodayDate()], // Include date in query key
    queryFn: () => fetchProfile(symbol),
    select: (data: CompanyProfile[]) => data[0],
    enabled: Boolean(symbol), // Always enable the query
    staleTime: Infinity, // Never consider cached data stale within the same day
    gcTime: 24 * 60 * 60 * 1000, // Keep data in React Query cache for 24 hours
    retry: 1,
    retryDelay: 5000,
    initialData: cachedData ? [cachedData] : undefined, // Convert single profile to array for type safety
    initialDataUpdatedAt: cachedData ? () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today.getTime();
    } : undefined,
  });
}