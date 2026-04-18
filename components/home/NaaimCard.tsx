'use client';

import { useMemo } from "react";

import { useSupabaseNaaim } from "@/hooks/useSupabaseNaaim";
import { formatNumber } from "@/components/home/marketFormatters";
import { SentimentCard, type SentimentReferenceRow } from "@/components/home/SentimentCard";
import type { NaaimSnapshot } from "@/lib/types";

interface LookbackSpec {
  name: string;
  weeksBack: number;
}

// NAAIM publishes weekly, so lookback horizons are approximated in weeks.
const WEEKLY_LOOKBACKS: LookbackSpec[] = [
  { name: "1W Ago", weeksBack: 1 },
  { name: "1M Ago", weeksBack: 4 },
  { name: "3M Ago", weeksBack: 13 },
  { name: "6M Ago", weeksBack: 26 }
];

function pointDelta(current: number, reference: number | null): number | null {
  if (reference === null || Number.isNaN(reference)) return null;
  return current - reference;
}

function findExtremes(history: NaaimSnapshot[]): { high: number | null; low: number | null } {
  if (history.length === 0) return { high: null, low: null };
  let high = history[0].mean_exposure;
  let low = history[0].mean_exposure;
  for (const row of history) {
    if (row.mean_exposure > high) high = row.mean_exposure;
    if (row.mean_exposure < low) low = row.mean_exposure;
  }
  return { high, low };
}

function buildReferenceRows(history: NaaimSnapshot[]): SentimentReferenceRow[] {
  if (history.length === 0) return [];
  const latest = history[0];
  const current = latest.mean_exposure;

  const lookbackRows: SentimentReferenceRow[] = WEEKLY_LOOKBACKS.map(({ name, weeksBack }) => {
    const reference = history[weeksBack]?.mean_exposure ?? null;
    return {
      name,
      referenceValue: reference === null ? "--" : formatNumber(reference),
      pointDelta: pointDelta(current, reference)
    };
  });

  const { high, low } = findExtremes(history);

  const extremeRows: SentimentReferenceRow[] = [
    {
      name: "52W High",
      referenceValue: high === null ? "--" : formatNumber(high),
      pointDelta: pointDelta(current, high)
    },
    {
      name: "52W Low",
      referenceValue: low === null ? "--" : formatNumber(low),
      pointDelta: pointDelta(current, low)
    }
  ];

  return [...lookbackRows, ...extremeRows];
}

export function NaaimCard() {
  const { latest, history, isLoading, error } = useSupabaseNaaim();

  const delta = useMemo(() => {
    if (history.length < 2) return null;
    return pointDelta(history[0].mean_exposure, history[1].mean_exposure);
  }, [history]);

  const referenceRows = useMemo(() => buildReferenceRows(history), [history]);

  const hasData = latest !== null;

  return (
    <SentimentCard
      tag="NAAIM"
      label="Active Mgr Exposure"
      heroValue={latest ? formatNumber(latest.mean_exposure) : "--"}
      delta={delta}
      referenceRows={referenceRows}
      isLoading={isLoading}
      hasData={hasData}
      errorMessage={error ? "Failed to load NAAIM data" : null}
    />
  );
}
