'use client';

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { DeltaCell } from "@/components/home/DeltaCell";

export type SentimentTone = "bullish" | "bearish" | "neutral";

export interface SentimentReferenceRow {
  name: string;
  referenceValue: string;
  percentChange: number | null;
  pointDelta: number | null;
}

export interface SentimentCardProps {
  tag: string;
  label: string;
  heroValue: string;
  heroSuffix?: string;
  rating?: { label: string; tone: SentimentTone };
  delta?: number | null;
  sparkline?: ReactNode;
  referenceRows: SentimentReferenceRow[];
  isLoading: boolean;
  hasData: boolean;
  emptyMessage?: string;
  errorMessage?: string | null;
}

function toneClassName(tone: SentimentTone): string {
  if (tone === "bullish") return "text-emerald-600 dark:text-emerald-400";
  if (tone === "bearish") return "text-rose-600 dark:text-rose-400";
  return "text-neutral-600 dark:text-neutral-300";
}

export function SentimentCard({
  tag,
  label,
  heroValue,
  heroSuffix,
  rating,
  delta,
  sparkline,
  referenceRows,
  isLoading,
  hasData,
  emptyMessage,
  errorMessage
}: SentimentCardProps) {
  return (
    <div className="min-w-[285px] shrink-0 rounded border border-neutral-300/80 bg-white/95 px-2.5 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-950/70">
      <div className="mb-2 border-b border-neutral-200 pb-2 dark:border-neutral-800">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="truncate rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
            {tag}
          </span>
          <span className="truncate font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
            {label}
          </span>
        </div>

        {isLoading ? (
          <div className="h-8 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        ) : errorMessage ? (
          <div className="font-mono text-[11px] text-rose-600 dark:text-rose-400">{errorMessage}</div>
        ) : !hasData ? (
          <div className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
            {emptyMessage ?? `No data yet for ${tag}`}
          </div>
        ) : (
          <div className="flex items-end justify-between gap-3">
            <span className="font-mono text-2xl font-semibold leading-none tabular-nums text-neutral-900 dark:text-neutral-50 sm:text-[26px]">
              {heroValue}
              {heroSuffix ? (
                <span className="ml-1 font-mono text-xs font-normal text-neutral-400 dark:text-neutral-500">
                  {heroSuffix}
                </span>
              ) : null}
            </span>
            <div className="flex flex-col items-end gap-0.5 font-mono text-[11px]">
              {rating ? (
                <span className={cn("font-semibold uppercase tracking-wide", toneClassName(rating.tone))}>
                  {rating.label}
                </span>
              ) : null}
              {delta !== undefined && delta !== null ? (
                <DeltaCell value={delta} format="points" />
              ) : null}
            </div>
          </div>
        )}

        {hasData && sparkline ? <div className="mt-2">{sparkline}</div> : null}
      </div>

      {isLoading ? (
        <div className="space-y-1.5 pb-0.5">
          <div className="grid grid-cols-[1fr,72px,72px] gap-2 border-b border-neutral-200 pb-1 font-mono text-[10px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
            <span>Period</span>
            <span className="text-right">% Chg</span>
            <span className="text-right">Δ Pts</span>
          </div>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="grid grid-cols-[1fr,72px,72px] items-center gap-2">
              <div className="h-3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            </div>
          ))}
        </div>
      ) : hasData ? (
        <div className="space-y-0.5 pb-0.5">
          <div className="grid grid-cols-[1fr,72px,72px] gap-2 border-b border-neutral-200 pb-1 font-mono text-[10px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
            <span>Period</span>
            <span className="text-right">% Chg</span>
            <span className="text-right">Δ Pts</span>
          </div>
          {referenceRows.map((row, index) => (
            <div
              key={row.name}
              className={cn(
                "grid grid-cols-[1fr,72px,72px] items-center gap-2 rounded px-1 py-1 font-mono text-[11px]",
                index % 2 === 0 ? "bg-neutral-100/50 dark:bg-neutral-900/40" : "bg-transparent"
              )}
            >
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate text-neutral-500 dark:text-neutral-400">{row.name}</span>
                <span className="flex-shrink-0 tabular-nums text-[10px] text-neutral-400 dark:text-neutral-500">
                  {row.referenceValue}
                </span>
              </span>
              <DeltaCell value={row.percentChange} format="percent" />
              <DeltaCell value={row.pointDelta} format="points" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
