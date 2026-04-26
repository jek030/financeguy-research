"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatMarketCap, formatNumber } from '@/lib/utils';
import { CompanyScreenerFilters, CompanyScreenerItem, useCompanyScreener } from '@/hooks/FMP/useCompanyScreener';
import { useAvailableSectors } from '@/hooks/FMP/useAvailableSectors';
import { useAvailableIndustries } from '@/hooks/FMP/useAvailableIndustries';
import { useAvailableCountries } from '@/hooks/FMP/useAvailableCountries';
import { CELL_CLS, HEAD_CLS, SortButton, useSortableData } from './screenerTable';

type BooleanFilter = 'any' | 'true' | 'false';

interface CompanyScreenerFormState {
  sector: string;
  industry: string;
  country: string;
  exchange: string;
  marketCapMoreThan: string;
  marketCapLowerThan: string;
  priceMoreThan: string;
  priceLowerThan: string;
  betaMoreThan: string;
  betaLowerThan: string;
  volumeMoreThan: string;
  volumeLowerThan: string;
  dividendMoreThan: string;
  dividendLowerThan: string;
  isEtf: BooleanFilter;
  isFund: BooleanFilter;
  isActivelyTrading: BooleanFilter;
  limit: string;
}

const DEFAULT_FORM_STATE: CompanyScreenerFormState = {
  sector: '',
  industry: '',
  country: 'US',
  exchange: '',
  marketCapMoreThan: '250000000',
  marketCapLowerThan: '',
  priceMoreThan: '5',
  priceLowerThan: '',
  betaMoreThan: '',
  betaLowerThan: '',
  volumeMoreThan: '100000',
  volumeLowerThan: '',
  dividendMoreThan: '',
  dividendLowerThan: '',
  isEtf: 'false',
  isFund: 'any',
  isActivelyTrading: 'true',
  limit: '100',
};

const DEFAULT_APPLIED_FILTERS: CompanyScreenerFilters = {
  country: 'US',
  marketCapMoreThan: 250000000,
  priceMoreThan: 5,
  volumeMoreThan: 100000,
  isEtf: false,
  isActivelyTrading: true,
  limit: 100,
};

const ANY_OPTION_VALUE = '__any';

const EXCHANGE_OPTIONS = ['NASDAQ', 'NYSE', 'AMEX', 'CBOE', 'OTC', 'PNK', 'CNQ'] as const;

