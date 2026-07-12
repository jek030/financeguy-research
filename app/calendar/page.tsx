"use client";
import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, TrendingUp, TrendingDown, ExternalLink, Sparkles, BarChart3, Target, ArrowUpRight, ArrowDownRight, Search, Sun, Moon, List } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { useEarningsConfirmed } from '@/hooks/FMP/useEarningsConfirmed';
import { useDowJonesConstituents } from '@/hooks/FMP/useDowJonesConstituents';
import { useSP500Constituents } from '@/hooks/FMP/useSP500Constituents';
import { useNasdaq100Constituents } from '@/hooks/FMP/useNasdaq100Constituents';
import { useAuth } from '@/lib/context/auth-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { useRouter } from 'next/navigation';
import { pageStyles } from '@/components/ui/CompanyHeader';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterMode = 'all' | 'sp500' | 'dow' | 'nasdaq100' | 'watchlist';
type SelectableFilterMode = Exclude<FilterMode, 'all'>;
type ViewMode = 'monthly' | 'weekly' | 'table';
type SortDirection = 'asc' | 'desc';
type EarningsTableSortColumn =
  | 'symbol'
  | 'reportTime'
  | 'reportDate'
  | 'fiscalDateEnding'
  | 'epsActual'
  | 'epsEstimated'
  | 'epsBeatPercentage'
  | 'revenueActual'
  | 'revenueEstimated'
  | 'revenueBeatPercentage';

const DEFAULT_ACTIVE_FILTERS: SelectableFilterMode[] = ['sp500', 'dow', 'nasdaq100', 'watchlist'];
const SELECTABLE_FILTERS: SelectableFilterMode[] = ['sp500', 'dow', 'nasdaq100', 'watchlist'];
const CALENDAR_VIEW_STORAGE_KEY = 'financeguy-calendar-view-mode';
const CALENDAR_FILTERS_STORAGE_KEY = 'financeguy-calendar-active-filters';

function parseStoredFilters(raw: string | null): Set<SelectableFilterMode> | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const filters = parsed.filter(
      (value): value is SelectableFilterMode =>
        typeof value === 'string' && SELECTABLE_FILTERS.includes(value as SelectableFilterMode)
    );
    // Empty array is intentional ("All"). Reject only if every entry was invalid.
    if (parsed.length > 0 && filters.length === 0) return null;
    return new Set(filters);
  } catch {
    return null;
  }
}

function readStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY);
    if (stored === 'monthly' || stored === 'weekly' || stored === 'table') {
      return stored;
    }
  } catch {
    // Ignore localStorage read errors
  }
  return 'monthly';
}

