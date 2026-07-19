"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Upload, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { RawTransactionFile, TransactionFile } from '@/lib/types/transactions';
import { parseTransactionFile } from '@/utils/transactionCalculations';

interface JsonUploaderProps {
  onDataLoaded: (data: TransactionFile) => void;
  onDataCleared?: () => void;
  className?: string;
}

export default function JsonUploader({ onDataLoaded, onDataCleared, className }: JsonUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedData = localStorage.getItem('transactions-data');
      const storedFilename = localStorage.getItem('transactions-filename');
      if (storedData) {
        setIsLoaded(true);
        setFileName(storedFilename ?? 'transactions.json');
      }
    } catch (error) {
      console.warn('Could not restore uploader state from localStorage:', error);
    }
  }, []);

  const processFile = useCallback((file: File) => {
    setError(null);
    setIsLoaded(false);

    if (!file.name.endsWith('.json')) {
      setError('Please upload a JSON file');
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const rawData = JSON.parse(content) as RawTransactionFile;
        
        // Validate structure
        if (!rawData.BrokerageTransactions || !Array.isArray(rawData.BrokerageTransactions)) {
          setError('Invalid file format: Missing BrokerageTransactions array');
          return;
        }

        const parsedData = parseTransactionFile(rawData);
        setFileName(file.name);
        setIsLoaded(true);
        onDataLoaded(parsedData);

        // Save to localStorage for persistence
        try {
          localStorage.setItem('transactions-data', JSON.stringify(parsedData));
          localStorage.setItem('transactions-filename', file.name);
        } catch (storageError) {
          console.warn('Could not save to localStorage:', storageError);
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        setError('Failed to parse JSON file. Please check the file format.');
      }
    };

    reader.onerror = () => {
      setError('Failed to read file');
    };

    reader.readAsText(file);
  }, [onDataLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleClear = useCallback(() => {
    setFileName(null);
    setIsLoaded(false);
    setError(null);
    localStorage.removeItem('transactions-data');
    localStorage.removeItem('transactions-filename');
    onDataCleared?.();
  }, [onDataCleared]);

  return (
    <div className={cn("w-full font-sans", className)}>
      {isLoaded && fileName ? (
        <div className="flex items-center gap-2 rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-2">
          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-300" />
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{fileName}</p>
          <Button variant="ghost" size="sm" className="h-6 w-6 shrink-0 p-0" onClick={handleClear}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "relative flex items-center gap-2.5 rounded-lg border border-dashed px-3 py-2.5 transition-colors",
            isDragging
              ? "border-violet-400 bg-violet-500/10"
              : "border-border bg-card/80 hover:border-primary/50",
            error && "border-red-500/50 bg-red-500/5"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border",
              isDragging ? "bg-violet-500/20" : "bg-indigo-500/15"
            )}
          >
            <Upload
              className={cn(
                "h-3.5 w-3.5",
                isDragging ? "text-violet-600 dark:text-violet-300" : "text-muted-foreground"
              )}
            />
          </div>
          <p className="text-xs font-medium text-foreground">
            {isDragging ? "Drop JSON file" : "Drop JSON or browse"}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1.5">
          <p className="text-[11px] text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}
