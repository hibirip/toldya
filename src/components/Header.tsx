'use client';

import { FilterType } from '@/types';
import { TickerPrice } from '@/lib/binance';
import { useTheme } from '@/hooks/useTheme';

interface HeaderProps {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  ticker: TickerPrice | null;
}

export default function Header({ filter, onFilterChange, ticker }: HeaderProps) {
  const filters: FilterType[] = ['ALL', 'LONG', 'SHORT'];
  const isPositive = ticker ? parseFloat(ticker.priceChangePercent) >= 0 : true;
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <header className="h-auto min-h-[52px] sm:min-h-[60px] glass-header flex flex-wrap items-center px-2 sm:px-4 py-2 sm:py-0 sticky top-0 z-50 gap-2">
      {/* 로고 + 티커 (모바일: 한 줄) */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        {/* 로고 */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <span
            className="text-point text-xs sm:text-base tracking-tight"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            Toldya
          </span>
        </div>

        {/* 티커 */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-center sm:justify-center">
            <div className="flex items-center gap-1.5 sm:gap-3 whitespace-nowrap text-xs sm:text-base">
              <span className="text-fg-secondary font-medium hidden sm:inline">BTC/USDT</span>
              <span className="text-fg-primary font-mono font-semibold text-sm sm:text-lg">
                ${ticker?.price ? Number(ticker.price).toLocaleString() : '---'}
              </span>
              <span className={`text-[10px] sm:text-sm font-medium px-1.5 py-0.5 sm:px-2 rounded-md ${
                isPositive
                  ? 'text-success bg-success/10'
                  : 'text-danger bg-danger/10'
              }`}>
                {isPositive ? '+' : ''}{ticker?.priceChangePercent || '0.00'}%
              </span>
              <span className="text-fg-muted mx-1 sm:mx-2 hidden md:inline">|</span>
              <span className="text-fg-tertiary text-xs sm:text-sm hidden md:inline">24h Vol</span>
              <span className="text-fg-primary font-mono text-xs sm:text-base hidden md:inline">${ticker?.volume || '0'}B</span>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 버튼 + 테마 토글 */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* 필터 버튼 */}
        <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-lg sm:rounded-xl bg-bg-tertiary/50">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-sm font-medium rounded-md sm:rounded-lg transition-all duration-200 ${
                filter === f
                  ? f === 'LONG'
                    ? 'bg-success/20 text-success shadow-sm'
                    : f === 'SHORT'
                    ? 'bg-danger/20 text-danger shadow-sm'
                    : 'bg-point/20 text-point shadow-sm'
                  : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary/80'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* 테마 토글 */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary/80 transition-all duration-200"
          aria-label="테마 전환"
        >
          {mounted && (
            theme === 'dark' ? (
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )
          )}
        </button>
      </div>
    </header>
  );
}
