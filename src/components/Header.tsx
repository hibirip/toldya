'use client';

import { TickerPrice } from '@/lib/binance';
import { useTheme } from '@/hooks/useTheme';

interface HeaderProps {
  ticker: TickerPrice | null;
}

export default function Header({ ticker }: HeaderProps) {
  const isPositive = ticker ? parseFloat(ticker.priceChangePercent) >= 0 : true;
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <header className="h-12 glass-header flex items-center justify-between px-4 sticky top-0 z-50">
      {/* 왼쪽: 로고 */}
      <div className="flex items-center">
        <span className="text-point text-sm font-semibold tracking-tight">
          Toldya
        </span>
      </div>

      {/* 중앙: 가격 + 변동률 */}
      <div className="flex items-center gap-2">
        <span className="text-fg-primary font-mono font-bold text-sm">
          ${ticker?.price ? Number(ticker.price).toLocaleString() : '---'}
        </span>
        <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${
          isPositive
            ? 'bg-success/15 text-success'
            : 'bg-danger/15 text-danger'
        }`}>
          <span className="text-[8px]">{isPositive ? '▲' : '▼'}</span>
          <span>{isPositive ? '+' : ''}{ticker?.priceChangePercent || '0.00'}%</span>
        </span>
      </div>

      {/* 오른쪽: 테마 토글 */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary/80 transition-all"
        aria-label="테마 전환"
      >
        {mounted && (
          theme === 'dark' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )
        )}
      </button>
    </header>
  );
}
