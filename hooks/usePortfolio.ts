import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, SupabasePortfolio, SupabasePortfolioPosition, SupabasePositionExit } from '@/lib/supabase';
import { useAuth } from '@/lib/context/auth-context';
import { useUserPreferences } from './useUserPreferences';
import {
  calculateRPriceTargets,
  getRealizedGain,
  isFullyClosed,
} from '@/utils/portfolioCalculations';

const SELECTED_PORTFOLIO_STORAGE_KEY = 'financeguy-selected-portfolio';

const normalizePortfolioKey = (key: number | string): number => {
  return typeof key === 'string' ? parseInt(key, 10) : key;
};

const formatDateForDb = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateOpenRiskPercentage = (cost: number, stopLoss: number): number => {
  if (!Number.isFinite(cost) || cost <= 0) {
    return 0;
  }
  if (!Number.isFinite(stopLoss) || stopLoss <= 0) {
    return 0;
  }
  return ((stopLoss - cost) / cost) * 100;
};

export interface PositionExit {
  id: string;
  positionId: string;
  price: number;
  shares: number;
  exitDate: Date | null;
  notes: string | null;
  sortOrder: number;
}

export interface StockPosition {
  id: string;
  symbol: string;
  cost: number;
  quantity: number;
  netCost: number;
  initialStopLoss: number;
  stopLoss: number;
  type: 'Long' | 'Short';
  openDate: Date;
  closedDate: Date | null;
  exits: PositionExit[];
  realizedGain: number;
  currentPrice?: number;
}

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<SupabasePortfolio | null>(null);
  const [portfolios, setPortfolios] = useState<SupabasePortfolio[]>([]);
  const [selectedPortfolioKey, setSelectedPortfolioKey] = useState<number | null>(null);
  const [positions, setPositions] = useState<StockPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitializedSelectionRef = useRef(false);
  const selectedPortfolioKeyRef = useRef<number | null>(null);
  const { user } = useAuth();
  const {
    defaultPortfolioKey,
    setDefaultPortfolio,
    isLoading: prefsLoading,
  } = useUserPreferences();

  useEffect(() => {
    selectedPortfolioKeyRef.current = selectedPortfolioKey;
  }, [selectedPortfolioKey]);

  // Helper function to parse date string as local date (not UTC)
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const mapSupabaseExitToPositionExit = (
    data: SupabasePositionExit,
    positionId: string
  ): PositionExit => ({
    id: data.id,
    positionId,
    price: data.price,
    shares: data.shares,
    exitDate: data.exit_date ? parseLocalDate(data.exit_date) : null,
    notes: data.notes,
    sortOrder: data.sort_order,
  });

  const sortExitsForDisplay = (exits: PositionExit[]): PositionExit[] => {
    const filled = exits
      .filter((e) => e.exitDate !== null)
      .sort((a, b) => a.exitDate!.getTime() - b.exitDate!.getTime());
    const planned = exits
      .filter((e) => e.exitDate === null)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return [...filled, ...planned];
  };

  type SupabasePositionWithExits = SupabasePortfolioPosition & {
    tblPositionExits?: SupabasePositionExit[] | null;
  };

  const mapSupabaseToPosition = (data: SupabasePositionWithExits): StockPosition => {
    const stopLossValue =
      data.initial_stop_loss <= 0
        ? 0
        : data.cost * (1 + data.open_risk / 100);

    const positionId = `${data.portfolio_key}-${data.trade_key}`;
    const rawExits = (data.tblPositionExits ?? []).map((e) =>
      mapSupabaseExitToPositionExit(e, positionId)
    );
    const exits = sortExitsForDisplay(rawExits);
    const type = data.type as 'Long' | 'Short';

    const realizedGain = getRealizedGain({
      cost: data.cost,
      quantity: data.quantity,
      initialStopLoss: data.initial_stop_loss,
      type,
      exits,
    });

    return {
      id: positionId,
      symbol: data.symbol,
      cost: data.cost,
      quantity: data.quantity,
      netCost: data.net_cost,
      initialStopLoss: data.initial_stop_loss,
      stopLoss: stopLossValue,
      type,
      openDate: parseLocalDate(data.open_date),
      closedDate: data.close_date ? parseLocalDate(data.close_date) : null,
      exits,
      realizedGain,
    };
  };

  // Convert our app's position to Supabase format
  const mapPositionToSupabase = (
    position: Omit<StockPosition, 'id' | 'exits' | 'realizedGain'>,
    portfolioKey: number | string,
    tradeKey?: number | string
  ) => {
    const now = new Date();
    const endDate = position.closedDate || now;
    const diffTime = Math.abs(endDate.getTime() - position.openDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const openRiskPercentage = calculateOpenRiskPercentage(position.cost, position.stopLoss);

    const portfolioValue = portfolio?.portfolio_value || 0;
    const equity = position.cost * position.quantity;
    const portfolioPercent = portfolioValue > 0 ? (equity / portfolioValue) * 100 : 0;

    const baseData = {
      portfolio_key: portfolioKey,
      symbol: position.symbol,
      type: position.type,
      cost: position.cost,
      quantity: position.quantity,
      net_cost: position.netCost,
      equity,
      percent_of_portfolio: portfolioPercent,
      initial_stop_loss: position.initialStopLoss,
      open_risk: openRiskPercentage,
      open_heat: 0,
      realized_gain: 0,
      open_date: formatDateForDb(position.openDate),
      close_date: position.closedDate ? formatDateForDb(position.closedDate) : null,
      days_in_trade: diffDays,
    };

    if (tradeKey !== undefined) {
      return { ...baseData, trade_key: tradeKey };
    }

    return baseData;
  };

  const fetchPositionsForPortfolio = async (portfolioKey: number) => {
    console.log('Fetching positions for portfolio_key:', portfolioKey);

    const { data: positionsData, error: positionsError } = await supabase
      .from('tblPortfolioPositions')
      .select('*, tblPositionExits (*)')
      .eq('portfolio_key', portfolioKey)
      .order('trade_key', { ascending: true });

    if (positionsError) {
      console.error('Positions query error:', positionsError);
      throw positionsError;
    }

    if (positionsData) {
      const mappedPositions = positionsData.map(mapSupabaseToPosition);
      setPositions(mappedPositions);
      return mappedPositions;
    }

    setPositions([]);
    return [] as StockPosition[];
  };

  // Fetch portfolios and positions
  const fetchPortfolio = async (overridePortfolioKey?: number) => {
    if (!user) {
      setPortfolio(null);
      setPortfolios([]);
      setPositions([]);
      setSelectedPortfolioKey(null);
      hasInitializedSelectionRef.current = false;
      selectedPortfolioKeyRef.current = null;
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching portfolios for user:', user.id);

      const { data: portfolioData, error: portfolioError } = await supabase
        .from('tblPortfolio')
        .select('*')
        .eq('user_id', user.id)
        .order('portfolio_key', { ascending: true });

      if (portfolioError) {
        console.error('Portfolio query error:', portfolioError);
        throw portfolioError;
      }

      let normalizedPortfolios = (portfolioData ?? []).map((item) => ({
        ...item,
        portfolio_key: normalizePortfolioKey(item.portfolio_key),
      }));

      if (normalizedPortfolios.length === 0) {
        const newPortfolio = {
          user_id: user.id,
          user_email: user.email || '',
          portfolio_value: 0,
          portfolio_name: 'My Portfolio',
        };

        console.log('Creating new portfolio for user:', newPortfolio);

        const { data: createdPortfolio, error: createError } = await supabase
          .from('tblPortfolio')
          .insert(newPortfolio)
          .select()
          .single();

        if (createError) {
          console.error('Portfolio creation error:', createError);
          throw createError;
        }

        const normalizedCreated = {
          ...createdPortfolio,
          portfolio_key: normalizePortfolioKey(createdPortfolio.portfolio_key),
        };

        normalizedPortfolios = [normalizedCreated];
      }

      let storedSelectedKey: number | null = null;

      if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem(SELECTED_PORTFOLIO_STORAGE_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!Number.isNaN(parsed)) {
            storedSelectedKey = parsed;
          }
        }
      }

      const hasPortfolioKey = (key: number | null) =>
        key !== null && normalizedPortfolios.some((item) => normalizePortfolioKey(item.portfolio_key) === key);

      const initialDefaultKey = hasPortfolioKey(defaultPortfolioKey) ? defaultPortfolioKey : null;
      const storedKey = hasPortfolioKey(storedSelectedKey) ? storedSelectedKey : null;
      const currentSelectedKey = hasPortfolioKey(selectedPortfolioKeyRef.current) ? selectedPortfolioKeyRef.current : null;
      const firstPortfolioKey = normalizedPortfolios.length > 0
        ? normalizePortfolioKey(normalizedPortfolios[0].portfolio_key)
        : null;

      let targetKey: number | null;
      if (overridePortfolioKey !== undefined && hasPortfolioKey(overridePortfolioKey)) {
        // Explicit user actions always win.
        targetKey = overridePortfolioKey;
      } else if (!hasInitializedSelectionRef.current) {
        // First load: honor default/favorite behavior.
        targetKey = initialDefaultKey ?? storedKey ?? currentSelectedKey ?? firstPortfolioKey;
      } else {
        // Refreshes: keep current selection stable when still valid.
        targetKey = currentSelectedKey ?? storedKey ?? initialDefaultKey ?? firstPortfolioKey;
      }

      let currentPortfolio =
        targetKey !== null
          ? normalizedPortfolios.find((item) => normalizePortfolioKey(item.portfolio_key) === targetKey)
          : undefined;

      if (!currentPortfolio && normalizedPortfolios.length > 0) {
        currentPortfolio = normalizedPortfolios[0];
        targetKey = normalizePortfolioKey(currentPortfolio.portfolio_key);
      }

      setPortfolios(normalizedPortfolios);
      setPortfolio(currentPortfolio ?? null);
      setSelectedPortfolioKey(targetKey ?? null);

      if (currentPortfolio) {
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(
              SELECTED_PORTFOLIO_STORAGE_KEY,
              String(normalizePortfolioKey(currentPortfolio.portfolio_key))
            );
          } catch {
            // Ignore storage write errors
          }
        }

        await fetchPositionsForPortfolio(normalizePortfolioKey(currentPortfolio.portfolio_key));
      } else {
        setPositions([]);
      }

      hasInitializedSelectionRef.current = true;
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
    } finally {
      setIsLoading(false);
    }
  };

  const selectPortfolio = (portfolioKey: number) => {
    const normalizedKey = normalizePortfolioKey(portfolioKey);
    setSelectedPortfolioKey(normalizedKey);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SELECTED_PORTFOLIO_STORAGE_KEY, String(normalizedKey));
      } catch {
        // Ignore storage write errors
      }
    }

    return fetchPortfolio(normalizedKey);
  };

  // Add a new position
  const addPosition = async (position: Omit<StockPosition, 'id' | 'exits' | 'realizedGain'>) => {
    if (!portfolio) {
      throw new Error('No portfolio found');
    }

    try {
      const supabasePosition = mapPositionToSupabase(position, portfolio.portfolio_key);

      const { data: insertedPosition, error: positionError } = await supabase
        .from('tblPortfolioPositions')
        .insert(supabasePosition)
        .select()
        .single();

      if (positionError) throw positionError;

      const rTargets = calculateRPriceTargets(
        position.cost,
        position.initialStopLoss,
        position.type
      );

      if (rTargets.priceTarget2R > 0 && rTargets.priceTarget5R > 0) {
        const seedRows = [
          {
            position_id: insertedPosition.trade_key,
            price: rTargets.priceTarget2R,
            shares: 0,
            exit_date: null,
            notes: null,
            sort_order: 0,
          },
          {
            position_id: insertedPosition.trade_key,
            price: rTargets.priceTarget5R,
            shares: 0,
            exit_date: null,
            notes: null,
            sort_order: 1,
          },
        ];

        const { error: exitsError } = await supabase
          .from('tblPositionExits')
          .insert(seedRows);

        if (exitsError) {
          await supabase
            .from('tblPortfolioPositions')
            .delete()
            .eq('trade_key', insertedPosition.trade_key);
          throw exitsError;
        }
      }

      const { data: refetched, error: refetchError } = await supabase
        .from('tblPortfolioPositions')
        .select('*, tblPositionExits (*)')
        .eq('trade_key', insertedPosition.trade_key)
        .single();

      if (refetchError) throw refetchError;

      const newPosition = mapSupabaseToPosition(refetched);
      setPositions((prev) => [...prev, newPosition]);
    } catch (err) {
      console.error('Error adding position:', err);
      throw err;
    }
  };

  const recomputeClosedDate = async (
    positionId: string,
    cost: number,
    quantity: number,
    initialStopLoss: number,
    type: 'Long' | 'Short'
  ): Promise<string | null> => {
    const [, tradeKeyStr] = positionId.split('-');
    const tradeKey = parseInt(tradeKeyStr, 10);

    const { data: exitsData, error: exitsErr } = await supabase
      .from('tblPositionExits')
      .select('*')
      .eq('position_id', tradeKey);

    if (exitsErr) throw exitsErr;

    const exits = (exitsData ?? []).map((e) =>
      mapSupabaseExitToPositionExit(e, positionId)
    );

    const closed = isFullyClosed({ cost, quantity, initialStopLoss, type, exits });
    const newClosedDate = closed
      ? exits
          .filter((e) => e.exitDate !== null)
          .reduce<Date | null>(
            (max, e) => (max === null || e.exitDate! > max ? e.exitDate : max),
            null
          )
      : null;

    const newClosedDateStr = newClosedDate ? formatDateForDb(newClosedDate) : null;

    const realized = getRealizedGain({ cost, quantity, initialStopLoss, type, exits });

    await supabase
      .from('tblPortfolioPositions')
      .update({ close_date: newClosedDateStr, realized_gain: realized })
      .eq('trade_key', tradeKey);

    return newClosedDateStr;
  };

  const validateFilledShares = (
    positionId: string,
    candidateExits: PositionExit[],
    quantity: number
  ): void => {
    const filled = candidateExits
      .filter((e) => e.exitDate !== null)
      .reduce((sum, e) => sum + e.shares, 0);
    if (filled > quantity) {
      throw new Error(
        `Filled exits exceed position size (${filled} / ${quantity} shares)`
      );
    }
  };

  const addExit = async (
    positionId: string,
    exit: Omit<PositionExit, 'id' | 'positionId' | 'sortOrder'>
  ): Promise<void> => {
    const position = positions.find((p) => p.id === positionId);
    if (!position) throw new Error('Position not found');

    validateFilledShares(
      positionId,
      [...position.exits, { ...exit, id: 'temp', positionId, sortOrder: 0 }],
      position.quantity
    );

    const [, tradeKeyStr] = positionId.split('-');
    const tradeKey = parseInt(tradeKeyStr, 10);

    const nextSortOrder =
      position.exits.length > 0
        ? Math.max(...position.exits.map((e) => e.sortOrder)) + 1
        : 0;

    const { error } = await supabase.from('tblPositionExits').insert({
      position_id: tradeKey,
      price: exit.price,
      shares: exit.shares,
      exit_date: exit.exitDate ? formatDateForDb(exit.exitDate) : null,
      notes: exit.notes,
      sort_order: nextSortOrder,
    });

    if (error) throw error;

    await recomputeClosedDate(
      positionId,
      position.cost,
      position.quantity,
      position.initialStopLoss,
      position.type
    );

    await fetchPositionsForPortfolio(parseInt(positionId.split('-')[0], 10));
  };

  const updateExit = async (
    exitId: string,
    updates: Partial<Omit<PositionExit, 'id' | 'positionId'>>
  ): Promise<void> => {
    const position = positions.find((p) => p.exits.some((e) => e.id === exitId));
    if (!position) throw new Error('Exit not found');

    const original = position.exits.find((e) => e.id === exitId)!;
    const candidate: PositionExit = {
      ...original,
      ...updates,
    };

    validateFilledShares(
      position.id,
      position.exits.map((e) => (e.id === exitId ? candidate : e)),
      position.quantity
    );

    const supabaseUpdates: Partial<SupabasePositionExit> = {};
    if (updates.price !== undefined) supabaseUpdates.price = updates.price;
    if (updates.shares !== undefined) supabaseUpdates.shares = updates.shares;
    if (updates.exitDate !== undefined) {
      supabaseUpdates.exit_date = updates.exitDate ? formatDateForDb(updates.exitDate) : null;
    }
    if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes;
    if (updates.sortOrder !== undefined) supabaseUpdates.sort_order = updates.sortOrder;

    const { error } = await supabase
      .from('tblPositionExits')
      .update(supabaseUpdates)
      .eq('id', exitId);

    if (error) throw error;

    await recomputeClosedDate(
      position.id,
      position.cost,
      position.quantity,
      position.initialStopLoss,
      position.type
    );

    await fetchPositionsForPortfolio(parseInt(position.id.split('-')[0], 10));
  };

  const deleteExit = async (exitId: string): Promise<void> => {
    const position = positions.find((p) => p.exits.some((e) => e.id === exitId));
    if (!position) throw new Error('Exit not found');

    const { error } = await supabase.from('tblPositionExits').delete().eq('id', exitId);
    if (error) throw error;

    await recomputeClosedDate(
      position.id,
      position.cost,
      position.quantity,
      position.initialStopLoss,
      position.type
    );

    await fetchPositionsForPortfolio(parseInt(position.id.split('-')[0], 10));
  };

  // Update an existing position
  const updatePosition = async (
    positionId: string,
    updates: Partial<
      Omit<StockPosition, 'id' | 'exits' | 'realizedGain' | 'currentPrice'>
    >
  ) => {
    if (!portfolio) {
      throw new Error('No portfolio found');
    }

    const currentPosition = positions.find((p) => p.id === positionId);
    if (!currentPosition) {
      throw new Error('Position not found');
    }

    const [portfolioKeyStr, tradeKeyStr] = positionId.split('-');
    const portfolioKey = parseInt(portfolioKeyStr, 10);
    const tradeKey = parseInt(tradeKeyStr, 10);

    const supabaseUpdates: Partial<SupabasePortfolioPosition> = {};

    if (updates.symbol !== undefined) supabaseUpdates.symbol = updates.symbol;
    if (updates.cost !== undefined) supabaseUpdates.cost = updates.cost;
    if (updates.quantity !== undefined) supabaseUpdates.quantity = updates.quantity;
    if (updates.netCost !== undefined) supabaseUpdates.net_cost = updates.netCost;
    if (updates.stopLoss !== undefined) {
      const cost = updates.cost !== undefined ? updates.cost : currentPosition.cost;
      supabaseUpdates.open_risk = calculateOpenRiskPercentage(cost, updates.stopLoss);
    }
    if (updates.type !== undefined) supabaseUpdates.type = updates.type;
    if (updates.openDate !== undefined) supabaseUpdates.open_date = formatDateForDb(updates.openDate);
    if (updates.closedDate !== undefined) {
      supabaseUpdates.close_date = updates.closedDate ? formatDateForDb(updates.closedDate) : null;
    }
    if (updates.initialStopLoss !== undefined) {
      supabaseUpdates.initial_stop_loss = updates.initialStopLoss;
    }

    if (updates.cost !== undefined || updates.quantity !== undefined) {
      const cost = updates.cost ?? currentPosition.cost;
      const quantity = updates.quantity ?? currentPosition.quantity;
      const filledShares = currentPosition.exits
        .filter((e) => e.exitDate !== null)
        .reduce((sum, e) => sum + e.shares, 0);
      const remaining = quantity - filledShares;
      const equity = cost * remaining;
      const portfolioValue = portfolio.portfolio_value || 0;
      supabaseUpdates.equity = equity;
      supabaseUpdates.percent_of_portfolio = portfolioValue > 0 ? (equity / portfolioValue) * 100 : 0;
    }

    if (updates.openDate !== undefined || updates.closedDate !== undefined) {
      const openDate = updates.openDate || currentPosition.openDate;
      const endDate = updates.closedDate || new Date();
      const diffTime = Math.abs(endDate.getTime() - openDate.getTime());
      supabaseUpdates.days_in_trade = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    if (Object.keys(supabaseUpdates).length === 0) {
      return;
    }

    const { error } = await supabase
      .from('tblPortfolioPositions')
      .update(supabaseUpdates)
      .eq('portfolio_key', portfolioKey)
      .eq('trade_key', tradeKey);

    if (error) throw error;

    await fetchPositionsForPortfolio(portfolioKey);
  };

  // Delete a position
  const deletePosition = async (positionId: string) => {
    if (!portfolio) {
      throw new Error('No portfolio found');
    }

    try {
      const [portfolioKeyStr, tradeKeyStr] = positionId.split('-');
      const portfolioKey = parseInt(portfolioKeyStr, 10);
      const tradeKey = parseInt(tradeKeyStr, 10);

      const { error } = await supabase
        .from('tblPortfolioPositions')
        .delete()
        .eq('portfolio_key', portfolioKey)
        .eq('trade_key', tradeKey);

      if (error) {
        throw error;
      }

      setPositions(prev => prev.filter(p => p.id !== positionId));
    } catch (err) {
      console.error('Error deleting position:', err);
      throw err;
    }
  };

  // Update portfolio value
  const updatePortfolioValue = async (value: number) => {
    if (!portfolio) {
      throw new Error('No portfolio found');
    }

    try {
      const currentKey = normalizePortfolioKey(portfolio.portfolio_key);

      const { error } = await supabase
        .from('tblPortfolio')
        .update({ portfolio_value: value })
        .eq('portfolio_key', portfolio.portfolio_key);

      if (error) {
        throw error;
      }

      setPortfolio(prev => prev ? { ...prev, portfolio_value: value } : null);
      setPortfolios(prev => prev.map(item => {
        if (normalizePortfolioKey(item.portfolio_key) === currentKey) {
          return { ...item, portfolio_value: value };
        }
        return item;
      }));

      // Recalculate percent_of_portfolio for all positions
      if (value > 0) {
        const updateRequests = positions.map((position) => {
          const filledShares = position.exits
            .filter((e) => e.exitDate !== null)
            .reduce((sum, e) => sum + e.shares, 0);
          const remaining = position.quantity - filledShares;
          const equity = position.cost * remaining;
          const portfolioPercent = (equity / value) * 100;

          const [portfolioKeyStr, tradeKeyStr] = position.id.split('-');
          const portfolioKey = parseInt(portfolioKeyStr, 10);
          const tradeKey = parseInt(tradeKeyStr, 10);

          return supabase
            .from('tblPortfolioPositions')
            .update({ percent_of_portfolio: portfolioPercent, equity: equity })
            .eq('portfolio_key', portfolioKey)
            .eq('trade_key', tradeKey);
        });

        await Promise.all(updateRequests);
      }
    } catch (err) {
      console.error('Error updating portfolio value:', err);
      throw err;
    }
  };

  // Update portfolio name and value
  const updatePortfolio = async (name: string, value: number) => {
    if (!portfolio) {
      throw new Error('No portfolio found');
    }

    try {
      const currentKey = normalizePortfolioKey(portfolio.portfolio_key);
      console.log('Updating portfolio:', {
        portfolio_key: portfolio.portfolio_key,
        portfolio_name: name,
        portfolio_value: value
      });

      const { error } = await supabase
        .from('tblPortfolio')
        .update({
          portfolio_name: name,
          portfolio_value: value
        })
        .eq('portfolio_key', portfolio.portfolio_key);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      console.log('Portfolio updated successfully');

      setPortfolio(prev => prev ? {
        ...prev,
        portfolio_name: name,
        portfolio_value: value
      } : null);
      setPortfolios(prev => prev.map(item => {
        if (normalizePortfolioKey(item.portfolio_key) === currentKey) {
          return { ...item, portfolio_name: name, portfolio_value: value };
        }
        return item;
      }));
    } catch (err) {
      console.error('Error updating portfolio:', err);
      throw err;
    }
  };

  // Create a new portfolio
  const createPortfolio = async (name: string, value: number) => {
    if (!user) {
      throw new Error('No user found');
    }

    try {
      const newPortfolio = {
        user_id: user.id,
        user_email: user.email || '',
        portfolio_value: value,
        portfolio_name: name,
      };

      console.log('Creating new portfolio:', newPortfolio);

      const { data: createdPortfolio, error: createError } = await supabase
        .from('tblPortfolio')
        .insert(newPortfolio)
        .select()
        .single();

      if (createError) {
        console.error('Portfolio creation error:', createError);
        throw createError;
      }

      const normalizedCreated = {
        ...createdPortfolio,
        portfolio_key: normalizePortfolioKey(createdPortfolio.portfolio_key),
      };

      console.log('Portfolio created successfully:', normalizedCreated);

      // Add to portfolios list and select it
      setPortfolios(prev => [...prev, normalizedCreated]);

      // Switch to the newly created portfolio
      await selectPortfolio(normalizePortfolioKey(normalizedCreated.portfolio_key));

      return normalizedCreated;
    } catch (err) {
      console.error('Error creating portfolio:', err);
      throw err;
    }
  };

  // Delete a portfolio
  const deletePortfolio = async (portfolioKey: number) => {
    if (!user) {
      throw new Error('No user found');
    }

    try {
      const normalizedKey = normalizePortfolioKey(portfolioKey);

      const { error } = await supabase
        .from('tblPortfolio')
        .delete()
        .eq('portfolio_key', normalizedKey)
        .eq('user_id', user.id);

      if (error) throw error;

      const remaining = portfolios.filter(
        (p) => normalizePortfolioKey(p.portfolio_key) !== normalizedKey
      );
      setPortfolios(remaining);

      if (selectedPortfolioKey === normalizedKey) {
        if (remaining.length > 0) {
          await selectPortfolio(normalizePortfolioKey(remaining[0].portfolio_key));
        } else {
          setPortfolio(null);
          setSelectedPortfolioKey(null);
          setPositions([]);
        }
      }
    } catch (err) {
      console.error('Error deleting portfolio:', err);
      throw err;
    }
  };

  // Add a new portfolio (alias for createPortfolio to match return shape)
  const addPortfolio = createPortfolio;

  // Fetch portfolio on mount (wait for preferences to load)
  // Note: We intentionally don't include defaultPortfolioKey in deps
  // to prevent re-fetching when user sets a new default
  useEffect(() => {
    if (!prefsLoading) {
      fetchPortfolio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, prefsLoading]);

  // Set a portfolio as the default
  const setPortfolioAsDefault = async (portfolioKey: number | null) => {
    try {
      const portfolioName = portfolioKey
        ? portfolios.find(p => normalizePortfolioKey(p.portfolio_key) === portfolioKey)?.portfolio_name
        : undefined;
      await setDefaultPortfolio(portfolioKey, portfolioName);
    } catch (err) {
      console.error('Error setting default portfolio:', err);
      setError(err instanceof Error ? err.message : 'Failed to set default portfolio');
    }
  };

  return {
    portfolio,
    portfolios,
    positions,
    selectedPortfolioKey,
    setSelectedPortfolioKey,
    isLoading,
    error,
    defaultPortfolioKey,
    preferencesLoading: prefsLoading,
    selectPortfolio,
    addPortfolio,
    updatePortfolio,
    deletePortfolio,
    addPosition,
    updatePosition,
    deletePosition,
    updatePortfolioValue,
    setDefaultPortfolio: setPortfolioAsDefault,
    addExit,
    updateExit,
    deleteExit,
    refetch: fetchPortfolio,
    createPortfolio,
  };
}
