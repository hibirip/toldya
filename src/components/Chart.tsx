'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CrosshairMode } from 'lightweight-charts';
import { Signal, CandleData, TimeframeType, MarkerPosition, MarkerCluster } from '@/types';
import { getCandleStartTime, toDisplayFormat } from '@/lib/timeUtils';
import { clusterMarkers } from '@/lib/clusterSignals';
import { useTheme } from '@/hooks/useTheme';
import StackedMarker from './StackedMarker';
import ExpandedCluster from './ExpandedCluster';

// 마커 데이터 (DOM 조작용)
interface MarkerData {
  signal: Signal;
  alignedTime: number;
  candlePrice: number; // 해당 캔들의 close 가격 (entry_price 대신 사용)
}

interface ClusterData {
  id: string;
  markers: MarkerData[];
}

// 차트 테마 설정 (Slate 계열 - 쿨톤)
const CHART_THEMES = {
  dark: {
    layout: {
      background: { color: '#020617' },  // slate-950
      textColor: '#94a3b8',              // slate-400 (더 밝게 - 가독성 향상)
    },
    grid: {
      vertLines: { color: '#1e293b' },   // slate-800
      horzLines: { color: '#1e293b' },   // slate-800
    },
    crosshair: {
      vertLine: { color: '#06b6d4', width: 1 as const, style: 2 as const },  // teal-500 (톤 다운된 시안)
      horzLine: { color: '#06b6d4', width: 1 as const, style: 2 as const },
    },
    rightPriceScale: { borderColor: '#1e293b' },  // slate-800
    timeScale: { borderColor: '#1e293b' },        // slate-800
  },
  light: {
    layout: {
      background: { color: '#ffffff' },
      textColor: '#64748b',              // slate-500
    },
    grid: {
      vertLines: { color: '#e2e8f0' },   // slate-200
      horzLines: { color: '#e2e8f0' },   // slate-200
    },
    crosshair: {
      vertLine: { color: '#0d39f5', width: 1 as const, style: 2 as const },  // 포인트 컬러
      horzLine: { color: '#0d39f5', width: 1 as const, style: 2 as const },
    },
    rightPriceScale: { borderColor: '#e2e8f0' },  // slate-200
    timeScale: { borderColor: '#e2e8f0' },        // slate-200
  },
};

interface ChartProps {
  candleData: CandleData[];
  signals: Signal[];
  onSignalClick?: (signalId: string) => void;
  selectedSignalId?: string | null;
  timeframe: TimeframeType;
  onTimeframeChange: (tf: TimeframeType) => void;
  isLoading: boolean;
}

const TIMEFRAME_OPTIONS: { value: TimeframeType; label: string }[] = [
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1M', label: '1M' },
];

// 타임프레임별 기본 표시 캔들 수 (마커 가시성 최적화)
// 0 = 전체 표시 (fitContent)
const DEFAULT_VISIBLE_CANDLES: Record<TimeframeType, number> = {
  '1h': 48,  // 2일
  '4h': 42,  // 7일
  '1d': 30,  // 1달
  '1w': 26,  // 6개월
  '1M': 0,   // 전체 표시
};

