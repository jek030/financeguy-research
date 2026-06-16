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
import { Search, ChevronLeft, ChevronRight, ChevronDown, ListFilter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { BrokerageTransaction } from '@/lib/types/transactions';
import { cn } from '@/lib/utils';
import { getTransactionTableColumns } from './TransactionTableColumns';
import { getUniqueSymbols, getUniqueActions } from '@/utils/transactionCalculations';
import AddToPortfolioModal from './AddToPortfolioModal';

interface TransactionTableProps {
  data: BrokerageTransaction[];
  symbolFilter?: string | null;
  onSymbolFilterChange?: (value: string | null) => void;
  className?: string;
}

export default function TransactionTable({
  data,
  symbolFilter,
  onSymbolFilterChange,
  className,
}: TransactionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [modalTransaction, setModalTransaction] = useState<BrokerageTransaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [internalSymbol, setInternalSymbol] = useState<string | null>(null);

  const symbol = symbolFilter !== undefined ? symbolFilter : internalSymbol;
  const setSymbol = onSymbolFilterChange ?? setInternalSymbol;

  const toggleType = React.useCallback((action: string) => {
    setTypeFilters((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  }, []);

  const handleAddToPortfolio = React.useCallback((txn: BrokerageTransaction) => {
    setModalTransaction(txn);
    setModalOpen(true);
  }, []);

  const columns = useMemo(
    () => getTransactionTableColumns({ onAddToPortfolio: handleAddToPortfolio }),
    [handleAddToPortfolio]
  );
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

  React.useEffect(() => {
    table.getColumn('action')?.setFilterValue(typeFilters.length ? typeFilters : undefined);
  }, [typeFilters, table]);

  React.useEffect(() => {
    table.getColumn('symbol')?.setFilterValue(symbol ?? undefined);
  }, [symbol, table]);

  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const totalRowCount = data.length;

  return (
    <Card className={cn("w-full rounded-xl border border-indigo-500/15 bg-gradient-to-br from-[#1b1f3b] to-[#14172c] shadow-lg shadow-black/20", className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold tracking-tight text-slate-100">
              All Transactions
            </CardTitle>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-indigo-300/60" />
              <Input
                placeholder="Search transactions..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="h-9 max-w-sm border-indigo-500/20 bg-[#0f1226] text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Type multi-select */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 border-indigo-500/20 bg-[#0f1226] text-xs text-slate-100 hover:bg-[#1b1f3b]"
                  >
                    <ListFilter className="h-3.5 w-3.5 text-indigo-300/70" />
                    Type
                    {typeFilters.length > 0 && (
                      <span className="ml-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-1.5 text-[10px] font-semibold text-white">
                        {typeFilters.length}
                      </span>
                    )}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="max-h-72 w-56 overflow-y-auto border-indigo-500/20 bg-[#14172c] text-slate-100"
                >
                  <DropdownMenuLabel className="text-indigo-300/70">
                    Transaction types
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-indigo-500/15" />
                  {uniqueActions.map((action) => (
                    <DropdownMenuCheckboxItem
                      key={action}
                      checked={typeFilters.includes(action)}
                      onCheckedChange={() => toggleType(action)}
                      onSelect={(e) => e.preventDefault()}
                      className="text-xs focus:bg-indigo-500/15"
                    >
                      {action}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Symbol filter (controlled) */}
              <Select
                value={symbol ?? 'all'}
                onValueChange={(value) => setSymbol(value === 'all' ? null : value)}
              >
                <SelectTrigger className="h-9 w-[130px] border-indigo-500/20 bg-[#0f1226] text-xs text-slate-100">
                  <SelectValue placeholder="Symbol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Symbols</SelectItem>
                  {uniqueSymbols.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Page size */}
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="h-9 w-[80px] border-indigo-500/20 bg-[#0f1226] text-xs text-slate-100">
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
        <div className="overflow-x-auto rounded-md border border-indigo-500/15">
          <Table className="min-w-full text-xs">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-indigo-500/15 bg-[#0f1226]">
                  {headerGroup.headers.map((header) => {
                    const isSticky = header.column.columnDef.meta?.sticky;
                    return (
                      <TableHead 
                        key={header.id} 
                        className={cn(
                          "whitespace-nowrap px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-indigo-300/70",
                          isSticky && "sticky left-0 z-10 bg-[#0f1226]"
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
                      "border-indigo-500/10 hover:bg-indigo-500/10",
                      index % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isSticky = cell.column.columnDef.meta?.sticky;
                      return (
                        <TableCell 
                          key={cell.id} 
                          className={cn(
                            "px-2 py-1.5 text-[11px] whitespace-nowrap",
                            isSticky && "sticky left-0 z-10 bg-[#14172c]"
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
                  <TableCell colSpan={columns.length} className="h-24 text-center text-xs text-slate-400">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between py-4">
          <div className="text-[11px] text-slate-400">
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
              className="h-8 px-3 border-indigo-500/20 bg-[#0f1226] text-slate-100 hover:bg-[#1b1f3b]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[11px] text-slate-400">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-3 border-indigo-500/20 bg-[#0f1226] text-slate-100 hover:bg-[#1b1f3b]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      <AddToPortfolioModal
        transaction={modalTransaction}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </Card>
  );
}
