'use client';

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { DeltaCell } from "@/components/home/DeltaCell";

import { SectorReturnChart } from "./SectorReturnChart";

interface SectorPerformanceCardProps {
  tag: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  averagePerformance: number | null;
  data: Array<{ name: string; symbol: string; performance: number }>;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) {
    return "";
  }

  const parts = dateString.split("-");
  if (parts.length !== 3) {
    return dateString;
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const date = new Date(Date.UTC(year, month, day));

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

export function SectorPerformanceCard({
  tag,
  title,
  startDate,
  endDate,
  averagePerformance,
  data
}: SectorPerformanceCardProps) {
  return (
    <Card className="w-full rounded border border-border bg-card/95 shadow-sm">
      <CardHeader className="space-y-1.5 border-b border-border p-2.5 pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {tag}
          </span>
          {startDate && endDate && (
            <span className="truncate font-mono text-[10px] text-muted-foreground">
              {formatDate(startDate)} → {formatDate(endDate)}
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-2">
          <h3 className="font-mono text-sm font-semibold leading-none tracking-tight text-foreground">
            {title}
          </h3>
          {averagePerformance !== null && (
            <DeltaCell value={averagePerformance} isDollar={false} className="font-mono text-[11px]" />
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2 pt-2">
        <SectorReturnChart data={data} />
      </CardContent>
    </Card>
  );
}
