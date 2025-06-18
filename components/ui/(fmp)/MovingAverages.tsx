"use client"

import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react"
import { formatter } from '@/lib/formatters';
import { CompanyOutlook } from '@/lib/types';
import { cn } from "@/lib/utils";
//UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from '@/components/ui/Badge';

import { useMovingAverageData } from '@/hooks/FMP/useMovingAverage';

interface MovingAveragesProps {
  companyData: CompanyOutlook;
  symbol: string;
}

interface MovingAverageResponse {
  ma: number;
  date: string;
}

interface MovingAverageData {
  ma: number;
  isAbove: boolean;
  percentDiff: number;
  difference: number;
}

function useMovingAverages(symbol: string, currentPrice: number) {

  const getMovingAverageValue = (data: MovingAverageResponse[] | undefined) => 
    data && data.length > 0 && data[0]?.ma ? data[0].ma : 0;

  const calculateMovingAverageData = (maValue: number): MovingAverageData => {
    const isAbove = maValue < currentPrice;
    const percentDiff = isAbove 
      ? (currentPrice / maValue - 1) * 100
      : (1 - currentPrice / maValue) * 100;
    const difference = isAbove 
      ? currentPrice - maValue
      : maValue - currentPrice;

    return { ma: maValue, isAbove, percentDiff, difference };
  };

  // Call hooks at the top level
  const tenEmaData = useMovingAverageData(symbol, 'ema', '10', '1day');
  const twentyOneEmaData = useMovingAverageData(symbol, 'ema', '21', '1day');
  const fiftyEmaData = useMovingAverageData(symbol, 'sma', '50', '1day');
  const twoHundredSmaData = useMovingAverageData(symbol, 'sma', '200', '1day');
  const twentyWeekSmaData = useMovingAverageData(symbol, 'sma', '20', '1week');

  const movingAverages = {
    tenEma: {
      data: calculateMovingAverageData(getMovingAverageValue(tenEmaData.data)),
      isLoading: tenEmaData.isLoading
    },
    twentyOneEma: {
      data: calculateMovingAverageData(getMovingAverageValue(twentyOneEmaData.data)),
      isLoading: twentyOneEmaData.isLoading
    },
    fiftySma: {
      data: calculateMovingAverageData(getMovingAverageValue(fiftyEmaData.data)),
      isLoading: fiftyEmaData.isLoading
    },
    twoHundredSma: {
      data: calculateMovingAverageData(getMovingAverageValue(twoHundredSmaData.data)),
      isLoading: twoHundredSmaData.isLoading
    },
    twentyWeekSma: {
      data: calculateMovingAverageData(getMovingAverageValue(twentyWeekSmaData.data)),
      isLoading: twentyWeekSmaData.isLoading
    }
  } as const;

  return movingAverages;
}

export function MovingAverages({ companyData, symbol }: MovingAveragesProps) {
  const currentPrice = companyData.profile.price || 0
  const movingAverages = useMovingAverages(symbol, currentPrice)

  return (
    <Card className="w-full bg-card border h-full">
      <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5">Moving Averages</CardTitle>
            <CardDescription className="text-sm">
              Current Price: ${formatter.format(currentPrice)}
            </CardDescription>
      </CardHeader>
      
      <CardContent className="p-3">
        <TooltipProvider>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="text-xs [&_th]:!text-xs [&_td]:!text-xs [&_th]:!sm:text-xs [&_td]:!sm:text-xs">
                <TableHeader>
                  <TableRow className="hover:bg-muted/50">
                    <TableHead className="w-[80px] text-xs p-2 !sm:text-xs">Status</TableHead>
                    <TableHead className="text-xs p-2 !sm:text-xs">Period</TableHead>
                    <TableHead className="text-xs p-2 !sm:text-xs">Value</TableHead>
                    <TableHead className="text-xs p-2 !sm:text-xs">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {Object.entries(movingAverages).map(([key, { data, isLoading }]) => {
                    const { ma, isAbove, percentDiff, difference } = data
                    
                    return (
                      <TableRow 
                        key={key} 
                        className={cn(
                          "group hover:bg-muted/50",
                          isLoading 
                            ? "bg-muted/50"
                            : isAbove 
                              ? "bg-emerald-500/5 dark:bg-emerald-500/10" 
                              : "bg-rose-500/5 dark:bg-rose-500/10"
                        )}
                      >
                        <TableCell className="whitespace-nowrap text-xs p-2 !sm:text-xs">
                          {isLoading ? (
                            <Badge variant="secondary" className="font-medium text-xs py-0">
                              Loading
                            </Badge>
                          ) : (
                            <Badge variant={isAbove ? "positive" : "destructive"} className="font-medium text-xs py-0">
                              {isAbove ? 'Above' : 'Below'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap text-xs p-2 !sm:text-xs">
                          {LABELS[key as keyof typeof LABELS]}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground whitespace-nowrap text-xs p-2 !sm:text-xs">
                          {isLoading ? "..." : `$${formatter.format(ma)}`}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs p-2 !sm:text-xs">
                          {isLoading ? (
                            <div className="text-muted-foreground">Loading...</div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className={cn(
                                "flex items-center gap-0.5",
                                isAbove 
                                  ? "text-emerald-500 dark:text-emerald-400" 
                                  : "text-rose-500 dark:text-rose-400"
                              )}>
                                {isAbove ? (
                                  <ArrowUpIcon className="h-3 w-3" />
                                ) : (
                                  <ArrowDownIcon className="h-3 w-3" />
                                )}
                                <span className="font-mono text-xs">
                                  ${formatter.format(difference)}
                                </span>
                              </div>
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button className="inline-flex text-xs text-muted-foreground hover:text-foreground transition-colors">
                                      ({formatter.format(percentDiff)}%)
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" sideOffset={5}>
                                    <p className="text-xs">Percentage difference from current price</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}

const LABELS = {
  tenEma: '10 Day EMA',
  twentyOneEma: '21 Day EMA',
  fiftySma: '50 Day SMA',
  twentyWeekSma: '20 Week SMA',
  twoHundredSma: '200 Day SMA',
} as const