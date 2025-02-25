"use client";
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { useEarningsConfirmed } from '@/hooks/FMP/useEarningsConfirmed';
import { useDowJonesConstituents } from '@/hooks/FMP/useDowJonesConstituents';
import { useSP500Constituents } from '@/hooks/FMP/useSP500Constituents';

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
}

interface EventsState {
  [key: string]: CalendarEvent[];
}

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<EventsState>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [eventCategories] = useState<Record<string, EventCategory>>({
    earnings: { name: 'Earnings', color: 'bg-info/10 text-primary' },
  });
  
  const { data: earnings = [] } = useEarningsConfirmed(currentDate);
  const { data: dowConstituents = new Set(), isLoading: dowLoading } = useDowJonesConstituents();
  const { data: spConstituents = new Set(), isLoading: spLoading } = useSP500Constituents();

  // Add a new function to format the time string
  const formatTime = (time: string | undefined): string => {
    if (!time) return 'TBD';
    
    switch (time.toLowerCase()) {
      case 'amc':
        return 'After close';
      case 'bmo':
        return 'Before open';
      default:
        return time;
    }
  };

  // Add useEffect to handle earnings data
  useEffect(() => {
    if (earnings && earnings.length > 0 && !dowLoading && !spLoading) {
      setEvents(prevEvents => {
        const newEvents = { ...prevEvents };
        
        earnings.forEach(earning => {
          // Only process if the symbol is in either index
          if (dowConstituents.has(earning.symbol) || spConstituents.has(earning.symbol)) {
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
              revenueBeatPercentage
            };

            if (!newEvents[dateKey]) {
              newEvents[dateKey] = [];
            }
            
            // Check if event already exists to avoid duplicates
            const eventExists = newEvents[dateKey].some(
              event => event.title === earningEvent.title
            );
            
            if (!eventExists) {
              newEvents[dateKey] = [...newEvents[dateKey], earningEvent];
            }
          }
        });

        return newEvents;
      });
    }
  }, [earnings, currentDate, dowConstituents, spConstituents, dowLoading, spLoading]);


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

  const renderEventBadge = (event: CalendarEvent): React.ReactElement => {
    const categoryStyle = eventCategories[event.category]?.color || 'bg-primary/10 text-primary';
    
    // Create a specific class based on earnings time
    let timingClass = '';
    if (event.time?.toLowerCase() === 'bmo') {
      timingClass = 'border-l-green-400';
    } else if (event.time?.toLowerCase() === 'amc') {
      timingClass = 'border-l-blue-400';
    }
    
    return (
      <div className={`text-xs truncate p-1 mb-1 rounded ${categoryStyle} border-l-2 ${timingClass}`}>
        {event.url ? (
          <a href={event.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {event.symbol}
          </a>
        ) : (
          event.symbol
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
        <div className="w-3 h-3 border-l-2 border-l-green-400 rounded-sm" />
        <span className="text-xs">Before Open</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 border-l-2 border-l-blue-400 rounded-sm" />
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
      // Sort events by symbol alphabetically
      const sortedEvents = [...dayEvents].sort((a, b) => 
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
              onClick={() => setSelectedDate(dateKey)}
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
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>
                  Earnings for {monthNames[currentDate.getMonth()]} {day}, {currentDate.getFullYear()}
                </span>
              </DialogTitle>
            </DialogHeader>
            {sortedEvents.length > 0 ? (
              <div className="space-y-4 mt-4">
                {sortedEvents.map((event, idx) => {
                  // Determine color based on EPS beat
                  let epsColor = '';
                  if (event.epsBeatPercentage && event.epsBeatPercentage > 0) {
                    epsColor = 'text-green-500';
                  } else if (event.epsBeatPercentage && event.epsBeatPercentage < 0) {
                    epsColor = 'text-red-500';
                  }
                  
                  // Determine color based on revenue beat
                  let revenueColor = '';
                  if (event.revenueBeatPercentage && event.revenueBeatPercentage > 0) {
                    revenueColor = 'text-green-500';
                  } else if (event.revenueBeatPercentage && event.revenueBeatPercentage < 0) {
                    revenueColor = 'text-red-500';
                  }
                  
                  // Determine card border color based on time
                  let timeBorderColor = 'border-primary';
                  if (event.time?.toLowerCase() === 'bmo') {
                    timeBorderColor = 'border-green-400';
                  } else if (event.time?.toLowerCase() === 'amc') {
                    timeBorderColor = 'border-blue-400';
                  }
                  
                  return (
                    <Card key={idx} className={`overflow-hidden border-l-4 ${timeBorderColor} shadow-sm hover:shadow transition-shadow`}>
                      <CardHeader className="py-3 bg-muted/20">
                        <CardTitle className="text-base flex justify-between items-center">
                          <span className="font-bold">{event.symbol}</span>
                          <span className="text-sm font-normal">{formatTime(event.time)}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-4">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                          <div className="flex flex-col space-y-0.5">
                            <span className="text-muted-foreground text-xs">EPS</span>
                            <div className="font-medium">{event.eps !== null ? event.eps : 'N/A'}</div>
                          </div>
                          
                          <div className="flex flex-col space-y-0.5">
                            <span className="text-muted-foreground text-xs">EPS Estimated</span>
                            <div className="font-medium">{event.epsEstimated !== null ? event.epsEstimated : 'N/A'}</div>
                          </div>
                          
                          <div className="flex flex-col space-y-0.5">
                            <span className="text-muted-foreground text-xs">EPS Beat</span>
                            <div className={`font-medium ${epsColor}`}>
                              {formatPercentage(event.epsBeatPercentage ?? null)}
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-0.5">
                            <span className="text-muted-foreground text-xs">Fiscal Period Ending</span>
                            <div className="font-medium">{event.fiscalDateEnding || 'N/A'}</div>
                          </div>
                          
                          <div className="flex flex-col space-y-0.5">
                            <span className="text-muted-foreground text-xs">Revenue</span>
                            <div className="font-medium">{formatCurrency(event.revenue ?? null)}</div>
                          </div>
                          
                          <div className="flex flex-col space-y-0.5">
                            <span className="text-muted-foreground text-xs">Revenue Estimated</span>
                            <div className="font-medium">{formatCurrency(event.revenueEstimated ?? null)}</div>
                          </div>
                          
                          <div className="flex flex-col space-y-0.5">
                            <span className="text-muted-foreground text-xs">Revenue Beat</span>
                            <div className={`font-medium ${revenueColor}`}>
                              {formatPercentage(event.revenueBeatPercentage ?? null)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No events for this day
              </div>
            )}
          </DialogContent>
        </Dialog>
      );
    }
    
    return days;
  };


  return (
    <div className="flex flex-col">
      <main className="w-full">
        <div className="flex flex-col gap-4 sm:items-start">
          <Card className="w-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={previousMonth}
                  className="p-2 hover:bg-muted/50 rounded-full"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <CardTitle className="mb-1 flex items-center justify-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mb-2">
                    Tap any day to view detailed earnings reports and performance metrics
                  </p>
                  <CategoryLegend />
                </div>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-muted/50 rounded-full"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="px-2 pt-0">
              <div className="grid grid-cols-5 gap-px">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                  <div key={day} className="h-8 p-2 font-semibold text-center border-b border-border/40">
                    {day}
                  </div>
                ))}
                {renderCalendar()}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  ) ;
};

export default CalendarPage;