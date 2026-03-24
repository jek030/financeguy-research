
interface SectorReturnChartProps {
  title?: string;
  subtitle?: string;
  data: Array<{
    name: string;
    symbol: string;
    performance: number;
  }>;
}

export function SectorReturnChart({ title, subtitle, data }: SectorReturnChartProps) {
  // Find maximum absolute value for scaling
  const maxAbsValue = Math.max(...data.map(item => Math.abs(item.performance)), 1);
  
  // Format number with percentage
  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // Calculate opacity based on relative performance
  const getOpacity = (value: number) => {
    const relativeValue = Math.abs(value) / maxAbsValue;
    // Scale opacity between 0.5 and 1
    return 0.5 + (relativeValue * 0.5);
  };
  
  return (
    <div className="w-full space-y-1.5">
      {(title || subtitle) && (
        <div className="text-center">
          {title && <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{title}</h3>}
          {subtitle && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
        </div>
      )}
      <div className="space-y-1">
        {data.map((item) => (
          <div
            key={item.name}
            className="grid grid-cols-[110px,1fr] items-center gap-2 rounded px-1 py-1 text-xs md:grid-cols-[140px,1fr]"
          >
            <div className="truncate pr-1 text-right text-neutral-600 dark:text-neutral-300">
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden">{item.symbol}</span>
              <span className="hidden md:inline"> ({item.symbol})</span>
            </div>
            <div className="min-w-0">
              {item.performance < 0 ? (
                // Negative performance bar (red)
                <div className="flex items-center">
                  <div 
                    className="h-4 min-w-[4px] rounded"
                    style={{ 
                      width: `${(Math.abs(item.performance) / maxAbsValue) * 100}%`,
                      maxWidth: '100%',
                      backgroundColor: `rgba(239, 68, 68, ${getOpacity(item.performance)})`
                    }}
                  ></div>
                  <span className="ml-2 flex-shrink-0 tabular-nums text-rose-600 dark:text-rose-400">
                    {formatPercent(item.performance)}
                  </span>
                </div>
              ) : (
                // Positive performance bar (green)
                <div className="flex items-center">
                  <div 
                    className="h-4 min-w-[4px] rounded"
                    style={{ 
                      width: `${(Math.abs(item.performance) / maxAbsValue) * 100}%`,
                      maxWidth: '100%',
                      backgroundColor: `rgba(34, 197, 94, ${getOpacity(item.performance)})`
                    }}
                  ></div>
                  <span className="ml-2 flex-shrink-0 tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatPercent(item.performance)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 