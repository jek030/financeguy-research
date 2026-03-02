"use client";

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, FolderInput } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrokerageTransaction, getActionCategory, isTradeAction } from '@/lib/types/transactions';
import { formatCurrency } from '@/utils/transactionCalculations';
import { cn } from '@/lib/utils';

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

function AmountCell({ amount }: { amount: number }) {
  const isPositive = amount > 0;
  const isNegative = amount < 0;
  
  return (
    <span className={cn(
      "font-mono font-medium",
      isPositive && "text-emerald-400",
      isNegative && "text-red-400"
    )}>
      {formatCurrency(amount)}
    </span>
  );
}

interface ColumnOptions {
  onAddToPortfolio?: (transaction: BrokerageTransaction) => void;
}

export function getTransactionTableColumns(options?: ColumnOptions): ColumnDef<BrokerageTransaction>[] {
  const columns: ColumnDef<BrokerageTransaction>[] = [
    {
      accessorKey: 'date',
      header: ({ column }) => <SortableHeader column={column} label="Date" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap">
          {row.original.date}
        </span>
      ),
      meta: { sticky: true },
    },
    {
      accessorKey: 'action',
      header: ({ column }) => <SortableHeader column={column} label="Action" />,
      cell: ({ row }) => <ActionBadge action={row.original.action} />,
      filterFn: 'equals',
    },
    {
      accessorKey: 'symbol',
      header: ({ column }) => <SortableHeader column={column} label="Symbol" />,
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-primary">
          {row.original.symbol || '-'}
        </span>
      ),
      filterFn: 'equals',
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <SortableHeader column={column} label="Description" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground max-w-[200px] truncate block">
          {row.original.description}
        </span>
      ),
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <SortableHeader column={column} label="Qty" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.quantity !== null ? row.original.quantity.toLocaleString() : '-'}
        </span>
      ),
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.quantity ?? 0;
        const b = rowB.original.quantity ?? 0;
        return a - b;
      },
    },
    {
      accessorKey: 'price',
      header: ({ column }) => <SortableHeader column={column} label="Price" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.price !== null ? formatCurrency(row.original.price) : '-'}
        </span>
      ),
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.price ?? 0;
        const b = rowB.original.price ?? 0;
        return a - b;
      },
    },
    {
      accessorKey: 'feesAndComm',
      header: ({ column }) => <SortableHeader column={column} label="Fees" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.feesAndComm !== null && row.original.feesAndComm > 0
            ? formatCurrency(row.original.feesAndComm)
            : '-'}
        </span>
      ),
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.feesAndComm ?? 0;
        const b = rowB.original.feesAndComm ?? 0;
        return a - b;
      },
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => <SortableHeader column={column} label="Amount" />,
      cell: ({ row }) => <AmountCell amount={row.original.amount} />,
    },
  ];

  if (options?.onAddToPortfolio) {
    const handler = options.onAddToPortfolio;
    columns.push({
      id: 'addToPortfolio',
      header: () => null,
      cell: ({ row }) => {
        const txn = row.original;
        const eligible =
          isTradeAction(txn.action) &&
          txn.quantity !== null &&
          txn.price !== null;

        if (!eligible) return null;

        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary"
            onClick={() => handler(txn)}
          >
            <FolderInput className="h-3 w-3 mr-1" />
            Portfolio
          </Button>
        );
      },
      enableSorting: false,
    });
  }

  return columns;
}
