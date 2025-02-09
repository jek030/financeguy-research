"use client"
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ScrollArea } from '@/components/ui/ScrollArea';
import type { CompanyOutlook } from '@/lib/types';

interface ExecutivesProps {
  companyData: CompanyOutlook;
}

function formatLargeNumber(num: number) {
  return new Intl.NumberFormat('en-US').format(num);
}

export const Executives: React.FC<ExecutivesProps> = ({ companyData }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Key Executives</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Pay</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead className="text-right">Year Born</TableHead>
                <TableHead className="text-right">Title Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(companyData.keyExecutives) && companyData.keyExecutives.length > 0 ? (
                companyData.keyExecutives.map((executive, index) => (
                  <TableRow key={`${executive.name}-${index}`}>
                    <TableCell className="font-medium">{executive.name}</TableCell>
                    <TableCell>{executive.title}</TableCell>
                    <TableCell className="text-right">
                      {executive.pay ? ` $${formatLargeNumber(executive.pay)}` : 'N/A'}
                    </TableCell>
                    <TableCell>{executive.gender || 'N/A'}</TableCell>
                    <TableCell className="text-right">{executive.yearBorn || 'N/A'}</TableCell>
                    <TableCell className="text-right">{executive.titleSince || 'N/A'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No executive data available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default Executives; 