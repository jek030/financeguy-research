"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, TrendingUp, TrendingDown, ExternalLink, Sparkles, BarChart3, Target, ArrowUpRight, ArrowDownRight, Search, Sun, Moon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { useEarningsConfirmed } from '@/hooks/FMP/useEarningsConfirmed';
import { useDowJonesConstituents } from '@/hooks/FMP/useDowJonesConstituents';
import { useSP500Constituents } from '@/hooks/FMP/useSP500Constituents';
import { useNasdaqConstituents } from '@/hooks/FMP/useNasdaqConstituents';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { useRouter } from 'next/navigation';
import { pageStyles } from '@/components/ui/CompanyHeader';

interface EventCategory {
  name: string;
  color: string;
}

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

const CalendarPage: React.FC = () => {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<EventsState>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('previous');
  const [showNasdaq, setShowNasdaq] = useState<boolean>(true);
  const [showSP500, setShowSP500] = useState<boolean>(true);
  const [showDow, setShowDow] = useState<boolean>(true);
  const [eventCategories] = useState<Record<string, EventCategory>>({
    earnings: { name: 'Earnings', color: 'bg-info/10 text-primary' },
  });
  
  // Fetch constituent data first (these are cached for 24h)
  const { data: dowData, isLoading: dowLoading } = useDowJonesConstituents();
  const { data: spData, isLoading: spLoading } = useSP500Constituents();
  const { data: nasdaqData, isLoading: nasdaqLoading } = useNasdaqConstituents();
  
  const dowConstituents = useMemo(() => dowData?.symbols || new Set<string>(), [dowData?.symbols]);
  const spConstituents = useMemo(() => spData?.symbols || new Set<string>(), [spData?.symbols]);
  const nasdaqConstituents = useMemo(() => nasdaqData?.symbols || new Set<string>(), [nasdaqData?.symbols]);
  
  const dowDataMap = useMemo(() => dowData?.dataMap || new Map(), [dowData?.dataMap]);
  const spDataMap = useMemo(() => spData?.dataMap || new Map(), [spData?.dataMap]);
  const nasdaqDataMap = useMemo(() => nasdaqData?.dataMap || new Map(), [nasdaqData?.dataMap]);

  // Combine ALL constituent symbols for server-side filtering (always include all, toggle filtering is client-side)
  const constituentsLoaded = !dowLoading && !spLoading && !nasdaqLoading;
  const allConstituentSymbols = useMemo(() => {
    if (!constituentsLoaded) return []; // Empty array = query disabled (waits for constituents)
    const combined = new Set<string>();
    spConstituents.forEach((s: string) => combined.add(s));
    dowConstituents.forEach((s: string) => combined.add(s));
    nasdaqConstituents.forEach((s: string) => combined.add(s));
    return Array.from(combined);
  }, [spConstituents, dowConstituents, nasdaqConstituents, constituentsLoaded]);

  // Fetch earnings data filtered to only constituent symbols (dependent query - waits for constituents)
  const { data: earnings = [] } = useEarningsConfirmed(currentDate, allConstituentSymbols);

  // Format the time string
  const formatTime = (time: string | undefined): string => {
    if (!time) return 'TBD';
    
    switch (time.toLowerCase()) {
      case 'amc':
        return 'After Close';
      case 'bmo':
        return 'Before Open';
      default:
        return time;
    }
  };

  // Get time icon
  const getTimeIcon = (time: string | undefined) => {
    if (!time) return <Clock className="w-3.5 h-3.5" />;
    switch (time.toLowerCase()) {
      case 'bmo':
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
      case 'amc':
        return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Clock className="w-3.5 h-3.5" />;
    }
  };

  // Handle earnings data - data is already filtered to constituent symbols server-side
  useEffect(() => {
    if (earnings && earnings.length > 0) {
      const newEvents: EventsState = {};
      
      earnings.forEach(earning => {
        const dateKey = earning.date;
        const earningTime = formatTime(earning.time);
        
        // Calculate beat percentages
        let epsBeatPercentage = null;
        let revenueBeatPercentage = null;
        
        if (earning.eps !== null && earning.epsEstimated !== null && earning.epsEstimated !== 0) {
          epsBeatPercentage = ((earning.eps - earning.epsEstimated) / Math.abs(earning.epsEstimated)) * 100;
        }
        
        if (earning.revenue !== null && earning.revenueEstimated !== null && earning.revenueEstimated !== 0) {
          revenueBeatPercentage = ((earning.revenue - earning.revenueEstimated) / Math.abs(earning.revenueEstimated)) * 100;
        }
        
        // Get constituent data for display (name, sector, etc.)
        const constituentData = dowDataMap.get(earning.symbol) || spDataMap.get(earning.symbol) || nasdaqDataMap.get(earning.symbol);
        
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
          subSector: constituentData?.subSector
        };

        if (!newEvents[dateKey]) {
          newEvents[dateKey] = [];
        }
        
        // Check if event already exists to avoid duplicates
        const eventExists = newEvents[dateKey].some(
          event => event.symbol === earningEvent.symbol
        );
        
        if (!eventExists) {
          newEvents[dateKey].push(earningEvent);
        }
      });

      setEvents(newEvents);
    } else {
      setEvents({});
    }
  }, [earnings, dowDataMap, spDataMap, nasdaqDataMap]);

  // Get all events as a flat sorted array with index filtering
  const allEventsSorted = useMemo(() => {
    const flatEvents: CalendarEvent[] = [];
    Object.entries(events).forEach(([date, dayEvents]) => {
      dayEvents.forEach(event => {
        // Filter by selected indices
        const isDow = dowConstituents.has(event.symbol || '');
        const isSP500 = spConstituents.has(event.symbol || '');
        const isNasdaq = nasdaqConstituents.has(event.symbol || '');
        
        const shouldInclude = 
          (isDow && showDow) || 
          (isSP500 && showSP500) || 
          (isNasdaq && showNasdaq);
        
        if (shouldInclude) {
          flatEvents.push({ ...event, date });
        }
      });
    });
    return flatEvents.sort((a, b) => {
      const dateA = new Date(a.date || '');
      const dateB = new Date(b.date || '');
      return dateA.getTime() - dateB.getTime();
    });
  }, [events, showDow, showSP500, showNasdaq, dowConstituents, spConstituents, nasdaqConstituents]);

  // Split events into previous and upcoming
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  
  const previousEvents = useMemo(() => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    return allEventsSorted.filter(event => {
      const eventDate = new Date(event.date || '');
      const eventMonth = eventDate.getMonth();
      const eventYear = eventDate.getFullYear();
      
      // Only include events from the current calendar month that are before today
      return eventYear === currentYear && 
             eventMonth === currentMonth && 
             eventDate < today;
    }); // Ascending order (earliest to latest)
  }, [allEventsSorted, today, currentDate]);

  const upcomingEvents = useMemo(() => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    return allEventsSorted.filter(event => {
      const eventDate = new Date(event.date || '');
      const eventMonth = eventDate.getMonth();
      const eventYear = eventDate.getFullYear();
      
      // Only include events from the current calendar month that are today or later
      return eventYear === currentYear && 
             eventMonth === currentMonth && 
             eventDate >= today;
    });
  }, [allEventsSorted, today, currentDate]);

  // Filter events based on search
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

  // Stats calculations
  const stats = useMemo(() => {
    const reported = previousEvents.filter(e => e.eps !== null);
    const beats = reported.filter(e => e.epsBeatPercentage && e.epsBeatPercentage > 0);
    const misses = reported.filter(e => e.epsBeatPercentage && e.epsBeatPercentage < 0);
    
    return {
      totalUpcoming: upcomingEvents.length,
      totalReported: reported.length,
      beatRate: reported.length > 0 ? (beats.length / reported.length * 100).toFixed(0) : '0',
      avgBeat: beats.length > 0 
        ? (beats.reduce((sum, e) => sum + (e.epsBeatPercentage || 0), 0) / beats.length).toFixed(1)
        : '0',
      missCount: misses.length,
      beatCount: beats.length
    };
  }, [previousEvents, upcomingEvents]);


  const daysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  
  const startOfMonth = (date: Date): number => {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    // If it's Sunday (0), adjust to 5 (after Friday)
    // If it's Saturday (6), adjust to 5 (after Friday)
    // For Mon-Fri (1-5), subtract 1 to make Monday the first column (0)
    if (firstDayOfMonth === 0) return 5; // Sunday after Friday
    if (firstDayOfMonth === 6) return 5; // Saturday after Friday
    return firstDayOfMonth - 1; // Mon-Fri shifted to 0-4
  };
  
  const monthNames: string[] = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const previousMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };
  
  const nextMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleGoToTicker = (symbol: string | undefined) => {
    if (!symbol) return;
    router.push(`/search/${symbol}`);
  };

  const handleOpenExternal = (url: string | undefined) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderEventBadge = (event: CalendarEvent): React.ReactElement => {
    // Create a specific class based on earnings time
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
        onClick={(e) => {
          e.stopPropagation();
          handleGoToTicker(event.symbol);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            handleGoToTicker(event.symbol);
          }
        }}
        className={`group relative flex items-center gap-1.5 p-2 mb-1 rounded-lg bg-card/80 hover:bg-card border border-border/50 hover:border-primary/30 hover:shadow-sm border-l-2 ${timingClass} transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        {timeIcon}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-xs truncate">{event.symbol}</div>
          {event.name && (
            <div className="text-[10px] text-muted-foreground truncate">{event.name}</div>
          )}
        </div>
        {event.url && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenExternal(event.url);
            }}
            className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            aria-label={`Open external earnings link for ${event.symbol}`}
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  const CategoryLegend: React.FC = () => (
    <div className="flex flex-wrap gap-3 items-center">
      {Object.entries(eventCategories).map(([key, category]) => (
        <div key={key} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded-sm ${category.color.split(' ')[0]}`} />
          <span className="text-xs">{category.name}</span>
        </div>
      ))}
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

  const formatCurrency = (amount: number | null): string => {
    if (amount === null) return 'N/A';
    
    // Handle large numbers more readably
    if (Math.abs(amount) >= 1_000_000_000) {
      return `$${(amount / 1_000_000_000).toFixed(2)}B`;
    } else if (Math.abs(amount) >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(2)}M`;
    } else if (Math.abs(amount) >= 1_000) {
      return `$${(amount / 1_000).toFixed(2)}K`;
    }
    
    return `$${amount.toFixed(2)}`;
  };

  const formatPercentage = (percentage: number | null): string => {
    if (percentage === null) return 'N/A';
    return `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const formatDateShort = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getDaysUntil = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const eventDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    return `In ${diffDays} days`;
  };

  // Earnings list item component
  const EarningsListItem: React.FC<{ event: CalendarEvent; showDate?: boolean }> = ({ event, showDate = true }) => {
    const isReported = event.eps !== null;
    const isBeat = event.epsBeatPercentage && event.epsBeatPercentage > 0;
    const isMiss = event.epsBeatPercentage && event.epsBeatPercentage < 0;
    const isRevenueBeat = event.revenueBeatPercentage && event.revenueBeatPercentage > 0;
    const isRevenueMiss = event.revenueBeatPercentage && event.revenueBeatPercentage < 0;
    
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => handleGoToTicker(event.symbol)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleGoToTicker(event.symbol);
          }
        }}
        className="group relative p-3 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-accent/30 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Header: Symbol, Name, Time, Date, Link */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="font-bold text-base tracking-tight flex-shrink-0">{event.symbol}</div>
            {event.name && (
              <div className="text-xs text-muted-foreground truncate">{event.name}</div>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
              {getTimeIcon(event.time)}
              <span className="hidden sm:inline">{formatTime(event.time)}</span>
            </div>
            {showDate && (
              <div className="text-xs text-muted-foreground flex-shrink-0">
                {formatDateShort(event.date)} • {getDaysUntil(event.date)}
              </div>
            )}
          </div>
          {event.url && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenExternal(event.url);
              }}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Open external earnings link for ${event.symbol}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="space-y-2">
          {/* EPS Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">EPS</div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-semibold">{event.eps !== null && event.eps !== undefined ? event.eps.toFixed(2) : '—'}</span>
                <span className="text-muted-foreground text-xs">/</span>
                <span className="text-muted-foreground">{event.epsEstimated !== null && event.epsEstimated !== undefined ? event.epsEstimated.toFixed(2) : '—'}</span>
              </div>
            </div>
            {isReported && (
              <Badge 
                variant={isBeat ? "default" : isMiss ? "destructive" : "secondary"}
                className={`text-[10px] h-5 ${isBeat ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : isMiss ? 'bg-red-500/20 text-red-500 border-red-500/30' : ''}`}
              >
                {isBeat && <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />}
                {isMiss && <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />}
                {formatPercentage(event.epsBeatPercentage ?? null)}
              </Badge>
            )}
          </div>

          {/* Revenue Row */}
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
              <Badge 
                variant={isRevenueBeat ? "default" : isRevenueMiss ? "destructive" : "secondary"}
                className={`text-[10px] h-5 ${isRevenueBeat ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : isRevenueMiss ? 'bg-red-500/20 text-red-500 border-red-500/30' : ''}`}
              >
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

  // Helper function to check if a date is a weekend
  const isWeekend = (year: number, month: number, day: number): boolean => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 is Sunday, 6 is Saturday
  };

  const renderCalendar = (): React.ReactElement[] => {
    const days: React.ReactElement[] = [];
    const totalDays = daysInMonth(currentDate);
    const startDay = startOfMonth(currentDate);
    
    // Add empty cells for days before the start of the month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-36 border border-border/40" />);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= totalDays; day++) {
      // Skip weekends
      if (isWeekend(currentDate.getFullYear(), currentDate.getMonth(), day)) {
        continue;
      }
      
      const dateKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayEvents = events[dateKey] || [];
      
      // Filter events based on selected indices
      const filteredDayEvents = dayEvents.filter(event => {
        const isDow = dowConstituents.has(event.symbol || '');
        const isSP500 = spConstituents.has(event.symbol || '');
        const isNasdaq = nasdaqConstituents.has(event.symbol || '');
        
        return (isDow && showDow) || (isSP500 && showSP500) || (isNasdaq && showNasdaq);
      });
      
      // Sort events by symbol alphabetically
      const sortedEvents = [...filteredDayEvents].sort((a, b) => 
        (a.symbol || '').localeCompare(b.symbol || '')
      );
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      
      days.push(
        <Dialog key={day}>
          <DialogTrigger asChild>
            <div
              className={`h-36 p-2 border border-border/40 ${
                isToday ? 'bg-accent/10 ring-1 ring-primary' : ''
              } hover:bg-muted/30 cursor-pointer transition-colors relative`}
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className={`font-semibold text-lg ${isToday ? 'text-primary' : ''}`}>{day}</span>
                {sortedEvents.length > 0 && (
                  <span className="bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {sortedEvents.length}
                  </span>
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
                 <div className="p-2 rounded-xl bg-primary/10">
                   <Calendar className="w-5 h-5 text-primary" />
                 </div>
                 <div>
                   <div className="text-xl font-bold">
                     {monthNames[currentDate.getMonth()]} {day}, {currentDate.getFullYear()}
                   </div>
                   <div className="text-sm text-muted-foreground font-normal">
                     {sortedEvents.length} {sortedEvents.length === 1 ? 'company' : 'companies'} reporting
                   </div>
                 </div>
               </DialogTitle>
               <DialogDescription className="sr-only">
                 Earnings reports for {monthNames[currentDate.getMonth()]} {day}, {currentDate.getFullYear()}
               </DialogDescription>
             </DialogHeader>
             
             <div className="overflow-y-auto flex-1 px-6" style={{ maxHeight: 'calc(85vh - 140px)' }}>
               {sortedEvents.length > 0 ? (
                 <div className="space-y-3 py-4">
                  {sortedEvents.map((event, idx) => {
                    // Determine beat/miss status
                    const isReported = event.eps !== null;
                    const isBeat = event.epsBeatPercentage && event.epsBeatPercentage > 0;
                    const isMiss = event.epsBeatPercentage && event.epsBeatPercentage < 0;
                    const isRevenueBeat = event.revenueBeatPercentage && event.revenueBeatPercentage > 0;
                    const isRevenueMiss = event.revenueBeatPercentage && event.revenueBeatPercentage < 0;
                    
                    return (
                      <div 
                        key={idx} 
                        role="button"
                        tabIndex={0}
                        onClick={() => handleGoToTicker(event.symbol)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleGoToTicker(event.symbol);
                          }
                        }}
                        className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card to-card/50 border border-border/50 hover:border-primary/30 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 pb-2">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl font-bold tracking-tight">{event.symbol}</div>
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              {getTimeIcon(event.time)}
                              {formatTime(event.time)}
                            </Badge>
                            {isReported && (
                              <Badge 
                                className={`text-xs ${isBeat ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : isMiss ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-muted'}`}
                              >
                                {isBeat ? 'Beat' : isMiss ? 'Missed' : 'Met'}
                              </Badge>
                            )}
                          </div>
                          {event.url && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenExternal(event.url);
                              }}
                              className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              aria-label={`Open external earnings link for ${event.symbol}`}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        {/* Company Info */}
                        {(event.name || event.sector || event.subSector) && (
                          <div className="px-4 pb-3 space-y-1">
                            {event.name && (
                              <div className="text-sm font-medium text-muted-foreground">{event.name}</div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {event.sector && (
                                <span className="px-2 py-0.5 rounded-md bg-muted/50">{event.sector}</span>
                              )}
                              {event.subSector && (
                                <span className="px-2 py-0.5 rounded-md bg-muted/30">{event.subSector}</span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 pt-0">
                          {/* EPS Actual */}
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              EPS Actual
                            </div>
                            <div className={`text-lg font-bold ${isBeat ? 'text-emerald-400' : isMiss ? 'text-red-400' : ''}`}>
                              {event.eps !== null && event.eps !== undefined ? `$${event.eps.toFixed(2)}` : '—'}
                            </div>
                          </div>
                          
                          {/* EPS Estimated */}
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <BarChart3 className="w-3 h-3" />
                              EPS Est.
                            </div>
                            <div className="text-lg font-bold text-muted-foreground">
                              {event.epsEstimated !== null && event.epsEstimated !== undefined ? `$${event.epsEstimated.toFixed(2)}` : '—'}
                            </div>
                          </div>
                          
                          {/* EPS Surprise */}
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              EPS Surprise
                            </div>
                            <div className={`text-lg font-bold flex items-center gap-1 ${isBeat ? 'text-emerald-400' : isMiss ? 'text-red-400' : ''}`}>
                              {isReported && (isBeat ? <TrendingUp className="w-4 h-4" /> : isMiss ? <TrendingDown className="w-4 h-4" /> : null)}
                              {formatPercentage(event.epsBeatPercentage ?? null)}
                            </div>
                          </div>
                          
                          {/* Fiscal Period */}
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Fiscal Period
                            </div>
                            <div className="text-sm font-medium">
                              {event.fiscalDateEnding || '—'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Revenue Section */}
                        <div className="border-t border-border/30 mx-4" />
                        <div className="grid grid-cols-3 gap-4 p-4 pt-3">
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</div>
                            <div className={`text-base font-bold ${isRevenueBeat ? 'text-emerald-400' : isRevenueMiss ? 'text-red-400' : ''}`}>
                              {formatCurrency(event.revenue ?? null)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue Est.</div>
                            <div className="text-base font-bold text-muted-foreground">
                              {formatCurrency(event.revenueEstimated ?? null)}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rev. Surprise</div>
                            <div className={`text-base font-bold ${isRevenueBeat ? 'text-emerald-400' : isRevenueMiss ? 'text-red-400' : ''}`}>
                              {formatPercentage(event.revenueBeatPercentage ?? null)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                   </div>
                 ) : (
                   <div className="py-12 text-center">
                     <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
                       <Calendar className="w-8 h-8 text-muted-foreground" />
                     </div>
                     <div className="text-muted-foreground">No earnings scheduled for this day</div>
                   </div>
                 )}
             </div>
           </DialogContent>
        </Dialog>
      );
    }
    
    return days;
  };


  return (
    <div className={`flex flex-col min-h-screen ${pageStyles.gradientBg}`}>
      <main className="w-full p-4 md:p-6">
        <div className="flex flex-col gap-6">
          {/* Page Header */}
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
            
            {/* Index Filter Switches */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="sp500-toggle"
                  checked={showSP500}
                  onCheckedChange={setShowSP500}
                />
                <Label
                  htmlFor="sp500-toggle"
                  className="text-sm font-medium cursor-pointer"
                >
                  S&P 500
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="dow-toggle"
                  checked={showDow}
                  onCheckedChange={setShowDow}
                />
                <Label
                  htmlFor="dow-toggle"
                  className="text-sm font-medium cursor-pointer"
                >
                  Dow Jones
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="nasdaq-toggle"
                  checked={showNasdaq}
                  onCheckedChange={setShowNasdaq}
                />
                <Label
                  htmlFor="nasdaq-toggle"
                  className="text-sm font-medium cursor-pointer"
                >
                  NASDAQ
                </Label>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={pageStyles.card}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
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
                  <div className="p-2 rounded-xl bg-emerald-500/10">
                    <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
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
                  <div className="p-2 rounded-xl bg-rose-500/10">
                    <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  </div>
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
                  <div className="p-2 rounded-xl bg-amber-500/10">
                    <Target className="w-5 h-5 text-amber-500" />
                  </div>
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
            {/* Calendar Section */}
            <Card className={`xl:col-span-2 ${pageStyles.card}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-muted/50 rounded-xl transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-center">
                    <CardTitle className="mb-1 flex items-center justify-center gap-2 text-xl">
                      {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mb-3">
                      Click any day to view detailed earnings reports
                    </p>
                    <CategoryLegend />
                  </div>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-muted/50 rounded-xl transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="px-2 pt-0">
                <div className="grid grid-cols-5 gap-px">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                    <div key={day} className="h-8 p-2 font-semibold text-center text-sm text-muted-foreground border-b border-border/40">
                      {day}
                    </div>
                  ))}
                  {renderCalendar()}
                </div>
              </CardContent>
            </Card>

            {/* Earnings List Section */}
            <Card className={`${pageStyles.card} flex flex-col max-h-[1000px] overflow-hidden`}>
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Earnings Reports</CardTitle>
                </div>
                {/* Search Input */}
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by symbol..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-muted/30 border-border/50"
                  />
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
                    <ScrollArea className="h-full">
                      <div className="p-4 space-y-2">
                        {filteredUpcomingEvents.length > 0 ? (
                          filteredUpcomingEvents.map((event, idx) => (
                            <EarningsListItem key={`${event.symbol}-${event.date}-${idx}`} event={event} />
                          ))
                        ) : (
                          <div className="py-12 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted/50 mb-3">
                              <Calendar className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div className="text-muted-foreground text-sm">
                              {searchQuery ? 'No matching earnings found' : 'No upcoming earnings'}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="previous" className="mt-0 flex-1 min-h-0 data-[state=inactive]:hidden">
                    <ScrollArea className="h-full">
                      <div className="p-4 space-y-2">
                        {filteredPreviousEvents.length > 0 ? (
                          filteredPreviousEvents.map((event, idx) => (
                            <EarningsListItem key={`${event.symbol}-${event.date}-${idx}`} event={event} />
                          ))
                        ) : (
                          <div className="py-12 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted/50 mb-3">
                              <Calendar className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div className="text-muted-foreground text-sm">
                              {searchQuery ? 'No matching earnings found' : 'No previous earnings'}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
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