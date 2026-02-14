'use client';

import { useState, useCallback } from 'react';

interface UseSortableTableOptions {
  defaultColumn?: string | null;
  defaultDirection?: 'asc' | 'desc';
}

interface UseSortableTableReturn {
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  handleSort: (column: string) => void;
  resetSort: () => void;
}

export function useSortableTable(options?: UseSortableTableOptions): UseSortableTableReturn {
  const { defaultColumn = null, defaultDirection = 'asc' } = options ?? {};

  const [sortColumn, setSortColumn] = useState<string | null>(defaultColumn);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultDirection);

  const handleSort = useCallback((column: string) => {
    setSortColumn(prev => {
      if (prev === column) {
        setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        return prev;
      }
      setSortDirection('asc');
      return column;
    });
  }, []);

  const resetSort = useCallback(() => {
    setSortColumn(defaultColumn);
    setSortDirection(defaultDirection);
  }, [defaultColumn, defaultDirection]);

  return { sortColumn, sortDirection, handleSort, resetSort };
}
