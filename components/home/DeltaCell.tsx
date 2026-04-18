'use client';

import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  formatDollarChange,
  formatPercentage,
  formatPointChange
} from "@/components/home/marketFormatters";

type DeltaFormat = "percent" | "dollar" | "points";

interface DeltaCellProps {
  value: number | null;
  /**
   * Explicit formatter to use for the delta text. When omitted, falls back to
   * `isDollar` for back-compat with existing callers.
   */
  format?: DeltaFormat;
  /** @deprecated prefer `format`. Kept for call-site compatibility. */
  isDollar?: boolean;
  className?: string;
}

function resolveFormat(format: DeltaFormat | undefined, isDollar: boolean | undefined): DeltaFormat {
  if (format) return format;
  if (isDollar) return "dollar";
  return "percent";
}

function renderDelta(value: number, format: DeltaFormat): string {
  if (format === "dollar") return formatDollarChange(value);
  if (format === "points") return formatPointChange(value);
  return formatPercentage(value);
}

export function DeltaCell({ value, format, isDollar, className }: DeltaCellProps) {
  if (value === null) {
    return <span className={cn("text-neutral-400", className)}>--</span>;
  }

  const resolvedFormat = resolveFormat(format, isDollar);
  const isPositive = value >= 0;
  const toneClassName = isPositive
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";
  const Icon = isPositive ? ArrowUp : ArrowDown;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-0.5 text-right tabular-nums",
        toneClassName,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {renderDelta(value, resolvedFormat)}
    </span>
  );
}