function readStoredFilters(): Set<SelectableFilterMode> {
  try {
    const stored = parseStoredFilters(localStorage.getItem(CALENDAR_FILTERS_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Ignore localStorage read errors
  }
  return new Set(DEFAULT_ACTIVE_FILTERS);
}

const EARNINGS_TABLE_COLUMNS: { id: EarningsTableSortColumn; label: string; align?: 'left' | 'right' }[] = [
  { id: 'symbol', label: 'Symbol' },
  { id: 'reportTime', label: 'Report Time' },
  { id: 'reportDate', label: 'Report Date' },
  { id: 'fiscalDateEnding', label: 'Fiscal Date Ending' },
  { id: 'epsActual', label: 'EPS Actual', align: 'right' },
  { id: 'epsEstimated', label: 'EPS Estimated', align: 'right' },
  { id: 'epsBeatPercentage', label: 'EPS Beat %', align: 'right' },
  { id: 'revenueActual', label: 'Revenue Actual', align: 'right' },
  { id: 'revenueEstimated', label: 'Revenue Estimated', align: 'right' },
  { id: 'revenueBeatPercentage', label: 'Revenue Beat %', align: 'right' },
];

interface CalendarEvent {
  title: string;
  category: string;
  url?: string;
  time?: string;
  symbol?: string;
  exchange?: string;
  eps?: number | null;
  epsEstimated?: number | null;
  revenue?: number | null;
  revenueEstimated?: number | null;
  fiscalDateEnding?: string;
  epsBeatPercentage?: number | null;
  revenueBeatPercentage?: number | null;
  date?: string;
  name?: string;
  sector?: string;
  subSector?: string;
}

interface EventsState {
  [key: string]: CalendarEvent[];
}

// ─── Date Helpers ────────────────────────────────────────────────────────────

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonthRange(date: Date): { from: string; to: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return { from: formatDateStr(firstDay), to: formatDateStr(lastDay) };
}

function getWeekRange(date: Date): { from: string; to: string; days: Date[] } {
  // Get Monday of the trading week for `date`.
  // Sat/Sun roll forward to the upcoming Mon–Fri (not the week that just ended).
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday =
    dayOfWeek === 0 ? 1 : // Sunday → next Monday
    dayOfWeek === 6 ? 2 : // Saturday → next Monday
    1 - dayOfWeek;        // Mon–Fri → Monday of this week
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const days: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }

  return { from: formatDateStr(monday), to: formatDateStr(friday), days };
}

function formatWeekLabel(days: Date[]): string {
  if (days.length === 0) return '';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const mon = days[0].toLocaleDateString('en-US', opts);
  const fri = days[days.length - 1].toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${mon} \u2013 ${fri}`;
}

// ─── Stable fallback constants (prevents new references on every render) ────
const EMPTY_SET = new Set<string>();
const EMPTY_MAP = new Map<string, { symbol: string; name: string; sector: string; subSector: string }>();

// ─── Component ───────────────────────────────────────────────────────────────

const CalendarPage: React.FC = () => {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('previous');
  const [activeFilters, setActiveFilters] = useState<Set<SelectableFilterMode>>(new Set(DEFAULT_ACTIVE_FILTERS));
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  // Gate preference-dependent UI/fetch until localStorage is applied (avoids default→cached flash)
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const initialTableRange = getMonthRange(new Date());
  const [draftFrom, setDraftFrom] = useState(initialTableRange.from);
  const [draftTo, setDraftTo] = useState(initialTableRange.to);
  const [appliedFrom, setAppliedFrom] = useState(initialTableRange.from);
  const [appliedTo, setAppliedTo] = useState(initialTableRange.to);
  const [tableRangeError, setTableRangeError] = useState<string | null>(null);
  const [tableSortColumn, setTableSortColumn] = useState<EarningsTableSortColumn | null>(null);
  const [tableSortDirection, setTableSortDirection] = useState<SortDirection>('asc');

  // Apply cached prefs before paint so SSR/default HTML is never shown as the selected state
  useLayoutEffect(() => {
    setViewMode(readStoredViewMode());
    setActiveFilters(readStoredFilters());
    setPrefsHydrated(true);
  }, []);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const { user } = useAuth();

  // ── Lightweight watchlist symbols query (avoids heavy useWatchlist hook) ───
  const EMPTY_WATCHLIST: string[] = useMemo(() => [], []);
  const { data: rawWatchlistSymbols } = useQuery({
    queryKey: ['calendar-watchlist-symbols', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: watchlistRows } = await supabase
        .from('watchlists')
        .select('id')
        .eq('user_id', user.id);
      if (!watchlistRows || watchlistRows.length === 0) return [];
      const ids = watchlistRows.map((w: { id: string }) => w.id);
      const { data: tickerRows } = await supabase
        .from('watchlist_tickers')
        .select('symbol')
        .in('watchlist_id', ids);
      return [...new Set((tickerRows || []).map((t: { symbol: string }) => t.symbol))];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const watchlistSymbols = rawWatchlistSymbols ?? EMPTY_WATCHLIST;

  // ── Constituent hooks ──────────────────────────────────────────────────────
  const { data: dowData, isLoading: dowLoading } = useDowJonesConstituents();
  const { data: spData, isLoading: spLoading } = useSP500Constituents();
  const { data: nasdaq100Data, isLoading: nasdaq100Loading } = useNasdaq100Constituents();

  const dowConstituents = useMemo(() => dowData?.symbols || EMPTY_SET, [dowData?.symbols]);
  const spConstituents = useMemo(() => spData?.symbols || EMPTY_SET, [spData?.symbols]);
  const nasdaq100Constituents = useMemo(() => nasdaq100Data?.symbols || EMPTY_SET, [nasdaq100Data?.symbols]);

  const dowDataMap = useMemo(() => dowData?.dataMap || EMPTY_MAP, [dowData?.dataMap]);
  const spDataMap = useMemo(() => spData?.dataMap || EMPTY_MAP, [spData?.dataMap]);
  const nasdaq100DataMap = useMemo(() => nasdaq100Data?.dataMap || EMPTY_MAP, [nasdaq100Data?.dataMap]);

  // ── Compute which symbols to fetch based on active filters ─────────────────
  const indexConstituentsLoaded = !dowLoading && !spLoading && !nasdaq100Loading;

  const selectedSymbols = useMemo((): string[] | undefined => {
    // No active filters = "All" (fetch every earning in the date range)
    if (activeFilters.size === 0) return undefined;

    const hasIndexFilter =
      activeFilters.has('sp500') ||
      activeFilters.has('dow') ||
      activeFilters.has('nasdaq100');

    // Wait for index constituents before fetching index-filtered results
    if (hasIndexFilter && !indexConstituentsLoaded) return [];

    const combined = new Set<string>();
    if (activeFilters.has('sp500')) {
      spConstituents.forEach((s: string) => combined.add(s));
    }
    if (activeFilters.has('dow')) {
      dowConstituents.forEach((s: string) => combined.add(s));
    }
    if (activeFilters.has('nasdaq100')) {
      nasdaq100Constituents.forEach((s: string) => combined.add(s));
    }
    if (activeFilters.has('watchlist')) {
      watchlistSymbols.forEach((s: string) => combined.add(s));
    }
    return Array.from(combined);
  }, [activeFilters, indexConstituentsLoaded, spConstituents, dowConstituents, nasdaq100Constituents, watchlistSymbols]);

  // ── Date range for the current view ────────────────────────────────────────
  const weekInfo = useMemo(() => getWeekRange(currentDate), [currentDate]);

  const dateRange = useMemo(() => {
    if (viewMode === 'table') {
      return { from: appliedFrom, to: appliedTo };
    }
    if (viewMode === 'weekly') {
      return { from: weekInfo.from, to: weekInfo.to };
    }
    return getMonthRange(currentDate);
  }, [viewMode, currentDate, weekInfo, appliedFrom, appliedTo]);

  // ── Fetch earnings ─────────────────────────────────────────────────────────
  // Hold the query until prefs hydrate so we don't fetch defaults then refetch cached filters
  const { data: earnings } = useEarningsConfirmed(
    prefsHydrated ? dateRange.from : '',
    prefsHydrated ? dateRange.to : '',
    selectedSymbols,
  );
  const normalizedSearchQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  // ─── Formatting helpers ────────────────────────────────────────────────────

  const formatTime = (time: string | undefined): string => {
    if (!time) return 'TBD';
    switch (time.toLowerCase()) {
      case 'amc': return 'After Close';
      case 'bmo': return 'Before Open';
      default: return time;
    }
  };

  const getTimeIcon = (time: string | undefined) => {
    if (!time) return <Clock className="w-3.5 h-3.5" />;
    switch (time.toLowerCase()) {
      case 'bmo': return <Sun className="w-3.5 h-3.5 text-amber-500" />;
      case 'amc': return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return 'N/A';
    if (Math.abs(amount) >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`;
    if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
    if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(2)}K`;
    return `$${amount.toFixed(2)}`;
  };

  const formatPercentage = (percentage: number | null): string => {
    if (percentage === null) return 'N/A';
    return `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  // Parse "YYYY-MM-DD" as local midnight (avoids UTC shift that causes off-by-one in US timezones)
  const parseLocalDate = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatDateShort = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getOrdinalSuffix = (day: number): string => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const formatDateDividerLabel = (dateStr: string | undefined): string => {
    if (!dateStr) return 'Unknown Date';
    const date = parseLocalDate(dateStr);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${weekday}, ${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
  };

  const getBeatPercentage = (actual: number | null | undefined, estimated: number | null | undefined): number | null => {
    if (actual === null || actual === undefined || estimated === null || estimated === undefined || estimated === 0) return null;
    return ((actual - estimated) / Math.abs(estimated)) * 100;
  };

  const getReportTimeSortRank = (time: string | undefined): number => {
    const normalized = (time || '').toLowerCase();
    if (normalized === 'bmo') return 0;
    if (normalized === 'amc') return 1;
    if (normalized) return 2;
    return 3;
  };

  const handleTableSort = (column: string) => {
    const nextColumn = column as EarningsTableSortColumn;
    if (tableSortColumn === nextColumn) {
      if (tableSortDirection === 'asc') {
        setTableSortDirection('desc');
      } else {
        setTableSortColumn(null);
        setTableSortDirection('asc');
      }
      return;
    }

    setTableSortColumn(nextColumn);
    setTableSortDirection('asc');
  };

  const getDaysUntil = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const eventDate = parseLocalDate(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    return `In ${diffDays} days`;
  };

  // ─── Build events from earnings (pure derivation, no side effects) ─────────

  const { events, allEventsSorted } = useMemo(() => {
    const newEvents: EventsState = {};
    const flatEvents: CalendarEvent[] = [];

    if (!earnings || earnings.length === 0) {
      return { events: newEvents, allEventsSorted: flatEvents };
    }

    const seenEvents = new Set<string>();

    earnings.forEach(earning => {
      const dateKey = earning.date;
      if (!dateKey || !earning.symbol) return;

      const eventKey = `${dateKey}:${earning.symbol}`;
      if (seenEvents.has(eventKey)) return;
      seenEvents.add(eventKey);

      const earningTime = formatTime(earning.time);

      let epsBeatPercentage = null;
      let revenueBeatPercentage = null;

      if (earning.eps !== null && earning.epsEstimated !== null && earning.epsEstimated !== 0) {
        epsBeatPercentage = ((earning.eps - earning.epsEstimated) / Math.abs(earning.epsEstimated)) * 100;
      }
      if (earning.revenue !== null && earning.revenueEstimated !== null && earning.revenueEstimated !== 0) {
        revenueBeatPercentage = ((earning.revenue - earning.revenueEstimated) / Math.abs(earning.revenueEstimated)) * 100;
      }

      const constituentData =
        dowDataMap.get(earning.symbol) ||
        spDataMap.get(earning.symbol) ||
        nasdaq100DataMap.get(earning.symbol);

      const earningEvent: CalendarEvent = {
        title: `${earning.symbol} Earnings - ${earningTime} (EPS: ${earning.eps ?? 'N/A'})`,
        category: 'earnings',
        url: earning.url,
        time: earning.time,
        symbol: earning.symbol,
        exchange: earning.exchange,
        eps: earning.eps,
        epsEstimated: earning.epsEstimated,
        revenue: earning.revenue,
        revenueEstimated: earning.revenueEstimated,
        fiscalDateEnding: earning.fiscalDateEnding,
        epsBeatPercentage,
        revenueBeatPercentage,
        date: earning.date,
        name: constituentData?.name,
        sector: constituentData?.sector,
        subSector: constituentData?.subSector,
      };

      if (!newEvents[dateKey]) newEvents[dateKey] = [];
      newEvents[dateKey].push(earningEvent);
      flatEvents.push(earningEvent);
    });

    flatEvents.sort((a, b) => {
      const dateCompare = (a.date || '').localeCompare(b.date || '');
      if (dateCompare !== 0) return dateCompare;
      const reportTimeCompare = getReportTimeSortRank(a.time) - getReportTimeSortRank(b.time);
      if (reportTimeCompare !== 0) return reportTimeCompare;
      return (a.symbol || '').localeCompare(b.symbol || '');
    });

    return { events: newEvents, allEventsSorted: flatEvents };
  }, [earnings, dowDataMap, spDataMap, nasdaq100DataMap]);

  // ─── Derived data ──────────────────────────────────────────────────────────

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const previousEvents = useMemo(() => {
    return allEventsSorted.filter(event => {
      const eventDate = event.date ? parseLocalDate(event.date) : new Date(0);
      return eventDate < today;
    });
  }, [allEventsSorted, today]);

  const upcomingEvents = useMemo(() => {
    return allEventsSorted.filter(event => {
      const eventDate = event.date ? parseLocalDate(event.date) : new Date(0);
      return eventDate >= today;
    });
  }, [allEventsSorted, today]);

  const filteredPreviousEvents = useMemo(() => {
    if (!normalizedSearchQuery) return previousEvents;
    return previousEvents.filter(event =>
      event.symbol?.toLowerCase().includes(normalizedSearchQuery)
    );
  }, [previousEvents, normalizedSearchQuery]);

  const filteredUpcomingEvents = useMemo(() => {
    if (!normalizedSearchQuery) return upcomingEvents;
    return upcomingEvents.filter(event =>
      event.symbol?.toLowerCase().includes(normalizedSearchQuery)
    );
  }, [upcomingEvents, normalizedSearchQuery]);

  const filteredTableRows = useMemo(() => {
    if (!earnings || earnings.length === 0) return [];
    const filtered = !normalizedSearchQuery
      ? earnings
      : earnings.filter(event =>
          event.symbol?.toLowerCase().includes(normalizedSearchQuery)
        );

    const getSortValue = (row: (typeof filtered)[number], column: EarningsTableSortColumn): number | string | null => {
      switch (column) {
        case 'symbol':
          return row.symbol || null;
        case 'reportTime':
          return getReportTimeSortRank(row.reportTime || row.time);
        case 'reportDate':
          return row.reportDate || row.date || null;
        case 'fiscalDateEnding':
          return row.fiscalDateEnding || null;
        case 'epsActual':
          return row.epsActual ?? row.eps ?? null;
        case 'epsEstimated':
          return row.epsEstimated ?? null;
        case 'epsBeatPercentage':
          return getBeatPercentage(row.epsActual ?? row.eps ?? null, row.epsEstimated ?? null);
        case 'revenueActual':
          return row.revenueActual ?? row.revenue ?? null;
        case 'revenueEstimated':
          return row.revenueEstimated ?? null;
        case 'revenueBeatPercentage':
          return getBeatPercentage(row.revenueActual ?? row.revenue ?? null, row.revenueEstimated ?? null);
      }
    };

    const compareSortValues = (aValue: number | string | null, bValue: number | string | null): number => {
      const aMissing = aValue === null || aValue === '';
      const bMissing = bValue === null || bValue === '';
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;
      const valueCompare = typeof aValue === 'number' && typeof bValue === 'number'
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue));
      return tableSortDirection === 'asc' ? valueCompare : -valueCompare;
    };

    return [...filtered].sort((a, b) => {
      if (tableSortColumn) {
        const requestedSortCompare = compareSortValues(
          getSortValue(a, tableSortColumn),
          getSortValue(b, tableSortColumn),
        );
        if (requestedSortCompare !== 0) return requestedSortCompare;
      }

      const dateCompare = (a.reportDate || a.date || '').localeCompare(b.reportDate || b.date || '');
      if (dateCompare !== 0) return dateCompare;
      const reportTimeCompare = getReportTimeSortRank(a.reportTime || a.time) - getReportTimeSortRank(b.reportTime || b.time);
      if (reportTimeCompare !== 0) return reportTimeCompare;
      const timeLabelCompare = (a.reportTime || a.time || '').localeCompare(b.reportTime || b.time || '');
      if (timeLabelCompare !== 0) return timeLabelCompare;
      return (a.symbol || '').localeCompare(b.symbol || '');
    });
  }, [earnings, normalizedSearchQuery, tableSortColumn, tableSortDirection]);

  const todayDividerRef = useRef<HTMLTableRowElement | null>(null);
  const hasAutoScrolledToTodayRef = useRef<boolean>(false);
  const todayDateKey = useMemo(() => formatDateStr(new Date()), []);

  useEffect(() => {
    if (viewMode !== 'table') {
      hasAutoScrolledToTodayRef.current = false;
      return;
    }

    if (hasAutoScrolledToTodayRef.current) return;
    if (!todayDividerRef.current) return;

    todayDividerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    hasAutoScrolledToTodayRef.current = true;
  }, [viewMode, filteredTableRows]);

  const stats = useMemo(() => {
    let reportedCount = 0;
    let beatCount = 0;
    let missCount = 0;

    previousEvents.forEach(event => {
      if (event.eps === null) return;
      reportedCount += 1;
      if (event.epsBeatPercentage && event.epsBeatPercentage > 0) beatCount += 1;
      if (event.epsBeatPercentage && event.epsBeatPercentage < 0) missCount += 1;
    });

    return {
      totalUpcoming: upcomingEvents.length,
      beatRate: reportedCount > 0 ? (beatCount / reportedCount * 100).toFixed(0) : '0',
      missCount,
      beatCount,
    };
  }, [previousEvents, upcomingEvents]);

  // ─── Navigation ────────────────────────────────────────────────────────────

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const navigateBack = () => {
    if (viewMode === 'weekly') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    }
  };

  const navigateForward = () => {
    if (viewMode === 'weekly') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    }
  };

  const handleApplyTableRange = () => {
    if (!draftFrom || !draftTo) {
      return;
    }
    if (draftFrom > draftTo) {
      setTableRangeError('From date must be on or before To date');
      return;
    }
    setTableRangeError(null);
    setAppliedFrom(draftFrom);
    setAppliedTo(draftTo);
  };

  const handleGoToTicker = (symbol: string | undefined) => {
    if (!symbol) return;
    router.push(`/search/${symbol}`);
  };

  const handleOpenExternal = (url: string | undefined) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ─── Shared sub-components ─────────────────────────────────────────────────

  const renderEventBadge = (event: CalendarEvent): React.ReactElement => {
    let timingClass = '';
    let timeIcon = null;
    if (event.time?.toLowerCase() === 'bmo') {
      timingClass = 'border-l-amber-400/60';
      timeIcon = <Sun className="w-3 h-3 text-amber-500 flex-shrink-0" />;
    } else if (event.time?.toLowerCase() === 'amc') {
      timingClass = 'border-l-indigo-400/60';
      timeIcon = <Moon className="w-3 h-3 text-indigo-400 flex-shrink-0" />;
    }

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); handleGoToTicker(event.symbol); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleGoToTicker(event.symbol); } }}
        className={`group relative flex items-center gap-1.5 px-1.5 py-1 mb-px bg-background/70 hover:bg-muted/50 border border-border/40 border-l-2 ${timingClass} transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
      >
        {timeIcon}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[11px] leading-tight truncate">{event.symbol}</div>
          {event.name && <div className="text-[10px] text-muted-foreground truncate">{event.name}</div>}
        </div>
        {event.url && (
          <button type="button" onClick={(e) => { e.stopPropagation(); handleOpenExternal(event.url); }}
            className="p-0.5 hover:bg-primary/10 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            aria-label={`Open external earnings link for ${event.symbol}`}>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  const renderCategoryLegend = () => (
    <div className="flex flex-wrap gap-2 items-center justify-center">
      <div className="flex items-center gap-1">
        <div className="w-2.5 h-2.5 border border-border bg-info/10" />
        <span className="text-xs">Earnings</span>
      </div>
      <div className="flex items-center gap-1">
        <Sun className="w-3 h-3 text-amber-500" />
        <span className="text-xs">Before Open</span>
      </div>
      <div className="flex items-center gap-1">
        <Moon className="w-3 h-3 text-indigo-400" />
        <span className="text-xs">After Close</span>
      </div>
    </div>
  );

  const renderEarningsListItem = (event: CalendarEvent, showDate = true) => {
    const isReported = event.eps !== null;
    const isBeat = event.epsBeatPercentage && event.epsBeatPercentage > 0;
    const isMiss = event.epsBeatPercentage && event.epsBeatPercentage < 0;
    const isRevenueBeat = event.revenueBeatPercentage && event.revenueBeatPercentage > 0;
    const isRevenueMiss = event.revenueBeatPercentage && event.revenueBeatPercentage < 0;

    return (
      <div
        role="button" tabIndex={0}
        onClick={() => handleGoToTicker(event.symbol)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGoToTicker(event.symbol); } }}
        className="group relative border border-border/50 bg-background/60 px-3 py-2 hover:border-primary/30 hover:bg-muted/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="font-bold text-sm tracking-tight flex-shrink-0">{event.symbol}</div>
            {event.name && <div className="text-xs text-muted-foreground truncate">{event.name}</div>}
            <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
              {getTimeIcon(event.time)}
              <span className="hidden sm:inline">{formatTime(event.time)}</span>
            </div>
            {showDate && (
              <div className="text-xs text-muted-foreground flex-shrink-0">
                {formatDateShort(event.date)} &bull; {getDaysUntil(event.date)}
              </div>
            )}
          </div>
          {event.url && (
            <button type="button" onClick={(e) => { e.stopPropagation(); handleOpenExternal(event.url); }}
              className="flex-shrink-0 p-1 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Open external earnings link for ${event.symbol}`}>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-1.5 sm:border-t-0 sm:pt-0">
            <div className="flex items-center gap-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">EPS</div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{event.eps !== null && event.eps !== undefined ? event.eps.toFixed(2) : '\u2014'}</span>
                <span className="text-muted-foreground text-xs">/</span>
                <span className="text-muted-foreground">{event.epsEstimated !== null && event.epsEstimated !== undefined ? event.epsEstimated.toFixed(2) : '\u2014'}</span>
              </div>
            </div>
            {isReported && (
              <Badge variant={isBeat ? 'default' : isMiss ? 'destructive' : 'secondary'}
                className={`h-4 rounded-none px-1 text-[10px] ${isBeat ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : isMiss ? 'bg-red-500/15 text-red-500 border-red-500/30' : ''}`}>
                {isBeat && <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />}
                {isMiss && <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />}
                {formatPercentage(event.epsBeatPercentage ?? null)}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">REV</div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{formatCurrency(event.revenue ?? null)}</span>
                <span className="text-muted-foreground text-xs">/</span>
                <span className="text-muted-foreground">{formatCurrency(event.revenueEstimated ?? null)}</span>
              </div>
            </div>
            {isReported && event.revenueBeatPercentage !== null && (
              <Badge variant={isRevenueBeat ? 'default' : isRevenueMiss ? 'destructive' : 'secondary'}
                className={`h-4 rounded-none px-1 text-[10px] ${isRevenueBeat ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : isRevenueMiss ? 'bg-red-500/15 text-red-500 border-red-500/30' : ''}`}>
                {isRevenueBeat && <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />}
                {isRevenueMiss && <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />}
                {formatPercentage(event.revenueBeatPercentage ?? null)}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Day detail dialog (shared between monthly and weekly views) ───────────

  const renderDayDetailDialog = (dayDate: Date, dayEvents: CalendarEvent[]) => {
    const sortedEvents = [...dayEvents].sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
    const dayNum = dayDate.getDate();
    const monthIdx = dayDate.getMonth();
    const year = dayDate.getFullYear();

    return (
      <Dialog key={formatDateStr(dayDate)}>
        <DialogTrigger asChild>
          <div
            className={`h-32 border border-border/40 bg-background/40 p-1.5 ${
              dayDate.toDateString() === new Date().toDateString() ? 'bg-primary/5 ring-1 ring-primary/60' : ''
            } hover:bg-muted/30 cursor-pointer transition-colors relative`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className={`font-semibold text-sm leading-none ${dayDate.toDateString() === new Date().toDateString() ? 'text-primary' : ''}`}>{dayNum}</span>
              {sortedEvents.length > 0 && (
                <span className="border border-border/60 bg-muted/40 px-1 text-[10px] leading-4 text-muted-foreground">{sortedEvents.length}</span>
              )}
            </div>
            <div className="overflow-y-auto max-h-[calc(100%-2rem)]">
              {sortedEvents.map((event, idx) => (
                <div key={idx}>{renderEventBadge(event)}</div>
              ))}
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col rounded-none">
          <DialogHeader className="px-4 py-3 border-b border-border/50 flex-shrink-0">
            <DialogTitle className="flex items-center gap-3">
              <div className="border border-border/60 bg-muted/30 p-1.5"><Calendar className="w-4 h-4 text-primary" /></div>
              <div>
                <div className="text-base font-bold">{monthNames[monthIdx]} {dayNum}, {year}</div>
                <div className="text-xs text-muted-foreground font-normal">{sortedEvents.length} {sortedEvents.length === 1 ? 'company' : 'companies'} reporting</div>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">Earnings reports for {monthNames[monthIdx]} {dayNum}, {year}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-4" style={{ maxHeight: 'calc(85vh - 120px)' }}>
            {sortedEvents.length > 0 ? (
              <div className="space-y-2 py-3">
                {sortedEvents.map((event, idx) => {
                  const isReported = event.eps !== null;
                  const isBeat = event.epsBeatPercentage && event.epsBeatPercentage > 0;
                  const isMiss = event.epsBeatPercentage && event.epsBeatPercentage < 0;
                  const isRevenueBeat = event.revenueBeatPercentage && event.revenueBeatPercentage > 0;
                  const isRevenueMiss = event.revenueBeatPercentage && event.revenueBeatPercentage < 0;
                  return (
                    <div key={idx} role="button" tabIndex={0}
                      onClick={() => handleGoToTicker(event.symbol)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGoToTicker(event.symbol); } }}
                      className="group relative overflow-hidden border border-border/50 bg-background/60 hover:border-primary/30 hover:bg-muted/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-bold tracking-tight">{event.symbol}</div>
                          <Badge variant="outline" className="h-5 rounded-none text-[10px] flex items-center gap-1">{getTimeIcon(event.time)}{formatTime(event.time)}</Badge>
                          {isReported && (
                            <Badge className={`h-5 rounded-none text-[10px] ${isBeat ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : isMiss ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-muted'}`}>
                              {isBeat ? 'Beat' : isMiss ? 'Missed' : 'Met'}
                            </Badge>
                          )}
                        </div>
                        {event.url && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleOpenExternal(event.url); }}
                            className="p-1 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            aria-label={`Open external earnings link for ${event.symbol}`}><ExternalLink className="w-4 h-4" /></button>
                        )}
                      </div>
                      {(event.name || event.sector || event.subSector) && (
                        <div className="px-3 pb-2 space-y-1">
                          {event.name && <div className="text-xs font-medium text-muted-foreground">{event.name}</div>}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {event.sector && <span className="border border-border/40 bg-muted/40 px-1.5 py-0.5">{event.sector}</span>}
                            {event.subSector && <span className="border border-border/40 bg-muted/20 px-1.5 py-0.5">{event.subSector}</span>}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-3 py-2 border-t border-border/40">
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" />EPS Actual</div>
                          <div className={`text-sm font-bold ${isBeat ? 'text-emerald-400' : isMiss ? 'text-red-400' : ''}`}>{event.eps !== null && event.eps !== undefined ? `$${event.eps.toFixed(2)}` : '\u2014'}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><BarChart3 className="w-3 h-3" />EPS Est.</div>
                          <div className="text-sm font-bold text-muted-foreground">{event.epsEstimated !== null && event.epsEstimated !== undefined ? `$${event.epsEstimated.toFixed(2)}` : '\u2014'}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" />EPS Surprise</div>
                          <div className={`text-sm font-bold flex items-center gap-1 ${isBeat ? 'text-emerald-400' : isMiss ? 'text-red-400' : ''}`}>
                            {isReported && (isBeat ? <TrendingUp className="w-4 h-4" /> : isMiss ? <TrendingDown className="w-4 h-4" /> : null)}
                            {formatPercentage(event.epsBeatPercentage ?? null)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />Fiscal Period</div>
                          <div className="text-xs font-medium">{event.fiscalDateEnding || '\u2014'}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 px-3 py-2 border-t border-border/40">
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</div>
                          <div className={`text-sm font-bold ${isRevenueBeat ? 'text-emerald-400' : isRevenueMiss ? 'text-red-400' : ''}`}>{formatCurrency(event.revenue ?? null)}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue Est.</div>
                          <div className="text-sm font-bold text-muted-foreground">{formatCurrency(event.revenueEstimated ?? null)}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rev. Surprise</div>
                          <div className={`text-sm font-bold ${isRevenueBeat ? 'text-emerald-400' : isRevenueMiss ? 'text-red-400' : ''}`}>{formatPercentage(event.revenueBeatPercentage ?? null)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <div className="inline-flex items-center justify-center border border-border/60 bg-muted/30 p-2 mb-3"><Calendar className="w-5 h-5 text-muted-foreground" /></div>
                <div className="text-sm text-muted-foreground">No earnings scheduled for this day</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ─── Monthly calendar grid ─────────────────────────────────────────────────

  const isWeekend = (year: number, month: number, day: number): boolean => {
    const d = new Date(year, month, day);
    const dow = d.getDay();
    return dow === 0 || dow === 6;
  };

  const daysInMonth = (date: Date): number => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const startOfMonth = (date: Date): number => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    if (firstDayOfMonth === 0) return 5;
    if (firstDayOfMonth === 6) return 5;
    return firstDayOfMonth - 1;
  };

  const renderMonthlyCalendar = (): React.ReactElement[] => {
    const days: React.ReactElement[] = [];
    const totalDays = daysInMonth(currentDate);
    const startDay = startOfMonth(currentDate);

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 border border-border/40 bg-muted/10" />);
    }

    for (let day = 1; day <= totalDays; day++) {
      if (isWeekend(currentDate.getFullYear(), currentDate.getMonth(), day)) continue;

      const dateKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayEvents = events[dateKey] || [];
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

      days.push(renderDayDetailDialog(dayDate, dayEvents));
    }

    return days;
  };

  // ─── Weekly view ───────────────────────────────────────────────────────────

  const renderWeeklyView = (): React.ReactElement => {
    const { days } = weekInfo;
    return (
      <div className="grid grid-cols-5 gap-px">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
          <div key={d} className="h-7 border-b border-border/50 bg-muted/20 px-2 py-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d}</div>
        ))}
        {days.map(dayDate => {
          const dateKey = formatDateStr(dayDate);
          const dayEvents = events[dateKey] || [];
          const sortedEvents = [...dayEvents].sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
          const isToday = dayDate.toDateString() === new Date().toDateString();

          return (
            <Dialog key={dateKey}>
              <DialogTrigger asChild>
                <div className={`min-h-[13rem] border border-border/40 bg-background/40 p-1.5 ${isToday ? 'bg-primary/5 ring-1 ring-primary/60' : ''} hover:bg-muted/30 cursor-pointer transition-colors`}>
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className={`font-semibold text-sm leading-none ${isToday ? 'text-primary' : ''}`}>{dayDate.getDate()}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{monthNames[dayDate.getMonth()].slice(0, 3)}</span>
                    </div>
                    {sortedEvents.length > 0 && (
                      <span className="border border-border/60 bg-muted/40 px-1 text-[10px] leading-4 text-muted-foreground">{sortedEvents.length}</span>
                    )}
                  </div>
                  <div className="overflow-y-auto max-h-[calc(100%-2rem)]">
                    {sortedEvents.map((event, idx) => (
                      <div key={idx}>{renderEventBadge(event)}</div>
                    ))}
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col rounded-none">
                <DialogHeader className="px-4 py-3 border-b border-border/50 flex-shrink-0">
                  <DialogTitle className="flex items-center gap-3">
                    <div className="border border-border/60 bg-muted/30 p-1.5"><Calendar className="w-4 h-4 text-primary" /></div>
                    <div>
                      <div className="text-base font-bold">{monthNames[dayDate.getMonth()]} {dayDate.getDate()}, {dayDate.getFullYear()}</div>
                      <div className="text-xs text-muted-foreground font-normal">{sortedEvents.length} {sortedEvents.length === 1 ? 'company' : 'companies'} reporting</div>
                    </div>
                  </DialogTitle>
                  <DialogDescription className="sr-only">Earnings reports for {monthNames[dayDate.getMonth()]} {dayDate.getDate()}, {dayDate.getFullYear()}</DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 px-4" style={{ maxHeight: 'calc(85vh - 120px)' }}>
                  {sortedEvents.length > 0 ? (
                    <div className="space-y-2 py-3">
                      {sortedEvents.map((event, idx) => (
                        <React.Fragment key={`${event.symbol}-${idx}`}>{renderEarningsListItem(event, false)}</React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <div className="inline-flex items-center justify-center border border-border/60 bg-muted/30 p-2 mb-3"><Calendar className="w-5 h-5 text-muted-foreground" /></div>
                      <div className="text-sm text-muted-foreground">No earnings scheduled for this day</div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          );
        })}
      </div>
    );
  };

  const renderTableView = (): React.ReactElement => {
    const tableColumnCount = EARNINGS_TABLE_COLUMNS.length;

    return (
      <div className="overflow-auto max-h-[76vh] border-y border-l border-border bg-card/60 shadow-sm [&_th]:!text-xs [&_td]:!text-xs [&_th]:!px-2 [&_td]:!px-2">
        <div className="min-w-[1040px]">
          <Table>
            <TableHeader className="!border-b-0 sticky top-0 z-30 bg-background [&_th]:bg-background [&_th]:border-b [&_th]:border-border">
              <TableRow>
                {EARNINGS_TABLE_COLUMNS.map((column) => (
                  <SortableHeader
                    key={column.id}
                    column={column.id}
                    label={column.label}
                    sortColumn={tableSortColumn}
                    sortDirection={tableSortDirection}
                    onSort={handleTableSort}
                    align={column.align}
                    className={cn(
                      "border-r whitespace-nowrap text-[11px] uppercase tracking-wide text-muted-foreground",
                      column.align === 'right' && "text-right",
                    )}
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTableRows.length > 0 ? (
                filteredTableRows.map((row, idx) => {
                  const rowDate = row.reportDate || row.date || '';
                  const previousRowDate = idx > 0 ? (filteredTableRows[idx - 1].reportDate || filteredTableRows[idx - 1].date || '') : '';
                  const shouldShowDivider = idx === 0 || rowDate !== previousRowDate;
                  const isTodayDivider = rowDate === todayDateKey;
                  const reportTimeValue = row.reportTime || row.time || '';
                  const epsBeatPct = getBeatPercentage(row.epsActual ?? row.eps ?? null, row.epsEstimated ?? null);
                  const revenueBeatPct = getBeatPercentage(row.revenueActual ?? row.revenue ?? null, row.revenueEstimated ?? null);
                  const epsBeatClass = epsBeatPct !== null ? (epsBeatPct > 0 ? 'text-emerald-500' : epsBeatPct < 0 ? 'text-red-500' : 'text-muted-foreground') : 'text-muted-foreground';
                  const revenueBeatClass = revenueBeatPct !== null ? (revenueBeatPct > 0 ? 'text-emerald-500' : revenueBeatPct < 0 ? 'text-red-500' : 'text-muted-foreground') : 'text-muted-foreground';

                  return (
                    <React.Fragment key={`${row.symbol}-${row.reportDate || row.date}-${idx}`}>
                      {shouldShowDivider && (
                        <TableRow ref={isTodayDivider ? todayDividerRef : undefined}>
                          <TableCell colSpan={tableColumnCount} className={`py-2.5 px-3 text-sm font-semibold border-y ${isTodayDivider ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted/30 text-foreground border-border/40'}`}>
                            {formatDateDividerLabel(rowDate)}
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className="border-b even:bg-muted/20 hover:bg-muted/40 transition-colors">
                        <TableCell className="border-r font-medium font-mono">
                          <button
                            type="button"
                            onClick={() => handleGoToTicker(row.symbol)}
                            className="rounded-md px-1.5 py-0.5 text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors"
                          >
                            {row.symbol}
                          </button>
                        </TableCell>
                        <TableCell className="border-r font-mono">
                          <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide">
                            {getTimeIcon(reportTimeValue)}
                            {reportTimeValue || '\u2014'}
                          </span>
                        </TableCell>
                        <TableCell className="border-r font-mono whitespace-nowrap text-muted-foreground">{row.reportDate || row.date || '\u2014'}</TableCell>
                        <TableCell className="border-r font-mono whitespace-nowrap text-muted-foreground">{row.fiscalDateEnding || '\u2014'}</TableCell>
                        <TableCell className="border-r font-mono text-right tabular-nums">{row.epsActual !== null && row.epsActual !== undefined ? row.epsActual.toFixed(4) : '\u2014'}</TableCell>
                        <TableCell className="border-r font-mono text-right tabular-nums">{row.epsEstimated !== null && row.epsEstimated !== undefined ? row.epsEstimated.toFixed(4) : '\u2014'}</TableCell>
                        <TableCell className={`border-r font-mono text-right tabular-nums font-semibold ${epsBeatClass}`}>{formatPercentage(epsBeatPct)}</TableCell>
                        <TableCell className="border-r font-mono text-right tabular-nums">{formatCurrency(row.revenueActual ?? null)}</TableCell>
                        <TableCell className="border-r font-mono text-right tabular-nums">{formatCurrency(row.revenueEstimated ?? null)}</TableCell>
                        <TableCell className={`border-r font-mono text-right tabular-nums font-semibold ${revenueBeatClass}`}>{formatPercentage(revenueBeatPct)}</TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={tableColumnCount} className="py-12 text-center text-muted-foreground">
                    {searchQuery ? 'No matching earnings found' : 'No earnings data for this range'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const filterOptions: { value: FilterMode; label: string; authRequired?: boolean }[] = [
    { value: 'all', label: 'All' },
    { value: 'sp500', label: 'S&P 500' },
    { value: 'dow', label: 'Dow Jones' },
    { value: 'nasdaq100', label: 'NASDAQ 100' },
    { value: 'watchlist', label: 'My Watchlists', authRequired: true },
  ];

  const headerTitle = viewMode === 'monthly'
    ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : viewMode === 'weekly'
      ? formatWeekLabel(weekInfo.days)
      : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()} Table`;

  const persistFilters = (filters: Set<SelectableFilterMode>) => {
    try {
      localStorage.setItem(CALENDAR_FILTERS_STORAGE_KEY, JSON.stringify(Array.from(filters)));
    } catch {
      // Ignore localStorage write errors
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, mode);
    } catch {
      // Ignore localStorage write errors
    }
  };

  const toggleFilter = (filter: FilterMode) => {
    if (filter === 'all') {
      const next = new Set<SelectableFilterMode>();
      setActiveFilters(next);
      persistFilters(next);
      return;
    }

    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      persistFilters(next);
      return next;
    });
  };

  const renderFilterButtons = () => (
    <div className="flex flex-wrap items-center gap-1.5">
      {filterOptions.map(opt => {
        if (opt.authRequired && !user) return null;
        const isActive = opt.value === 'all'
          ? activeFilters.size === 0
          : activeFilters.has(opt.value as SelectableFilterMode);
        return (
          <Button
            key={opt.value}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleFilter(opt.value)}
            className={cn("h-7 rounded-none px-2 text-xs", isActive ? '' : 'text-muted-foreground')}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );

  const renderViewModeToggle = () => (
    <div className="flex items-center border border-border/60 bg-background/60 w-fit">
      <button
        type="button"
        onClick={() => handleViewModeChange('monthly')}
        className={cn(
          "inline-flex h-8 w-[86px] items-center justify-center gap-1.5 border-r border-border/50 px-2 text-xs font-medium transition-colors",
          viewMode === 'monthly' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        )}
      >
        <Calendar className="w-3.5 h-3.5" />
        Monthly
      </button>
      <button
        type="button"
        onClick={() => handleViewModeChange('weekly')}
        className={cn(
          "inline-flex h-8 w-[78px] items-center justify-center gap-1.5 border-r border-border/50 px-2 text-xs font-medium transition-colors",
          viewMode === 'weekly' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        )}
      >
        <List className="w-3.5 h-3.5" />
        Weekly
      </button>
      <button
        type="button"
        onClick={() => handleViewModeChange('table')}
        className={cn(
          "inline-flex h-8 w-[70px] items-center justify-center gap-1.5 px-2 text-xs font-medium transition-colors",
          viewMode === 'table' ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        )}
      >
        <BarChart3 className="w-3.5 h-3.5" />
        Table
      </button>
    </div>
  );

  return (
    <div className={`flex flex-col min-h-screen ${pageStyles.gradientBg}`}>
      <main className="w-full p-4 md:p-6">
        <div className="flex flex-col gap-4">
          {/* Page Header */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <div className="border border-border/60 bg-muted/30 p-1.5">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  Earnings Calendar
                </h1>
              </div>

              {/* View Mode Toggle — invisible until prefs hydrate (keeps layout, no wrong selection flash) */}
              <div
                className={cn(!prefsHydrated && 'invisible pointer-events-none')}
                aria-hidden={!prefsHydrated}
              >
                {renderViewModeToggle()}
              </div>
            </div>

            {/* Filter Buttons */}
            <div
              className={cn(!prefsHydrated && 'invisible pointer-events-none')}
              aria-hidden={!prefsHydrated}
            >
              {renderFilterButtons()}
            </div>
          </div>

          {!prefsHydrated ? (
            <div
              className="min-h-[420px] border border-border/40 bg-muted/10"
              aria-busy="true"
              aria-label="Loading calendar preferences"
            />
          ) : viewMode === 'table' ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="flex flex-col gap-1">
                  <label htmlFor="table-from" className="text-xs text-muted-foreground uppercase tracking-wide">
                    From
                  </label>
                  <Input
                    id="table-from"
                    type="date"
                    value={draftFrom}
                    onChange={(e) => {
                      setDraftFrom(e.target.value);
                      setTableRangeError(null);
                    }}
                    className="h-8 w-[160px] rounded-none bg-background/50 border-border/60 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="table-to" className="text-xs text-muted-foreground uppercase tracking-wide">
                    To
                  </label>
                  <Input
                    id="table-to"
                    type="date"
                    value={draftTo}
                    onChange={(e) => {
                      setDraftTo(e.target.value);
                      setTableRangeError(null);
                    }}
                    className="h-8 w-[160px] rounded-none bg-background/50 border-border/60 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyTableRange}
                  className="h-8 rounded-none px-3 text-xs"
                >
                  Apply
                </Button>
              </div>
              {tableRangeError ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">{tableRangeError}</p>
              ) : null}
              {renderTableView()}
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Card className="rounded-none border-border/60 bg-card/60 shadow-none">
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="border border-border/50 bg-muted/30 p-1"><Clock className="w-3.5 h-3.5 text-primary" /></div>
                      <div>
                        <div className="text-lg font-bold leading-none">{stats.totalUpcoming}</div>
                        <div className="mt-1 text-[10px] text-muted-foreground uppercase tracking-wide">Upcoming</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-none border-border/60 bg-card/60 shadow-none">
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="border border-emerald-500/30 bg-emerald-500/10 p-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /></div>
                      <div>
                        <div className="text-lg font-bold leading-none text-emerald-600 dark:text-emerald-400">{stats.beatCount}</div>
                        <div className="mt-1 text-[10px] text-muted-foreground uppercase tracking-wide">Beats</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-none border-border/60 bg-card/60 shadow-none">
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="border border-rose-500/30 bg-rose-500/10 p-1"><TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /></div>
                      <div>
                        <div className="text-lg font-bold leading-none text-rose-600 dark:text-rose-400">{stats.missCount}</div>
                        <div className="mt-1 text-[10px] text-muted-foreground uppercase tracking-wide">Misses</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-none border-border/60 bg-card/60 shadow-none">
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="border border-amber-500/30 bg-amber-500/10 p-1"><Target className="w-3.5 h-3.5 text-amber-500" /></div>
                      <div>
                        <div className="text-lg font-bold leading-none">{stats.beatRate}%</div>
                        <div className="mt-1 text-[10px] text-muted-foreground uppercase tracking-wide">Beat Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Calendar / Week Section */}
                <Card className="xl:col-span-2 rounded-none border-border/60 bg-card/60 shadow-none">
                  <CardHeader className="border-b border-border/50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <button onClick={navigateBack} className="border border-border/60 p-1.5 hover:bg-muted/50 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="text-center">
                        <CardTitle className="mb-1 flex items-center justify-center gap-2 text-base">
                          {headerTitle}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mb-2">
                          Click any day to view detailed earnings reports
                        </p>
                        {renderCategoryLegend()}
                      </div>
                      <button onClick={navigateForward} className="border border-border/60 p-1.5 hover:bg-muted/50 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2">
                    {viewMode === 'monthly' ? (
                      <div className="grid grid-cols-5 gap-px">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                          <div key={day} className="h-7 border-b border-border/50 bg-muted/20 px-2 py-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day}</div>
                        ))}
                        {renderMonthlyCalendar()}
                      </div>
                    ) : viewMode === 'weekly' ? (
                      renderWeeklyView()
                    ) : (
                      renderTableView()
                    )}
                  </CardContent>
                </Card>

                {/* Earnings List Section */}
                <Card className="flex flex-col max-h-[1000px] overflow-hidden rounded-none border-border/60 bg-card/60 shadow-none">
                  <CardHeader className="border-b border-border/50 px-3 py-2 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Earnings Reports</CardTitle>
                    </div>
                    <div className="relative mt-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input placeholder="Search by symbol..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 rounded-none pl-8 bg-background/50 border-border/60 text-sm" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 min-h-0">
                      <div className="px-3 py-2 flex-shrink-0">
                        <TabsList className="w-full grid grid-cols-2 rounded-none bg-muted/30">
                          <TabsTrigger value="upcoming" className="rounded-none text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            Upcoming ({filteredUpcomingEvents.length})
                          </TabsTrigger>
                          <TabsTrigger value="previous" className="rounded-none text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            Previous ({filteredPreviousEvents.length})
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="upcoming" className="mt-0 flex-1 min-h-0 data-[state=inactive]:hidden">
                        <div className="h-full overflow-y-auto">
                          <div className="px-3 pb-3 space-y-1.5">
                            {filteredUpcomingEvents.length > 0 ? (
                              filteredUpcomingEvents.map((event, idx) => (
                                <React.Fragment key={`${event.symbol}-${event.date}-${idx}`}>{renderEarningsListItem(event)}</React.Fragment>
                              ))
                            ) : (
                              <div className="py-10 text-center">
                                <div className="inline-flex items-center justify-center border border-border/60 bg-muted/30 p-2 mb-3"><Calendar className="w-5 h-5 text-muted-foreground" /></div>
                                <div className="text-muted-foreground text-sm">{searchQuery ? 'No matching earnings found' : 'No upcoming earnings'}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="previous" className="mt-0 flex-1 min-h-0 data-[state=inactive]:hidden">
                        <div className="h-full overflow-y-auto">
                          <div className="px-3 pb-3 space-y-1.5">
                            {filteredPreviousEvents.length > 0 ? (
                              filteredPreviousEvents.map((event, idx) => (
                                <React.Fragment key={`${event.symbol}-${event.date}-${idx}`}>{renderEarningsListItem(event)}</React.Fragment>
                              ))
                            ) : (
                              <div className="py-10 text-center">
                                <div className="inline-flex items-center justify-center border border-border/60 bg-muted/30 p-2 mb-3"><Calendar className="w-5 h-5 text-muted-foreground" /></div>
                                <div className="text-muted-foreground text-sm">{searchQuery ? 'No matching earnings found' : 'No previous earnings'}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default CalendarPage;
