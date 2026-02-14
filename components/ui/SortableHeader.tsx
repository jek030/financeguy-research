'use client';

import * as React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { TableHead } from '@/components/ui/Table';
import { cn } from '@/lib/utils';

export interface SortableHeaderProps {
  column: string;
  label: string | React.ReactNode;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  className?: string;
}

export function SortableHeader({ column, label, sortColumn, sortDirection, onSort, className }: SortableHeaderProps) {
  const isActive = sortColumn === column;
  const currentSort = isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <TableHead 
      className={cn("cursor-pointer select-none hover:bg-muted/50", className)}
      onClick={() => onSort(column)}
      aria-sort={currentSort}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
          )
        ) : null}
      </div>
    </TableHead>
  );
}
