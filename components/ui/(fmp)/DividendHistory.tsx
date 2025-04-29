"use client"
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { useDividendHistory } from '@/hooks/FMP/useDividendHistory';

interface DividendHistoryProps {
  symbol: string;
}

export const DividendHistory: React.FC<DividendHistoryProps> = ({ symbol }) => {
  const { data: dividendHistory, isLoading: dividendLoading, error: dividendError } = useDividendHistory(symbol);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dividend History</CardTitle>
      </CardHeader>
      <CardContent>
        {dividendLoading ? (
          <div className="flex items-center justify-center p-4">
            Loading dividend history...
          </div>
        ) : dividendError ? (
          <div className="flex items-center justify-center p-4 text-red-600">
            Error loading dividend history: {dividendError.message}
          </div>
        ) : (
          <div className="relative border rounded-lg">
          <div className="h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-20">
                <TableRow>
                  <TableHead>Declaration Date</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Dividend</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Record Date</TableHead>
                  <TableHead>Adjusted Dividend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(dividendHistory) && dividendHistory.length > 0 ? (
                  dividendHistory.map((dividend) => (
                    <TableRow key={`${dividend.date}-${dividend.dividend}`}>
                      <TableCell>{dividend.declarationDate ? new Date(dividend.declarationDate).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>{dividend.paymentDate ? new Date(dividend.paymentDate).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>${dividend.dividend.toFixed(4)}</TableCell>
                      <TableCell>{new Date(dividend.date).toLocaleDateString()}</TableCell>
                      <TableCell>{dividend.recordDate ? new Date(dividend.recordDate).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>${dividend.adjDividend.toFixed(4)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No dividend history available</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DividendHistory; 