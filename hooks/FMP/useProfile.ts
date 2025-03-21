import { useQuery } from '@tanstack/react-query';
import type { CompanyProfile } from '@/lib/types';

async function fetchProfile(symbol: string): Promise<CompanyProfile[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/profile?symbol=${symbol}`);

  if (!response.ok) {
    throw new Error('Failed to fetch profile data');
  }

  return response.json();
}

export function useProfile(symbol: string) {
  return useQuery({
    queryKey: ['profile', symbol],
    queryFn: () => fetchProfile(symbol),
    select: (data: CompanyProfile[]) => data[0],
    enabled: Boolean(symbol),
    refetchInterval: 3600000, // Refetch every hour (profile data doesn't change often)
    staleTime: 1800000, // Consider data stale after 30 minutes
    gcTime: 24 * 60 * 60 * 1000, // Keep unused data in cache for 24 hours
    retry: 1,
    retryDelay: 5000,
  });
} 