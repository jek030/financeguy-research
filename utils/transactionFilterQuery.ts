import { BrokerageTransaction, SymbolSummary } from '@/lib/types/transactions';

export type FilterOperator = '=' | '!=' | '>' | '<' | '>=' | '<=';

type FieldType = 'string' | 'number' | 'date';

export interface FilterClause<TField extends string = string> {
  field: TField;
  operator: FilterOperator;
  value: string;
}

const OPERATOR_PATTERN = /\s*(=|!=|>=|<=|>|<)\s*/;

type TransactionFilterField =
  | 'date'
  | 'symbol'
  | 'action'
  | 'description'
  | 'quantity'
  | 'price'
  | 'feesAndComm'
  | 'amount';

type SymbolSummaryFilterField =
  | 'symbol'
  | 'description'
  | 'transactionCount'
  | 'totalBuyQuantity'
  | 'totalSellQuantity'
  | 'buyAmount'
  | 'sellAmount'
  | 'netAmount'
  | 'avgBuyPrice'
  | 'avgSellPrice'
  | 'totalFees';

const TRANSACTION_ALIASES: Record<string, TransactionFilterField> = {
  date: 'date',
  symbol: 'symbol',
  action: 'action',
  type: 'action',
  description: 'description',
  desc: 'description',
  qty: 'quantity',
  quantity: 'quantity',
  price: 'price',
  fees: 'feesAndComm',
  fee: 'feesAndComm',
  amount: 'amount',
};

const SYMBOL_SUMMARY_ALIASES: Record<string, SymbolSummaryFilterField> = {
  symbol: 'symbol',
  description: 'description',
  desc: 'description',
  transactions: 'transactionCount',
  transaction: 'transactionCount',
  txns: 'transactionCount',
  txn: 'transactionCount',
  count: 'transactionCount',
  'buy qty': 'totalBuyQuantity',
  buyqty: 'totalBuyQuantity',
  buyquantity: 'totalBuyQuantity',
  'sell qty': 'totalSellQuantity',
  sellqty: 'totalSellQuantity',
  sellquantity: 'totalSellQuantity',
  'buy $': 'buyAmount',
  buy: 'buyAmount',
  buyamount: 'buyAmount',
  'sell $': 'sellAmount',
  sell: 'sellAmount',
  sellamount: 'sellAmount',
  'net $': 'netAmount',
  net: 'netAmount',
  netamount: 'netAmount',
  'avg buy': 'avgBuyPrice',
  avgbuy: 'avgBuyPrice',
  'avg sell': 'avgSellPrice',
  avgsell: 'avgSellPrice',
  fees: 'totalFees',
  fee: 'totalFees',
};

const TRANSACTION_FIELD_TYPES: Partial<Record<TransactionFilterField, FieldType>> = {
  date: 'date',
  quantity: 'number',
  price: 'number',
  feesAndComm: 'number',
  amount: 'number',
};

const SYMBOL_SUMMARY_FIELD_TYPES: Partial<Record<SymbolSummaryFilterField, FieldType>> = {
  transactionCount: 'number',
  totalBuyQuantity: 'number',
  totalSellQuantity: 'number',
  buyAmount: 'number',
  sellAmount: 'number',
  netAmount: 'number',
  avgBuyPrice: 'number',
  avgSellPrice: 'number',
  totalFees: 'number',
};

function normalizeAliasKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeColumnName<TField extends string>(
  name: string,
  aliases: Record<string, TField>
): TField | null {
  const compact = normalizeAliasKey(name);

  for (const [alias, field] of Object.entries(aliases)) {
    if (normalizeAliasKey(alias) === compact) {
      return field;
    }
  }

  return null;
}

