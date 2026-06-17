"use client";

import React from 'react';
import { Receipt, Coins, CalendarRange } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { TransactionSummary } from '@/lib/types/transactions';
import { formatCurrency } from '@/utils/transactionCalculations';
import { cn } from '@/lib/utils';

interface TransactionSummaryCardsProps {
  summary: TransactionSummary;
  className?: string;
}

export default function TransactionSummaryCards({ summary, className }: TransactionSummaryCardsProps) {
  const cards = [
    {
      label: 'Total Transactions',
      value: summary.totalTransactions.toLocaleString(),
      icon: Receipt,
      iconWrap: 'bg-indigo-500/15 text-indigo-300',
      valueClass: 'text-2xl font-bold text-slate-50',
    },
    {
      label: 'Total Fees',
      value: formatCurrency(summary.totalFees),
      icon: Coins,
      iconWrap: 'bg-red-500/15 text-red-400',
      valueClass: 'text-2xl font-bold text-red-400',
    },
    {
      label: 'Date Range',
      value: `${summary.dateRange.from} – ${summary.dateRange.to}`,
      icon: CalendarRange,
      iconWrap: 'bg-violet-500/15 text-violet-300',
      valueClass: 'text-xl font-bold text-violet-300',
    },
  ];

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-3", className)}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className="rounded-xl border border-indigo-500/15 bg-gradient-to-br from-[#1b1f3b] to-[#14172c] shadow-lg shadow-black/20"
          >
            <CardContent className="flex items-center justify-between gap-4 py-5">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-indigo-300/70">
                  {card.label}
                </p>
                <p className={card.valueClass}>{card.value}</p>
              </div>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", card.iconWrap)}>
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
