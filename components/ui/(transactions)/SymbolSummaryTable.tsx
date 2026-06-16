"use client";

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SymbolSummary } from '@/lib/types/transactions';
import { formatCurrency } from '@/utils/transactionCalculations';
import { cn } from '@/lib/utils';

interface SymbolSummaryTableProps {
  data: SymbolSummary[];
  onSymbolClick?: (symbol: string) => void;
  className?: string;
}

// Sortable header component
function SortableHeader({ 
  column, 
  label 
}: { 
  column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc?: boolean) => void };
  label: string;
}) {
  const sorted = column.getIsSorted();
  
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className="h-8 px-2 -ml-2 font-semibold hover:bg-muted/50"
    >
      {label}
      {sorted === 'asc' ? (
        <ArrowUp className="ml-1 h-3 w-3" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="ml-1 h-3 w-3" />
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
      )}
    </Button>
  );
}

function getSymbolColumns(onSymbolClick?: (symbol: string) => void): ColumnDef<SymbolSummary>[] {
  return [
    {
      accessorKey: 'symbol',
      header: ({ column }) => <SortableHeader column={column} label="Symbol" />,
      cell: ({ row }) => {
        const symbol = row.original.symbol;
        const isNonSymbol = symbol.startsWith('[');
        
        return (
          <button
            onClick={() => !isNonSymbol && onSymbolClick?.(symbol)}
            className={cn(
              "font-mono font-semibold text-left",
              isNonSymbol 
                ? "text-muted-foreground cursor-default" 
                : "text-primary hover:underline cursor-pointer"
            )}
            disabled={isNonSymbol}
          >
            {symbol}
          </button>
        );
      },
    },
    {
      accessorKey: 'transactionCount',
      header: ({ column }) => <SortableHeader column={column} label="# Txns" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.transactionCount}
        </span>
      ),
    },
    {
      accessorKey: 'totalBuyQuantity',
      header: ({ column }) => <SortableHeader column={column} label="Buy Qty" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.totalBuyQuantity > 0 ? row.original.totalBuyQuantity.toLocaleString() : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'totalSellQuantity',
      header: ({ column }) => <SortableHeader column={column} label="Sell Qty" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.totalSellQuantity > 0 ? row.original.totalSellQuantity.toLocaleString() : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'buyAmount',
      header: ({ column }) => <SortableHeader column={column} label="Buy $" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-red-400">
          {row.original.buyAmount > 0 ? formatCurrency(row.original.buyAmount) : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'sellAmount',
      header: ({ column }) => <SortableHeader column={column} label="Sell $" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-emerald-400">
          {row.original.sellAmount > 0 ? formatCurrency(row.original.sellAmount) : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'netAmount',
      header: ({ column }) => <SortableHeader column={column} label="Net $" />,
      cell: ({ row }) => {
        const net = row.original.netAmount;
        return (
          <span className={cn(
            "font-mono text-xs font-semibold",
            net > 0 ? "text-emerald-400" : net < 0 ? "text-red-400" : ""
          )}>
            {formatCurrency(net)}
          </span>
        );
      },
    },
    {
      accessorKey: 'avgBuyPrice',
      header: ({ column }) => <SortableHeader column={column} label="Avg Buy" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.avgBuyPrice !== null ? formatCurrency(row.original.avgBuyPrice) : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'avgSellPrice',
      header: ({ column }) => <SortableHeader column={column} label="Avg Sell" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.avgSellPrice !== null ? formatCurrency(row.original.avgSellPrice) : '-'}
        </span>
      ),
    },
    {
      accessorKey: 'totalFees',
      header: ({ column }) => <SortableHeader column={column} label="Fees" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.totalFees > 0 ? formatCurrency(row.original.totalFees) : '-'}
        </span>
      ),
    },
  ];
}

export default function SymbolSummaryTable({ data, onSymbolClick, className }: SymbolSummaryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'transactionCount', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(() => getSymbolColumns(onSymbolClick), [onSymbolClick]);

  // Separate stock symbols from non-symbol entries
  const stockSymbols = useMemo(() => data.filter(d => !d.symbol.startsWith('[')), [data]);
  const nonStockItems = useMemo(() => data.filter(d => d.symbol.startsWith('[')), [data]);

  const table = useReactTable({
    data: stockSymbols,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Calculate totals
  const totals = useMemo(() => {
    return stockSymbols.reduce(
      (acc, item) => ({
        transactionCount: acc.transactionCount + item.transactionCount,
        buyAmount: acc.buyAmount + item.buyAmount,
        sellAmount: acc.sellAmount + item.sellAmount,
        netAmount: acc.netAmount + item.netAmount,
        totalFees: acc.totalFees + item.totalFees,
      }),
      { transactionCount: 0, buyAmount: 0, sellAmount: 0, netAmount: 0, totalFees: 0 }
    );
  }, [stockSymbols]);

  return (
    <Card className={cn("w-full rounded-xl border border-indigo-500/15 bg-gradient-to-br from-[#1b1f3b] to-[#14172c] shadow-lg shadow-black/20 font-sans", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-tight text-slate-100">By Symbol</CardTitle>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-indigo-300/60" />
            <Input
              placeholder="Search symbols..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-9 w-[180px] border-indigo-500/20 bg-[#0f1226] text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-indigo-500/15">
          <Table className="min-w-full text-xs">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-indigo-500/15 bg-[#0f1226]">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-indigo-300/70">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                <>
                  {table.getRowModel().rows.map((row, index) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        "border-indigo-500/10 hover:bg-indigo-500/10",
                        index % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-2 py-1.5 text-[11px] whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="border-t-2 border-indigo-500/30 bg-indigo-500/10 font-semibold">
                    <TableCell className="px-2 py-2 text-[11px]">TOTAL</TableCell>
                    <TableCell className="px-2 py-2 text-[11px] font-mono">{totals.transactionCount}</TableCell>
                    <TableCell className="px-2 py-2 text-[11px]">-</TableCell>
                    <TableCell className="px-2 py-2 text-[11px]">-</TableCell>
                    <TableCell className="px-2 py-2 text-[11px] font-mono text-red-400">{formatCurrency(totals.buyAmount)}</TableCell>
                    <TableCell className="px-2 py-2 text-[11px] font-mono text-emerald-400">{formatCurrency(totals.sellAmount)}</TableCell>
                    <TableCell className={cn(
                      "px-2 py-2 text-[11px] font-mono",
                      totals.netAmount > 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                      {formatCurrency(totals.netAmount)}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-[11px]">-</TableCell>
                    <TableCell className="px-2 py-2 text-[11px]">-</TableCell>
                    <TableCell className="px-2 py-2 text-[11px] font-mono">{formatCurrency(totals.totalFees)}</TableCell>
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-xs">
                    No symbols found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-2 text-[11px] text-slate-400">
          {table.getFilteredRowModel().rows.length} symbols
          {nonStockItems.length > 0 && (
            <span> • {nonStockItems.length} non-stock transactions (see Action Summary)</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
