'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { CandleData, TimeframeType } from '@/types';
import { getCandleStartTime } from '@/lib/timeUtils';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';

export interface RealtimeTicker {
  price: string;
  priceChangePercent: string;
  volume: string;
}

export interface RealtimeCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  isNew: boolean; // 새 캔들인지 기존 캔들 업데이트인지
}

interface UseBinanceWebSocketOptions {
  timeframe: TimeframeType;
  lastCandleTime?: number; // REST에서 받은 마지막 캔들 시간
  onCandleUpdate?: (candle: RealtimeCandle) => void;
  onTickerUpdate?: (ticker: RealtimeTicker) => void;
}

// 타임프레임을 Binance 웹소켓 interval로 변환
const timeframeToInterval: Record<TimeframeType, string> = {
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
  '1M': '1M',
};

export function useBinanceWebSocket({
  timeframe,
  lastCandleTime,
  onCandleUpdate,
  onTickerUpdate,
}: UseBinanceWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastCandleTimeRef = useRef<number | undefined>(lastCandleTime);
  const maxReconnectAttempts = 5;

  // lastCandleTime이 변경되면 ref 업데이트
  useEffect(() => {
    lastCandleTimeRef.current = lastCandleTime;
  }, [lastCandleTime]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // 스트림 구성: 캔들 + 24시간 티커
    const interval = timeframeToInterval[timeframe];
    const streams = [
      `btcusdt@kline_${interval}`, // 캔들 데이터
      'btcusdt@ticker',            // 24시간 티커
    ];

    const wsUrl = `${BINANCE_WS_URL}/${streams.join('/')}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Kline (캔들) 데이터
          if (data.e === 'kline') {
            const kline = data.k;
            const candleTime = getCandleStartTime(Math.floor(kline.t / 1000), timeframe);

            // REST 데이터의 마지막 캔들 시간보다 이전 데이터는 무시
            if (lastCandleTimeRef.current && candleTime < lastCandleTimeRef.current) {
              return;
            }

            const candle: RealtimeCandle = {
              time: candleTime,
              open: Math.round(parseFloat(kline.o)),
              high: Math.round(parseFloat(kline.h)),
              low: Math.round(parseFloat(kline.l)),
              close: Math.round(parseFloat(kline.c)),
              isNew: lastCandleTimeRef.current ? candleTime > lastCandleTimeRef.current : false,
            };
            onCandleUpdate?.(candle);
          }

          // 24시간 티커 데이터
          if (data.e === '24hrTicker') {
            const ticker: RealtimeTicker = {
              price: parseFloat(data.c).toFixed(2),
              priceChangePercent: parseFloat(data.P).toFixed(2),
              volume: (parseFloat(data.q) / 1e9).toFixed(1),
            };
            onTickerUpdate?.(ticker);
          }
        } catch (e) {
          console.error('WebSocket message parse error:', e);
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection error');
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);

        // 자동 재연결 (최대 5회)
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('Connection failed after multiple attempts');
        }
      };
    } catch (e) {
      setError('Failed to create WebSocket connection');
    }
  }, [timeframe, onCandleUpdate, onTickerUpdate]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  // 타임프레임 변경 시 재연결
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    error,
    reconnect: connect,
  };
}
