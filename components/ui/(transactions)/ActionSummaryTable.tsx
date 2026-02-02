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
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { ActionSummary, getActionCategory } from '@/lib/types/transactions';
import { formatCurrency } from '@/utils/transactionCalculations';
import { cn } from '@/lib/utils';

interface ActionSummaryTableProps {
  data: ActionSummary[];
  onActionClick?: (action: string) => void;
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

// Action badge with category color
function ActionBadge({ action }: { action: string }) {
  const category = getActionCategory(action);
  
  const colorClasses = {
    trade: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    option: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    income: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    expense: 'bg-red-500/20 text-red-400 border-red-500/30',
    other: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap",
      colorClasses[category]
    )}>
      {action}
    </span>
  );
}

function getActionColumns(onActionClick?: (action: string) => void): ColumnDef<ActionSummary>[] {
  return [
    {
      accessorKey: 'action',
      header: ({ column }) => <SortableHeader column={column} label="Action Type" />,
      cell: ({ row }) => (
        <button
          onClick={() => onActionClick?.(row.original.action)}
          className="cursor-pointer"
        >
          <ActionBadge action={row.original.action} />
        </button>
      ),
    },
    {
      accessorKey: 'transactionCount',
      header: ({ column }) => <SortableHeader column={column} label="# Transactions" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.transactionCount}
        </span>
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: ({ column }) => <SortableHeader column={column} label="Total Amount" />,
      cell: ({ row }) => {
        const amount = row.original.totalAmount;
        return (
          <span className={cn(
            "font-mono text-xs font-semibold",
            amount > 0 ? "text-emerald-400" : amount < 0 ? "text-red-400" : ""
          )}>
            {formatCurrency(amount)}
          </span>
        );
      },
    },
    {
      accessorKey: 'totalFees',
      header: ({ column }) => <SortableHeader column={column} label="Total Fees" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.totalFees > 0 ? formatCurrency(row.original.totalFees) : '-'}
        </span>
      ),
    },
    {
      id: 'avgAmount',
      header: 'Avg Amount',
      cell: ({ row }) => {
        const avg = row.original.totalAmount / row.original.transactionCount;
        return (
          <span className={cn(
            "font-mono text-xs",
            avg > 0 ? "text-emerald-400" : avg < 0 ? "text-red-400" : ""
          )}>
            {formatCurrency(avg)}
          </span>
        );
      },
    },
  ];
}

export default function ActionSummaryTable({ data, onActionClick, className }: ActionSummaryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'transactionCount', desc: true }]);

  const columns = useMemo(() => getActionColumns(onActionClick), [onActionClick]);

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
    return data.reduce(
      (acc, item) => ({
        transactionCount: acc.transactionCount + item.transactionCount,
        totalAmount: acc.totalAmount + item.totalAmount,
        totalFees: acc.totalFees + item.totalFees,
      }),
      { transactionCount: 0, totalAmount: 0, totalFees: 0 }
    );
  }, [data]);

  // Group by category for summary
  const categoryTotals = useMemo(() => {
    const categories: Record<string, { count: number; amount: number }> = {};
    data.forEach((item) => {
      const category = getActionCategory(item.action);
      if (!categories[category]) {
        categories[category] = { count: 0, amount: 0 };
      }
      categories[category].count += item.transactionCount;
      categories[category].amount += item.totalAmount;
    });
    return categories;
  }, [data]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">By Action Type</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Category Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {Object.entries(categoryTotals).map(([category, data]) => {
            const colorClasses = {
              trade: 'border-blue-500/30 bg-blue-500/10',
              option: 'border-purple-500/30 bg-purple-500/10',
              income: 'border-emerald-500/30 bg-emerald-500/10',
              expense: 'border-red-500/30 bg-red-500/10',
              other: 'border-border bg-muted/30',
            };
            
            return (
              <div 
                key={category} 
                className={cn(
                  "p-3 rounded-lg border",
                  colorClasses[category as keyof typeof colorClasses]
                )}
              >
                <p className="text-[10px] uppercase text-muted-foreground font-medium">{category}</p>
                <p className="font-mono text-sm font-bold">{data.count}</p>
                <p className={cn(
                  "font-mono text-xs",
                  data.amount > 0 ? "text-emerald-400" : data.amount < 0 ? "text-red-400" : ""
                )}>
                  {formatCurrency(data.amount)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Detailed Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-full text-xs">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-muted/30">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="px-2 py-2 text-[10px] font-semibold whitespace-nowrap">
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
                        "hover:bg-muted/50",
                        index % 2 === 0 ? "bg-background" : "bg-muted/20"
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
                  <TableRow className="bg-muted/50 font-semibold border-t-2">
                    <TableCell className="px-2 py-2 text-[11px]">TOTAL</TableCell>
                    <TableCell className="px-2 py-2 text-[11px] font-mono">{totals.transactionCount}</TableCell>
                    <TableCell className={cn(
                      "px-2 py-2 text-[11px] font-mono",
                      totals.totalAmount > 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                      {formatCurrency(totals.totalAmount)}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-[11px] font-mono">
                      {formatCurrency(totals.totalFees)}
                    </TableCell>
                    <TableCell className="px-2 py-2 text-[11px]">-</TableCell>
                  </TableRow>
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-xs">
                    No action data found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
