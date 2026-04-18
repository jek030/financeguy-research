import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

export interface FearGreedSnapshot {
  date: string;
  score: number;
  rating: string | null;
  previous_close: number | null;
  previous_1_week: number | null;
  previous_1_month: number | null;
  previous_1_year: number | null;
}

interface FearGreedHistoricalPoint {
  date: string;
  score: number;
  rating: string | null;
}

interface FearGreedApiResponse {
  latest: FearGreedSnapshot;
  history: FearGreedHistoricalPoint[];
}

async function fetchFearGreedHistory(): Promise<FearGreedApiResponse> {
  const response = await fetch("/api/market/fear-greed", {
    headers: { "Content-Type": "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Fear & Greed API error (${response.status})`);
  }

  return (await response.json()) as FearGreedApiResponse;
}

export interface UseSupabaseFearGreedResult {
  latest: FearGreedSnapshot | null;
  history: FearGreedHistoricalPoint[];
  isLoading: boolean;
  error: Error | null;
}

export function useSupabaseFearGreed(): UseSupabaseFearGreedResult {
  const query = useQuery<FearGreedApiResponse, Error>({
    queryKey: ["cnn-fear-greed"],
    queryFn: fetchFearGreedHistory,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000
  });

  return useMemo(() => {
    const payload = query.data;
    return {
      latest: payload?.latest ?? null,
      history: payload?.history ?? [],
      isLoading: query.isLoading,
      error: query.error ?? null
    };
  }, [query.data, query.isLoading, query.error]);
}
