'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import Chart from '@/components/Chart';
import SidePanel from '@/components/SidePanel';
import DragHandle from '@/components/DragHandle';
import { CandleData, FilterType, TimeframeType, Signal } from '@/types';
import { TickerPrice, fetchBTCCandlesClient } from '@/lib/binance';
import { useBinanceWebSocket, RealtimeTicker, RealtimeCandle } from '@/hooks/useBinanceWebSocket';

interface DashboardProps {
  initialCandleData: CandleData[];
  ticker: TickerPrice | null;
  initialSignals?: Signal[];  // Supabase에서 가져온 실제 시그널 데이터
}

export default function Dashboard({ initialCandleData, ticker: initialTicker, initialSignals = [] }: DashboardProps) {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [highlightedSignalId, setHighlightedSignalId] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeType>('1h');
  const [candleData, setCandleData] = useState<CandleData[]>(initialCandleData);
  const [isLoading, setIsLoading] = useState(false);
  const [realtimeTicker, setRealtimeTicker] = useState<RealtimeTicker | null>(null);
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string | null>(null);

  // 차트 높이 상태 (모바일용 드래그 리사이즈)
  const [chartHeight, setChartHeight] = useState(40); // 기본값 40vh
  const [isMobile, setIsMobile] = useState(false);

  // localStorage에서 저장된 높이 불러오기 & 모바일 감지
  useEffect(() => {
    // 모바일 감지 (lg 브레이크포인트 미만)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // localStorage에서 저장된 높이 불러오기
    const savedHeight = localStorage.getItem('toldya_chart_height');
    if (savedHeight) {
      const parsed = parseFloat(savedHeight);
      if (!isNaN(parsed) && parsed >= 25 && parsed <= 70) {
        setChartHeight(parsed);
      }
    }

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 차트 높이 변경 핸들러
  const handleChartHeightChange = useCallback((newHeight: number) => {
    setChartHeight(newHeight);
    // 차트 리사이즈 이벤트 발생
    window.dispatchEvent(new Event('resize'));
  }, []);

  // 드래그 종료 시 localStorage에 저장
  const handleDragEnd = useCallback(() => {
    localStorage.setItem('toldya_chart_height', chartHeight.toString());
  }, [chartHeight]);

  // 하이라이트 타이머 ref (메모리 누수 방지)
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // 시그널 데이터: DB 데이터만 사용 (Mock 데이터 제거)
  const signalsWithRealPrices = useMemo(() => {
    return initialSignals;
  }, [initialSignals]);

  // 필터링된 시그널 (sentiment + influencer)
  const filteredSignals = useMemo(() => {
    let result = signalsWithRealPrices;

    // 인플루언서 필터
    if (selectedInfluencerId) {
      result = result.filter((s) => s.influencer_id === selectedInfluencerId);
    }

    // sentiment 필터
    if (filter !== 'ALL') {
      result = result.filter((s) => s.sentiment === filter);
    }

    return result;
  }, [filter, signalsWithRealPrices, selectedInfluencerId]);

  // 차트에서 시그널 클릭 시 (타이머 정리로 메모리 누수 방지)
  const handleSignalClick = useCallback((signalId: string) => {
    // 이전 타이머 정리
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    setHighlightedSignalId(signalId);
    // 3초 후 하이라이트 해제
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedSignalId(null);
    }, 3000);
  }, []);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header ticker={currentTicker} />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* 차트 영역 - 모바일에서는 동적 높이 */}
        <div
          className="lg:h-full lg:flex-[7] border-b lg:border-b-0 lg:border-r border-border-primary flex-shrink-0"
          style={isMobile ? { height: `${chartHeight}vh` } : undefined}
        >
          <Chart
            candleData={candleData}
            signals={filteredSignals}
            onSignalClick={handleSignalClick}
            timeframe={timeframe}
            onTimeframeChange={handleTimeframeChange}
            isLoading={isLoading}
          />
        </div>

        {/* 드래그 핸들 - 모바일/태블릿에서만 표시 */}
        <DragHandle
          className="lg:hidden"
          currentHeight={chartHeight}
          onHeightChange={handleChartHeightChange}
          onDragEnd={handleDragEnd}
          minHeight={25}
          maxHeight={70}
        />

        {/* 시그널 피드 영역 */}
        <aside className="flex-1 lg:flex-[3] lg:min-w-[320px] lg:max-w-[400px] overflow-hidden min-h-0">
          <SidePanel
            signals={filteredSignals}
            highlightedId={highlightedSignalId}
            currentPrice={currentPrice}
            filter={filter}
            onFilterChange={setFilter}
            selectedInfluencerId={selectedInfluencerId}
            onInfluencerSelect={setSelectedInfluencerId}
          />
        </aside>
      </main>
    </div>
  );
}
