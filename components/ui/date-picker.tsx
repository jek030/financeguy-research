"use client";

import * as React from "react";
import { addDays, format, subDays, subMonths, subYears } from "date-fns";
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
  date?: Date;
  onDateChange?: (date: Date) => void;
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
  date,
  onDateChange,
  label,
  fromDate,
  toDate,
  onRangeChange 
}: DatePickerProps) {
  const [selectedRange, setSelectedRange] = React.useState<DateRange | undefined>({
    from: fromDate || subYears(new Date(), 1),
    to: toDate || new Date(),
  });

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (!range) return;
    setSelectedRange(range);
    if (onRangeChange && range.from && range.to) {
      onRangeChange({ from: range.from, to: range.to });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[300px] justify-start text-left font-normal",
            !selectedRange && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedRange?.from ? (
            selectedRange.to ? (
              <>
                {format(selectedRange.from, "LLL dd, y")} -{" "}
                {format(selectedRange.to, "LLL dd, y")}
              </>
            ) : (
              format(selectedRange.from, "LLL dd, y")
            )
          ) : (
            <span>{label || "Pick a date range"}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="grid gap-2 p-4">
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
          <div className="border-t my-2" />
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selectedRange?.from}
            selected={selectedRange}
            onSelect={handleRangeSelect}
            numberOfMonths={2}
            disabled={(date) => date > new Date()}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
} 