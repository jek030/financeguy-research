import { useState, useEffect } from 'react';
import { supabase, SupabasePortfolio, SupabasePortfolioPosition } from '@/lib/supabase';
import { useAuth } from '@/lib/context/auth-context';

const SELECTED_PORTFOLIO_STORAGE_KEY = 'financeguy-selected-portfolio';

const normalizePortfolioKey = (key: number | string): number => {
  return typeof key === 'string' ? parseInt(key, 10) : key;
};

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
  closedDate?: Date | null;
  priceTarget2R: number;
  priceTarget2RShares: number;
  priceTarget5R: number;
  priceTarget5RShares: number;
  priceTarget21Day: number;
  remainingShares: number;
  currentPrice?: number;
}

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<SupabasePortfolio | null>(null);
  const [portfolios, setPortfolios] = useState<SupabasePortfolio[]>([]);
  const [selectedPortfolioKey, setSelectedPortfolioKey] = useState<number | null>(null);
  const [positions, setPositions] = useState<StockPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Helper function to parse date string as local date (not UTC)
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Convert Supabase position to our app's format
  const mapSupabaseToPosition = (data: SupabasePortfolioPosition): StockPosition => {
    // The open_risk column stores the percentage value that should be displayed in "Open Risk %" column
    // We need to convert this percentage back to the actual stop loss value for the stopLoss field
    // Formula: stopLoss = cost + (open_risk / 100) * cost = cost * (1 + open_risk / 100)
    const stopLossValue = data.cost * (1 + data.open_risk / 100);

    return {
      id: `${data.portfolio_key}-${data.trade_key}`,
      symbol: data.symbol,
      cost: data.cost,
      quantity: data.quantity,
      netCost: data.net_cost,
      initialStopLoss: data.initial_stop_loss,
      stopLoss: stopLossValue, // Convert the stored percentage back to stop loss value
      type: data.type as 'Long' | 'Short',
      openDate: parseLocalDate(data.open_date),
      closedDate: data.close_date ? parseLocalDate(data.close_date) : null,
      priceTarget2R: data.price_target_1,
      priceTarget2RShares: data.price_target_1_quantity,
      priceTarget5R: data.price_target_2,
      priceTarget5RShares: data.price_target_2_quantity,
      priceTarget21Day: data.price_target_3,
      remainingShares: data.remaining_shares,
    };
  };

  // Convert our app's position to Supabase format
  const mapPositionToSupabase = (position: Omit<StockPosition, 'id'>, portfolioKey: number | string, tradeKey?: number | string) => {
    const now = new Date();
    const endDate = position.closedDate || now;
    const diffTime = Math.abs(endDate.getTime() - position.openDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Calculate the Open Risk % percentage: (stopLoss - cost) / cost * 100
    // This is the value that should be stored in the open_risk column
    const openRiskPercentage = ((position.stopLoss - position.cost) / position.cost) * 100;

    // Calculate the % Portfolio percentage: (equity / portfolio_value) * 100
    // This is the value that should be stored in the percent_of_portfolio column
    const portfolioValue = portfolio?.portfolio_value || 0;
    const remainingShares = position.quantity - position.priceTarget2RShares - position.priceTarget5RShares;
    const equity = position.cost * remainingShares; // Calculate equity based on remaining shares
    const portfolioPercent = portfolioValue > 0 ? (equity / portfolioValue) * 100 : 0;

    const baseData = {
      portfolio_key: portfolioKey,
      symbol: position.symbol,
      type: position.type,
      cost: position.cost,
      quantity: position.quantity,
      net_cost: position.netCost,
      equity: equity, // Will be updated with live price
      percent_of_portfolio: portfolioPercent, // Store the % Portfolio percentage value
      initial_stop_loss: position.initialStopLoss,
      open_risk: openRiskPercentage, // Store the Open Risk % percentage value
      open_heat: 0, // Will be calculated
      price_target_1: position.priceTarget2R,
      price_target_1_quantity: position.priceTarget2RShares,
      price_target_2: position.priceTarget5R,
      price_target_2_quantity: position.priceTarget5RShares,
      price_target_3: position.priceTarget21Day,
      remaining_shares: remainingShares, // Store the calculated remaining shares
      open_date: position.openDate.toISOString().split('T')[0], // YYYY-MM-DD format
      close_date: position.closedDate ? position.closedDate.toISOString().split('T')[0] : null,
      days_in_trade: diffDays,
    };

    // Only include trade_key if it's explicitly provided (for updates)
    // For inserts, omit trade_key so the database auto-generates it
    if (tradeKey !== undefined) {
      return { ...baseData, trade_key: tradeKey };
    }

    return baseData;
  };

  const fetchPositionsForPortfolio = async (portfolioKey: number) => {
    console.log('Fetching positions for portfolio_key:', portfolioKey);

    const { data: positionsData, error: positionsError } = await supabase
      .from('tblPortfolioPositions')
      .select('*')
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

      let targetKey =
        overridePortfolioKey ??
        storedSelectedKey ??
        selectedPortfolioKey ??
        (normalizedPortfolios.length > 0
          ? normalizePortfolioKey(normalizedPortfolios[0].portfolio_key)
          : null);

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
  const addPosition = async (position: Omit<StockPosition, 'id'>) => {
    console.log('addPosition called with:', position);
    
    if (!portfolio) {
      console.error('No portfolio found');
      throw new Error('No portfolio found');
    }

    console.log('Current portfolio:', portfolio);

    try {
      const supabasePosition = mapPositionToSupabase(position, portfolio.portfolio_key);
      console.log('Mapped to Supabase position:', supabasePosition);
      
      const { data, error } = await supabase
        .from('tblPortfolioPositions')
        .insert(supabasePosition)
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Insert successful, data returned:', data);
      const newPosition = mapSupabaseToPosition(data);
      console.log('Mapped back to position:', newPosition);
      
      setPositions(prev => [...prev, newPosition]);
      console.log('Position added to state');
    } catch (err) {
      console.error('Error adding position:', err);
      throw err;
    }
  };

  // Update an existing position
  const updatePosition = async (positionId: string, updates: Partial<StockPosition>) => {
    if (!portfolio) {
      throw new Error('No portfolio found');
    }

    try {
      const [portfolioKeyStr, tradeKeyStr] = positionId.split('-');
      const portfolioKey = parseInt(portfolioKeyStr, 10);
      const tradeKey = parseInt(tradeKeyStr, 10);
      
      const supabaseUpdates: Partial<SupabasePortfolioPosition> = {};
      
      if (updates.symbol !== undefined) supabaseUpdates.symbol = updates.symbol;
      if (updates.cost !== undefined) supabaseUpdates.cost = updates.cost;
      if (updates.quantity !== undefined) supabaseUpdates.quantity = updates.quantity;
      if (updates.netCost !== undefined) supabaseUpdates.net_cost = updates.netCost;
      if (updates.stopLoss !== undefined) {
        // Calculate the Open Risk % percentage: (stopLoss - cost) / cost * 100
        // This is the value that should be stored in the open_risk column
        const cost = updates.cost !== undefined ? updates.cost : positions.find(p => p.id === positionId)?.cost!;
        const openRiskPercentage = ((updates.stopLoss - cost) / cost) * 100;
        supabaseUpdates.open_risk = openRiskPercentage;
      }
      if (updates.type !== undefined) supabaseUpdates.type = updates.type;
      if (updates.openDate !== undefined) supabaseUpdates.open_date = updates.openDate.toISOString().split('T')[0];
      if (updates.closedDate !== undefined) supabaseUpdates.close_date = updates.closedDate ? updates.closedDate.toISOString().split('T')[0] : null;
      if (updates.priceTarget2R !== undefined) supabaseUpdates.price_target_1 = updates.priceTarget2R;
      if (updates.priceTarget2RShares !== undefined) supabaseUpdates.price_target_1_quantity = updates.priceTarget2RShares;
      if (updates.priceTarget5R !== undefined) supabaseUpdates.price_target_2 = updates.priceTarget5R;
      if (updates.priceTarget5RShares !== undefined) supabaseUpdates.price_target_2_quantity = updates.priceTarget5RShares;
      if (updates.priceTarget21Day !== undefined) supabaseUpdates.price_target_3 = updates.priceTarget21Day;

      // Recalculate remaining shares if quantity, PT 1 #, or PT 2 # change
      if (updates.quantity !== undefined || updates.priceTarget2RShares !== undefined || updates.priceTarget5RShares !== undefined) {
        const quantity = updates.quantity !== undefined ? updates.quantity : positions.find(p => p.id === positionId)?.quantity!;
        const pt1Shares = updates.priceTarget2RShares !== undefined ? updates.priceTarget2RShares : positions.find(p => p.id === positionId)?.priceTarget2RShares!;
        const pt2Shares = updates.priceTarget5RShares !== undefined ? updates.priceTarget5RShares : positions.find(p => p.id === positionId)?.priceTarget5RShares!;
        const remainingShares = quantity - pt1Shares - pt2Shares;
        supabaseUpdates.remaining_shares = remainingShares;
      }

      // Recalculate % Portfolio if cost, quantity, or portfolio value changes
      if (updates.cost !== undefined || updates.quantity !== undefined) {
        const cost = updates.cost !== undefined ? updates.cost : positions.find(p => p.id === positionId)?.cost!;
        const quantity = updates.quantity !== undefined ? updates.quantity : positions.find(p => p.id === positionId)?.quantity!;
        const pt1Shares = updates.priceTarget2RShares !== undefined ? updates.priceTarget2RShares : positions.find(p => p.id === positionId)?.priceTarget2RShares!;
        const pt2Shares = updates.priceTarget5RShares !== undefined ? updates.priceTarget5RShares : positions.find(p => p.id === positionId)?.priceTarget5RShares!;
        const remainingShares = quantity - pt1Shares - pt2Shares;
        const equity = cost * remainingShares; // Calculate equity based on remaining shares
        const portfolioPercent = portfolio && portfolio.portfolio_value > 0 ? (equity / portfolio.portfolio_value) * 100 : 0;
        supabaseUpdates.percent_of_portfolio = portfolioPercent;
        supabaseUpdates.equity = equity;
      }

      // Recalculate days_in_trade if dates changed
      if (updates.openDate !== undefined || updates.closedDate !== undefined) {
        const openDate = updates.openDate || positions.find(p => p.id === positionId)?.openDate!;
        const endDate = updates.closedDate || new Date();
        const diffTime = Math.abs(endDate.getTime() - openDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        supabaseUpdates.days_in_trade = diffDays;
      }

      const { data, error } = await supabase
        .from('tblPortfolioPositions')
        .update(supabaseUpdates)
        .eq('portfolio_key', portfolioKey)
        .eq('trade_key', tradeKey)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const updatedPosition = mapSupabaseToPosition(data);
      setPositions(prev => prev.map(p => p.id === positionId ? updatedPosition : p));
    } catch (err) {
      console.error('Error updating position:', err);
      throw err;
    }
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
        for (const position of positions) {
          const remainingShares = position.quantity - position.priceTarget2RShares - position.priceTarget5RShares;
          const equity = position.cost * remainingShares; // Calculate equity based on remaining shares
          const portfolioPercent = (equity / value) * 100;
          
          const [portfolioKeyStr, tradeKeyStr] = position.id.split('-');
          const portfolioKey = parseInt(portfolioKeyStr, 10);
          const tradeKey = parseInt(tradeKeyStr, 10);

          await supabase
            .from('tblPortfolioPositions')
            .update({ percent_of_portfolio: portfolioPercent, equity: equity })
            .eq('portfolio_key', portfolioKey)
            .eq('trade_key', tradeKey);
        }
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

  // Fetch portfolio on mount
  useEffect(() => {
    fetchPortfolio();
  }, [user]);

  return {
    portfolio,
    portfolios,
    selectedPortfolioKey,
    positions,
    isLoading,
    error,
    selectPortfolio,
    addPosition,
    updatePosition,
    deletePosition,
    updatePortfolioValue,
    updatePortfolio,
    refetch: fetchPortfolio,
  };
}
