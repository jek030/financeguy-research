"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { BrokerageTransaction, OPTION_ACTIONS, TRADE_ACTIONS, isOptionAction } from '@/lib/types/transactions';
import { usePortfolio, StockPosition } from '@/hooks/usePortfolio';
import { useAuth } from '@/lib/context/auth-context';
import { calculateRPriceTargets, getRemainingShares } from '@/utils/portfolioCalculations';
import { formatCurrency } from '@/utils/transactionCalculations';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddToPortfolioModalProps {
  transaction: BrokerageTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Mode = 'new' | 'offset';
const OPTION_CONTRACT_MULTIPLIER = 100;

function isOpeningAction(action: string): boolean {
  return action === 'Buy' || action === 'Sell Short' || action === 'Buy to Open' || action === 'Sell to Open';
}

function getDefaultMode(action: string): Mode {
  if (isOpeningAction(action)) return 'new';
  return 'offset';
}

function getPositionType(action: string): 'Long' | 'Short' {
  if (
    action === 'Sell Short' ||
    action === 'Buy to Cover' ||
    action === 'Sell to Open' ||
    action === 'Buy to Close'
  ) {
    return 'Short';
  }
  return 'Long';
}

function parseTxnDate(dateStr: string): Date {
  const cleaned = dateStr.replace(/\s+as of.*$/i, '').trim();
  const parsed = new Date(cleaned);
  if (isNaN(parsed.getTime())) return new Date();
  return parsed;
}

export default function AddToPortfolioModal({
  transaction,
  open,
  onOpenChange,
}: AddToPortfolioModalProps) {
  const { user } = useAuth();
  const {
    portfolio,
    portfolios,
    positions,
    isLoading: portfolioLoading,
    selectPortfolio,
    addPosition,
    addExit,
  } = usePortfolio();

  const [mode, setMode] = useState<Mode>('new');
  const [selectedPortfolioKey, setSelectedPortfolioKey] = useState<string>('');
  const [stopLoss, setStopLoss] = useState('');
  const [selectedPositionId, setSelectedPositionId] = useState<string>('');
  const [offsetQty, setOffsetQty] = useState('');
  const [offsetNotes, setOffsetNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const isOptionTransaction = Boolean(transaction && isOptionAction(transaction.action));

  // Sync the local dropdown to whichever portfolio the hook already loaded
  useEffect(() => {
    if (portfolio && !selectedPortfolioKey) {
      setSelectedPortfolioKey(String(portfolio.portfolio_key));
    }
  }, [portfolio, selectedPortfolioKey]);

  // Reset form state when transaction changes or dialog opens
  useEffect(() => {
    if (transaction && open) {
      setMode(getDefaultMode(transaction.action));
      setStopLoss('');
      setSelectedPositionId('');
      setOffsetQty(transaction.quantity ? Math.abs(transaction.quantity).toString() : '');
      setOffsetNotes('');
      setSubmitError(null);
      setSubmitSuccess(false);
    }
  }, [transaction, open]);

  const handlePortfolioChange = (value: string) => {
    setSelectedPortfolioKey(value);
    setSelectedPositionId('');
    selectPortfolio(Number(value));
  };

  // Filter open positions matching the transaction's symbol
  const matchingPositions = useMemo(() => {
    if (!transaction) return [];
    return positions.filter(
      (p) =>
        p.symbol === transaction.symbol &&
        !p.closedDate
    );
  }, [positions, transaction]);

  const selectedPosition = useMemo(() => {
    return positions.find((p) => p.id === selectedPositionId) || null;
  }, [positions, selectedPositionId]);

  // Auto-select position if there's only one match
  useEffect(() => {
    if (matchingPositions.length === 1 && !selectedPositionId) {
      setSelectedPositionId(matchingPositions[0].id);
    }
  }, [matchingPositions, selectedPositionId]);

  // Computed values for new position
  const newPositionPreview = useMemo(() => {
    if (!transaction || !transaction.price || !transaction.quantity) return null;
    const cost = transaction.price;
    const contractsOrShares = Math.abs(transaction.quantity);
    const qty = isOptionTransaction
      ? contractsOrShares * OPTION_CONTRACT_MULTIPLIER
      : contractsOrShares;
    const type = getPositionType(transaction.action);
    const sl = parseFloat(stopLoss);
    const effectiveStop = !isNaN(sl) && sl > 0 ? sl : 0;
    const rTargets = calculateRPriceTargets(cost, effectiveStop, type);

    return {
      symbol: transaction.symbol,
      cost,
      quantity: qty,
      displayQuantity: contractsOrShares,
      netCost: cost * qty,
      type,
      openDate: parseTxnDate(transaction.date),
      rTargets,
    };
  }, [isOptionTransaction, stopLoss, transaction]);

  // Remaining (unfilled) shares on the selected position.
  const remainingShares = useMemo(() => {
    if (!selectedPosition) return 0;
    return getRemainingShares(selectedPosition);
  }, [selectedPosition]);

  // Computed values for offset
  const offsetPreview = useMemo(() => {
    if (!transaction || !selectedPosition || !transaction.price) return null;
    const sellPrice = transaction.price;

    const offsetInput = parseFloat(offsetQty) || 0;
    const soldQty = isOptionTransaction
      ? offsetInput * OPTION_CONTRACT_MULTIPLIER
      : offsetInput;
    if (soldQty <= 0) return null;

    const gainPerShare =
      selectedPosition.type === 'Long'
        ? sellPrice - selectedPosition.cost
        : selectedPosition.cost - sellPrice;
    const gainIncrement = gainPerShare * soldQty;
    const willClose = soldQty >= remainingShares;

    return {
      sellPrice,
      gainPerShare,
      gainIncrement,
      soldQty,
      displayQty: offsetInput,
      willClose,
    };
  }, [isOptionTransaction, transaction, selectedPosition, offsetQty, remainingShares]);

  const handleSubmitNewPosition = async () => {
    if (!transaction || !newPositionPreview) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const sl = parseFloat(stopLoss);
      const resolvedStopLoss = !isNaN(sl) && sl > 0 ? sl : 0;
      const newPosition: Omit<StockPosition, 'id' | 'exits' | 'realizedGain'> = {
        symbol: newPositionPreview.symbol,
        cost: newPositionPreview.cost,
        quantity: newPositionPreview.quantity,
        netCost: newPositionPreview.netCost,
        initialStopLoss: resolvedStopLoss,
        stopLoss: resolvedStopLoss,
        type: newPositionPreview.type,
        openDate: newPositionPreview.openDate,
        closedDate: null,
      };

      await addPosition(newPosition);
      setSubmitSuccess(true);
      setTimeout(() => onOpenChange(false), 1200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add position');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitOffset = async () => {
    if (!selectedPosition || !offsetPreview || !transaction) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const trimmed = offsetNotes.trim();
      await addExit(selectedPosition.id, {
        price: offsetPreview.sellPrice,
        shares: offsetPreview.soldQty,
        exitDate: parseTxnDate(transaction.date),
        notes: trimmed.length > 0 ? trimmed : null,
      });
      setSubmitSuccess(true);
      setTimeout(() => onOpenChange(false), 1200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update position');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmitNew =
    !!selectedPortfolioKey &&
    !!newPositionPreview &&
    (isOptionTransaction || parseFloat(stopLoss) > 0);

  const canSubmitOffset =
    !!selectedPortfolioKey &&
    !!selectedPositionId &&
    !!offsetPreview &&
    offsetPreview.soldQty > 0;

  if (!transaction) return null;

  const canHandleAction =
    TRADE_ACTIONS.includes(transaction.action as typeof TRADE_ACTIONS[number]) ||
    OPTION_ACTIONS.includes(transaction.action as typeof OPTION_ACTIONS[number]);
  if (!canHandleAction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Portfolio</DialogTitle>
          <DialogDescription>
            {transaction.action} {transaction.quantity ? Math.abs(transaction.quantity) : 0}{' '}
            {isOptionTransaction ? 'contracts' : 'shares'}{' '}
            <span className="font-semibold text-foreground">{transaction.symbol}</span>
            {transaction.price ? ` @ ${formatCurrency(transaction.price)}` : ''}
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Sign in to add transactions to your portfolio.
          </div>
        ) : portfolioLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : submitSuccess ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium">
              {mode === 'new' ? 'Position added' : 'Position updated'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Portfolio Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Portfolio</Label>
              <Select
                value={selectedPortfolioKey}
                onValueChange={handlePortfolioChange}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select portfolio" />
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((p) => (
                    <SelectItem key={String(p.portfolio_key)} value={String(p.portfolio_key)}>
                      {p.portfolio_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mode Toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs">Action</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode('new')}
                  className={cn(
                    'rounded-md border px-3 py-2 text-xs font-medium transition-colors',
                    mode === 'new'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                  )}
                >
                  New Position
                </button>
                <button
                  onClick={() => setMode('offset')}
                  className={cn(
                    'rounded-md border px-3 py-2 text-xs font-medium transition-colors',
                    mode === 'offset'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                  )}
                >
                  Offset Existing
                </button>
              </div>
            </div>

            {mode === 'new' ? (
              <NewPositionForm
                preview={newPositionPreview}
                stopLoss={stopLoss}
                onStopLossChange={setStopLoss}
                isOptionTransaction={isOptionTransaction}
              />
            ) : (
              <OffsetForm
                transaction={transaction}
                matchingPositions={matchingPositions}
                selectedPositionId={selectedPositionId}
                onPositionSelect={setSelectedPositionId}
                offsetQty={offsetQty}
                onOffsetQtyChange={setOffsetQty}
                offsetNotes={offsetNotes}
                onOffsetNotesChange={setOffsetNotes}
                preview={offsetPreview}
                selectedPosition={selectedPosition}
                remainingShares={remainingShares}
                isOptionTransaction={isOptionTransaction}
              />
            )}

            {submitError && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-red-500/10 text-red-500 text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {submitError}
              </div>
            )}
          </div>
        )}

        {user && !portfolioLoading && !submitSuccess && (
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                isSubmitting || (mode === 'new' ? !canSubmitNew : !canSubmitOffset)
              }
              onClick={mode === 'new' ? handleSubmitNewPosition : handleSubmitOffset}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === 'new' ? (
                'Add Position'
              ) : (
                'Apply Offset'
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewPositionForm({
  preview,
  stopLoss,
  onStopLossChange,
  isOptionTransaction,
}: {
  preview: {
    symbol: string;
    cost: number;
    quantity: number;
    displayQuantity: number;
    netCost: number;
    type: 'Long' | 'Short';
    openDate: Date;
    rTargets: { priceTarget2R: number; priceTarget5R: number };
  } | null;
  stopLoss: string;
  onStopLossChange: (v: string) => void;
  isOptionTransaction: boolean;
}) {
  if (!preview) return null;

  return (
    <div className="space-y-3">
      {/* Read-only fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Symbol</Label>
          <div className="text-sm font-semibold font-mono">{preview.symbol}</div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Type</Label>
          <div className={cn(
            'text-sm font-semibold',
            preview.type === 'Long' ? 'text-emerald-500' : 'text-red-500'
          )}>
            {preview.type}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Cost Basis</Label>
          <div className="text-sm font-mono">{formatCurrency(preview.cost)}</div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">
            {isOptionTransaction ? 'Contracts' : 'Quantity'}
          </Label>
          <div className="text-sm font-mono">
            {isOptionTransaction
              ? `${preview.displayQuantity.toLocaleString()} (${preview.quantity.toLocaleString()} sh eq)`
              : preview.quantity.toLocaleString()}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Net Cost</Label>
          <div className="text-sm font-mono">{formatCurrency(preview.netCost)}</div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Open Date</Label>
          <div className="text-sm font-mono">
            {preview.openDate.toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Stop Loss Input */}
      <div className="space-y-1.5">
        <Label className="text-xs" htmlFor="stop-loss">
          Initial Stop Loss {!isOptionTransaction && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id="stop-loss"
          type="number"
          step="0.01"
          placeholder={isOptionTransaction ? 'Optional (default 0)' : (preview.type === 'Long' ? 'Below entry price' : 'Above entry price')}
          value={stopLoss}
          onChange={(e) => onStopLossChange(e.target.value)}
          className="h-8 text-sm font-mono"
        />
        {stopLoss && parseFloat(stopLoss) > 0 && (
          <div className="text-[10px] text-muted-foreground">
            Risk per share: {formatCurrency(Math.abs(preview.cost - parseFloat(stopLoss)))}
          </div>
        )}
      </div>

      {/* R Targets Preview */}
      {preview.rTargets.priceTarget2R > 0 && preview.rTargets.priceTarget5R > 0 && (
        <div className="rounded-md border border-border/50 bg-muted/20 p-2.5 space-y-1">
          <div className="text-[10px] font-medium text-muted-foreground">Price Targets</div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-muted-foreground">2R: </span>
              <span className="text-emerald-500">
                {formatCurrency(preview.rTargets.priceTarget2R)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">5R: </span>
              <span className="text-emerald-500">
                {formatCurrency(preview.rTargets.priceTarget5R)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OffsetForm({
  transaction,
  matchingPositions,
  selectedPositionId,
  onPositionSelect,
  offsetQty,
  onOffsetQtyChange,
  offsetNotes,
  onOffsetNotesChange,
  preview,
  selectedPosition,
  remainingShares,
  isOptionTransaction,
}: {
  transaction: BrokerageTransaction;
  matchingPositions: StockPosition[];
  selectedPositionId: string;
  onPositionSelect: (id: string) => void;
  offsetQty: string;
  onOffsetQtyChange: (v: string) => void;
  offsetNotes: string;
  onOffsetNotesChange: (v: string) => void;
  preview: {
    sellPrice: number;
    gainPerShare: number;
    gainIncrement: number;
    willClose: boolean;
    soldQty: number;
    displayQty: number;
  } | null;
  selectedPosition: StockPosition | null;
  remainingShares: number;
  isOptionTransaction: boolean;
}) {
  if (matchingPositions.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-md bg-muted text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4 shrink-0" />
        No open positions found for {transaction.symbol} in this portfolio.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Position Selector */}
      <div className="space-y-1.5">
        <Label className="text-xs">Position to Offset</Label>
        <Select value={selectedPositionId} onValueChange={onPositionSelect}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select position" />
          </SelectTrigger>
          <SelectContent>
            {matchingPositions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.symbol} · {p.type} · {p.quantity} shares @ {formatCurrency(p.cost)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPosition && (
        <>
          {/* Current Position Info */}
          <div className="rounded-md border border-border/50 bg-muted/20 p-2.5 space-y-1">
            <div className="text-[10px] font-medium text-muted-foreground">Current Position</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Qty: </span>
                <span className="font-mono font-semibold">{selectedPosition.quantity}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cost: </span>
                <span className="font-mono">{formatCurrency(selectedPosition.cost)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining: </span>
                <span className="font-mono font-semibold">{remainingShares}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Gain: </span>
                <span className={cn(
                  'font-mono',
                  selectedPosition.realizedGain >= 0 ? 'text-emerald-500' : 'text-red-500'
                )}>
                  {formatCurrency(selectedPosition.realizedGain)}
                </span>
              </div>
            </div>
          </div>

          {/* Quantity to Offset */}
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="offset-qty">
              {isOptionTransaction ? 'Contracts to Close' : 'Shares to Sell'}
            </Label>
            <Input
              id="offset-qty"
              type="number"
              min="1"
              value={offsetQty}
              onChange={(e) => onOffsetQtyChange(e.target.value)}
              className="h-8 text-sm font-mono"
            />
          </div>

          {/* Notes (freeform; copied to the exit row's notes column) */}
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="offset-notes">Notes</Label>
            <Input
              id="offset-notes"
              value={offsetNotes}
              onChange={(e) => onOffsetNotesChange(e.target.value)}
              placeholder="(optional)"
              className="h-8 text-sm"
            />
          </div>

          {/* Offset Preview */}
          {preview && (
            <div className="rounded-md border border-border/50 bg-muted/20 p-2.5 space-y-1.5">
              <div className="text-[10px] font-medium text-muted-foreground">Preview</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isOptionTransaction ? 'Contracts' : 'Shares'}</span>
                  <span className="font-mono">{isOptionTransaction ? preview.displayQty : preview.soldQty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gain/share</span>
                  <span className={cn(
                    'font-mono',
                    preview.gainPerShare >= 0 ? 'text-emerald-500' : 'text-red-500'
                  )}>
                    {formatCurrency(preview.gainPerShare)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total gain from offset</span>
                  <span className={cn(
                    'font-mono font-semibold',
                    preview.gainIncrement >= 0 ? 'text-emerald-500' : 'text-red-500'
                  )}>
                    {formatCurrency(preview.gainIncrement)}
                  </span>
                </div>
                {preview.willClose && (
                  <div className="mt-1 text-[10px] font-medium text-amber-500">
                    Position will be closed
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
