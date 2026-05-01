'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import type { StockPosition } from '@/hooks/usePortfolio';
import { addDays, format, subDays, subMonths, subYears } from 'date-fns';
import { cn } from '@/lib/utils';

export interface PositionChartModalProps {
  position: StockPosition | null;
  isOpen: boolean;
  onClose: () => void;
}

type RangePreset = 'Trade' | '3M' | '6M' | '1Y';

const RANGE_PRESETS: RangePreset[] = ['Trade', '3M', '6M', '1Y'];

function formatDateForFmp(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function clampToToday(d: Date): Date {
  const today = new Date();
  return d > today ? today : d;
}

function deriveRange(position: StockPosition, preset: RangePreset): {
  from: string;
  to: string;
} {
  const today = new Date();

  if (preset === 'Trade') {
    const datedExits = position.exits.filter((e) => e.exitDate !== null);
    const lastExit = datedExits.length
      ? datedExits.reduce<Date>(
          (max, e) => ((e.exitDate as Date) > max ? (e.exitDate as Date) : max),
          datedExits[0].exitDate as Date
        )
      : null;
    const from = subDays(position.openDate, 30);
    const to = clampToToday(addDays(lastExit ?? today, 30));
    return { from: formatDateForFmp(from), to: formatDateForFmp(to) };
  }

  const spanMap: Record<Exclude<RangePreset, 'Trade'>, Date> = {
    '3M': subMonths(today, 3),
    '6M': subMonths(today, 6),
    '1Y': subYears(today, 1),
  };
  return {
    from: formatDateForFmp(spanMap[preset]),
    to: formatDateForFmp(today),
  };
}

export function PositionChartModal({
  position,
  isOpen,
  onClose,
}: PositionChartModalProps) {
  const [preset, setPreset] = useState<RangePreset>('Trade');

  const range = useMemo(
    () => (position ? deriveRange(position, preset) : null),
    [position, preset]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1100px] p-0 gap-0">
        {position && (
          <div className="flex flex-col">
            <DialogHeader className="flex flex-row items-center justify-between px-5 py-3 border-b">
              <div className="flex flex-col gap-0.5">
                <DialogTitle className="font-mono text-base">
                  {position.symbol}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  {position.type} · opened {format(position.openDate, 'yyyy-MM-dd')}
                </p>
              </div>
              <div className="flex gap-1">
                {RANGE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreset(p)}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-mono rounded border',
                      preset === p
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </DialogHeader>
            <div className="px-5 py-4">
              <div className="h-[600px] flex items-center justify-center text-sm text-muted-foreground">
                {range && `Range: ${range.from} → ${range.to}`}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
