"use client";
import React, { useState, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useRouter } from 'next/navigation';
import { pageStyles } from '@/components/ui/CompanyHeader';

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterMode = 'all' | 'sp500' | 'dow' | 'nasdaq100' | 'watchlist';
type ViewMode = 'monthly' | 'weekly';

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
  // Get Monday of the week containing `date`
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
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
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');

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

  // ── Compute which symbols to fetch based on active filter ──────────────────
  const indexConstituentsLoaded = !dowLoading && !spLoading && !nasdaq100Loading;

  const selectedSymbols = useMemo((): string[] | undefined => {
    // "All" = no symbol filtering at all — fetch every earning in the date range
    if (activeFilter === 'all') return undefined;

    if (activeFilter === 'watchlist') {
      return watchlistSymbols.length > 0 ? watchlistSymbols : [];
    }

    // For index-based filters, wait until constituent data is loaded
    if (!indexConstituentsLoaded) return [];

    const combined = new Set<string>();
    if (activeFilter === 'sp500') {
      spConstituents.forEach((s: string) => combined.add(s));
    }
    if (activeFilter === 'dow') {
      dowConstituents.forEach((s: string) => combined.add(s));
    }
    if (activeFilter === 'nasdaq100') {
      nasdaq100Constituents.forEach((s: string) => combined.add(s));
    }
    return Array.from(combined);
  }, [activeFilter, indexConstituentsLoaded, spConstituents, dowConstituents, nasdaq100Constituents, watchlistSymbols]);

  // ── Date range for the current view ────────────────────────────────────────
  const weekInfo = useMemo(() => getWeekRange(currentDate), [currentDate]);

  const dateRange = useMemo(() => {
    if (viewMode === 'weekly') {
      return { from: weekInfo.from, to: weekInfo.to };
    }
    return getMonthRange(currentDate);
  }, [viewMode, currentDate, weekInfo]);

  // ── Fetch earnings ─────────────────────────────────────────────────────────
  const { data: earnings } = useEarningsConfirmed(dateRange.from, dateRange.to, selectedSymbols);

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

  const events: EventsState = useMemo(() => {
    if (!earnings || earnings.length === 0) return {};

    const newEvents: EventsState = {};

    earnings.forEach(earning => {
      const dateKey = earning.date;
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
      const eventExists = newEvents[dateKey].some(e => e.symbol === earningEvent.symbol);
      if (!eventExists) newEvents[dateKey].push(earningEvent);
    });

    return newEvents;
  }, [earnings, dowDataMap, spDataMap, nasdaq100DataMap]);

  // ─── Derived data ──────────────────────────────────────────────────────────

  const allEventsSorted = useMemo(() => {
    const flatEvents: CalendarEvent[] = [];
    Object.entries(events).forEach(([date, dayEvents]) => {
      dayEvents.forEach(event => {
        flatEvents.push({ ...event, date });
      });
    });
    return flatEvents.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [events]);

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
    if (!searchQuery) return previousEvents;
    return previousEvents.filter(event =>
      event.symbol?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [previousEvents, searchQuery]);

  const filteredUpcomingEvents = useMemo(() => {
    if (!searchQuery) return upcomingEvents;
    return upcomingEvents.filter(event =>
      event.symbol?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [upcomingEvents, searchQuery]);

  const stats = useMemo(() => {
    const reported = previousEvents.filter(e => e.eps !== null);
    const beats = reported.filter(e => e.epsBeatPercentage && e.epsBeatPercentage > 0);
    const misses = reported.filter(e => e.epsBeatPercentage && e.epsBeatPercentage < 0);
    return {
      totalUpcoming: upcomingEvents.length,
      beatRate: reported.length > 0 ? (beats.length / reported.length * 100).toFixed(0) : '0',
      missCount: misses.length,
      beatCount: beats.length,
    };
  }, [previousEvents, upcomingEvents]);

  // ─── Navigation ────────────────────────────────────────────────────────────

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const navigateBack = () => {
    if (viewMode === 'monthly') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    }
  };

  const navigateForward = () => {
    if (viewMode === 'monthly') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    }
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
        className={`group relative flex items-center gap-1.5 p-2 mb-1 rounded-lg bg-card/80 hover:bg-card border border-border/50 hover:border-primary/30 hover:shadow-sm border-l-2 ${timingClass} transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        {timeIcon}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-xs truncate">{event.symbol}</div>
          {event.name && <div className="text-[10px] text-muted-foreground truncate">{event.name}</div>}
        </div>
        {event.url && (
          <button type="button" onClick={(e) => { e.stopPropagation(); handleOpenExternal(event.url); }}
            className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            aria-label={`Open external earnings link for ${event.symbol}`}>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  const renderCategoryLegend = () => (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm bg-info/10" />
        <span className="text-xs">Earnings</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Sun className="w-3 h-3 text-amber-500" />
        <span className="text-xs">Before Open</span>
      </div>
      <div className="flex items-center gap-1.5">
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
        className="group relative p-3 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-accent/30 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="font-bold text-base tracking-tight flex-shrink-0">{event.symbol}</div>
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
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Open external earnings link for ${event.symbol}`}>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">EPS</div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-semibold">{event.eps !== null && event.eps !== undefined ? event.eps.toFixed(2) : '\u2014'}</span>
                <span className="text-muted-foreground text-xs">/</span>
                <span className="text-muted-foreground">{event.epsEstimated !== null && event.epsEstimated !== undefined ? event.epsEstimated.toFixed(2) : '\u2014'}</span>
              </div>
            </div>
            {isReported && (
              <Badge variant={isBeat ? 'default' : isMiss ? 'destructive' : 'secondary'}
                className={`text-[10px] h-5 ${isBeat ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : isMiss ? 'bg-red-500/20 text-red-500 border-red-500/30' : ''}`}>
                {isBeat && <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />}
                {isMiss && <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />}
                {formatPercentage(event.epsBeatPercentage ?? null)}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">REV</div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-semibold">{formatCurrency(event.revenue ?? null)}</span>
                <span className="text-muted-foreground text-xs">/</span>
                <span className="text-muted-foreground">{formatCurrency(event.revenueEstimated ?? null)}</span>
              </div>
            </div>
            {isReported && event.revenueBeatPercentage !== null && (
              <Badge variant={isRevenueBeat ? 'default' : isRevenueMiss ? 'destructive' : 'secondary'}
                className={`text-[10px] h-5 ${isRevenueBeat ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : isRevenueMiss ? 'bg-red-500/20 text-red-500 border-red-500/30' : ''}`}>
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
            className={`h-36 p-2 border border-border/40 ${
              dayDate.toDateString() === new Date().toDateString() ? 'bg-accent/10 ring-1 ring-primary' : ''
            } hover:bg-muted/30 cursor-pointer transition-colors relative`}
          >
            <div className="flex justify-between items-start mb-1.5">
              <span className={`font-semibold text-lg ${dayDate.toDateString() === new Date().toDateString() ? 'text-primary' : ''}`}>{dayNum}</span>
              {sortedEvents.length > 0 && (
                <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-full">{sortedEvents.length}</span>
              )}
            </div>
            <div className="overflow-y-auto max-h-[calc(100%-2rem)]">
              {sortedEvents.map((event, idx) => (
                <div key={idx}>{renderEventBadge(event)}</div>
              ))}
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 pt-6 px-6 border-b border-border/50 flex-shrink-0">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10"><Calendar className="w-5 h-5 text-primary" /></div>
              <div>
                <div className="text-xl font-bold">{monthNames[monthIdx]} {dayNum}, {year}</div>
                <div className="text-sm text-muted-foreground font-normal">{sortedEvents.length} {sortedEvents.length === 1 ? 'company' : 'companies'} reporting</div>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">Earnings reports for {monthNames[monthIdx]} {dayNum}, {year}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-6" style={{ maxHeight: 'calc(85vh - 140px)' }}>
            {sortedEvents.length > 0 ? (
              <div className="space-y-3 py-4">
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
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 hover:border-primary/30 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <div className="flex items-center justify-between p-4 pb-2">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold tracking-tight">{event.symbol}</div>
                          <Badge variant="outline" className="text-xs flex items-center gap-1">{getTimeIcon(event.time)}{formatTime(event.time)}</Badge>
                          {isReported && (
                            <Badge className={`text-xs ${isBeat ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : isMiss ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-muted'}`}>
                              {isBeat ? 'Beat' : isMiss ? 'Missed' : 'Met'}
                            </Badge>
                          )}
                        </div>
                        {event.url && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleOpenExternal(event.url); }}
                            className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            aria-label={`Open external earnings link for ${event.symbol}`}><ExternalLink className="w-4 h-4" /></button>
                        )}
                      </div>
                      {(event.name || event.sector || event.subSector) && (
                        <div className="px-4 pb-3 space-y-1">
                          {event.name && <div className="text-sm font-medium text-muted-foreground">{event.name}</div>}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {event.sector && <span className="px-2 py-0.5 rounded-md bg-muted/50">{event.sector}</span>}
                            {event.subSector && <span className="px-2 py-0.5 rounded-md bg-muted/30">{event.subSector}</span>}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 pt-0">
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" />EPS Actual</div>
                          <div className={`text-lg font-bold ${isBeat ? 'text-emerald-400' : isMiss ? 'text-red-400' : ''}`}>{event.eps !== null && event.eps !== undefined ? `$${event.eps.toFixed(2)}` : '\u2014'}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><BarChart3 className="w-3 h-3" />EPS Est.</div>
                          <div className="text-lg font-bold text-muted-foreground">{event.epsEstimated !== null && event.epsEstimated !== undefined ? `$${event.epsEstimated.toFixed(2)}` : '\u2014'}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" />EPS Surprise</div>
                          <div className={`text-lg font-bold flex items-center gap-1 ${isBeat ? 'text-emerald-400' : isMiss ? 'text-red-400' : ''}`}>
                            {isReported && (isBeat ? <TrendingUp className="w-4 h-4" /> : isMiss ? <TrendingDown className="w-4 h-4" /> : null)}
                            {formatPercentage(event.epsBeatPercentage ?? null)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />Fiscal Period</div>
                          <div className="text-sm font-medium">{event.fiscalDateEnding || '\u2014'}</div>
                        </div>
                      </div>
                      <div className="border-t border-border/30 mx-4" />
                      <div className="grid grid-cols-3 gap-4 p-4 pt-3">
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</div>
                          <div className={`text-base font-bold ${isRevenueBeat ? 'text-emerald-400' : isRevenueMiss ? 'text-red-400' : ''}`}>{formatCurrency(event.revenue ?? null)}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue Est.</div>
                          <div className="text-base font-bold text-muted-foreground">{formatCurrency(event.revenueEstimated ?? null)}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rev. Surprise</div>
                          <div className={`text-base font-bold ${isRevenueBeat ? 'text-emerald-400' : isRevenueMiss ? 'text-red-400' : ''}`}>{formatPercentage(event.revenueBeatPercentage ?? null)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4"><Calendar className="w-8 h-8 text-muted-foreground" /></div>
                <div className="text-muted-foreground">No earnings scheduled for this day</div>
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
      days.push(<div key={`empty-${i}`} className="h-36 border border-border/40" />);
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
          <div key={d} className="h-8 p-2 font-semibold text-center text-sm text-muted-foreground border-b border-border/40">{d}</div>
        ))}
        {days.map(dayDate => {
          const dateKey = formatDateStr(dayDate);
          const dayEvents = events[dateKey] || [];
          const sortedEvents = [...dayEvents].sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
          const isToday = dayDate.toDateString() === new Date().toDateString();

          return (
            <Dialog key={dateKey}>
              <DialogTrigger asChild>
                <div className={`min-h-[16rem] p-2 border border-border/40 ${isToday ? 'bg-accent/10 ring-1 ring-primary' : ''} hover:bg-muted/30 cursor-pointer transition-colors`}>
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <span className={`font-semibold text-lg ${isToday ? 'text-primary' : ''}`}>{dayDate.getDate()}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{monthNames[dayDate.getMonth()].slice(0, 3)}</span>
                    </div>
                    {sortedEvents.length > 0 && (
                      <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-full">{sortedEvents.length}</span>
                    )}
                  </div>
                  <div className="overflow-y-auto max-h-[calc(100%-2rem)]">
                    {sortedEvents.map((event, idx) => (
                      <div key={idx}>{renderEventBadge(event)}</div>
                    ))}
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
                <DialogHeader className="pb-4 pt-6 px-6 border-b border-border/50 flex-shrink-0">
                  <DialogTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10"><Calendar className="w-5 h-5 text-primary" /></div>
                    <div>
                      <div className="text-xl font-bold">{monthNames[dayDate.getMonth()]} {dayDate.getDate()}, {dayDate.getFullYear()}</div>
                      <div className="text-sm text-muted-foreground font-normal">{sortedEvents.length} {sortedEvents.length === 1 ? 'company' : 'companies'} reporting</div>
                    </div>
                  </DialogTitle>
                  <DialogDescription className="sr-only">Earnings reports for {monthNames[dayDate.getMonth()]} {dayDate.getDate()}, {dayDate.getFullYear()}</DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 px-6" style={{ maxHeight: 'calc(85vh - 140px)' }}>
                  {sortedEvents.length > 0 ? (
                    <div className="space-y-3 py-4">
                      {sortedEvents.map((event, idx) => (
                        <React.Fragment key={`${event.symbol}-${idx}`}>{renderEarningsListItem(event, false)}</React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4"><Calendar className="w-8 h-8 text-muted-foreground" /></div>
                      <div className="text-muted-foreground">No earnings scheduled for this day</div>
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
    : formatWeekLabel(weekInfo.days);

  return (
    <div className={`flex flex-col min-h-screen ${pageStyles.gradientBg}`}>
      <main className="w-full p-4 md:p-6">
        <div className="flex flex-col gap-6">
          {/* Page Header */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Calendar className="w-7 h-7 text-primary" />
                  </div>
                  Earnings Calendar
                </h1>
                <p className="text-muted-foreground mt-1">
                  Click on a day to view detailed earnings reports for that day. Click on a company to redirect to the company profile.
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 border border-border/50">
                <Button
                  variant={viewMode === 'monthly' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('monthly')}
                  className="gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Monthly
                </Button>
                <Button
                  variant={viewMode === 'weekly' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('weekly')}
                  className="gap-1.5"
                >
                  <List className="w-3.5 h-3.5" />
                  Weekly
                </Button>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {filterOptions.map(opt => {
                if (opt.authRequired && !user) return null;
                const isActive = activeFilter === opt.value;
                return (
                  <Button
                    key={opt.value}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter(opt.value)}
                    className={isActive ? '' : 'text-muted-foreground'}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={pageStyles.card}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10"><Clock className="w-5 h-5 text-primary" /></div>
                  <div>
                    <div className="text-2xl font-bold">{stats.totalUpcoming}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Upcoming</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={pageStyles.card}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10"><TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.beatCount}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Beats</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={pageStyles.card}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/10"><TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" /></div>
                  <div>
                    <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.missCount}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Misses</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={pageStyles.card}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10"><Target className="w-5 h-5 text-amber-500" /></div>
                  <div>
                    <div className="text-2xl font-bold">{stats.beatRate}%</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Beat Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Calendar / Week Section */}
            <Card className={`xl:col-span-2 ${pageStyles.card}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <button onClick={navigateBack} className="p-2 hover:bg-muted/50 rounded-xl transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-center">
                    <CardTitle className="mb-1 flex items-center justify-center gap-2 text-xl">
                      {headerTitle}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mb-3">
                      Click any day to view detailed earnings reports
                    </p>
                    {renderCategoryLegend()}
                  </div>
                  <button onClick={navigateForward} className="p-2 hover:bg-muted/50 rounded-xl transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="px-2 pt-0">
                {viewMode === 'monthly' ? (
                  <div className="grid grid-cols-5 gap-px">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                      <div key={day} className="h-8 p-2 font-semibold text-center text-sm text-muted-foreground border-b border-border/40">{day}</div>
                    ))}
                    {renderMonthlyCalendar()}
                  </div>
                ) : (
                  renderWeeklyView()
                )}
              </CardContent>
            </Card>

            {/* Earnings List Section */}
            <Card className={`${pageStyles.card} flex flex-col max-h-[1000px] overflow-hidden`}>
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Earnings Reports</CardTitle>
                </div>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search by symbol..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-muted/30 border-border/50" />
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 min-h-0">
                  <div className="px-4 flex-shrink-0">
                    <TabsList className="w-full grid grid-cols-2 bg-muted/30">
                      <TabsTrigger value="upcoming" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Upcoming ({filteredUpcomingEvents.length})
                      </TabsTrigger>
                      <TabsTrigger value="previous" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Previous ({filteredPreviousEvents.length})
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="upcoming" className="mt-0 flex-1 min-h-0 data-[state=inactive]:hidden">
                    <div className="h-full overflow-y-auto">
                      <div className="p-4 space-y-2">
                        {filteredUpcomingEvents.length > 0 ? (
                          filteredUpcomingEvents.map((event, idx) => (
                            <React.Fragment key={`${event.symbol}-${event.date}-${idx}`}>{renderEarningsListItem(event)}</React.Fragment>
                          ))
                        ) : (
                          <div className="py-12 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted/50 mb-3"><Calendar className="w-6 h-6 text-muted-foreground" /></div>
                            <div className="text-muted-foreground text-sm">{searchQuery ? 'No matching earnings found' : 'No upcoming earnings'}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="previous" className="mt-0 flex-1 min-h-0 data-[state=inactive]:hidden">
                    <div className="h-full overflow-y-auto">
                      <div className="p-4 space-y-2">
                        {filteredPreviousEvents.length > 0 ? (
                          filteredPreviousEvents.map((event, idx) => (
                            <React.Fragment key={`${event.symbol}-${event.date}-${idx}`}>{renderEarningsListItem(event)}</React.Fragment>
                          ))
                        ) : (
                          <div className="py-12 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted/50 mb-3"><Calendar className="w-6 h-6 text-muted-foreground" /></div>
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
        </div>
      </main>
    </div>
  );
};

export default CalendarPage;
