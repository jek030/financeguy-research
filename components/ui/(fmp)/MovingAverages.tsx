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
import { StatusIndicator } from '@/components/ui/PriceIndicator';
import { pageStyles } from '@/components/ui/CompanyHeader';

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
  const eightEmaData = useMovingAverageData(symbol, 'ema', '8', '1day');
  const twentyOneEmaData = useMovingAverageData(symbol, 'ema', '21', '1day');
  const fiftyEmaData = useMovingAverageData(symbol, 'sma', '50', '1day');
  const twoHundredSmaData = useMovingAverageData(symbol, 'sma', '200', '1day');
  const twentyWeekSmaData = useMovingAverageData(symbol, 'sma', '20', '1week');

  const movingAverages = {
    eightEma: {
      data: calculateMovingAverageData(getMovingAverageValue(eightEmaData.data)),
      isLoading: eightEmaData.isLoading
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
    <Card className={`w-full h-full ${pageStyles.card}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Moving Averages</CardTitle>
        <CardDescription className="text-sm text-neutral-500 dark:text-neutral-400">
          Current Price: ${formatter.format(currentPrice)}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <TooltipProvider>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="text-xs [&_th]:!text-xs [&_td]:!text-xs [&_th]:!sm:text-xs [&_td]:!sm:text-xs">
                <TableHeader>
                  <TableRow className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
                    <TableHead className="w-[80px] text-xs p-2 !sm:text-xs text-neutral-500 dark:text-neutral-400">Status</TableHead>
                    <TableHead className="text-xs p-2 !sm:text-xs text-neutral-500 dark:text-neutral-400">Period</TableHead>
                    <TableHead className="text-xs p-2 !sm:text-xs text-neutral-500 dark:text-neutral-400">Value</TableHead>
                    <TableHead className="text-xs p-2 !sm:text-xs text-neutral-500 dark:text-neutral-400">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {Object.entries(movingAverages).map(([key, { data, isLoading }]) => {
                    const { ma, isAbove, percentDiff, difference } = data
                    
                    return (
                      <TableRow 
                        key={key} 
                        className={cn(
                          "group border-b border-neutral-100 dark:border-neutral-800 last:border-b-0",
                          isLoading 
                            ? "bg-neutral-50 dark:bg-neutral-800/50"
                            : isAbove 
                              ? "bg-emerald-500/5 dark:bg-emerald-500/10 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15" 
                              : "bg-rose-500/5 dark:bg-rose-500/10 hover:bg-rose-500/10 dark:hover:bg-rose-500/15"
                        )}
                      >
                        <TableCell className="whitespace-nowrap text-xs p-2 !sm:text-xs">
                          {isLoading ? (
                            <Badge variant="secondary" className="font-medium text-xs py-0">
                              Loading
                            </Badge>
                          ) : (
                            <StatusIndicator isPositive={isAbove} />
                          )}
                        </TableCell>
                        <TableCell className="text-neutral-600 dark:text-neutral-300 whitespace-nowrap text-xs p-2 !sm:text-xs font-medium">
                          {LABELS[key as keyof typeof LABELS]}
                        </TableCell>
                        <TableCell className="font-mono text-neutral-600 dark:text-neutral-300 whitespace-nowrap text-xs p-2 !sm:text-xs">
                          {isLoading ? "..." : `$${formatter.format(ma)}`}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs p-2 !sm:text-xs">
                          {isLoading ? (
                            <div className="text-neutral-400 dark:text-neutral-500">Loading...</div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className={cn(
                                "flex items-center gap-0.5",
                                isAbove 
                                  ? "text-emerald-600 dark:text-emerald-400" 
                                  : "text-rose-600 dark:text-rose-400"
                              )}>
                                {isAbove ? (
                                  <ArrowUpIcon className="h-3 w-3" />
                                ) : (
                                  <ArrowDownIcon className="h-3 w-3" />
                                )}
                                <span className="font-mono text-xs font-medium">
                                  ${formatter.format(difference)}
                                </span>
                              </div>
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button className="inline-flex text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
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
  eightEma: '8 Day EMA',
  twentyOneEma: '21 Day EMA',
  fiftySma: '50 Day SMA',
  twentyWeekSma: '20 Week SMA',
  twoHundredSma: '200 Day SMA',
} as const
