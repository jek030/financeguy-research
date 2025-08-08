"use client";

import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { TradeRecord } from '@/lib/types/trading';
import { formatCurrency } from '@/utils/tradeCalculations';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

interface TickerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  trades: TradeRecord[];
}

const columnHelper = createColumnHelper<TradeRecord>();

export default function TickerDetailModal({ isOpen, onClose, ticker, trades }: TickerDetailModalProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Filter trades for the specific ticker
  const tickerTrades = useMemo(() => 
    trades.filter(trade => trade.symbol === ticker),
    [trades, ticker]
  );

  const columns = useMemo(() => [
    columnHelper.accessor('symbol', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold"
        >
          Symbol
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: info => (
        <span className="font-mono font-semibold">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('openedDate', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold"
        >
          Opened Date
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: info => {
        try {
          const date = parseISO(info.getValue());
          return format(date, 'MMM dd, yyyy');
        } catch {
          return info.getValue();
        }
      },
    }),
    columnHelper.accessor('closedDate', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold"
        >
          Closed Date
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: info => {
        try {
          const date = parseISO(info.getValue());
          return format(date, 'MMM dd, yyyy');
        } catch {
          return info.getValue();
        }
      },
    }),
    columnHelper.accessor('quantity', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold"
        >
          Quantity
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: info => info.getValue().toLocaleString(),
    }),
    columnHelper.accessor('costPerShare', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold"
        >
          Cost Per Share
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: info => formatCurrency(info.getValue()),
    }),
    columnHelper.accessor('proceedsPerShare', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold"
        >
          Proceeds Per Share
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: info => formatCurrency(info.getValue()),
    }),
    columnHelper.accessor('proceeds', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold"
        >
          Proceeds
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: info => formatCurrency(info.getValue()),
    }),
    columnHelper.accessor('costBasis', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold"
        >
          Cost Basis
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: info => formatCurrency(info.getValue()),
    }),
    columnHelper.accessor('gainLoss', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold"
        >
          Gain/Loss
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: info => {
        const value = info.getValue();
        return (
          <span className={cn(
            "font-semibold",
            value >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrency(value)}
          </span>
        );
      },
    }),
    columnHelper.accessor('daysInTrade', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold"
        >
          Days in Trade
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: info => {
        const days = info.getValue();
        return (
          <span className="font-medium">
            {days == null ? 'N/A' : days === 0 ? '0' : days.toLocaleString()}
          </span>
        );
      },
    }),
    columnHelper.accessor('term', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold"
        >
          Term
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: info => (
        <span className={cn(
          "px-2 py-1 rounded text-xs font-medium",
          info.getValue() === 'Long Term' 
            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
            : "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
        )}>
          {info.getValue()}
        </span>
      ),
    }),
  ], []);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {ticker} Trade Details
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {totalTrades} trades • Total: <span className={cn(
              "font-semibold",
              totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(totalGainLoss)}
            </span>
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <div className="rounded-md border w-full">
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="sticky top-0 bg-background">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
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
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
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