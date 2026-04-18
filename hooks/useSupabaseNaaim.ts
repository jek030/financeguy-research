import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { NaaimSnapshot } from "@/lib/types";

const HISTORY_LIMIT = 52;

async function fetchNaaimHistory(): Promise<NaaimSnapshot[]> {
  const { data, error } = await supabase
    .from("market_sentiment_naaim")
    .select("*")
    .order("week_ending", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error) {
    console.error("[sentiment] naaim fetch failed", error);
    throw new Error(`Supabase query error for NAAIM: ${error.message}`);
  }

  return (data ?? []) as NaaimSnapshot[];
}

export interface UseSupabaseNaaimResult {
  latest: NaaimSnapshot | null;
  history: NaaimSnapshot[];
  isLoading: boolean;
  error: Error | null;
}

export function useSupabaseNaaim(): UseSupabaseNaaimResult {
  const query = useQuery<NaaimSnapshot[], Error>({
    queryKey: ["supabase-naaim"],
    queryFn: fetchNaaimHistory,
    staleTime: 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000
  });

  return useMemo(() => {
    const rows = query.data ?? [];
    const latest = rows.length > 0 ? rows[0] : null;

    return {
      latest,
      history: rows,
      isLoading: query.isLoading,
      error: query.error ?? null
    };
  }, [query.data, query.isLoading, query.error]);
}
