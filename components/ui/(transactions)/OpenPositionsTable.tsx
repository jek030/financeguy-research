"use client";

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { OpenPosition } from '@/lib/types/transactions';
import { formatCurrency } from '@/utils/transactionCalculations';
import { cn } from '@/lib/utils';

interface OpenPositionsTableProps {
  data: OpenPosition[];
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

// Side badge component
function SideBadge({ side }: { side: 'long' | 'short' }) {
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap inline-flex items-center gap-1",
      side === 'long' 
        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
        : 'bg-red-500/20 text-red-400 border-red-500/30'
    )}>
      {side === 'long' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {side.toUpperCase()}
    </span>
  );
}

function getOpenPositionsColumns(onSymbolClick?: (symbol: string) => void): ColumnDef<OpenPosition>[] {
  return [
    {
      accessorKey: 'symbol',
      header: ({ column }) => <SortableHeader column={column} label="Symbol" />,
      cell: ({ row }) => (
        <button
          onClick={() => onSymbolClick?.(row.original.symbol)}
          className="font-mono font-semibold text-primary hover:underline cursor-pointer"
        >
          {row.original.symbol}
        </button>
      ),
    },
    {
      accessorKey: 'side',
      header: ({ column }) => <SortableHeader column={column} label="Side" />,
      cell: ({ row }) => <SideBadge side={row.original.side} />,
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <SortableHeader column={column} label="Quantity" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">
          {row.original.quantity.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'avgCostBasis',
      header: ({ column }) => <SortableHeader column={column} label="Avg Cost" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {formatCurrency(row.original.avgCostBasis)}
        </span>
      ),
    },
    {
      accessorKey: 'totalCost',
      header: ({ column }) => <SortableHeader column={column} label="Total Cost" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">
          {formatCurrency(row.original.totalCost)}
        </span>
      ),
    },
    {
      accessorKey: 'firstTradeDate',
      header: ({ column }) => <SortableHeader column={column} label="First Trade" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.firstTradeDate}
        </span>
      ),
    },
    {
      accessorKey: 'lastTradeDate',
      header: ({ column }) => <SortableHeader column={column} label="Last Trade" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.lastTradeDate}
        </span>
      ),
    },
    {
      accessorKey: 'tradeCount',
      header: ({ column }) => <SortableHeader column={column} label="# Trades" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.tradeCount}
        </span>
      ),
    },
  ];
}

export default function OpenPositionsTable({ data, onSymbolClick, className }: OpenPositionsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'totalCost', desc: true }]);

  const columns = useMemo(() => getOpenPositionsColumns(onSymbolClick), [onSymbolClick]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Calculate totals
  const totals = useMemo(() => {
    const longPositions = data.filter(p => p.side === 'long');
    const shortPositions = data.filter(p => p.side === 'short');
    
    return {
      longCount: longPositions.length,
      shortCount: shortPositions.length,
      longValue: longPositions.reduce((sum, p) => sum + p.totalCost, 0),
      shortValue: shortPositions.reduce((sum, p) => sum + p.totalCost, 0),
      totalValue: data.reduce((sum, p) => sum + p.totalCost, 0),
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Open Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            No open positions found. All trades have matching buy/sell transactions.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full border-border bg-background font-mono", className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.14em]">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Open Positions
            <span className="text-[11px] font-normal text-muted-foreground">
              ({data.length} position{data.length !== 1 ? 's' : ''})
            </span>
          </CardTitle>
          
          {/* Summary Stats */}
          <div className="flex items-center gap-4 text-[11px]">
            {totals.longCount > 0 && (
              <div className="flex items-center gap-2 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">
                  {totals.longCount} Long
                </span>
                <span className="text-emerald-400 font-mono">
                  {formatCurrency(totals.longValue)}
                </span>
              </div>
            )}
            {totals.shortCount > 0 && (
              <div className="flex items-center gap-2 rounded-sm border border-red-500/30 bg-red-500/10 px-3 py-1.5">
                <TrendingDown className="h-3 w-3 text-red-400" />
                <span className="text-red-400 font-medium">
                  {totals.shortCount} Short
                </span>
                <span className="text-red-400 font-mono">
                  {formatCurrency(totals.shortValue)}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-border">
          <Table className="min-w-full text-xs">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-muted/40">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "hover:bg-muted/60",
                    index % 2 === 0 ? "bg-background" : "bg-muted/25"
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
              <TableRow className="border-t-2 bg-muted/55 font-semibold">
                <TableCell className="px-2 py-2 text-[11px]">TOTAL</TableCell>
                <TableCell className="px-2 py-2 text-[11px]">-</TableCell>
                <TableCell className="px-2 py-2 text-[11px]">-</TableCell>
                <TableCell className="px-2 py-2 text-[11px]">-</TableCell>
                <TableCell className="px-2 py-2 text-[11px] font-mono font-bold">
                  {formatCurrency(totals.totalValue)}
                </TableCell>
                <TableCell className="px-2 py-2 text-[11px]">-</TableCell>
                <TableCell className="px-2 py-2 text-[11px]">-</TableCell>
                <TableCell className="px-2 py-2 text-[11px]">-</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        <p className="mt-3 text-[11px] text-muted-foreground">
          Open positions are identified by matching buy and sell transactions. 
          Positions shown here have unmatched quantities.
        </p>
      </CardContent>
    </Card>
  );
}