function parseSingleClause<TField extends string>(
  part: string,
  aliases: Record<string, TField>
): FilterClause<TField> | null {
  const trimmed = part.trim();
  if (!trimmed) return null;

  const opMatch = trimmed.match(OPERATOR_PATTERN);
  if (!opMatch || opMatch.index === undefined) return null;

  const operator = opMatch[1] as FilterOperator;
  const columnPart = trimmed.slice(0, opMatch.index).trim();
  const valuePart = trimmed.slice(opMatch.index + opMatch[0].length).trim();

  if (!columnPart || !valuePart) return null;

  const field = normalizeColumnName(columnPart, aliases);
  if (!field) return null;

  return { field, operator, value: valuePart };
}

function parseUserDate(value: string): Date | null {
  const trimmed = value.trim().replace(/^["']|["']$/g, '');
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function parseTransactionDate(dateStr: string): Date | null {
  const primary = dateStr.trim().split(/\s+as\s+of\s+/i)[0]?.split(' ')[0] ?? '';
  return parseUserDate(primary);
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function compareDates(left: Date, right: Date): number {
  return startOfDay(left) - startOfDay(right);
}

function parseNumericValue(value: string): number | null {
  const trimmed = value.trim().replace(/^["']|["']$/g, '');
  const normalized = trimmed.replace(/[$,]/g, '');
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function compareStrings(
  left: string,
  right: string,
  operator: FilterOperator
): boolean {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();

  switch (operator) {
    case '=':
      return a === b;
    case '!=':
      return a !== b;
    default:
      return false;
  }
}

function compareNumbers(
  left: number,
  right: number,
  operator: FilterOperator
): boolean {
  switch (operator) {
    case '=':
      return left === right;
    case '!=':
      return left !== right;
    case '>':
      return left > right;
    case '<':
      return left < right;
    case '>=':
      return left >= right;
    case '<=':
      return left <= right;
    default:
      return false;
  }
}

function parseFilterQueryForFields<TField extends string>(
  input: string,
  aliases: Record<string, TField>
): FilterClause<TField>[] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+and\s+/i);
  const clauses: FilterClause<TField>[] = [];

  for (const part of parts) {
    const clause = parseSingleClause(part, aliases);
    if (!clause) return null;
    clauses.push(clause);
  }

  return clauses.length > 0 ? clauses : null;
}

function matchesFilterClauseForRow<T, TField extends string>(
  row: T,
  clause: FilterClause<TField>,
  getFieldValue: (row: T, field: TField) => string | number | null,
  fieldTypes: Partial<Record<TField, FieldType>>
): boolean {
  const rawValue = getFieldValue(row, clause.field);
  const fieldType = fieldTypes[clause.field] ?? 'string';

  if (fieldType === 'date') {
    const rowDate = parseTransactionDate(String(rawValue ?? ''));
    const filterDate = parseUserDate(clause.value);
    if (!rowDate || !filterDate) return false;

    const comparison = compareDates(rowDate, filterDate);
    switch (clause.operator) {
      case '=':
        return comparison === 0;
      case '!=':
        return comparison !== 0;
      case '>':
        return comparison > 0;
      case '<':
        return comparison < 0;
      case '>=':
        return comparison >= 0;
      case '<=':
        return comparison <= 0;
      default:
        return false;
    }
  }

  if (fieldType === 'number') {
    const numericValue =
      typeof rawValue === 'number' ? rawValue : parseNumericValue(String(rawValue ?? ''));
    const filterValue = parseNumericValue(clause.value);
    if (numericValue === null || filterValue === null) return false;
    return compareNumbers(numericValue, filterValue, clause.operator);
  }

  const stringValue = String(rawValue ?? '');
  if (clause.operator === '=' || clause.operator === '!=') {
    return compareStrings(stringValue, clause.value, clause.operator);
  }

  const stringComparison = stringValue.localeCompare(clause.value, undefined, {
    sensitivity: 'base',
  });
  return compareNumbers(stringComparison, 0, clause.operator);
}

function matchesStructuredSearch<T, TField extends string>(
  row: T,
  input: string,
  aliases: Record<string, TField>,
  getFieldValue: (row: T, field: TField) => string | number | null,
  fieldTypes: Partial<Record<TField, FieldType>>
): boolean {
  const clauses = parseFilterQueryForFields(input, aliases);
  if (!clauses) return true;
  return clauses.every((clause) =>
    matchesFilterClauseForRow(row, clause, getFieldValue, fieldTypes)
  );
}

function matchesTextSearch(
  values: Array<string | number | null | undefined>,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return values.some((value) => {
    if (value === null || value === undefined) return false;
    return String(value).toLowerCase().includes(q);
  });
}

function getTransactionFieldValue(
  txn: BrokerageTransaction,
  field: TransactionFilterField
): string | number | null {
  switch (field) {
    case 'date':
      return txn.date;
    case 'symbol':
      return txn.symbol ?? '';
    case 'action':
      return txn.action;
    case 'description':
      return txn.description;
    case 'quantity':
      return txn.quantity;
    case 'price':
      return txn.price;
    case 'feesAndComm':
      return txn.feesAndComm;
    case 'amount':
      return txn.amount;
    default:
      return null;
  }
}

function getSymbolSummaryFieldValue(
  summary: SymbolSummary,
  field: SymbolSummaryFilterField
): string | number | null {
  switch (field) {
    case 'symbol':
      return summary.symbol;
    case 'description':
      return summary.description;
    case 'transactionCount':
      return summary.transactionCount;
    case 'totalBuyQuantity':
      return summary.totalBuyQuantity;
    case 'totalSellQuantity':
      return summary.totalSellQuantity;
    case 'buyAmount':
      return summary.buyAmount;
    case 'sellAmount':
      return summary.sellAmount;
    case 'netAmount':
      return summary.netAmount;
    case 'avgBuyPrice':
      return summary.avgBuyPrice;
    case 'avgSellPrice':
      return summary.avgSellPrice;
    case 'totalFees':
      return summary.totalFees;
    default:
      return null;
  }
}

export function parseFilterQuery(input: string): FilterClause<TransactionFilterField>[] | null {
  return parseFilterQueryForFields(input, TRANSACTION_ALIASES);
}

export function parseSymbolSummaryFilterQuery(
  input: string
): FilterClause<SymbolSummaryFilterField>[] | null {
  return parseFilterQueryForFields(input, SYMBOL_SUMMARY_ALIASES);
}

export function matchesTransactionSearch(
  txn: BrokerageTransaction,
  input: string
): boolean {
  const trimmed = input.trim();
  if (!trimmed) return true;

  if (parseFilterQueryForFields(trimmed, TRANSACTION_ALIASES)) {
    return matchesStructuredSearch(
      txn,
      trimmed,
      TRANSACTION_ALIASES,
      getTransactionFieldValue,
      TRANSACTION_FIELD_TYPES
    );
  }

  return matchesTextSearch(
    [
      txn.date,
      txn.action,
      txn.symbol,
      txn.description,
      txn.quantity,
      txn.price,
      txn.feesAndComm,
      txn.amount,
    ],
    trimmed
  );
}

export function matchesSymbolSummarySearch(
  summary: SymbolSummary,
  input: string
): boolean {
  const trimmed = input.trim();
  if (!trimmed) return true;

  if (parseFilterQueryForFields(trimmed, SYMBOL_SUMMARY_ALIASES)) {
    return matchesStructuredSearch(
      summary,
      trimmed,
      SYMBOL_SUMMARY_ALIASES,
      getSymbolSummaryFieldValue,
      SYMBOL_SUMMARY_FIELD_TYPES
    );
  }

  return matchesTextSearch(
    [
      summary.symbol,
      summary.description,
      summary.transactionCount,
      summary.totalBuyQuantity,
      summary.totalSellQuantity,
      summary.buyAmount,
      summary.sellAmount,
      summary.netAmount,
      summary.avgBuyPrice,
      summary.avgSellPrice,
      summary.totalFees,
    ],
    trimmed
  );
}
