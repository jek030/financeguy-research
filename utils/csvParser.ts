import Papa from 'papaparse';
import { TradeRecord, CSVFileData } from '@/lib/types/trading';

export interface CSVParseResult {
  success: boolean;
  data: CSVFileData;
  error?: string;
}

function parseNumericValue(value: string): number {
  if (!value || value.trim() === '') return 0;
  
  const trimmed = value.trim();
  
  // Check if value is wrapped in parentheses (indicating negative)
  const isNegative = trimmed.startsWith('(') && trimmed.endsWith(')');
  
  // Remove currency symbols, commas, parentheses, and quotes
  const cleaned = trimmed.replace(/[$,"()]/g, '').trim();
  const num = parseFloat(cleaned);
  
  if (isNaN(num)) return 0;
  
  // Apply negative sign if value was wrapped in parentheses
  return isNegative ? -Math.abs(num) : num;
}

function parseQuantity(value: string): number {
  if (!value || value.trim() === '') return 0;
  // Remove commas and quotes
  const cleaned = value.replace(/[,"]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseTradesCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            resolve({
              success: false,
              data: { summary: '', trades: [] },
              error: `CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`
            });
            return;
          }

          const rows = results.data as string[][];
          
          if (rows.length < 3) {
            resolve({
              success: false,
              data: { summary: '', trades: [] },
              error: 'CSV file must have at least 3 rows (summary, headers, and data)'
            });
            return;
          }

          // Extract summary from first row
          const summary = rows[0][0] || '';
          
          // Extract headers from second row
          const headers = rows[1];
          
          // Parse data rows (starting from row 3)
          const trades: TradeRecord[] = [];
          
          for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            
            // Skip empty rows
            if (!row || row.every(cell => !cell || cell.trim() === '')) {
              continue;
            }
            
            try {
              const openedDate = String(row[3] || '').trim();
              const closedDate = String(row[2] || '').trim();
              
              // Calculate days in trade
              let daysInTrade = 0;
              try {
                const openDate = new Date(openedDate);
                const closeDate = new Date(closedDate);
                if (!isNaN(openDate.getTime()) && !isNaN(closeDate.getTime())) {
                  const timeDiff = closeDate.getTime() - openDate.getTime();
                  daysInTrade = Math.round(timeDiff / (1000 * 3600 * 24));
                }
              } catch (error) {
                console.warn(`Could not calculate days in trade for row ${i + 1}`);
              }

              const trade: TradeRecord = {
                symbol: String(row[0] || '').toUpperCase().trim(),
                name: String(row[1] || '').trim(),
                closedDate,
                openedDate,
                quantity: parseQuantity(row[4] || '0'),
                proceedsPerShare: parseNumericValue(row[5] || '0'),
                costPerShare: parseNumericValue(row[6] || '0'),
                proceeds: parseNumericValue(row[7] || '0'),
                costBasis: parseNumericValue(row[8] || '0'),
                gainLoss: parseNumericValue(row[9] || '0'),
                gainLossPercent: parseNumericValue(row[10] || '0'),
                longTermGainLoss: parseNumericValue(row[11] || '0'),
                shortTermGainLoss: parseNumericValue(row[12] || '0'),
                term: (String(row[13] || '').trim() === 'Long Term' ? 'Long Term' : 'Short Term') as 'Short Term' | 'Long Term',
                unadjustedCostBasis: parseNumericValue(row[14] || '0'),
                washSale: String(row[15] || '').trim(),
                disallowedLoss: parseNumericValue(row[16] || '0'),
                transactionClosedDate: String(row[17] || '').trim(),
                transactionCostBasis: parseNumericValue(row[18] || '0'),
                totalTransactionGainLoss: parseNumericValue(row[19] || '0'),
                totalTransactionGainLossPercent: parseNumericValue(row[20] || '0'),
                ltTransactionGainLoss: parseNumericValue(row[21] || '0'),
                ltTransactionGainLossPercent: parseNumericValue(row[22] || '0'),
                stTransactionGainLoss: parseNumericValue(row[23] || '0'),
                stTransactionGainLossPercent: parseNumericValue(row[24] || '0'),
                daysInTrade,
              };

              // Validate required fields
              if (!trade.symbol || !trade.openedDate || !trade.closedDate) {
                console.warn(`Skipping row ${i + 1}: Missing required fields`);
                continue;
              }

              trades.push(trade);
            } catch (error) {
              console.warn(`Error parsing row ${i + 1}:`, error);
              continue;
            }
          }

          if (trades.length === 0) {
            resolve({
              success: false,
              data: { summary: '', trades: [] },
              error: 'No valid trade records found in the CSV file'
            });
            return;
          }

          resolve({
            success: true,
            data: {
              summary,
              trades
            }
          });
        } catch (error) {
          resolve({
            success: false,
            data: { summary: '', trades: [] },
            error: `Failed to process CSV data: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          data: { summary: '', trades: [] },
          error: `Failed to parse CSV file: ${error.message}`
        });
      }
    });
  });
} 