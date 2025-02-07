"use client";

import * as React from "react";
import { format, subDays, subMonths, subYears } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Calendar } from "@/components/ui/Calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";

interface DatePickerProps {
  label?: string;
  fromDate?: Date;
  toDate?: Date;
  onRangeChange?: (range: { from: Date; to: Date }) => void;
}

const presets = [
  {
    label: "7 Days",
    getValue: () => ({
      from: subDays(new Date(), 7),
      to: new Date(),
    }),
  },
  {
    label: "30 Days",
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
  },
  {
    label: "3 Months",
    getValue: () => ({
      from: subMonths(new Date(), 3),
      to: new Date(),
    }),
  },
  {
    label: "1 Year",
    getValue: () => ({
      from: subYears(new Date(), 1),
      to: new Date(),
    }),
  },
];

export function DatePicker({ 
  fromDate,
  toDate,
  onRangeChange 
}: DatePickerProps) {
  const [selectedRange, setSelectedRange] = React.useState<DateRange>({
    from: fromDate || subYears(new Date(), 1),
    to: toDate || new Date(),
  });

  const handleFromDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const newRange = {
      from: date,
      to: selectedRange.to || new Date(),
    };
    setSelectedRange(newRange);
    if (onRangeChange && newRange.to) {
      onRangeChange(newRange);
    }
  };

  const handleToDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const newRange = {
      from: selectedRange.from || subYears(new Date(), 1),
      to: date,
    };
    setSelectedRange(newRange);
    if (onRangeChange && newRange.from) {
      onRangeChange(newRange);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !selectedRange.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedRange.from ? (
                format(selectedRange.from, "LLL dd, y")
              ) : (
                <span>Start date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="single"
              defaultMonth={selectedRange.from}
              selected={selectedRange.from}
              onSelect={handleFromDateSelect}
              disabled={(date) => 
                date > (selectedRange.to || new Date()) || 
                date > new Date()
              }
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground">to</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !selectedRange.to && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedRange.to ? (
                format(selectedRange.to, "LLL dd, y")
              ) : (
                <span>End date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="single"
              defaultMonth={selectedRange.to}
              selected={selectedRange.to}
              onSelect={handleToDateSelect}
              disabled={(date) => 
                date < (selectedRange.from || subYears(new Date(), 1)) || 
                date > new Date()
              }
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            onClick={() => {
              const range = preset.getValue();
              setSelectedRange(range);
              if (onRangeChange) {
                onRangeChange(range);
              }
            }}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
} 