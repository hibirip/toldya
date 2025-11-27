import { CandleData, TimeframeType } from '@/types';

const BINANCE_API = 'https://api.binance.com/api/v3';
const BINANCE_MAX_LIMIT = 1000; // Binance API 최대 캔들 수

export interface TickerPrice {
  symbol: string;
  price: string;
  priceChangePercent: string;
  volume: string;
}

// ============================================
// 타임프레임별 조회 시작 기준 (보수적 설정)
// ============================================
// 1H: 최근 90일 (약 2,160개 캔들)
// 4H: 2023년 1월 1일부터 (약 4,000개 캔들)
// 1D: 2021년 1월 1일부터 (전체 역사)
export const TIMEFRAME_START_LIMITS: Record<TimeframeType, number> = {
  '1h': Date.now() - 90 * 24 * 60 * 60 * 1000,           // 최근 90일
  '4h': new Date('2023-01-01T00:00:00Z').getTime(),      // 2023년 1월 1일
  '1d': new Date('2021-01-01T00:00:00Z').getTime(),      // 2021년 1월 1일
};

// 기존 TIMEFRAME_LIMITS는 호환성을 위해 유지 (단순 limit용)
export const TIMEFRAME_LIMITS: Record<TimeframeType, number> = {
  '1h': 168,  // 7일치 (7 * 24)
  '4h': 180,  // 30일치 (30 * 6)
  '1d': 90,   // 90일치
};

// 초기 표시할 캔들 수 (최근 데이터 중심으로 보여줌)
export const INITIAL_VISIBLE_CANDLES: Record<TimeframeType, number> = {
  '1h': 168,  // 최근 7일
  '4h': 180,  // 최근 30일
  '1d': 90,   // 최근 90일
};

// Binance timestamp(밀리초)를 Unix timestamp(초)로 변환
function formatTime(timestamp: number): number {
  return Math.floor(timestamp / 1000);
}

// 캔들 데이터 중복 제거 및 정렬 (시간 기준 오름차순)
function deduplicateAndSort(candles: CandleData[]): CandleData[] {
  const seen = new Map<number, CandleData>();
  candles.forEach((candle) => {
    seen.set(candle.time, candle);
  });
  return Array.from(seen.values()).sort((a, b) => a.time - b.time);
}

// BTC/USDT 캔들 데이터 가져오기 (서버용 - 페이지네이션 지원)
// 타임프레임별 시작 기준까지 모든 데이터를 가져옴
export async function fetchBTCCandles(
  interval: TimeframeType = '4h'
): Promise<CandleData[]> {
  const startLimit = TIMEFRAME_START_LIMITS[interval];
  const allCandles: CandleData[] = [];
  let endTime: number | null = null;
  let reachedStart = false;

  try {
    while (!reachedStart) {
      let url = `${BINANCE_API}/klines?symbol=BTCUSDT&interval=${interval}&limit=${BINANCE_MAX_LIMIT}`;
      if (endTime !== null) {
        url += `&endTime=${endTime}`;
      }

      const response = await fetch(url, { next: { revalidate: 60 } });

      if (!response.ok) {
        throw new Error(`Failed to fetch candle data: ${response.status}`);
      }

      const data: number[][] = await response.json();

      if (data.length === 0) break;

      const candles = data.map((kline) => ({
        time: formatTime(kline[0]),
        open: Math.round(parseFloat(kline[1] as unknown as string)),
        high: Math.round(parseFloat(kline[2] as unknown as string)),
        low: Math.round(parseFloat(kline[3] as unknown as string)),
        close: Math.round(parseFloat(kline[4] as unknown as string)),
      }));

      allCandles.push(...candles);

      const oldestCandleTime = data[0][0];

      if (oldestCandleTime <= startLimit) {
        reachedStart = true;
      } else {
        endTime = oldestCandleTime - 1;
      }

      if (data.length < BINANCE_MAX_LIMIT) break;
    }

    const result = deduplicateAndSort(allCandles);
    const startLimitSeconds = Math.floor(startLimit / 1000);
    return result.filter((candle) => candle.time >= startLimitSeconds);
  } catch (error) {
    console.error('Error fetching BTC candles:', error);
    return [];
  }
}