export default function Chart({ candleData, signals, onSignalClick, selectedSignalId, timeframe, onTimeframeChange, isLoading }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // 마커/클러스터 DOM refs (직접 DOM 조작용)
  const markerRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const clusterRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  // 마커 데이터 (시그널 변경 시에만 업데이트) - state와 ref 둘 다 유지
  const [markerDataList, setMarkerDataList] = useState<MarkerData[]>([]);
  const [clusterDataList, setClusterDataList] = useState<ClusterData[]>([]);

  // ref로도 유지 (updateMarkerPositions에서 최신 값 참조용)
  const markerDataListRef = useRef<MarkerData[]>([]);
  const clusterDataListRef = useRef<ClusterData[]>([]);

  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    signal: Signal | null;
    candlePrice: number;
  }>({ visible: false, x: 0, y: 0, signal: null, candlePrice: 0 });
  const { theme } = useTheme();

  // Refs for stable references (avoid recreating callbacks)
  const candleDataRef = useRef(candleData);
  const signalsRef = useRef(signals);
  const timeframeRef = useRef(timeframe);
  const lastFirstCandleTimeRef = useRef<number | null>(null);

  // Keep refs in sync
  useEffect(() => {
    candleDataRef.current = candleData;
  }, [candleData]);

  useEffect(() => {
    signalsRef.current = signals;
  }, [signals]);

  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

  // 시그널 데이터가 변경될 때 마커 데이터 리스트 업데이트 (React 리렌더링은 여기서만)
  useEffect(() => {
    const currentCandleData = candleDataRef.current;
    const currentTimeframe = timeframeRef.current;

    if (currentCandleData.length === 0 || signals.length === 0) {
      setMarkerDataList([]);
      setClusterDataList([]);
      return;
    }

    // O(1) 조회를 위한 캔들 Map 생성
    const candleMap = new Map(currentCandleData.map((c) => [c.time, c]));

    const validMarkers: MarkerData[] = [];

    signals.forEach((signal) => {
      const alignedTime = getCandleStartTime(signal.signal_timestamp, currentTimeframe);
      const matchingCandle = candleMap.get(alignedTime);
      if (matchingCandle) {
        validMarkers.push({ signal, alignedTime, candlePrice: matchingCandle.close });
      }
    });

    // 클러스터링을 위해 임시로 위치 계산 (초기 렌더링용)
    if (chartRef.current && seriesRef.current) {
      const timeScale = chartRef.current.timeScale();
      const positions: MarkerPosition[] = [];
      const outsideMarkers: MarkerData[] = []; // 가시 영역 밖 마커

      validMarkers.forEach((marker) => {
        const x = timeScale.timeToCoordinate(marker.alignedTime as Time);
        const y = seriesRef.current!.priceToCoordinate(marker.candlePrice); // entry_price 대신 캔들 가격 사용
        if (x !== null && y !== null) {
          positions.push({ signal: marker.signal, x, y });
        } else {
          // 가시 영역 밖이어도 마커 데이터는 유지
          outsideMarkers.push(marker);
        }
      });

      const { clusters, standalone } = clusterMarkers(positions, { yThreshold: 25, minClusterSize: 3 });

      // standalone 마커 데이터 + 가시 영역 밖 마커
      const standaloneMarkers: MarkerData[] = [
        ...standalone.map((pos) => {
          const alignedTime = getCandleStartTime(pos.signal.signal_timestamp, currentTimeframe);
          const candle = candleMap.get(alignedTime);
          return {
            signal: pos.signal,
            alignedTime,
            candlePrice: candle?.close ?? pos.signal.entry_price, // fallback to entry_price
          };
        }),
        ...outsideMarkers, // 가시 영역 밖 마커도 포함 (이미 candlePrice 있음)
      ];

      // 클러스터 데이터 (MarkerCluster의 signals 사용)
      const clusterData: ClusterData[] = clusters.map((cluster) => ({
        id: cluster.id,
        markers: cluster.signals.map((signal) => {
          const alignedTime = getCandleStartTime(signal.signal_timestamp, currentTimeframe);
          const candle = candleMap.get(alignedTime);
          return {
            signal,
            alignedTime,
            candlePrice: candle?.close ?? signal.entry_price, // fallback to entry_price
          };
        }),
      }));

      setMarkerDataList(standaloneMarkers);
      setClusterDataList(clusterData);
      // ref도 동기화
      markerDataListRef.current = standaloneMarkers;
      clusterDataListRef.current = clusterData;
    } else {
      // 차트가 아직 초기화되지 않은 경우 모든 마커를 standalone으로
      setMarkerDataList(validMarkers);
      setClusterDataList([]);
      // ref도 동기화
      markerDataListRef.current = validMarkers;
      clusterDataListRef.current = [];
    }
  }, [signals, timeframe, candleData]);

  // ref 기반 DOM 조작으로 마커 위치 업데이트 (React 리렌더링 없이)
  // 의존성 없음 - 항상 ref에서 최신 값 참조
  const updateMarkerPositions = useCallback(() => {
    if (!chartRef.current || !seriesRef.current) return;

    const timeScale = chartRef.current.timeScale();
    const series = seriesRef.current;
    const currentMarkerDataList = markerDataListRef.current;
    const currentClusterDataList = clusterDataListRef.current;

    // 개별 마커 위치 업데이트
    markerRefsMap.current.forEach((element, signalId) => {
      const markerData = currentMarkerDataList.find((m) => m.signal.id === signalId);
      if (!markerData) return;

      const x = timeScale.timeToCoordinate(markerData.alignedTime as Time);
      const y = series.priceToCoordinate(markerData.candlePrice);

      if (x === null || y === null) {
        element.style.visibility = 'hidden';
      } else {
        element.style.visibility = 'visible';
        const topOffset = markerData.signal.sentiment === 'LONG' ? y + 3 : y - 38;
        element.style.transform = `translate(${x}px, ${topOffset}px) translateX(-50%)`;
      }
    });

    // 클러스터 마커 위치 업데이트
    clusterRefsMap.current.forEach((element, clusterId) => {
      const clusterData = currentClusterDataList.find((c) => c.id === clusterId);
      if (!clusterData || clusterData.markers.length === 0) return;

      // 클러스터 중심점 계산
      let sumX = 0;
      let sumY = 0;
      let validCount = 0;

      clusterData.markers.forEach((marker) => {
        const x = timeScale.timeToCoordinate(marker.alignedTime as Time);
        const y = series.priceToCoordinate(marker.candlePrice);
        if (x !== null && y !== null) {
          sumX += x;
          sumY += y;
          validCount++;
        }
      });

      if (validCount === 0) {
        element.style.visibility = 'hidden';
      } else {
        element.style.visibility = 'visible';
        const centerX = sumX / validCount;
        const centerY = sumY / validCount;
        element.style.transform = `translate(${centerX}px, ${centerY}px) translate(-50%, -50%)`;
      }
    });
  }, []); // 의존성 없음 - ref 사용

  // 클러스터 데이터를 MarkerCluster 형식으로 변환 (StackedMarker/ExpandedCluster용)
  const markerClusters = useMemo((): MarkerCluster[] => {
    if (!chartRef.current || !seriesRef.current) return [];

    const timeScale = chartRef.current.timeScale();
    const series = seriesRef.current;

    return clusterDataList.map((cluster) => {
      // 유효한 마커들만 필터링하고 중심점 계산
      let sumX = 0;
      let sumY = 0;
      let validCount = 0;
      const validSignals: Signal[] = [];

      cluster.markers.forEach((marker) => {
        const x = timeScale.timeToCoordinate(marker.alignedTime as Time);
        const y = series.priceToCoordinate(marker.candlePrice);
        if (x !== null && y !== null) {
          sumX += x;
          sumY += y;
          validCount++;
          validSignals.push(marker.signal);
        }
      });

      const avgX = validCount > 0 ? sumX / validCount : 0;
      const avgY = validCount > 0 ? sumY / validCount : 0;

      return {
        id: cluster.id,
        signals: validSignals,
        x: avgX,
        y: avgY,
      };
    });
  }, [clusterDataList]);

  // 차트 초기화 (테마 변경 시에만 재생성)
  useEffect(() => {
    if (!containerRef.current) return;

    const chartTheme = CHART_THEMES[theme as keyof typeof CHART_THEMES];
    const chart = createChart(containerRef.current, {
      layout: chartTheme.layout,
      grid: chartTheme.grid,
      crosshair: {
        mode: CrosshairMode.Normal,
        ...chartTheme.crosshair,
      },
      rightPriceScale: chartTheme.rightPriceScale,
      timeScale: {
        ...chartTheme.timeScale,
        timeVisible: true,
      },
      localization: {
        // 사용자 로컬 타임존으로 시간 표시
        timeFormatter: (timestamp: number) => {
          const date = new Date(timestamp * 1000);
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        },
      },
    });

    chartRef.current = chart;

    // 캔들 색상 (다크모드에서 그린 시인성 향상: #10b981 → #34d399)
    const isThemeDark = theme === 'dark';
    const upColor = isThemeDark ? '#34d399' : '#10b981';    // emerald-400 (dark) / emerald-500 (light)
    const downColor = '#ef4444';                             // red-500

    const candlestickSeries = chart.addCandlestickSeries({
      upColor,
      downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });

    seriesRef.current = candlestickSeries;

    // 초기 데이터 설정
    const currentData = candleDataRef.current;
    if (currentData.length > 0) {
      const formattedData: CandlestickData[] = currentData.map((d) => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      candlestickSeries.setData(formattedData);
      lastFirstCandleTimeRef.current = currentData[0].time;
      // 타임프레임별 기본 줌 적용 (마커 가시성 최적화)
      const visibleCandles = DEFAULT_VISIBLE_CANDLES[timeframe];
      if (visibleCandles === 0) {
        chart.timeScale().fitContent();
      } else {
        const from = Math.max(0, currentData.length - visibleCandles);
        const to = currentData.length - 1;
        chart.timeScale().setVisibleLogicalRange({ from, to });
      }
    }

    // 리사이즈 핸들러
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
        // 리사이즈 후 마커 위치 업데이트
        requestAnimationFrame(() => updateMarkerPositions());
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // 차트 스케일 변경 시 마커 위치 직접 업데이트 (ref 기반 - 동기화 문제 해결)
    const handleScaleChange = () => {
      // 즉시 DOM 업데이트 (React 리렌더링 없이)
      updateMarkerPositions();
    };

    // 시간 축 변경 구독
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleScaleChange);

    // 가격 축 스케일 변경 감지 - RAF로 동기화
    let lastPriceCoord: number | null = null;
    let rafId: number | null = null;

    const checkPriceScale = () => {
      if (seriesRef.current && candleDataRef.current.length > 0) {
        const testPrice = candleDataRef.current[0].high;
        const coord = seriesRef.current.priceToCoordinate(testPrice);

        if (coord !== null && coord !== lastPriceCoord) {
          lastPriceCoord = coord;
          updateMarkerPositions();
        }
      }
      rafId = requestAnimationFrame(checkPriceScale);
    };

    rafId = requestAnimationFrame(checkPriceScale);

    // 초기 마커 위치 설정
    const timer = setTimeout(() => updateMarkerPositions(), 100);

    return () => {
      clearTimeout(timer);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [theme, updateMarkerPositions]);

  // 캔들 데이터 변경 시 차트 업데이트
  useEffect(() => {
    if (!seriesRef.current || candleData.length === 0) return;

    const firstCandleTime = candleData[0].time;

    // 데이터 세트가 변경된 경우 (타임프레임 변경 등) - 전체 재설정
    if (lastFirstCandleTimeRef.current !== firstCandleTime) {
      const formattedData: CandlestickData[] = candleData.map((d) => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      seriesRef.current.setData(formattedData);
      lastFirstCandleTimeRef.current = firstCandleTime;
      // 타임프레임별 기본 줌 적용 (마커 가시성 최적화)
      const visibleCandles = DEFAULT_VISIBLE_CANDLES[timeframe];
      if (visibleCandles === 0) {
        chartRef.current?.timeScale().fitContent();
      } else {
        const from = Math.max(0, candleData.length - visibleCandles);
        const to = candleData.length - 1;
        chartRef.current?.timeScale().setVisibleLogicalRange({ from, to });
      }
      // 데이터 로드 후 마커 위치 업데이트
      setTimeout(() => updateMarkerPositions(), 50);
      return;
    }

    // 실시간 업데이트: 마지막 캔들만 업데이트
    const lastCandle = candleData[candleData.length - 1];
    const formattedCandle: CandlestickData = {
      time: lastCandle.time as Time,
      open: lastCandle.open,
      high: lastCandle.high,
      low: lastCandle.low,
      close: lastCandle.close,
    };

    seriesRef.current.update(formattedCandle);
  }, [candleData, updateMarkerPositions]);

  // 마커 데이터 변경 시 위치 업데이트
  useEffect(() => {
    updateMarkerPositions();
  }, [markerDataList, clusterDataList, updateMarkerPositions]);

  // 시그널 ID 목록 (실제 시그널 변경 감지용)
  const signalIds = useMemo(() => signals.map(s => s.id).join(','), [signals]);

  // 타임프레임/시그널 변경 시 펼쳐진 클러스터 닫기
  // signalIds를 사용해 실제 시그널 변경만 감지 (배열 참조 변경 무시)
  useEffect(() => {
    setExpandedClusterId(null);
  }, [timeframe, signalIds]);

  // 시그널 선택 시 차트 스크롤
  useEffect(() => {
    if (!selectedSignalId || !chartRef.current) return;

    // 해당 시그널의 마커 데이터 찾기
    const markerData = markerDataListRef.current.find(
      (m) => m.signal.id === selectedSignalId
    );

    if (markerData) {
      // 차트를 해당 시간으로 스크롤 (중앙에 위치)
      const timeScale = chartRef.current.timeScale();
      const visibleRange = timeScale.getVisibleLogicalRange();
      if (visibleRange) {
        const visibleWidth = visibleRange.to - visibleRange.from;
        const targetTime = markerData.alignedTime as Time;

        // 해당 시간의 logical index 찾기
        const coordinate = timeScale.timeToCoordinate(targetTime);
        if (coordinate !== null) {
          const logicalIndex = timeScale.coordinateToLogical(coordinate);
          if (logicalIndex !== null) {
            // 마커가 화면 중앙에 오도록 스크롤
            const newFrom = logicalIndex - visibleWidth / 2;
            const newTo = logicalIndex + visibleWidth / 2;
            timeScale.setVisibleLogicalRange({ from: newFrom, to: newTo });
          }
        }
      }

      // 약간의 딜레이 후 마커 위치 업데이트
      setTimeout(() => updateMarkerPositions(), 100);
    }
  }, [selectedSignalId, updateMarkerPositions]);

  return (
    <div className="relative w-full h-full min-h-[250px] sm:min-h-[300px] md:min-h-[400px] overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {/* 타임프레임 선택 UI */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-30 flex gap-0.5 sm:gap-1 glass rounded-lg sm:rounded-xl p-0.5 sm:p-1">
        {TIMEFRAME_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onTimeframeChange(option.value)}
            disabled={isLoading}
            className={`px-3 py-2 sm:px-3.5 sm:py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
              timeframe === option.value
                ? 'bg-point text-white shadow-md ring-2 ring-point/30'
                : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary/80'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center glass">
          <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl bg-bg-elevated/80 shadow-soft-lg">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-point" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs sm:text-sm font-medium text-fg-primary">로딩 중...</span>
          </div>
        </div>
      )}

      {/* 커스텀 마커 오버레이 (프로필 + 방향) - ref 기반 DOM 조작 */}
      {markerDataList.map((markerData) => {
        const isSelected = selectedSignalId === markerData.signal.id;
        return (
        <div
          key={markerData.signal.id}
          ref={(el) => {
            if (el) {
              markerRefsMap.current.set(markerData.signal.id, el);
            } else {
              markerRefsMap.current.delete(markerData.signal.id);
            }
          }}
          className={`absolute left-0 top-0 pointer-events-none ${isSelected ? 'z-50' : 'z-10'}`}
          style={{
            willChange: 'transform, visibility',
            visibility: 'hidden', // 초기에는 숨김, updateMarkerPositions에서 표시
          }}
        >
          <div
            className={`flex flex-col items-center pointer-events-auto cursor-pointer marker-hover ${isSelected ? 'marker-selected' : ''}`}
            onClick={() => onSignalClick?.(markerData.signal.id)}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const containerRect = containerRef.current?.getBoundingClientRect();
              if (containerRect) {
                const x = rect.left - containerRect.left + rect.width / 2;
                const y = rect.top - containerRect.top;
                setTooltip({
                  visible: true,
                  x,
                  y: markerData.signal.sentiment === 'LONG' ? y + 50 : y,
                  signal: markerData.signal,
                  candlePrice: markerData.candlePrice,
                });
              }
            }}
            onMouseLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}
          >
            {/* SHORT: 화살표가 위, 프로필이 아래 */}
            {markerData.signal.sentiment === 'SHORT' && (
              <div className="text-danger text-sm sm:text-xl leading-none">▼</div>
            )}

            {/* 프로필 이미지 */}
            <div
              className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 overflow-hidden bg-bg-secondary ${
                markerData.signal.sentiment === 'LONG'
                  ? 'border-success'
                  : 'border-danger'
              }`}
            >
              <img
                src={markerData.signal.influencer?.avatar_url}
                alt={markerData.signal.influencer?.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* LONG: 프로필이 위, 화살표가 아래 */}
            {markerData.signal.sentiment === 'LONG' && (
              <div className="text-success text-sm sm:text-xl leading-none">▲</div>
            )}
          </div>
        </div>
        )
      })}

      {/* 클러스터 마커 - ref 기반 DOM 조작 */}
      {clusterDataList.map((clusterData) => {
        const cluster = markerClusters.find((c) => c.id === clusterData.id);
        if (!cluster) return null;

        return (
          <div
            key={clusterData.id}
            ref={(el) => {
              if (el) {
                clusterRefsMap.current.set(clusterData.id, el);
              } else {
                clusterRefsMap.current.delete(clusterData.id);
              }
            }}
            className="absolute left-0 top-0 pointer-events-auto z-10"
            style={{
              willChange: 'transform, visibility',
              visibility: 'hidden', // 초기에는 숨김, updateMarkerPositions에서 표시
            }}
          >
            <StackedMarker
              cluster={cluster}
              onClick={() => setExpandedClusterId(clusterData.id)}
            />
          </div>
        );
      })}

      {/* 펼쳐진 클러스터 */}
      {(() => {
        const expandedCluster = expandedClusterId
          ? markerClusters.find((c) => c.id === expandedClusterId)
          : null;
        if (!expandedCluster) return null;
        return (
          <ExpandedCluster
            cluster={expandedCluster}
            onClose={() => setExpandedClusterId(null)}
            onSignalClick={(signalId) => {
              onSignalClick?.(signalId);
              setExpandedClusterId(null);
            }}
            containerBounds={containerRef.current?.getBoundingClientRect()}
          />
        );
      })()}

      {/* X 스타일 툴팁 - 모바일에서는 숨김 */}
      {tooltip.visible && tooltip.signal && (
        <div
          className="absolute z-20 w-[280px] sm:w-[320px] glass-tooltip pointer-events-none overflow-hidden hidden sm:block"
          style={{
            left: Math.min(Math.max(tooltip.x - 140, 10), (containerRef.current?.clientWidth || 400) - 290),
            top: Math.max(tooltip.y + 15, 10),
          }}
        >
          {/* 헤더 */}
          <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 sm:px-4 sm:pt-3 sm:pb-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-fg-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>

          {/* 본문 */}
          <div className="px-3 pb-2.5 sm:px-4 sm:pb-3">
            <div className="flex gap-2 sm:gap-3">
              {/* 아바타 */}
              <img
                src={tooltip.signal.influencer?.avatar_url}
                alt={tooltip.signal.influencer?.name}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 ring-2 ring-bg-primary/30"
              />

              <div className="flex-1 min-w-0">
                {/* 이름 & 핸들 */}
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-fg-primary font-bold text-[13px] sm:text-[15px]">{tooltip.signal.influencer?.name}</span>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-point" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                  </svg>
                  <span className="text-fg-tertiary text-[13px] sm:text-[15px]">{tooltip.signal.influencer?.handle}</span>
                </div>

                {/* 텍스트 */}
                <p className="text-fg-primary text-[13px] sm:text-[15px] leading-5 mt-1 sm:mt-1.5 line-clamp-3">
                  {tooltip.signal.original_text}
                </p>

                {/* 시그널 정보 카드 */}
                <div className="mt-2 sm:mt-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-bg-tertiary/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-point font-bold text-sm sm:text-base">{tooltip.signal.coin_symbol}</span>
                      <span
                        className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold ${
                          tooltip.signal.sentiment === 'LONG'
                            ? 'bg-success/15 text-success'
                            : 'bg-danger/15 text-danger'
                        }`}
                      >
                        {tooltip.signal.sentiment}
                      </span>
                    </div>
                    <span className="text-fg-secondary text-xs sm:text-sm font-mono px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md bg-bg-tertiary/50">
                      ${tooltip.candlePrice.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 날짜 */}
                <p className="text-fg-tertiary text-[11px] sm:text-[13px] mt-1.5 sm:mt-2">
                  {toDisplayFormat(tooltip.signal.signal_timestamp, 'long')}
                </p>
              </div>
            </div>
          </div>

          {/* 하단 액션 바 */}
          <div className="flex items-center justify-around py-2 sm:py-2.5 border-t border-border-primary/50 text-fg-tertiary bg-bg-tertiary/30">
            <div className="flex items-center gap-1 p-1 sm:p-1.5 rounded-lg hover:bg-bg-secondary/50 transition-colors">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="flex items-center gap-1 p-1 sm:p-1.5 rounded-lg hover:bg-bg-secondary/50 transition-colors">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="flex items-center gap-1 p-1 sm:p-1.5 rounded-lg hover:bg-bg-secondary/50 transition-colors">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div className="flex items-center gap-1 p-1 sm:p-1.5 rounded-lg hover:bg-bg-secondary/50 transition-colors">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* 로딩 스켈레톤 */}
      {candleData.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-primary">
          <div className="animate-pulse text-fg-muted">차트 로딩 중...</div>
        </div>
      )}
    </div>
  );
}
