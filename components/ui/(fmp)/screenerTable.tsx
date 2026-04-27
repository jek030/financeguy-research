"use client";

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Button } from "@/components/ui/Button";

export const HEAD_CLS = 'h-7 px-2 text-[11px] sm:text-[11px]';
export const CELL_CLS = 'py-1 px-2 text-[11px] sm:text-[11px]';

export type SortDirection = 'asc' | 'desc';
export type SortConfig<T> = { key: keyof T; direction: SortDirection } | null;

interface SortButtonProps<T> {
  label: string;
  column: keyof T;
  sortConfig: SortConfig<T>;
  onSort: (key: keyof T) => void;
  align?: 'left' | 'right';
}

export function SortButton<T>({ label, column, sortConfig, onSort, align = 'left' }: SortButtonProps<T>) {
  const isActive = sortConfig?.key === column;
  const Icon = !isActive ? ArrowUpDown : sortConfig?.direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <div className={align === 'right' ? 'flex justify-end' : ''}>
      <Button
        variant="ghost"
        onClick={() => onSort(column)}
        className={`hover:bg-transparent px-0 text-[11px] h-6 ${isActive ? 'text-foreground' : ''}`}
      >
        {label}
        <Icon className="ml-1 h-3 w-3" />
      </Button>
    </div>
  );
}

// Generic sort hook with 3-state cycle (asc -> desc -> none) and missing-value handling.
export function useSortableData<T>(data: T[]): {
  sortConfig: SortConfig<T>;
  requestSort: (key: keyof T) => void;
  sortedData: T[];
} {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>(null);

  const requestSort = (key: keyof T) => {
    setSortConfig((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    const { key, direction } = sortConfig;
    return [...data].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const aMissing = av === undefined || av === null || av === '';
      const bMissing = bv === undefined || bv === null || bv === '';
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;
      let comparison = 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        comparison = av - bv;
      } else if (typeof av === 'boolean' && typeof bv === 'boolean') {
        comparison = (av ? 1 : 0) - (bv ? 1 : 0);
      } else {
        comparison = String(av).localeCompare(String(bv));
      }
      return direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  return { sortConfig, requestSort, sortedData };
}
