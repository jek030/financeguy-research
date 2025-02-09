"use client"
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useInsiderTrading } from '@/hooks/FMP/useInsiderTrading';

interface InsiderActivityProps {
  symbol: string;
}

function formatLargeNumber(num: number) {
  return new Intl.NumberFormat('en-US').format(num);
}

export const InsiderActivity: React.FC<InsiderActivityProps> = ({ symbol }) => {
  const { data: insiderTrades, isLoading: insiderLoading, error: insiderError } = useInsiderTrading(symbol);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Insider Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {insiderLoading ? (
          <div className="flex items-center justify-center p-4">
            Loading insider trading data...
          </div>
        ) : insiderError ? (
          <div className="flex items-center justify-center p-4 text-red-600">
            Error loading insider trading data: {insiderError.message}
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filing Date</TableHead>
                  <TableHead>Transaction Date</TableHead>
                  <TableHead>Insider Name</TableHead>
                  <TableHead>Transaction Type</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Shares Total</TableHead>
                  <TableHead>Form</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(insiderTrades) && insiderTrades.length > 0 ? (
                  insiderTrades.map((trade) => (
                    <TableRow key={`${trade.filingDate}-${trade.reportingName}-${trade.transactionDate}-${trade.transactionType}-${trade.securitiesTransacted}-${trade.price}-${trade.securitiesOwned}`}>
                      <TableCell>{new Date(trade.filingDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(trade.transactionDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{trade.reportingName}</p>
                          <p className="text-sm text-gray-500">{trade.typeOfOwner}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          trade.acquistionOrDisposition === 'A' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {trade.transactionType} ({trade.acquistionOrDisposition === 'A' ? 'Buy' : 'Sell'})
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{trade.price ? `$${trade.price.toFixed(2)}` : 'N/A'}</TableCell>
                      <TableCell className="text-right">{formatLargeNumber(trade.securitiesTransacted)}</TableCell>
                      <TableCell className="text-right">${formatLargeNumber(trade.securitiesTransacted * (trade.price || 0))}</TableCell>
                      <TableCell className="text-right">${formatLargeNumber(trade.securitiesOwned)}</TableCell>
                      <TableCell>
                        <a 
                          href={trade.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {trade.formType}
                        </a>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">No insider trades available</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default InsiderActivity; 