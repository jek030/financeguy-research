import React from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TradeRecord } from '@/lib/types/trading';
import { formatCurrency } from '@/utils/tradeCalculations';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    sticky?: boolean;
  }
}

const columnHelper = createColumnHelper<TradeRecord>();

export function getTradeTableColumns(){
  return [
    columnHelper.accessor('symbol', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold text-[10px]"
        >
          Symbol
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3" />
          )}
        </Button>
      ),
      cell: info => (
        <span className="font-mono font-semibold">{info.getValue()}</span>
      ),
      meta: {
        sticky: true,
      },
    }),
    columnHelper.accessor('name', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold text-[10px]"
        >
          Name
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3" />
          )}
        </Button>
      ),
      cell: info => (
        <span className="font-mono">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('openedDate', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold text-[10px]"
        >
          Opened Date
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3" />
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
          className="p-0 h-auto font-semibold text-[10px]"
        >
          Closed Date
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3" />
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
          className="p-0 h-auto font-semibold text-[10px]"
        >
          Quantity
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3" />
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
          className="p-0 h-auto font-semibold text-[10px]"
        >
          Cost Per Share
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3" />
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
          className="p-0 h-auto font-semibold text-[10px]"
        >
          Proceeds Per Share
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3" />
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
          className="p-0 h-auto font-semibold text-[10px]"
        >
          Proceeds
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3" />
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
          className="p-0 h-auto font-semibold text-[10px]"
        >
          Cost Basis
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3" />
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
          className="p-0 h-auto font-semibold text-[10px]"
        >
          Gain/Loss $
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3" />
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
    columnHelper.accessor('gainLossPercent', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold text-[10px]"
        >
          Gain/Loss %
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3" />
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
            {value.toFixed(2)}%
          </span>
        );
      },
    }),
    columnHelper.accessor('daysInTrade', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold text-[10px]"
        >
          Days in Trade
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3" />
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
          className="p-0 h-auto font-semibold text-[10px]"
        >
          Term
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3" />
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
    columnHelper.accessor('washSale', {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 h-auto font-semibold text-[10px]"
        >
          Wash Sale
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3" />
          )}
        </Button>
      ),
      cell: info => {
        const value = info.getValue();
        const isWashSale = value && value.toLowerCase() === 'yes';
        return (
          <span className={cn(
            "px-2 py-1 rounded text-xs font-medium",
            isWashSale
              ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
          )}>
            {isWashSale ? 'Yes' : 'No'}
          </span>
        );
      },
    }),
  ];
}
