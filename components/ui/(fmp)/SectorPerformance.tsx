import { useSectorPerformance } from '@/hooks/FMP/useSectorPerformance';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/Table";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/Card";
import { useState } from 'react';
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";

interface SectorPerformance {
  sector: string;
  changesPercentage: string;
}


export default function SectorPerformance() {
  const { data = [], isLoading, error } = useSectorPerformance();
  const router = useRouter();
  const [sortConfig, setSortConfig] = useState<{
    key: keyof SectorPerformance;
    direction: 'asc' | 'desc';
  } | null>(null);

  if (isLoading) {
    return (
      <Card className="border border-border/50 shadow-sm max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading sector data...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-border/50 shadow-sm max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-destructive">{error?.message}</div>
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig) return 0;

    let comparison = 0;
    if (sortConfig.key === 'sector') {
      comparison = a.sector.localeCompare(b.sector);
    } else {
      comparison = parseFloat(a.changesPercentage) - parseFloat(b.changesPercentage);
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  const requestSort = (key: keyof SectorPerformance) => {
    setSortConfig((currentSort) => {
      if (!currentSort || currentSort.key !== key) {
        return { key, direction: 'asc' };
      }
      if (currentSort.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };
  

  const handleSectorClick = (sector: string) => {
    router.push(`/scans/sectors/${encodeURIComponent(sector)}`);
  };

  return (
    <Card className="border border-border/50 shadow-sm max-w-2xl mx-auto bg-card">
      <CardHeader className="pb-3 space-y-2">
        <CardTitle className="text-xl font-semibold">Market Sectors</CardTitle>
        <CardDescription>
          Daily performance of major market sectors
          <br /><br />
          <span className="text-muted-foreground/75 italic text-sm">https://financialmodelingprep.com/api/v3/sector-performance?apikey=</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[200px]">
                <Button
                  variant="ghost"
                  onClick={() => requestSort('sector')}
                  className="hover:bg-transparent pl-0 font-semibold"
                >
                  Sector
                  <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TableHead>
              <TableHead className="w-[150px]">
                <Button
                  variant="ghost"
                  onClick={() => requestSort('changesPercentage')}
                  className="hover:bg-transparent pl-0 font-semibold"
                >
                  Performance
                  <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item, index) => (
              <TableRow 
                key={index}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSectorClick(item.sector)}
              >
                <TableCell className="font-medium">{item.sector}</TableCell>
                <TableCell className={cn(
                  "font-medium",
                  parseFloat(item.changesPercentage) >= 0 ? "text-positive" : "text-negative"
                )}>
                  {parseFloat(item.changesPercentage).toFixed(2)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 