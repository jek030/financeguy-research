'use client';

import { useState, useCallback, useMemo } from 'react';
import type { TableColumnDef } from '@/lib/table-types';
import { useTableSettings } from '@/hooks/useTableSettings';

interface UseSortableTableOptions {
  defaultColumn?: string | null;
  defaultDirection?: 'asc' | 'desc';
  columns?: TableColumnDef[];
  tableId?: string;
  enableRowReorder?: boolean;
}

interface UseSortableTableReturn {
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  handleSort: (column: string) => void;
  resetSort: () => void;
  visibleColumns: TableColumnDef[];
  hiddenColumns: Set<string>;
  toggleColumn: (columnId: string) => void;
  reorderColumns: (newOrder: string[]) => void;
  resetColumnsToDefaults: () => void;
  isColumnsLoading: boolean;
  enableRowReorder: boolean;
  anchorColumn: TableColumnDef | undefined;
  allColumns: TableColumnDef[];
  orderedColumns: TableColumnDef[];
}

const EMPTY_SET = new Set<string>();
const EMPTY_COLUMNS: TableColumnDef[] = [];

export function useSortableTable(options?: UseSortableTableOptions): UseSortableTableReturn {
  const {
    defaultColumn = null,
    defaultDirection = 'asc',
    columns,
    tableId,
    enableRowReorder = false,
  } = options ?? {};

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

  const hasColumnConfig = Boolean(columns && tableId);
  const settings = useTableSettings(
    tableId ?? '__unused__',
    columns ?? EMPTY_COLUMNS,
  );

  const anchorColumn = useMemo(
    () => columns?.find(c => c.isAnchor),
    [columns],
  );

  // All columns sorted by persisted order (anchor first, then ordered, then any new columns at end)
  const orderedColumns = useMemo(() => {
    if (!columns) return EMPTY_COLUMNS;
    if (!settings.columnOrder) return columns;

    const orderMap = new Map(settings.columnOrder.map((id, idx) => [id, idx]));
    const anchor = columns.filter(c => c.isAnchor);
    const rest = columns.filter(c => !c.isAnchor);

    const ordered = rest.slice().sort((a, b) => {
      const aIdx = orderMap.get(a.id);
      const bIdx = orderMap.get(b.id);
      if (aIdx === undefined && bIdx === undefined) return 0;
      if (aIdx === undefined) return 1;
      if (bIdx === undefined) return -1;
      return aIdx - bIdx;
    });

    return [...anchor, ...ordered];
  }, [columns, settings.columnOrder]);

  const visibleColumns = useMemo(() => {
    return orderedColumns.filter(c => {
      if (c.isAnchor || c.alwaysVisible) return true;
      return !settings.hiddenColumns.has(c.id);
    });
  }, [orderedColumns, settings.hiddenColumns]);

  return {
    sortColumn,
    sortDirection,
    handleSort,
    resetSort,
    visibleColumns,
    hiddenColumns: hasColumnConfig ? settings.hiddenColumns : EMPTY_SET,
    toggleColumn: settings.toggleColumn,
    reorderColumns: settings.reorderColumns,
    resetColumnsToDefaults: settings.resetToDefaults,
    isColumnsLoading: hasColumnConfig ? settings.isLoading : false,
    enableRowReorder,
    anchorColumn,
    allColumns: columns ?? EMPTY_COLUMNS,
    orderedColumns,
  };
}
