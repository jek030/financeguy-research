"use client"
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
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
      <div className="relative border rounded-lg">
      <div className="h-[600px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-20">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Pay</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Year Born</TableHead>
                <TableHead>Title Since</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {Array.isArray(companyData.keyExecutives) && companyData.keyExecutives.length > 0 ? (
                  companyData.keyExecutives.map((executive, index) => (
                    <TableRow key={`${executive.name}-${index}`}>
                      <TableCell>{executive.name}</TableCell>
                      <TableCell>{executive.title}</TableCell>
                      <TableCell>
                        {executive.pay ? `$${formatLargeNumber(executive.pay)}` : 'N/A'}
                      </TableCell>
                      <TableCell>{executive.gender || 'N/A'}</TableCell>
                      <TableCell>{executive.yearBorn || 'N/A'}</TableCell>
                      <TableCell>{executive.titleSince || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No executive data available</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Executives; 