// BTC/USDT 캔들 데이터 가져오기 (클라이언트용 - 페이지네이션 지원)
// 타임프레임별 시작 기준까지 모든 데이터를 가져옴
export async function fetchBTCCandlesClient(
  interval: TimeframeType = '4h'
): Promise<CandleData[]> {
  const startLimit = TIMEFRAME_START_LIMITS[interval];
  const allCandles: CandleData[] = [];
  let endTime: number | null = null; // null이면 최신부터
  let reachedStart = false;

  console.log(`[fetchBTCCandlesClient] Starting fetch for ${interval}, startLimit: ${new Date(startLimit).toISOString()}`);

  try {
    while (!reachedStart) {
      // API URL 구성
      let url = `${BINANCE_API}/klines?symbol=BTCUSDT&interval=${interval}&limit=${BINANCE_MAX_LIMIT}`;
      if (endTime !== null) {
        url += `&endTime=${endTime}`;
      }

      const response = await fetch(url, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`Failed to fetch candle data: ${response.status}`);
      }

      const data: number[][] = await response.json();

      if (data.length === 0) {
        console.log('[fetchBTCCandlesClient] No more data available');
        break;
      }

      // 캔들 데이터 변환
      const candles = data.map((kline) => ({
        time: formatTime(kline[0]),
        open: Math.round(parseFloat(kline[1] as unknown as string)),
        high: Math.round(parseFloat(kline[2] as unknown as string)),
        low: Math.round(parseFloat(kline[3] as unknown as string)),
        close: Math.round(parseFloat(kline[4] as unknown as string)),
      }));

      allCandles.push(...candles);

      // 가장 오래된 캔들의 시간 (밀리초)
      const oldestCandleTime = data[0][0];
      console.log(`[fetchBTCCandlesClient] Fetched ${data.length} candles, oldest: ${new Date(oldestCandleTime).toISOString()}`);

      // 시작 기준에 도달했는지 확인
      if (oldestCandleTime <= startLimit) {
        console.log('[fetchBTCCandlesClient] Reached start limit');
        reachedStart = true;
      } else {
        // 다음 요청을 위해 endTime 설정 (가장 오래된 캔들 시간 - 1ms)
        endTime = oldestCandleTime - 1;
      }

      // 데이터가 1000개 미만이면 더 이상 없음
      if (data.length < BINANCE_MAX_LIMIT) {
        console.log('[fetchBTCCandlesClient] Received less than max, no more data');
        break;
      }
    }

    // 중복 제거 및 정렬
    const result = deduplicateAndSort(allCandles);

    // 시작 기준 이전 데이터 필터링
    const startLimitSeconds = Math.floor(startLimit / 1000);
    const filtered = result.filter((candle) => candle.time >= startLimitSeconds);

    console.log(`[fetchBTCCandlesClient] Total candles: ${filtered.length} (after dedup & filter)`);
    return filtered;
  } catch (error) {
    console.error('[fetchBTCCandlesClient] Error:', error);
    return [];
  }
}

// BTC/USDT 특정 시점의 과거 가격 가져오기
export async function fetchHistoricalBTCPrice(unixTimestamp: number): Promise<number | null> {
  try {
    // Unix timestamp (초) → 밀리초로 변환
    const timestampMs = unixTimestamp * 1000;

    // 해당 시점을 포함하는 1분봉 1개 가져오기
    const response = await fetch(
      `${BINANCE_API}/klines?symbol=BTCUSDT&interval=1m&startTime=${timestampMs}&limit=1`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      console.log('[fetchHistoricalBTCPrice] Failed to fetch:', response.status);
      return null;
    }

    const data: number[][] = await response.json();

    if (data.length === 0) {
      console.log('[fetchHistoricalBTCPrice] No data returned for timestamp:', unixTimestamp);
      return null;
    }

    // close 가격 반환 (index 4)
    const closePrice = parseFloat(data[0][4] as unknown as string);
    return Math.round(closePrice);
  } catch (error) {
    console.error('[fetchHistoricalBTCPrice] Error:', error);
    return null;
  }
}

// BTC/USDT 현재 가격 및 24시간 변동률 가져오기
export async function fetchBTCTicker(): Promise<TickerPrice | null> {
  try {
    const response = await fetch(
      `${BINANCE_API}/ticker/24hr?symbol=BTCUSDT`,
      { next: { revalidate: 10 } } // 10초마다 재검증
    );

    if (!response.ok) {
      throw new Error('Failed to fetch ticker data');
    }

    const data = await response.json();

    return {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice).toFixed(2),
      priceChangePercent: parseFloat(data.priceChangePercent).toFixed(2),
      volume: (parseFloat(data.quoteVolume) / 1e9).toFixed(1), // B (Billion) 단위
    };
  } catch (error) {
    console.error('Error fetching BTC ticker:', error);
    return null;
  }
}
