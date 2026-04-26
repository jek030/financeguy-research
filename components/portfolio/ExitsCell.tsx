'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { StockPosition } from '@/hooks/usePortfolio';
import {
  formatRMultiple,
  getPerExitR,
  getRMultiple,
} from '@/utils/portfolioCalculations';
import { format } from 'date-fns';

function PositionExitsTable({ position }: { position: StockPosition }) {
  return (
    <table className="w-full text-xs">
      <thead className="text-muted-foreground">
        <tr>
          <th className="text-right py-1 pr-3 font-medium">Price</th>
          <th className="text-right py-1 pr-3 font-medium">Shares</th>
          <th className="text-left py-1 pr-3 font-medium">Date</th>
          <th className="text-right py-1 pr-3 font-medium">R</th>
          <th className="text-left py-1 font-medium">Notes</th>
        </tr>
      </thead>
      <tbody>
        {position.exits.map((exit) => {
          const isPlanned = exit.exitDate === null;
          const perR = getPerExitR(position, exit);
          const rText = formatRMultiple(perR);
          const rowClass = isPlanned ? 'text-muted-foreground' : '';
          return (
            <tr key={exit.id} className={rowClass}>
              <td className="text-right py-1 pr-3 tabular-nums">${exit.price.toFixed(2)}</td>
              <td className="text-right py-1 pr-3 tabular-nums">{exit.shares}</td>
              <td className="text-left py-1 pr-3 tabular-nums">
                {exit.exitDate ? format(exit.exitDate, 'yyyy-MM-dd') : '—'}
              </td>
              <td className="text-right py-1 pr-3 tabular-nums">
                {rText}
                {isPlanned && perR !== null && (
                  <span className="ml-1 text-[10px] uppercase tracking-wide">plan</span>
                )}
              </td>
              <td className="text-left py-1 truncate max-w-[200px]" title={exit.notes ?? undefined}>
                {exit.notes ?? ''}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export interface ExitsCellProps {
  position: StockPosition;
}

export function ExitsCell({ position }: ExitsCellProps) {
  const [expanded, setExpanded] = useState(false);

  const totalCount = position.exits.length;
  const filledCount = position.exits.filter((e) => e.exitDate !== null).length;

  let summary: string;
  if (totalCount === 0) {
    summary = '—';
  } else if (filledCount === 0) {
    summary = `0/${totalCount} · plan only`;
  } else {
    const r = getRMultiple(position);
    const rText = formatRMultiple(r);
    summary = r === null
      ? `${filledCount}/${totalCount} filled`
      : `${filledCount}/${totalCount} filled · ${rText}`;
  }

  if (totalCount === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex items-center gap-1 text-left hover:text-foreground text-xs"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        )}
        <span>{summary}</span>
      </button>
      {expanded && (
        <div className="rounded border border-border/50 bg-muted/30 p-2">
          <PositionExitsTable position={position} />
        </div>
      )}
    </div>
  );
}
