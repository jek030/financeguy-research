'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { GripVertical, X, RotateCcw, Settings } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import type { TableColumnDef } from '@/lib/table-types';
import { cn } from '@/lib/utils';

interface ColumnSettingsPopoverProps {
  columns: TableColumnDef[];
  hiddenColumns: Set<string>;
  onToggleColumn: (columnId: string) => void;
  onReorderColumns: (newOrder: string[]) => void;
  onReset: () => void;
}

export function ColumnSettingsPopover({
  columns,
  hiddenColumns,
  onToggleColumn,
  onReorderColumns,
  onReset,
}: ColumnSettingsPopoverProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const nonAnchorColumns = useMemo(
    () => columns.filter(c => !c.isAnchor),
    [columns],
  );

  const visibleNonAnchor = useMemo(
    () => nonAnchorColumns.filter(c => !hiddenColumns.has(c.id)),
    [nonAnchorColumns, hiddenColumns],
  );

  const hiddenNonAnchor = useMemo(
    () => nonAnchorColumns.filter(c => hiddenColumns.has(c.id) && !c.alwaysVisible),
    [nonAnchorColumns, hiddenColumns],
  );

  const handleDragStart = useCallback((e: React.DragEvent, colId: string) => {
    setDraggedId(colId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(colId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    setDraggedId(null);

    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    const currentOrder = nonAnchorColumns.map(c => c.id);
    const fromIdx = currentOrder.indexOf(sourceId);
    const toIdx = currentOrder.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, sourceId);
    onReorderColumns(newOrder);
  }, [nonAnchorColumns, onReorderColumns]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  const visibleCount = visibleNonAnchor.length;

  return (
    <Sheet>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <button
                className="inline-flex items-center justify-center rounded-sm p-0.5 hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Column Settings"
                onClick={(e) => e.stopPropagation()}
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Column Settings</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <SheetContent side="right" className="flex flex-col p-0">
        <SheetHeader className="px-4 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between pr-6">
            <SheetTitle>Column Settings</SheetTitle>
            <span className="text-xs text-muted-foreground">Changes save automatically</span>
          </div>
          <SheetDescription className="sr-only">
            Configure which columns are visible and drag to reorder them.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Visible columns - draggable */}
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Selected <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold w-5 h-5">{visibleCount}</span>
              </span>
            </div>

            {/* Anchor column (not draggable, not removable) */}
            {columns.filter(c => c.isAnchor).map(col => {
              const label = typeof col.label === 'string' ? col.label : col.id;
              return (
                <div
                  key={col.id}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md bg-muted/30 mb-1"
                >
                  <div className="w-5 h-5 flex items-center justify-center text-muted-foreground/30">
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                  <span className="flex-1 truncate font-medium">{label}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Pinned</span>
                </div>
              );
            })}

            {/* Draggable visible columns */}
            {visibleNonAnchor.map(col => {
              const label = typeof col.label === 'string' ? col.label : col.id;
              const isDragging = draggedId === col.id;
              const isDragOver = dragOverId === col.id;
              const isAlwaysVisible = col.alwaysVisible;

              return (
                <div
                  key={col.id}
                  draggable={!isAlwaysVisible}
                  onDragStart={(e) => handleDragStart(e, col.id)}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md mb-0.5 transition-colors",
                    isDragging && "opacity-40",
                    isDragOver && "bg-primary/10 border border-primary/30",
                    !isDragging && !isDragOver && "hover:bg-muted/50",
                    !isAlwaysVisible && "cursor-grab active:cursor-grabbing",
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 flex items-center justify-center",
                    isAlwaysVisible ? "text-muted-foreground/30" : "text-muted-foreground"
                  )}>
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                  <span className="flex-1 truncate">{label}</span>
                  {!isAlwaysVisible && (
                    <button
                      onClick={() => onToggleColumn(col.id)}
                      className="w-5 h-5 flex items-center justify-center rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label={`Hide ${label}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hidden columns */}
          {hiddenNonAnchor.length > 0 && (
            <div className="px-4 pt-3 pb-3 border-t border-border mt-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Hidden
              </span>
              {hiddenNonAnchor.map(col => {
                const label = typeof col.label === 'string' ? col.label : col.id;
                return (
                  <label
                    key={col.id}
                    className="flex items-center justify-between px-2 py-1.5 text-sm rounded-md hover:bg-muted/50 transition-colors cursor-pointer mb-0.5"
                  >
                    <span className="truncate mr-2 text-muted-foreground">{label}</span>
                    <Switch
                      checked={false}
                      onCheckedChange={() => onToggleColumn(col.id)}
                      className="scale-75"
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="w-full text-xs h-7 text-destructive hover:text-destructive"
          >
            <RotateCcw className="h-3 w-3 mr-1.5" />
            Reset Columns
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
