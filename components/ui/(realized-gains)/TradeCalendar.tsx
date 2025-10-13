"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TradeRecord } from '@/lib/types/trading';
import { formatCurrency } from '@/utils/tradeCalculations';
import { parseTradeDate } from '@/utils/aggregateByPeriod';
import { cn } from '@/lib/utils';
import DailyTradesModal from './DailyTradesModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TradeCalendarProps {
  trades: TradeRecord[];
  className?: string;
}

export default function TradeCalendar({ trades, className }: TradeCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Group trades by date
  const tradesByDate = useMemo(() => {
    const grouped = new Map<string, TradeRecord[]>();
    
    trades.forEach(trade => {
      try {
        const closeDate = parseTradeDate(trade.closedDate);
        const dateKey = closeDate.toISOString().split('T')[0];
        
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, []);
        }
        grouped.get(dateKey)?.push(trade);
      } catch {
        console.warn('Invalid date in trade:', trade.closedDate);
      }
    });
    
    return grouped;
  }, [trades]);

  // Get trades for a specific date
  const getTradesForDate = (date: Date): TradeRecord[] => {
    const dateKey = date.toISOString().split('T')[0];
    return tradesByDate.get(dateKey) || [];
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    const tradesForDate = getTradesForDate(date);
    if (tradesForDate.length > 0) {
      setSelectedDate(date);
      setIsModalOpen(true);
    }
  };

  // Get calendar data for current month
  const getCalendarData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const calendarDays = getCalendarData();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <>
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Trade Calendar</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click on a date to view all trades closed on that day
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="w-full">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="w-full">
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-px mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-px">
                {calendarDays.map((date, index) => {
                  const tradesForDay = getTradesForDate(date);
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const isToday = date.toDateString() === new Date().toDateString();
                  const dayNumber = date.getDate();

                  return (
                    <div
                      key={index}
                      className={cn(
                        "min-h-[100px] border border-border bg-background p-2 relative",
                        !isCurrentMonth && "opacity-30",
                        isToday && "bg-accent"
                      )}
                    >
                      {/* Day number */}
                      <div className={cn(
                        "text-sm font-medium mb-1",
                        isToday && "font-bold"
                      )}>
                        {dayNumber}
                      </div>

                      {/* Trade events */}
                      {tradesForDay.length > 0 && (
                        <div className="space-y-1">
                          <div
                            onClick={() => handleDateClick(date)}
                            className={cn(
                              "cursor-pointer rounded-sm p-1 text-xs transition-colors hover:opacity-80",
                              (() => {
                                const totalGainLoss = tradesForDay.reduce((sum, t) => sum + t.gainLoss, 0);
                                return totalGainLoss >= 0
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                              })()
                            )}
                          >
                            <div className="font-medium">
                              {tradesForDay.length} {tradesForDay.length === 1 ? 'trade' : 'trades'}
                            </div>
                            <div className="font-bold">
                              {formatCurrency(tradesForDay.reduce((sum, t) => sum + t.gainLoss, 0))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Trades Modal */}
      {selectedDate && (
        <DailyTradesModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDate(undefined);
          }}
          date={selectedDate}
          trades={getTradesForDate(selectedDate)}
        />
      )}
    </>
  );
}