function parseNumber(value: string): number | undefined {
  const trimmed = value.replace(/,/g, '').trim();
  if (trimmed === '') {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

// Format a numeric string for display: keeps integer parts comma-grouped,
// preserves trailing decimal points (e.g., "1234." while typing) and decimal digits.
function formatNumericInput(value: string): string {
  if (value === '') return '';
  const cleaned = value.replace(/,/g, '');
  if (cleaned === '-' || cleaned === '.') return cleaned;
  const isNegative = cleaned.startsWith('-');
  const unsigned = isNegative ? cleaned.slice(1) : cleaned;
  const [intPart, decPart] = unsigned.split('.');
  const intNum = intPart === '' ? '' : Number(intPart);
  if (intPart !== '' && Number.isNaN(intNum)) return value;
  const formattedInt = intPart === '' ? '' : (intNum as number).toLocaleString('en-US');
  const result = decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
  return isNegative ? `-${result}` : result;
}

function stripCommas(value: string): string {
  return value.replace(/,/g, '');
}

function parseBooleanFilter(value: BooleanFilter): boolean | undefined {
  if (value === 'any') return undefined;
  return value === 'true';
}

function buildFilters(form: CompanyScreenerFormState): CompanyScreenerFilters {
  return {
    sector: form.sector.trim() || undefined,
    industry: form.industry.trim() || undefined,
    country: form.country.trim() || undefined,
    exchange: form.exchange.trim() || undefined,
    marketCapMoreThan: parseNumber(form.marketCapMoreThan),
    marketCapLowerThan: parseNumber(form.marketCapLowerThan),
    priceMoreThan: parseNumber(form.priceMoreThan),
    priceLowerThan: parseNumber(form.priceLowerThan),
    betaMoreThan: parseNumber(form.betaMoreThan),
    betaLowerThan: parseNumber(form.betaLowerThan),
    volumeMoreThan: parseNumber(form.volumeMoreThan),
    volumeLowerThan: parseNumber(form.volumeLowerThan),
    dividendMoreThan: parseNumber(form.dividendMoreThan),
    dividendLowerThan: parseNumber(form.dividendLowerThan),
    isEtf: parseBooleanFilter(form.isEtf),
    isFund: parseBooleanFilter(form.isFund),
    isActivelyTrading: parseBooleanFilter(form.isActivelyTrading),
    limit: parseNumber(form.limit),
  };
}

function countActiveFilters(filters: CompanyScreenerFilters): number {
  return Object.entries(filters).filter(([key, value]) => {
    if (key === 'limit') return false;
    if (key === 'isActivelyTrading' && value === true) return false;
    if (key === 'country' && value === 'US') return false;
    if (key === 'marketCapMoreThan' && value === 250000000) return false;
    if (key === 'priceMoreThan' && value === 5) return false;
    if (key === 'volumeMoreThan' && value === 100000) return false;
    if (key === 'isEtf' && value === false) return false;
    return value !== undefined && value !== '' && value !== null;
  }).length;
}

interface RangeRowProps {
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
}

function RangeRow({ label, minValue, maxValue, onMinChange, onMaxChange, minPlaceholder, maxPlaceholder }: RangeRowProps) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="flex gap-1">
        <Input
          value={formatNumericInput(minValue)}
          onChange={(event) => onMinChange(stripCommas(event.target.value))}
          placeholder={minPlaceholder ?? 'Min'}
          inputMode="decimal"
          className="h-8 text-xs"
        />
        <Input
          value={formatNumericInput(maxValue)}
          onChange={(event) => onMaxChange(stripCommas(event.target.value))}
          placeholder={maxPlaceholder ?? 'Max'}
          inputMode="decimal"
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

export default function CompanyScreener() {
  const [formState, setFormState] = useState<CompanyScreenerFormState>(DEFAULT_FORM_STATE);
  const [appliedFilters, setAppliedFilters] = useState<CompanyScreenerFilters>(DEFAULT_APPLIED_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const { data = [], isLoading, isFetching, error } = useCompanyScreener(appliedFilters);
  const { sortConfig, requestSort, sortedData } = useSortableData<CompanyScreenerItem>(data);
  const { data: availableSectors = [], isLoading: isLoadingSectors } = useAvailableSectors();
  const { data: availableCountries = [], isLoading: isLoadingCountries } = useAvailableCountries();
  const {
    data: availableIndustries = [],
    isLoading: isLoadingIndustries,
  } = useAvailableIndustries(formState.sector || undefined);
  const countryOptions = useMemo(() => {
    if (availableCountries.includes('US')) {
      return availableCountries;
    }

    return ['US', ...availableCountries];
  }, [availableCountries]);

  const activeFilterCount = useMemo(() => countActiveFilters(appliedFilters), [appliedFilters]);

  const updateField = <K extends keyof CompanyScreenerFormState>(
    key: K,
    value: CompanyScreenerFormState[K]
  ) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const handleApplyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedFilters(buildFilters(formState));
  };

  const handleResetFilters = () => {
    setFormState(DEFAULT_FORM_STATE);
    setAppliedFilters(DEFAULT_APPLIED_FILTERS);
  };

  useEffect(() => {
    if (formState.industry && !availableIndustries.includes(formState.industry)) {
      setFormState((current) => ({ ...current, industry: '' }));
    }
  }, [availableIndustries, formState.industry]);

  return (
    <Card className="border border-border/50 shadow-sm bg-card">
      <CardContent className="p-0">
        <form onSubmit={handleApplyFilters}>
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/50">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground/80"
            >
              {filtersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </button>
            <div className="flex items-center gap-2">
              {isFetching && <span className="text-[11px] text-muted-foreground">Refreshing...</span>}
              <Badge variant="outline" className="h-5 text-[11px]">{formatNumber(sortedData.length)} rows</Badge>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleResetFilters}>
                Reset
              </Button>
              <Button type="submit" size="sm" className="h-7 px-3 text-xs">
                Apply
              </Button>
            </div>
          </div>

          {filtersOpen && (
            <div className="px-3 py-3 border-b border-border/50 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Sector</Label>
                <Select
                  value={formState.sector || ANY_OPTION_VALUE}
                  onValueChange={(value) => {
                    const nextSector = value === ANY_OPTION_VALUE ? '' : value;
                    updateField('sector', nextSector);
                    updateField('industry', '');
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={isLoadingSectors ? 'Loading...' : 'Any'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY_OPTION_VALUE}>Any</SelectItem>
                    {availableSectors.map((sector) => (
                      <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Industry</Label>
                <Select
                  value={formState.industry || ANY_OPTION_VALUE}
                  onValueChange={(value) =>
                    updateField('industry', value === ANY_OPTION_VALUE ? '' : value)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue
                      placeholder={isLoadingIndustries ? 'Loading...' : 'Any'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY_OPTION_VALUE}>Any</SelectItem>
                    {availableIndustries.map((industry) => (
                      <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Country</Label>
                <Select
                  value={formState.country || ANY_OPTION_VALUE}
                  onValueChange={(value) =>
                    updateField('country', value === ANY_OPTION_VALUE ? '' : value)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={isLoadingCountries ? 'Loading...' : 'Any'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY_OPTION_VALUE}>Any</SelectItem>
                    {countryOptions.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Exchange</Label>
                <Select
                  value={formState.exchange || ANY_OPTION_VALUE}
                  onValueChange={(value) =>
                    updateField('exchange', value === ANY_OPTION_VALUE ? '' : value)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY_OPTION_VALUE}>Any</SelectItem>
                    {EXCHANGE_OPTIONS.map((exchange) => (
                      <SelectItem key={exchange} value={exchange}>{exchange}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">ETF</Label>
                <Select value={formState.isEtf} onValueChange={(value) => updateField('isEtf', value as BooleanFilter)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Fund</Label>
                <Select value={formState.isFund} onValueChange={(value) => updateField('isFund', value as BooleanFilter)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <RangeRow
                label="Market Cap"
                minValue={formState.marketCapMoreThan}
                maxValue={formState.marketCapLowerThan}
                onMinChange={(v) => updateField('marketCapMoreThan', v)}
                onMaxChange={(v) => updateField('marketCapLowerThan', v)}
              />
              <RangeRow
                label="Price"
                minValue={formState.priceMoreThan}
                maxValue={formState.priceLowerThan}
                onMinChange={(v) => updateField('priceMoreThan', v)}
                onMaxChange={(v) => updateField('priceLowerThan', v)}
              />
              <RangeRow
                label="Volume"
                minValue={formState.volumeMoreThan}
                maxValue={formState.volumeLowerThan}
                onMinChange={(v) => updateField('volumeMoreThan', v)}
                onMaxChange={(v) => updateField('volumeLowerThan', v)}
              />
              <RangeRow
                label="Beta"
                minValue={formState.betaMoreThan}
                maxValue={formState.betaLowerThan}
                onMinChange={(v) => updateField('betaMoreThan', v)}
                onMaxChange={(v) => updateField('betaLowerThan', v)}
              />
              <RangeRow
                label="Dividend"
                minValue={formState.dividendMoreThan}
                maxValue={formState.dividendLowerThan}
                onMinChange={(v) => updateField('dividendMoreThan', v)}
                onMaxChange={(v) => updateField('dividendLowerThan', v)}
              />

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Actively Trading</Label>
                <Select
                  value={formState.isActivelyTrading}
                  onValueChange={(value) => updateField('isActivelyTrading', value as BooleanFilter)}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Limit</Label>
                <Input
                  value={formatNumericInput(formState.limit)}
                  onChange={(event) => updateField('limit', stripCommas(event.target.value))}
                  placeholder="100"
                  inputMode="numeric"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
        </form>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading company screener data...</div>
        ) : error ? (
          <div className="text-sm text-destructive py-8 px-3">{error.message}</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No matches found. Update filters and try again.</div>
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
                  <TableHead className={`text-right ${HEAD_CLS}`}>
                    <SortButton label="Volume" column="volume" sortConfig={sortConfig} onSort={requestSort} align="right" />
                  </TableHead>
                  <TableHead className={`text-right ${HEAD_CLS}`}>
                    <SortButton label="Dividend" column="lastAnnualDividend" sortConfig={sortConfig} onSort={requestSort} align="right" />
                  </TableHead>
                  <TableHead className={`text-right ${HEAD_CLS}`}>
                    <SortButton label="Beta" column="beta" sortConfig={sortConfig} onSort={requestSort} align="right" />
                  </TableHead>
                  <TableHead className={HEAD_CLS}>
                    <SortButton label="Sector" column="sector" sortConfig={sortConfig} onSort={requestSort} />
                  </TableHead>
                  <TableHead className={HEAD_CLS}>
                    <SortButton label="Industry" column="industry" sortConfig={sortConfig} onSort={requestSort} />
                  </TableHead>
                  <TableHead className={HEAD_CLS}>
                    <SortButton label="Country" column="country" sortConfig={sortConfig} onSort={requestSort} />
                  </TableHead>
                  <TableHead className={HEAD_CLS}>
                    <SortButton label="Exchange" column="exchangeShortName" sortConfig={sortConfig} onSort={requestSort} />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((item) => (
                  <TableRow key={`${item.symbol}-${item.exchangeShortName || item.exchange}`} className="group hover:bg-muted">
                    <TableCell className={`sticky left-0 bg-background group-hover:bg-muted transition-colors font-medium ${CELL_CLS}`}>
                      <Link
                        href={`/search/${encodeURIComponent(item.symbol)}`}
                        className="hover:underline text-blue-600 dark:text-blue-400"
                      >
                        {item.symbol}
                      </Link>
                    </TableCell>
                    <TableCell className={`${CELL_CLS} truncate max-w-[260px]`}>{item.companyName || '-'}</TableCell>
                    <TableCell className={`${CELL_CLS} text-right tabular-nums`}>{typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className={`${CELL_CLS} text-right tabular-nums`}>{typeof item.marketCap === 'number' ? `$${formatMarketCap(item.marketCap)}` : '-'}</TableCell>
                    <TableCell className={`${CELL_CLS} text-right tabular-nums`}>{typeof item.volume === 'number' ? formatNumber(item.volume) : '-'}</TableCell>
                    <TableCell className={`${CELL_CLS} text-right tabular-nums`}>{typeof item.lastAnnualDividend === 'number' ? item.lastAnnualDividend.toFixed(2) : '-'}</TableCell>
                    <TableCell className={`${CELL_CLS} text-right tabular-nums`}>{typeof item.beta === 'number' ? item.beta.toFixed(2) : '-'}</TableCell>
                    <TableCell className={CELL_CLS}>{item.sector || '-'}</TableCell>
                    <TableCell className={CELL_CLS}>{item.industry || '-'}</TableCell>
                    <TableCell className={CELL_CLS}>{item.country || '-'}</TableCell>
                    <TableCell className={CELL_CLS}>{item.exchangeShortName || item.exchange || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
