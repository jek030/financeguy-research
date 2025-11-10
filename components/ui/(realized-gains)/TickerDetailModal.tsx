"use client";

import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { TradeRecord } from '@/lib/types/trading';
import { formatCurrency } from '@/utils/tradeCalculations';
import { cn } from '@/lib/utils';
import { getTradeTableColumns } from './TradeTableColumns';

interface TickerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  trades: TradeRecord[];
}

export default function TickerDetailModal({ isOpen, onClose, ticker, trades }: TickerDetailModalProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Filter trades for the specific ticker
  const tickerTrades = useMemo(() => 
    trades.filter(trade => trade.symbol === ticker),
    [trades, ticker]
  );

  const columns = useMemo(() => getTradeTableColumns(), []);

  const table = useReactTable({
    data: tickerTrades,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });



  // Calculate summary for this ticker
  const totalGainLoss = tickerTrades.reduce((sum, trade) => sum + trade.gainLoss, 0);
  const totalTrades = tickerTrades.length;

  // Calculate averages excluding wash sales
  const nonWashSaleTrades = tickerTrades.filter(trade => 
    !trade.washSale || trade.washSale.toLowerCase() !== 'yes'
  );
  const nonWashSaleCount = nonWashSaleTrades.length;
  
  const avgDaysInTrade = nonWashSaleCount > 0
    ? nonWashSaleTrades.reduce((sum, trade) => sum + (trade.daysInTrade || 0), 0) / nonWashSaleCount
    : 0;
  
  const avgGainLoss = nonWashSaleCount > 0
    ? nonWashSaleTrades.reduce((sum, trade) => sum + trade.gainLoss, 0) / nonWashSaleCount
    : 0;
  
  const avgGainLossPercent = nonWashSaleCount > 0
    ? nonWashSaleTrades.reduce((sum, trade) => sum + trade.gainLossPercent, 0) / nonWashSaleCount
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {ticker} Trade Details
          </DialogTitle>
          <div className="text-sm text-muted-foreground mt-2 space-y-1">
            <div>
              {totalTrades} trades • Total: <span className={cn(
                "font-semibold",
                totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(totalGainLoss)}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Avg Days in Trade: <span className="font-semibold text-foreground">
                  {avgDaysInTrade.toFixed(1)}
                </span>
              </span>
              <span>
                Avg Gain/Loss $: <span className={cn(
                  "font-semibold",
                  avgGainLoss >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(avgGainLoss)}
                </span>
              </span>
              <span>
                Avg Gain/Loss %: <span className={cn(
                  "font-semibold",
                  avgGainLossPercent >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {avgGainLossPercent.toFixed(2)}%
                </span>
              </span>
            </div>
            {nonWashSaleCount < totalTrades && (
              <p className="text-xs italic">
                Averages exclude {totalTrades - nonWashSaleCount} wash sale{totalTrades - nonWashSaleCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
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
                        No trades found for {ticker}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {/* Pagination */}
          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {table.getRowModel().rows.length} of {tickerTrades.length} trades
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 