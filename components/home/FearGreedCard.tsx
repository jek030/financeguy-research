'use client';

import { useMemo } from "react";

import { useSupabaseFearGreed } from "@/hooks/useSupabaseFearGreed";
import { formatNumber } from "@/components/home/marketFormatters";
import { SentimentCard, type SentimentReferenceRow, type SentimentTone } from "@/components/home/SentimentCard";
import type { FearGreedSnapshot } from "@/hooks/useSupabaseFearGreed";

interface DerivedRating {
  label: string;
  tone: SentimentTone;
}

// CNN's 5-tier rating buckets as a client-side fallback when the row's
// `rating` column is null.
function deriveRating(score: number): DerivedRating {
  if (score < 25) return { label: "Extreme Fear", tone: "bearish" };
  if (score < 45) return { label: "Fear", tone: "bearish" };
  if (score < 55) return { label: "Neutral", tone: "neutral" };
  if (score < 75) return { label: "Greed", tone: "bullish" };
  return { label: "Extreme Greed", tone: "bullish" };
}

function toneForRatingText(rating: string): SentimentTone {
  const normalized = rating.trim().toLowerCase();
  if (normalized.includes("greed")) return "bullish";
  if (normalized.includes("fear")) return "bearish";
  return "neutral";
}

function pointDelta(current: number, reference: number | null): number | null {
  if (reference === null || Number.isNaN(reference)) return null;
  return current - reference;
}

function buildReferenceRows(latest: FearGreedSnapshot): SentimentReferenceRow[] {
  const { score } = latest;
  const rows: { name: string; reference: number | null }[] = [
    { name: "Prev Close", reference: latest.previous_close },
    { name: "1W Ago", reference: latest.previous_1_week },
    { name: "1M Ago", reference: latest.previous_1_month },
    { name: "1Y Ago", reference: latest.previous_1_year }
  ];

  return rows.map(({ name, reference }) => ({
    name,
    referenceValue: reference === null ? "--" : formatNumber(reference),
    pointDelta: pointDelta(score, reference)
  }));
}

export function FearGreedCard() {
  const { latest, isLoading, error } = useSupabaseFearGreed();

  const rating = useMemo<DerivedRating | undefined>(() => {
    if (!latest) return undefined;
    if (latest.rating && latest.rating.trim().length > 0) {
      return { label: latest.rating, tone: toneForRatingText(latest.rating) };
    }
    return deriveRating(latest.score);
  }, [latest]);

  const delta = useMemo(() => {
    if (!latest) return null;
    return pointDelta(latest.score, latest.previous_close);
  }, [latest]);

  const referenceRows = useMemo(() => {
    if (!latest) return [];
    return buildReferenceRows(latest);
  }, [latest]);

  const hasData = latest !== null;

  return (
    <SentimentCard
      tag="F&G"
      label="CNN Fear & Greed"
      heroValue={latest ? formatNumber(latest.score) : "--"}
      heroSuffix="/100"
      rating={rating}
      delta={delta}
      referenceRows={referenceRows}
      isLoading={isLoading}
      hasData={hasData}
      errorMessage={error ? "Failed to load Fear & Greed data" : null}
    />
  );
}
