'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { StockPosition, PositionExit } from '@/hooks/usePortfolio';
import {
  formatRMultiple,
  getPerExitR,
  getRealizedGain,
  getRMultiple,
} from '@/utils/portfolioCalculations';
import { format } from 'date-fns';

interface DraftExit {
  id: string;            // existing exit id, or 'new-N' for unsaved rows
  isNew: boolean;
  price: number;
  shares: number;
  exitDate: Date | null;
  notes: string;
}

export interface EditPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: StockPosition | null;
  onSavePosition: (
    positionId: string,
    updates: Partial<
      Omit<StockPosition, 'id' | 'exits' | 'realizedGain' | 'currentPrice'>
    >
  ) => Promise<void>;
  onAddExit: (
    positionId: string,
    exit: Omit<PositionExit, 'id' | 'positionId' | 'sortOrder'>
  ) => Promise<void>;
  onUpdateExit: (
    exitId: string,
    updates: Partial<Omit<PositionExit, 'id' | 'positionId'>>
  ) => Promise<void>;
  onDeleteExit: (exitId: string) => Promise<void>;
}

export function EditPositionModal({
  isOpen,
  onClose,
  position,
  onSavePosition,
  onAddExit,
  onUpdateExit,
  onDeleteExit,
}: EditPositionModalProps) {
  // Position-level draft state
  const [cost, setCost] = useState('');
  const [quantity, setQuantity] = useState('');
  const [initialStopLoss, setInitialStopLoss] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [openDate, setOpenDate] = useState<Date | undefined>(undefined);
  const [type, setType] = useState<'Long' | 'Short'>('Long');

  // Exits draft state
  const [draftExits, setDraftExits] = useState<DraftExit[]>([]);
  const [originalExitIds, setOriginalExitIds] = useState<Set<string>>(new Set());
  const [newExitCounter, setNewExitCounter] = useState(0);

  const [activeTab, setActiveTab] = useState<'position' | 'exits'>('exits');
  const [saving, setSaving] = useState(false);

  // Hydrate draft state on closed→open transition only. Re-hydrating on
  // every `position` prop change would clobber unsaved edits whenever a
  // background refetch updates the prop.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current && position) {
      setCost(position.cost.toString());
      setQuantity(position.quantity.toString());
      setInitialStopLoss(position.initialStopLoss.toString());
      setStopLoss(position.stopLoss.toString());
      setOpenDate(position.openDate);
      setType(position.type);
      setDraftExits(
        position.exits.map((e) => ({
          id: e.id,
          isNew: false,
          price: e.price,
          shares: e.shares,
          exitDate: e.exitDate,
          notes: e.notes ?? '',
        }))
      );
      setOriginalExitIds(new Set(position.exits.map((e) => e.id)));
      setNewExitCounter(0);
      const hasFilled = position.exits.some((e) => e.exitDate !== null);
      setActiveTab(hasFilled ? 'exits' : 'position');
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, position]);

  // Live validation: filled-only strict
  const filledShares = draftExits
    .filter((e) => e.exitDate !== null)
    .reduce((sum, e) => sum + (Number.isFinite(e.shares) ? e.shares : 0), 0);
  const plannedShares = draftExits.reduce(
    (sum, e) => sum + (Number.isFinite(e.shares) ? e.shares : 0),
    0
  );
  const quantityNum = parseFloat(quantity) || 0;
  const overFilled = filledShares > quantityNum && quantityNum > 0;

  // Live realized & R for the footer
  const draftPositionForCalc = useMemo(
    () => ({
      cost: parseFloat(cost) || 0,
      quantity: quantityNum,
      initialStopLoss: parseFloat(initialStopLoss) || 0,
      type,
      exits: draftExits
        .filter((e) => Number.isFinite(e.price) && Number.isFinite(e.shares))
        .map((e) => ({ price: e.price, shares: e.shares, exitDate: e.exitDate })),
    }),
    [cost, quantityNum, initialStopLoss, type, draftExits]
  );
  const realizedGainPreview = getRealizedGain(draftPositionForCalc);
  const rPreview = getRMultiple(draftPositionForCalc);

  const handleAddExit = () => {
    const lastPrice = draftExits[draftExits.length - 1]?.price ?? (parseFloat(cost) || 0);
    const id = `new-${newExitCounter}`;
    setDraftExits((prev) => [
      ...prev,
      { id, isNew: true, price: lastPrice, shares: 0, exitDate: null, notes: '' },
    ]);
    setNewExitCounter((n) => n + 1);
  };

  const handleRemoveExit = (id: string) => {
    const target = draftExits.find((e) => e.id === id);
    if (!target) return;

    // Filled rows: confirm
    if (target.exitDate !== null) {
      const confirmMsg = `Remove filled exit of ${target.shares} shares at $${target.price.toFixed(2)} on ${format(target.exitDate, 'yyyy-MM-dd')}? Realized gain will be recalculated.`;
      if (!window.confirm(confirmMsg)) return;
    }

    setDraftExits((prev) => prev.filter((e) => e.id !== id));
  };

  const handleUpdateDraft = (id: string, patch: Partial<DraftExit>) => {
    setDraftExits((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  };

  const handleSave = async () => {
    if (!position || saving) return;
    if (overFilled) {
      toast.error(
        `Filled exits exceed position size (${filledShares} / ${quantityNum} shares)`
      );
      return;
    }
    setSaving(true);
    try {
      // 1. Position-level updates
      const positionUpdates: Partial<
        Omit<StockPosition, 'id' | 'exits' | 'realizedGain' | 'currentPrice'>
      > = {};
      const costNum = parseFloat(cost);
      const qtyNum = parseFloat(quantity);
      const initSL = parseFloat(initialStopLoss);
      const sl = parseFloat(stopLoss);
      if (Number.isFinite(costNum) && costNum !== position.cost) positionUpdates.cost = costNum;
      if (Number.isFinite(qtyNum) && qtyNum !== position.quantity) positionUpdates.quantity = qtyNum;
      if (Number.isFinite(initSL) && initSL !== position.initialStopLoss) positionUpdates.initialStopLoss = initSL;
      if (Number.isFinite(sl) && sl !== position.stopLoss) positionUpdates.stopLoss = sl;
      if (openDate && openDate.getTime() !== position.openDate.getTime()) positionUpdates.openDate = openDate;
      if (type !== position.type) positionUpdates.type = type;

      if (Object.keys(positionUpdates).length > 0) {
        await onSavePosition(position.id, positionUpdates);
      }

      // 2. Diff exits: deletes -> updates -> adds
      const draftIds = new Set(draftExits.filter((e) => !e.isNew).map((e) => e.id));
      const toDelete = [...originalExitIds].filter((id) => !draftIds.has(id));
      for (const id of toDelete) {
        await onDeleteExit(id);
      }

      for (const draft of draftExits) {
        if (draft.isNew) continue;
        const original = position.exits.find((e) => e.id === draft.id);
        if (!original) continue;
        const updates: Partial<Omit<PositionExit, 'id' | 'positionId'>> = {};
        if (draft.price !== original.price) updates.price = draft.price;
        if (draft.shares !== original.shares) updates.shares = draft.shares;
        if (
          (draft.exitDate?.getTime() ?? null) !==
          (original.exitDate?.getTime() ?? null)
        ) {
          updates.exitDate = draft.exitDate;
        }
        if ((draft.notes || null) !== original.notes) {
          updates.notes = draft.notes || null;
        }
        if (Object.keys(updates).length > 0) {
          await onUpdateExit(draft.id, updates);
        }
      }

      for (const draft of draftExits) {
        if (!draft.isNew) continue;
        await onAddExit(position.id, {
          price: draft.price,
          shares: draft.shares,
          exitDate: draft.exitDate,
          notes: draft.notes || null,
        });
      }

      toast.success('Position saved');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!position) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Position — {position.symbol}</DialogTitle>
          <DialogDescription>
            Update position details and manage exit rows.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'position' | 'exits')}>
          <TabsList>
            <TabsTrigger value="position">Position</TabsTrigger>
            <TabsTrigger value="exits">
              Exits <span className="ml-1 text-xs text-muted-foreground">({draftExits.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="position" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'Long' | 'Short')}
                  className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                >
                  <option value="Long">Long</option>
                  <option value="Short">Short</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Cost</Label>
                <Input value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Quantity</Label>
                <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Initial Stop Loss</Label>
                <Input value={initialStopLoss} onChange={(e) => setInitialStopLoss(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Stop Loss</Label>
                <Input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Open Date</Label>
                <input
                  type="date"
                  value={openDate ? format(openDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                      setOpenDate(undefined);
                    } else {
                      // Parse as local date to avoid timezone shift.
                      const [y, m, d] = v.split('-').map(Number);
                      setOpenDate(new Date(y, m - 1, d));
                    }
                  }}
                  className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Closed Date</Label>
                <Input value={position.closedDate ? format(position.closedDate, 'yyyy-MM-dd') : '(auto)'} readOnly className="text-muted-foreground" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="exits" className="space-y-2 pt-3">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">Exit rows</div>
              <Button size="sm" variant="outline" onClick={handleAddExit}>
                <Plus className="h-3 w-3 mr-1" /> Add exit
              </Button>
            </div>

            {draftExits.length === 0 && (
              <div className="text-xs text-muted-foreground py-4 text-center">
                No exits yet. Click &quot;Add exit&quot; to plan one.
              </div>
            )}

            {draftExits.length > 0 && (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-right py-1 pr-2 font-medium">Price</th>
                    <th className="text-right py-1 pr-2 font-medium">Shares</th>
                    <th className="text-left py-1 pr-2 font-medium">Date</th>
                    <th className="text-left py-1 pr-2 font-medium">Notes</th>
                    <th className="text-right py-1 pr-2 font-medium">R</th>
                    <th className="py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {draftExits.map((draft) => {
                    const isPlanned = draft.exitDate === null;
                    const perR = getPerExitR(
                      { cost: parseFloat(cost) || 0, initialStopLoss: parseFloat(initialStopLoss) || 0, type },
                      { price: draft.price }
                    );
                    const rowOver = isPlanned ? false : filledShares > quantityNum && quantityNum > 0;
                    return (
                      <tr key={draft.id} className={`${isPlanned ? 'text-muted-foreground' : ''} ${rowOver ? 'bg-destructive/10' : ''}`}>
                        <td className="text-right py-1 pr-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={draft.price}
                            onChange={(e) =>
                              handleUpdateDraft(draft.id, { price: parseFloat(e.target.value) || 0 })
                            }
                            className="h-7 text-right text-xs"
                          />
                        </td>
                        <td className="text-right py-1 pr-2">
                          <Input
                            type="number"
                            value={draft.shares}
                            onChange={(e) =>
                              handleUpdateDraft(draft.id, { shares: parseFloat(e.target.value) || 0 })
                            }
                            className="h-7 text-right text-xs"
                          />
                        </td>
                        <td className="text-left py-1 pr-2">
                          <input
                            type="date"
                            value={draft.exitDate ? format(draft.exitDate, 'yyyy-MM-dd') : ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) {
                                handleUpdateDraft(draft.id, { exitDate: null });
                              } else {
                                const [y, m, d] = v.split('-').map(Number);
                                handleUpdateDraft(draft.id, { exitDate: new Date(y, m - 1, d) });
                              }
                            }}
                            className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs"
                          />
                        </td>
                        <td className="text-left py-1 pr-2">
                          <Input
                            value={draft.notes}
                            onChange={(e) => handleUpdateDraft(draft.id, { notes: e.target.value })}
                            placeholder="(optional)"
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="text-right py-1 pr-2 tabular-nums whitespace-nowrap">
                          {formatRMultiple(perR)}
                          {isPlanned && perR !== null && (
                            <span className="ml-1 text-[10px] uppercase tracking-wide bg-muted px-1 rounded">plan</span>
                          )}
                        </td>
                        <td className="py-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveExit(draft.id)}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div className={`flex flex-wrap gap-x-6 gap-y-1 text-xs pt-2 ${overFilled ? 'text-destructive' : 'text-muted-foreground'}`}>
              <div>Planned: <span className="font-medium tabular-nums">{plannedShares} / {quantityNum}</span> shares</div>
              <div>Filled: <span className="font-medium tabular-nums">{filledShares} / {quantityNum}</span> shares</div>
              <div>Realized: <span className="font-medium tabular-nums">${realizedGainPreview.toFixed(2)} ({formatRMultiple(rPreview)})</span></div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || overFilled}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
