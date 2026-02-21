'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { TableSettings } from '@/lib/supabase';
import { useAuth } from '@/lib/context/auth-context';
import type { TableColumnDef } from '@/lib/table-types';

const LOCAL_STORAGE_PREFIX = 'table-settings-';

function getDefaultHidden(columns: TableColumnDef[]): string[] {
  return columns
    .filter(c => c.defaultHidden && !c.isAnchor && !c.alwaysVisible)
    .map(c => c.id);
}

export function useTableSettings(tableId: string, columns: TableColumnDef[]) {
  const { user } = useAuth();
  const [allSettings, setAllSettings] = useState<TableSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defaultHidden = useMemo(() => getDefaultHidden(columns), [columns]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        try {
          const stored = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${tableId}`);
          if (stored && !cancelled) {
            const parsed = JSON.parse(stored) as { hiddenColumns: string[]; columnOrder?: string[] };
            setAllSettings({ [tableId]: parsed });
          }
        } catch { /* ignore parse errors */ }
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('table_settings')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (!cancelled) {
          setAllSettings((data?.table_settings as TableSettings) ?? null);
        }
      } catch (err) {
        console.error('Error fetching table settings:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    setIsLoading(true);
    load();
    return () => { cancelled = true; };
  }, [user, tableId]);

  const hiddenColumns = useMemo(() => {
    const tableConfig = allSettings?.[tableId];
    if (!tableConfig) {
      return new Set(defaultHidden);
    }
    return new Set(tableConfig.hiddenColumns);
  }, [allSettings, tableId, defaultHidden]);

  const columnOrder = useMemo(() => {
    return allSettings?.[tableId]?.columnOrder ?? null;
  }, [allSettings, tableId]);

  const persist = useCallback((nextHidden: string[], nextOrder?: string[] | null | undefined) => {
    const currentConfig = allSettings?.[tableId];
    const resolvedOrder = nextOrder === undefined
      ? currentConfig?.columnOrder
      : (nextOrder ?? undefined);
    const nextSettings: TableSettings = {
      ...allSettings,
      [tableId]: {
        hiddenColumns: nextHidden,
        columnOrder: resolvedOrder,
      },
    };
    setAllSettings(nextSettings);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (!user) {
        try {
          localStorage.setItem(
            `${LOCAL_STORAGE_PREFIX}${tableId}`,
            JSON.stringify(nextSettings[tableId])
          );
        } catch { /* quota exceeded */ }
        return;
      }

      try {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            table_settings: nextSettings,
            updated_at: now,
          }, {
            onConflict: 'user_id',
          });

        if (error) throw error;
      } catch (err) {
        console.error('Error saving table settings:', err);
      }
    }, 300);
  }, [allSettings, tableId, user]);

  const toggleColumn = useCallback((columnId: string) => {
    const col = columns.find(c => c.id === columnId);
    if (!col || col.isAnchor || col.alwaysVisible) return;

    const current = new Set(hiddenColumns);
    if (current.has(columnId)) {
      current.delete(columnId);
    } else {
      current.add(columnId);
    }
    persist(Array.from(current));
  }, [columns, hiddenColumns, persist]);

  const reorderColumns = useCallback((newOrder: string[]) => {
    persist(Array.from(hiddenColumns), newOrder);
  }, [hiddenColumns, persist]);

  const resetToDefaults = useCallback(() => {
    persist(defaultHidden, null);
  }, [defaultHidden, persist]);

  return {
    hiddenColumns,
    columnOrder,
    toggleColumn,
    reorderColumns,
    resetToDefaults,
    isLoading,
  };
}
