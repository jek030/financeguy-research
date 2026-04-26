"use client";
import React, { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
// React Query caches useSectorStocks for 5 minutes, so navigating from the sector
// page resolves synchronously. We just filter the cached sector stocks by industry.
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Card, CardContent } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useSectorStocks } from '@/hooks/FMP/useSectorStocks';
import { pageStyles } from '@/components/ui/CompanyHeader';
import { formatMarketCap, formatNumber } from "@/lib/utils";
import { CELL_CLS, HEAD_CLS, SortButton, useSortableData } from '@/components/ui/(fmp)/screenerTable';

interface SectorStock {
  symbol: string;
  companyName: string;
  marketCap: number;
  sector: string;
  industry: string;
  price: number;
  volume: number;
  exchangeShortName: string;
  country: string;
}

export default function IndustryPage({ params }: { params: Promise<{ sector: string; industry: string }> }) {
  const [selectedCountry, setSelectedCountry] = useState<string>("US");

  const resolvedParams = use(params);
  const sector = decodeURIComponent(resolvedParams.sector);
  const industry = decodeURIComponent(resolvedParams.industry);

  const { data: apiSectorData = [], isLoading, error } = useSectorStocks(sector);

  const data = useMemo<SectorStock[]>(() => {
    const target = industry.trim().toLowerCase();
    return apiSectorData.filter(
      (stock) => stock.industry && stock.industry.trim().toLowerCase() === target
    );
  }, [apiSectorData, industry]);

  const countries = useMemo(() => {
    if (data.length === 0) return ["US"];
    const countrySet = new Set<string>();
    data.forEach((item) => {
      if (item.country) countrySet.add(item.country);
    });
    return Array.from(countrySet).sort();
  }, [data]);

  useEffect(() => {
    if (countries.includes("US")) {
      setSelectedCountry("US");
    } else if (countries.length > 0) {
      setSelectedCountry(countries[0]);
    }
  }, [countries]);

  const filteredData = useMemo(() => {
    if (selectedCountry === "All") return data;
    return data.filter((item) => item.country === selectedCountry);
  }, [data, selectedCountry]);

  const { sortConfig, requestSort, sortedData } = useSortableData<SectorStock>(filteredData);

  return (
    <div className={`flex flex-col min-h-screen ${pageStyles.gradientBg}`}>
      <main className="flex-1 px-2 md:px-3 py-2 md:py-3">
        <div className="w-full space-y-2">
          <Card className="border border-border/50 shadow-sm bg-card">
            <CardContent className="p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border/50">
                <div className="flex items-center gap-2 min-w-0">
                  <Link href="/screener" className="text-[11px] text-muted-foreground hover:text-foreground">
                    Sectors
                  </Link>
                  <span className="text-[11px] text-muted-foreground">/</span>
                  <Link
                    href={`/screener/sectors/${encodeURIComponent(sector)}`}
                    className="text-[11px] text-muted-foreground hover:text-foreground truncate"
                  >
                    {sector}
                  </Link>
                  <span className="text-[11px] text-muted-foreground">/</span>
                  <h2 className="text-sm font-semibold truncate">{industry}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="h-5 text-[11px]">{formatNumber(sortedData.length)} rows</Badge>
                  <div className="flex items-center gap-1">
                    <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Country</Label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger className="h-7 w-[120px] text-xs">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All</SelectItem>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="text-sm text-muted-foreground py-8 text-center">Loading industry data...</div>
              ) : error ? (
                <div className="text-sm text-destructive py-8 px-3">{error.message}</div>
              ) : sortedData.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">No stocks found for this industry.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={`sticky left-0 bg-background min-w-[80px] ${HEAD_CLS}`}>
                          <SortButton label="Symbol" column="symbol" sortConfig={sortConfig} onSort={requestSort} />
                        </TableHead>
                        <TableHead className={`min-w-[180px] ${HEAD_CLS}`}>
                          <SortButton label="Name" column="companyName" sortConfig={sortConfig} onSort={requestSort} />
                        </TableHead>
                        <TableHead className={`text-right ${HEAD_CLS}`}>
                          <SortButton label="Price" column="price" sortConfig={sortConfig} onSort={requestSort} align="right" />
                        </TableHead>
                        <TableHead className={`text-right ${HEAD_CLS}`}>
                          <SortButton label="Market Cap" column="marketCap" sortConfig={sortConfig} onSort={requestSort} align="right" />
                        </TableHead>
                        <TableHead className={HEAD_CLS}>
                          <SortButton label="Exchange" column="exchangeShortName" sortConfig={sortConfig} onSort={requestSort} />
                        </TableHead>
                        <TableHead className={HEAD_CLS}>
                          <SortButton label="Country" column="country" sortConfig={sortConfig} onSort={requestSort} />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedData.map((item, index) => (
                        <TableRow key={index} className="group hover:bg-muted">
                          <TableCell className={`sticky left-0 bg-background group-hover:bg-muted transition-colors font-medium ${CELL_CLS}`}>
                            <Link
                              href={`/search/${encodeURIComponent(item.symbol || '')}`}
                              className="hover:underline text-blue-600 dark:text-blue-400"
                            >
                              {item.symbol || '-'}
                            </Link>
                          </TableCell>
                          <TableCell className={`${CELL_CLS} truncate max-w-[260px]`}>{item.companyName || '-'}</TableCell>
                          <TableCell className={`${CELL_CLS} text-right tabular-nums`}>
                            {typeof item.price === 'number' && !isNaN(item.price) ? `$${item.price.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className={`${CELL_CLS} text-right tabular-nums`}>
                            {typeof item.marketCap === 'number' && !isNaN(item.marketCap) ? `$${formatMarketCap(item.marketCap)}` : '-'}
                          </TableCell>
                          <TableCell className={CELL_CLS}>{item.exchangeShortName || '-'}</TableCell>
                          <TableCell className={CELL_CLS}>{item.country || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
