"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { parseTradesCSV } from '@/utils/csvParser';
import { TradeRecord, CSVFileData } from '@/lib/types/trading';
import { cn } from '@/lib/utils';

interface CsvUploaderProps {
  onDataLoaded: (data: CSVFileData) => void;
  className?: string;
}

export default function CsvUploader({ onDataLoaded, className }: CsvUploaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await parseTradesCSV(file);
      
      if (result.success) {
        onDataLoaded(result.data);
        setSuccess(`Successfully loaded ${result.data.trades.length} trade records`);
      } else {
        setError(result.error || 'Failed to parse CSV file');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [onDataLoaded]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/csv': ['.csv'],
    },
    multiple: false,
    disabled: isLoading,
  });

  return (
    <div className={cn("space-y-4", className)}>
      <Card 
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragActive && !isDragReject && "border-primary bg-primary/5",
          isDragReject && "border-destructive bg-destructive/5",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
          {isLoading ? (
            <>
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mb-4" />
              <p className="text-sm text-muted-foreground">Processing CSV file...</p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                {isDragActive ? (
                  <Upload className="h-8 w-8 text-primary" />
                ) : (
                  <FileText className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              
              <h3 className="text-lg font-semibold mb-2">
                {isDragActive 
                  ? "Drop your CSV file here" 
                  : "Upload Trading CSV"
                }
              </h3>
              
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your realized trades CSV file here, or click to browse
              </p>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Expected format: Summary row, header row, then data rows</p>
                <p>Key columns: Symbol, Opened Date, Closed Date, Quantity, Proceeds, Cost Basis, Gain/Loss, Term</p>
                <p>Supported formats: .csv files only</p>
              </div>
              
              <Button 
                variant="outline" 
                className="mt-4"
                disabled={isLoading}
              >
                Select CSV File
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div>
            <h4 className="font-semibold">Upload Error</h4>
            <p className="text-sm">{error}</p>
          </div>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <div>
            <h4 className="font-semibold">Upload Successful</h4>
            <p className="text-sm">{success}</p>
          </div>
        </Alert>
      )}
    </div>
  );
} 