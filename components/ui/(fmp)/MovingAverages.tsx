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
  const twentyEmaData = useMovingAverageData(symbol, 'ema', '20', '1day');
  const fiftyEmaData = useMovingAverageData(symbol, 'sma', '50', '1day');
  const twoHundredSmaData = useMovingAverageData(symbol, 'sma', '200', '1day');
  const twentyWeekSmaData = useMovingAverageData(symbol, 'sma', '20', '1week');

  const movingAverages = {
    tenEma: {
      data: calculateMovingAverageData(getMovingAverageValue(tenEmaData.data)),
      isLoading: tenEmaData.isLoading
    },
    twentyEma: {
      data: calculateMovingAverageData(getMovingAverageValue(twentyEmaData.data)),
      isLoading: twentyEmaData.isLoading
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
    <div className="space-y-4">
      <Card className="border-border">
        <CardHeader>
              <CardTitle className="text-foreground">Moving Averages Analysis</CardTitle>
              <CardDescription>
                Current Price: ${formatter.format(currentPrice)}
              </CardDescription>
        </CardHeader>
        
        <CardContent>
          <TooltipProvider>
            <div className="rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-muted/50">
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                              ? "bg-emerald-50/50 dark:bg-emerald-950/50" 
                              : "bg-rose-50/50 dark:bg-rose-950/50"
                        )}
                      >
                        <TableCell>
                          {isLoading ? (
                            <Badge variant="secondary" className="font-medium">
                              Loading
                            </Badge>
                          ) : (
                            <Badge variant={isAbove ? "positive" : "destructive"} className="font-medium">
                              {isAbove ? 'Above' : 'Below'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {LABELS[key as keyof typeof LABELS]}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {isLoading ? "..." : `$${formatter.format(ma)}`}
                        </TableCell>
                        <TableCell>
                          {isLoading ? (
                            <div className="text-muted-foreground">Loading...</div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "flex items-center gap-1",
                                isAbove ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                              )}>
                                {isAbove ? (
                                  <ArrowUpIcon className="h-4 w-4" />
                                ) : (
                                  <ArrowDownIcon className="h-4 w-4" />
                                )}
                                <span className="font-mono">
                                  ${formatter.format(difference)}
                                </span>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help text-xs text-muted-foreground">
                                    ({formatter.format(percentDiff)}%)
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Percentage difference from current price</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  )
}

const LABELS = {
  tenEma: '10 Day EMA',
  twentyEma: '20 Day EMA',
  fiftySma: '50 Day SMA',
  twentyWeekSma: '20 Week SMA',
  twoHundredSma: '200 Day SMA',
} as const