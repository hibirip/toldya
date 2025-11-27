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

        {/* 티커 - 글래스 카드 스타일 */}
        <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-bg-tertiary/30 border border-border/50">
          {/* BTC 아이콘 */}
          <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#f7931a]/20 flex-shrink-0">
            <span className="text-[#f7931a] font-bold text-xs sm:text-sm">₿</span>
          </div>

          {/* 심볼 + 가격 */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-fg-secondary font-medium text-[10px] sm:text-xs hidden sm:inline">BTC/USDT</span>
            <span className="text-fg-primary font-mono font-bold text-sm sm:text-lg">
              ${ticker?.price ? Number(ticker.price).toLocaleString() : '---'}
            </span>
          </div>

          {/* 변동률 배지 */}
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md font-medium text-[10px] sm:text-xs ${
            isPositive
              ? 'bg-success/15 text-success'
              : 'bg-danger/15 text-danger'
          }`}>
            <span className="text-[8px] sm:text-[10px]">{isPositive ? '▲' : '▼'}</span>
            <span>{isPositive ? '+' : ''}{ticker?.priceChangePercent || '0.00'}%</span>
          </div>

          {/* 구분선 */}
          <div className="hidden md:block w-px h-5 bg-border/50" />

          {/* 24h 거래량 */}
          <div className="hidden md:flex items-center gap-1">
            <span className="text-fg-muted text-[10px]">24h</span>
            <span className="text-fg-secondary font-mono text-xs">${ticker?.volume || '0'}B</span>
          </div>
        </div>
      </div>

      {/* 테마 토글 */}
      <div className="flex items-center flex-shrink-0">
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
