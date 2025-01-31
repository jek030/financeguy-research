"use client";
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
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
}

interface EventsState {
  [key: string]: CalendarEvent[];
}

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<EventsState>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('default');
  const [eventCategories] = useState<Record<string, EventCategory>>({
    default: { name: 'Default', color: 'bg-primary/10 text-primary' },
    earnings: { name: 'Earnings', color: 'bg-info/10 text-primary' },
  });
  const [editingEvent, setEditingEvent] = useState<{ index: number; text: string } | null>(null);
  
  const { data: earnings = [] } = useEarningsConfirmed(currentDate);
  const { data: dowConstituents = new Set(), isLoading: dowLoading } = useDowJonesConstituents();
  const { data: spConstituents = new Set(), isLoading: spLoading } = useSP500Constituents();

  // Add useEffect to handle earnings data
  useEffect(() => {
    if (earnings && earnings.length > 0 && !dowLoading && !spLoading) {
      setEvents(prevEvents => {
        const newEvents = { ...prevEvents };
        
        earnings.forEach(earning => {
          // Only process if the symbol is in either index
          if (dowConstituents.has(earning.symbol) || spConstituents.has(earning.symbol)) {
            const dateKey = earning.date;
            const earningEvent: CalendarEvent = {
              title: `${earning.symbol} Earnings - ${earning.time}`,
              category: 'earnings',
              url: earning.url,
              time: earning.time,
              symbol: earning.symbol,
              exchange: earning.exchange
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
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
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



  const handleAddEvent = (): void => {
    if (newEvent.trim() && selectedDate) {
      const dateKey = selectedDate;
      const newEventObj: CalendarEvent = {
        title: newEvent.trim(),
        category: selectedCategory
      };
      
      setEvents(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), newEventObj]
      }));
      setNewEvent('');
      setSelectedCategory('default');
    }
  };

  const renderEventBadge = (event: CalendarEvent): React.ReactElement => {
    const categoryStyle = eventCategories[event.category]?.color || eventCategories.default.color;
    return (
      <div className={`text-xs truncate p-1 mb-1 rounded ${categoryStyle}`}>
        {event.url ? (
          <a href={event.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {event.title}
          </a>
        ) : (
          event.title
        )}
      </div>
    );
  };

  const CategoryLegend: React.FC = () => (
    <div className="flex flex-wrap gap-2 mt-4">
      {Object.entries(eventCategories).map(([key, category]) => (
        <div key={key} className="flex items-center space-x-1">
          <div className={`w-3 h-3 rounded ${category.color.split(' ')[0]}`} />
          <span className="text-xs">{category.name}</span>
        </div>
      ))}
    </div>
  );

  const renderCalendar = (): React.ReactElement[] => {
    const days: React.ReactElement[] = [];
    const totalDays = daysInMonth(currentDate);
    const startDay = startOfMonth(currentDate);
    
    // Add empty cells for days before the start of the month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 p-2" />);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayEvents = events[dateKey] || [];
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      
      days.push(
        <Dialog key={day}>
          <DialogTrigger asChild>
            <div
              className={`h-24 p-2 border border-border/50 ${
                isToday ? 'bg-accent/10 font-bold' : ''
              } hover:bg-muted/50 cursor-pointer transition-colors relative`}
              onClick={() => setSelectedDate(dateKey)}
            >
              <div className="flex justify-between items-start">
                <span>{day}</span>
                {dayEvents.length > 0 && (
                  <span className="bg-muted text-muted-foreground text-xs px-1 rounded-full">
                    {dayEvents.length}
                  </span>
                )}
              </div>
              <div className="mt-1 overflow-y-auto max-h-[calc(100%-1.5rem)]">
                {dayEvents.map((event, idx) => (
                  <div key={idx}>{renderEventBadge(event)}</div>
                ))}
              </div>
            </div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Events for {monthNames[currentDate.getMonth()]} {day}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <div className="space-y-2">
                <Input
                  placeholder="Add new event"
                  value={newEvent}
                  onChange={(e) => setNewEvent(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
                />
                <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(eventCategories).map(([key, category]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded ${category.color.split(' ')[0]}`} />
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddEvent} className="w-full">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Event
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dayEvents.map((event, idx) => (
                  <div key={idx} className={`flex justify-between items-center p-2 rounded ${eventCategories[event.category]?.color || eventCategories.default.color}`}>
                    {editingEvent?.index === idx ? (
                      <Input
                        value={editingEvent.text}
                        onChange={(e) => setEditingEvent({ ...editingEvent, text: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEvents(prev => ({
                              ...prev,
                              [dateKey]: prev[dateKey].map((ev, i) => 
                                i === idx ? { ...ev, title: editingEvent.text } : ev
                              )
                            }));
                            setEditingEvent(null);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span>{event.title}</span>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingEvent({ index: idx, text: event.title })}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEvents(prev => ({
                            ...prev,
                            [dateKey]: prev[dateKey].filter((_, i) => i !== idx)
                          }));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    }
    
    return days;
  };


  return (
    <div className="flex flex-col">

      <main className="w-full">
        <div className="flex flex-col gap-8 sm:items-start">
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <button
                  onClick={previousMonth}
                  className="p-2 hover:bg-muted/50 rounded-full"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <CardTitle className="mb-2">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </CardTitle>
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
            <CardContent className="px-2">
              <div className="grid grid-cols-7 gap-px">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="h-12 p-2 font-semibold text-center">
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