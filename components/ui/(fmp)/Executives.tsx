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
        <div className="relative border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead className="w-[220px]">Title</TableHead>
                <TableHead className="w-[100px] text-right">Pay</TableHead>
                <TableHead className="w-[70px]">Gender</TableHead>
                <TableHead className="w-[80px] text-right">Year Born</TableHead>
                <TableHead className="w-[100px] text-right">Title Since</TableHead>
              </TableRow>
            </TableHeader>
          </Table>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableBody>
                {Array.isArray(companyData.keyExecutives) && companyData.keyExecutives.length > 0 ? (
                  companyData.keyExecutives.map((executive, index) => (
                    <TableRow key={`${executive.name}-${index}`}>
                      <TableCell className="w-[200px] font-medium">{executive.name}</TableCell>
                      <TableCell className="w-[220px]">{executive.title}</TableCell>
                      <TableCell className="w-[100px] text-right">
                        {executive.pay ? `$${formatLargeNumber(executive.pay)}` : 'N/A'}
                      </TableCell>
                      <TableCell className="w-[70px]">{executive.gender || 'N/A'}</TableCell>
                      <TableCell className="w-[80px] text-right">{executive.yearBorn || 'N/A'}</TableCell>
                      <TableCell className="w-[100px] text-right">{executive.titleSince || 'N/A'}</TableCell>
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
        </div>
      </CardContent>
    </Card>
  );
};

export default Executives; 