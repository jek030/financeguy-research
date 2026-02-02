"use client";

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Search, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { BrokerageTransaction } from '@/lib/types/transactions';
import { cn } from '@/lib/utils';
import { getTransactionTableColumns } from './TransactionTableColumns';
import { getUniqueSymbols, getUniqueActions } from '@/utils/transactionCalculations';

interface TransactionTableProps {
  data: BrokerageTransaction[];
  className?: string;
}

export default function TransactionTable({ data, className }: TransactionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const columns = useMemo(() => getTransactionTableColumns(), []);
  const uniqueSymbols = useMemo(() => getUniqueSymbols(data), [data]);
  const uniqueActions = useMemo(() => getUniqueActions(data), [data]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  // Update page size when selection changes
  React.useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  const exportToCSV = () => {
    const filteredData = table.getFilteredRowModel().rows.map(row => row.original);
    const headers = ['Date', 'Action', 'Symbol', 'Description', 'Quantity', 'Price', 'Fees & Comm', 'Amount'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(t => [
        `"${t.date}"`,
        `"${t.action}"`,
        `"${t.symbol}"`,
        `"${t.description}"`,
        t.quantity ?? '',
        t.price ?? '',
        t.feesAndComm ?? '',
        t.amount,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const totalRowCount = data.length;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Transactions</CardTitle>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="max-w-sm h-8 text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              
              {/* Symbol Filter */}
              <Select
                value={(table.getColumn('symbol')?.getFilterValue() as string) ?? ''}
                onValueChange={(value) =>
                  table.getColumn('symbol')?.setFilterValue(value === 'all' ? '' : value)
                }
              >
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Symbol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Symbols</SelectItem>
                  {uniqueSymbols.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Action Filter */}
              <Select
                value={(table.getColumn('action')?.getFilterValue() as string) ?? ''}
                onValueChange={(value) =>
                  table.getColumn('action')?.setFilterValue(value === 'all' ? '' : value)
                }
              >
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Page Size */}
              <Select
                value={String(pageSize)}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger className="w-[80px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-full text-xs">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-muted/30">
                  {headerGroup.headers.map((header) => {
                    const isSticky = header.column.columnDef.meta?.sticky;
                    return (
                      <TableHead 
                        key={header.id} 
                        className={cn(
                          "px-2 py-2 text-[10px] font-semibold whitespace-nowrap",
                          isSticky && "sticky left-0 z-10 bg-muted/30"
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
                table.getRowModel().rows.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "hover:bg-muted/50",
                      index % 2 === 0 ? "bg-background" : "bg-muted/20"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isSticky = cell.column.columnDef.meta?.sticky;
                      return (
                        <TableCell 
                          key={cell.id} 
                          className={cn(
                            "px-2 py-1.5 text-[11px] whitespace-nowrap",
                            isSticky && "sticky left-0 z-10 bg-background"
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
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between py-4">
          <div className="text-xs text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {filteredRowCount} transactions
            {filteredRowCount !== totalRowCount && (
              <span className="ml-1">(filtered from {totalRowCount})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-3"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-3"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
