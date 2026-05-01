'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import type { StockPosition } from '@/hooks/usePortfolio';
import { format } from 'date-fns';

export interface PositionChartModalProps {
  position: StockPosition | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PositionChartModal({
  position,
  isOpen,
  onClose,
}: PositionChartModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1100px] p-0 gap-0">
        {position && (
          <div key={position.id} className="flex flex-col">
            <DialogHeader className="flex flex-row items-center justify-between px-5 py-3 border-b">
              <div className="flex flex-col gap-0.5">
                <DialogTitle className="font-mono text-base">
                  {position.symbol}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  {position.type} · opened {format(position.openDate, 'yyyy-MM-dd')}
                </p>
              </div>
              {/* Range selector goes here in Task 3 */}
            </DialogHeader>
            <div className="px-5 py-4">
              <div className="h-[600px] flex items-center justify-center text-sm text-muted-foreground">
                Chart placeholder for {position.symbol}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
