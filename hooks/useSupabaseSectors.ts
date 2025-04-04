import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Sector } from '@/lib/types';

interface SectorPerformance {
  symbol: string;
  name: string;
  weekPerformance: number;
  oneMonthPerformance: number;
  threeMonthPerformance: number;
  halfYearPerformance: number;
}

interface SectorPerformanceResult {
  sectors: SectorPerformance[];
  dateRanges: {
    latestDate: string;
    oneWeekDate: string;
    oneMonthDate: string;
    threeMonthDate: string;
    halfYearDate: string;
  };
}

// Map sector ETF symbols to sector names
const sectorMap: Record<string, string> = {
  XLE: 'Energy',
  XLB: 'Basic Materials',
  XLU: 'Utilities',
  XLI: 'Industrials',
  XLP: 'Consumer Defensive',
  XLF: 'Financial',
  XLRE: 'Real Estate',
  XLV: 'Healthcare',
  XLK: 'Technology',
  XLY: 'Consumer Cyclical',
  XLC: 'Communication Services',
};

// All sector symbols
const sectorSymbols = Object.keys(sectorMap);

export function useSupabaseSectors() {
  const fetchSectorData = useCallback(async (): Promise<SectorPerformanceResult> => {
    // Get current date and calculate date periods
    const now = new Date();
    
    // Add one day to ensure we include today's data in our range
    now.setDate(now.getDate() + 1);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);
    
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    
    // Format dates as ISO strings for Supabase queries
    const nowStr = now.toISOString().split('T')[0];
    const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .in('symbol', sectorSymbols)
        .gte('date', sixMonthsAgoStr)
        .order('date', { ascending: false });

      if (error) {
        throw new Error(`Supabase query error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No sector data found in the database for the specified time period');
      }

      // Check if we have at least one data point for each sector
      const symbolsWithData = new Set(data.map(item => item.symbol));
      const missingSymbols = sectorSymbols.filter(symbol => !symbolsWithData.has(symbol));
      
      if (missingSymbols.length > 0) {
        console.warn(`Missing data for sectors: ${missingSymbols.join(', ')}`);
      }

      // Group data by symbol
      const groupedData: Record<string, Sector[]> = {};
      data.forEach((item: Sector) => {
        if (!groupedData[item.symbol]) {
          groupedData[item.symbol] = [];
        }
        groupedData[item.symbol].push(item);
      });

      // Track dates used for calculations
      let latestDate = '';
      let oneWeekDate = '';
      let oneMonthDate = '';
      let threeMonthDate = '';  
      let halfYearDate = '';

      // Calculate performance for each sector
      const sectorPerformances: SectorPerformance[] = Object.keys(groupedData).map(symbol => {
        const sectorData = groupedData[symbol];
        // Sort by date descending (newest to oldest)
        sectorData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Find closest data points to our time periods
        const latestDataPoint = sectorData[0];
        console.log("Latest Data Point: " + latestDataPoint?.date);
        const oneWeekDataPoint = findClosestDataPoint(sectorData, oneWeekAgoStr);
        const oneMonthDataPoint = findClosestDataPoint(sectorData, oneMonthAgoStr);
        const threeMonthDataPoint = findClosestDataPoint(sectorData, threeMonthsAgoStr);
        const sixMonthDataPoint = findClosestDataPoint(sectorData, sixMonthsAgoStr);

        // Save date info from the first sector we process
        if (!latestDate && latestDataPoint) {
          latestDate = latestDataPoint.date;
          oneWeekDate = oneWeekDataPoint?.date || '';
          oneMonthDate = oneMonthDataPoint?.date || '';
          threeMonthDate = threeMonthDataPoint?.date || '';
          halfYearDate = sixMonthDataPoint?.date || '';
        }

        // Calculate performance metrics
        const calculatePerformance = (current: number, previous: number) => {
          if (!current || !previous) return 0;
          return ((current - previous) / previous) * 100;
        };

        const weekPerformance = calculatePerformance(
          latestDataPoint?.close || 0,
          oneWeekDataPoint?.close || 0
        );

        const oneMonthPerformance = calculatePerformance(
          latestDataPoint?.close || 0,
          oneMonthDataPoint?.close || 0
        );

        const threeMonthPerformance = calculatePerformance(
          latestDataPoint?.close || 0,
          threeMonthDataPoint?.close || 0
        );

        const halfYearPerformance = calculatePerformance(
          latestDataPoint?.close || 0,
          sixMonthDataPoint?.close || 0
        );

        return {
          symbol,
          name: sectorMap[symbol] || symbol,
          weekPerformance,
          oneMonthPerformance,
          threeMonthPerformance,
          halfYearPerformance
        };
      });

      if (sectorPerformances.length === 0) {
        throw new Error('Failed to calculate sector performances from the retrieved data');
      }

      return {
        sectors: sectorPerformances,
        dateRanges: {
          latestDate,
          oneWeekDate,
          oneMonthDate,
          threeMonthDate,
          halfYearDate
        }
      };
    } catch (error) {
      console.error('Error fetching sector data:', error);
      throw error;
    }
  }, []);

  return useQuery({
    queryKey: ['sectorPerformance'],
    queryFn: fetchSectorData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2, // Retry failed requests up to 2 times
  });
}

// Helper function to find closest data point to a target date
function findClosestDataPoint(data: Sector[], targetDate: string): Sector | null {
  if (!data || data.length === 0) return null;
  
  const targetTime = new Date(targetDate).getTime();
  
  // Sort by closest date
  return data.reduce((closest, current) => {
    const currentTime = new Date(current.date).getTime();
    const closestTime = closest ? new Date(closest.date).getTime() : Number.MAX_SAFE_INTEGER;
    
    const currentDiff = Math.abs(currentTime - targetTime);
    const closestDiff = Math.abs(closestTime - targetTime);
    
    return currentDiff < closestDiff ? current : closest;
  }, null as Sector | null);
} 