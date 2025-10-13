"use client";

import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { TradeRecord } from '@/lib/types/trading';
import { formatCurrency } from '@/utils/tradeCalculations';
import { cn } from '@/lib/utils';
import { getTradeTableColumns } from './TradeTableColumns';
import { format } from 'date-fns';

interface DailyTradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  trades: TradeRecord[];
}

export default function DailyTradesModal({ isOpen, onClose, date, trades }: DailyTradesModalProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = useMemo(() => getTradeTableColumns(), []);

  const table = useReactTable({
    data: trades,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Calculate summary for this date
  const totalGainLoss = trades.reduce((sum, trade) => sum + trade.gainLoss, 0);
  const totalTrades = trades.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Trades for {format(date, 'MMMM dd, yyyy')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {totalTrades} trade{totalTrades !== 1 ? 's' : ''} • Total: <span className={cn(
              "font-semibold",
              totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(totalGainLoss)}
            </span>
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <div className="rounded-md border w-full">
            <div className="max-h-[60vh] overflow-auto relative">
              <Table className="text-xs">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const isSticky = header.column.columnDef.meta?.sticky;
                        return (
                          <TableHead 
                            key={header.id} 
                            className={cn(
                              "sticky top-0 bg-background px-2 py-2 text-[10px] font-semibold whitespace-nowrap",
                              isSticky && "left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.1)]"
                            )}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => {
                          const isSticky = cell.column.columnDef.meta?.sticky;
                          return (
                            <TableCell 
                              key={cell.id}
                              className={cn(
                                "px-2 py-1.5 text-[10px] whitespace-nowrap",
                                isSticky && "sticky left-0 z-10 bg-background shadow-[2px_0_4px_rgba(0,0,0,0.05)]"
                              )}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center text-xs">
                        No trades found for {format(date, 'MMMM dd, yyyy')}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

