"use client"
import React from 'react';
import type { CompanyOutlook } from '@/lib/types';
//UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/Table";
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer} from 'recharts';

interface FinancialsProps {
  companyData: CompanyOutlook;
}

export const Financials: React.FC<FinancialsProps> = ({ companyData }) => {
  // Prepare quarterly revenue data for chart
  const quarterlyData = React.useMemo(() => {
    if (!companyData?.financialsQuarter?.income) {
      return [];
    }

    return companyData.financialsQuarter.income
      .filter(quarter => quarter && quarter.date)
      .map(quarter => ({
        date: new Date(quarter.date).toLocaleDateString('en-US', { 
          month: 'short', 
          year: '2-digit' 
        }),
        revenue: (quarter.revenue || 0) / 1e9,
        profit: (quarter.netIncome || 0) / 1e9
      }))
      .reverse();
  }, [companyData?.financialsQuarter?.income]);

  const annualData = React.useMemo(() => {
    if (!companyData?.financialsAnnual?.income) {
      return [];
    }
  
    return companyData.financialsAnnual.income
      .filter(year => year && year.date)
      .map(year => ({
        date: new Date(year.date).toLocaleDateString('en-US', { 
          year: '2-digit'
        }),
        revenue: (year.revenue || 0) / 1e9,
        profit: (year.netIncome || 0) / 1e9
      }))
      .reverse();
  }, [companyData?.financialsAnnual?.income]);

  return (
    <div className="grid gap-2">
      {/* Performance Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Quarterly Performance */}
        <Card >
          <CardHeader>
            <CardTitle>Quarterly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarterlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-muted-foreground" />
                  <YAxis tickFormatter={(value: number) => `$${value}B`} className="text-muted-foreground" />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}B`, '']}
                    labelFormatter={(label: string) => `Quarter: ${label}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend className="text-muted-foreground" />
                  <Bar name="Revenue" dataKey="revenue" fill="#8884d8" />
                  <Bar name="Net Income" dataKey="profit" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Annual Performance */}
        <Card >
          <CardHeader>
            <CardTitle>Annual Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-muted-foreground" />
                  <YAxis tickFormatter={(value: number) => `$${value}B`} className="text-muted-foreground" />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}B`, '']}
                    labelFormatter={(label: string) => `Year: 20${label}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend className="text-muted-foreground" />
                  <Bar name="Revenue" dataKey="revenue" fill="#6366f1" />
                  <Bar name="Net Income" dataKey="profit" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Quarterly Income Statement */}
        <Card>
          <CardHeader>
            <CardTitle>Quarterly Income Statements</CardTitle>
            <CardDescription>Last 5 quarters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative border rounded-lg">
            <div className="overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-20">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Gross Profit</TableHead>
                    <TableHead>Net Income</TableHead>
                    <TableHead>EPS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(companyData.financialsQuarter?.income) && companyData.financialsQuarter.income.length > 0 ? (
                    companyData.financialsQuarter.income.map((quarter) => (
                      <TableRow key={quarter.date}>
                        <TableCell>
                          <a 
                            href={quarter.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {new Date(quarter.date).toLocaleDateString()}
                          </a>
                        </TableCell>
                        <TableCell>${(quarter.revenue / 1e9).toFixed(2)}B</TableCell>
                        <TableCell>${(quarter.grossProfit / 1e9).toFixed(2)}B</TableCell>
                        <TableCell>${(quarter.netIncome / 1e9).toFixed(2)}B</TableCell>
                        <TableCell>${quarter.eps.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">No quarterly data available</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            </div>
          </CardContent>
        </Card>

        {/* Annual Income Statement */}
        <Card>
          <CardHeader>
            <CardTitle>Annual Income Statements</CardTitle>
            <CardDescription>Last 5 years</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative border rounded-lg">
            <div className="overflow-auto">              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Gross Profit</TableHead>
                    <TableHead>Net Income</TableHead>
                    <TableHead>EPS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(companyData.financialsAnnual?.income) && companyData.financialsAnnual.income.length > 0 ? (
                    companyData.financialsAnnual.income.map((annual) => (
                      <TableRow key={annual.date}>
                        <TableCell>
                          <a 
                            href={annual.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {new Date(annual.date).getFullYear()}
                          </a>
                        </TableCell>
                        <TableCell>${(annual.revenue / 1e9).toFixed(2)}B</TableCell>
                        <TableCell>${(annual.grossProfit / 1e9).toFixed(2)}B</TableCell>
                        <TableCell>${(annual.netIncome / 1e9).toFixed(2)}B</TableCell>
                        <TableCell>${annual.eps.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">No annual data available</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>  
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 