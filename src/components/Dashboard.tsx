'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Header from '@/components/Header';
import Chart from '@/components/Chart';
import SignalFeed from '@/components/SignalFeed';
import { CandleData, FilterType, TimeframeType, Signal } from '@/types';
import { TickerPrice, fetchBTCCandlesClient } from '@/lib/binance';
import { getSignalsWithRealPrices } from '@/lib/mockData';
import { useBinanceWebSocket, RealtimeTicker, RealtimeCandle } from '@/hooks/useBinanceWebSocket';

interface DashboardProps {
  initialCandleData: CandleData[];
  ticker: TickerPrice | null;
  initialSignals?: Signal[];  // Supabase에서 가져온 실제 시그널 데이터
}

export default function Dashboard({ initialCandleData, ticker: initialTicker, initialSignals = [] }: DashboardProps) {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [highlightedSignalId, setHighlightedSignalId] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeType>('4h');
  const [candleData, setCandleData] = useState<CandleData[]>(initialCandleData);
  const [isLoading, setIsLoading] = useState(false);
  const [realtimeTicker, setRealtimeTicker] = useState<RealtimeTicker | null>(null);

  // REST 데이터의 마지막 캔들 시간
  const lastCandleTime = candleData.length > 0 ? candleData[candleData.length - 1].time : undefined;

  // 실시간 캔들 업데이트 핸들러
  const handleCandleUpdate = useCallback((candle: RealtimeCandle) => {
    setCandleData((prev) => {
      if (prev.length === 0) return prev;

      const lastCandle = prev[prev.length - 1];

      // 같은 캔들 업데이트 (현재 캔들의 실시간 업데이트)
      if (lastCandle.time === candle.time) {
        const { isNew, ...candleData } = candle;
        return [...prev.slice(0, -1), candleData];
      }

      // 새 캔들 추가 (타임프레임 경계를 넘었을 때)
      if (candle.isNew && candle.time > lastCandle.time) {
        const { isNew, ...candleData } = candle;
        return [...prev.slice(1), candleData]; // 오래된 캔들 제거하고 새 캔들 추가
      }

      return prev;
    });
  }, []);

  // 실시간 티커 업데이트 핸들러
  const handleTickerUpdate = useCallback((ticker: RealtimeTicker) => {
    setRealtimeTicker(ticker);
  }, []);

  // Binance WebSocket 연결
  useBinanceWebSocket({
    timeframe,
    lastCandleTime,
    onCandleUpdate: handleCandleUpdate,
    onTickerUpdate: handleTickerUpdate,
  });

  // 타임프레임 변경 시 캔들 데이터 다시 가져오기
  const fetchCandleData = useCallback(async (tf: TimeframeType) => {
    setIsLoading(true);
    try {
      const data = await fetchBTCCandlesClient(tf);
      setCandleData(data);
    } catch (error) {
      console.error('Failed to fetch candle data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 서버에서 데이터를 못 가져온 경우 클라이언트에서 재시도
  // (Vercel 서버에서 Binance API 차단 시 대응)
  useEffect(() => {
    if (initialCandleData.length === 0 && candleData.length === 0 && !isLoading) {
      console.log('[Dashboard] Server data empty, fetching from client...');
      fetchCandleData(timeframe);
    }
  }, [initialCandleData.length, candleData.length, isLoading, fetchCandleData, timeframe]);

  // 타임프레임 변경 핸들러
  const handleTimeframeChange = useCallback((tf: TimeframeType) => {
    if (tf !== timeframe) {
      setTimeframe(tf);
      fetchCandleData(tf);
    }
  }, [timeframe, fetchCandleData]);

  // 현재 티커 (실시간 > 초기값 > 캔들 종가)
  const currentTicker: TickerPrice | null = realtimeTicker
    ? {
        symbol: 'BTCUSDT',
        price: realtimeTicker.price,
        priceChangePercent: realtimeTicker.priceChangePercent,
        volume: realtimeTicker.volume,
      }
    : initialTicker;

  // 현재 가격
  const currentPrice = currentTicker
    ? parseFloat(currentTicker.price)
    : candleData[candleData.length - 1]?.close || 0;

  // 시그널 데이터: DB 데이터가 있으면 사용, 없으면 Mock 데이터 사용
  const signalsWithRealPrices = useMemo(() => {
    // DB에서 가져온 실제 데이터가 있으면 사용
    if (initialSignals.length > 0) {
      return initialSignals;
    }
    // 없으면 Mock 데이터 사용 (개발/테스트용)
    return getSignalsWithRealPrices(candleData, timeframe);
  }, [initialSignals, candleData, timeframe]);

  // 필터링된 시그널
  const filteredSignals = useMemo(() => {
    if (filter === 'ALL') return signalsWithRealPrices;
    return signalsWithRealPrices.filter((s) => s.sentiment === filter);
  }, [filter, signalsWithRealPrices]);

  // 차트에서 시그널 클릭 시
  const handleSignalClick = (signalId: string) => {
    setHighlightedSignalId(signalId);
    // 3초 후 하이라이트 해제
    setTimeout(() => setHighlightedSignalId(null), 3000);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header filter={filter} onFilterChange={setFilter} ticker={currentTicker} />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* 차트 영역 */}
        <div className="h-[50vh] sm:h-[55vh] md:h-[60vh] lg:h-full lg:flex-[7] border-b lg:border-b-0 lg:border-r border-border-primary flex-shrink-0">
          <Chart
            candleData={candleData}
            signals={filteredSignals}
            onSignalClick={handleSignalClick}
            timeframe={timeframe}
            onTimeframeChange={handleTimeframeChange}
            isLoading={isLoading}
          />
        </div>

        {/* 시그널 피드 영역 */}
        <aside className="flex-1 lg:flex-[3] lg:min-w-[320px] lg:max-w-[400px] overflow-hidden min-h-0">
          <SignalFeed
            signals={filteredSignals}
            highlightedId={highlightedSignalId}
            currentPrice={currentPrice}
          />
        </aside>
      </main>
    </div>
  );
}
