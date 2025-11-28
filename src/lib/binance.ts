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
// 타임프레임별 조회 시작 기준
// ============================================
// 1H: 최근 90일 (약 2,160개 캔들)
// 4H: 2020년 1월 1일부터 (코로나 빔 포함)
// 1D: 2017년 1월 1일부터 (BTC 전체 역사)
// 1W: 2017년 1월 1일부터 (~400개 캔들)
// 1M: 2017년 1월 1일부터 (~96개 캔들)
export const TIMEFRAME_START_LIMITS: Record<TimeframeType, number> = {
  '1h': Date.now() - 90 * 24 * 60 * 60 * 1000,           // 최근 90일
  '4h': new Date('2020-01-01T00:00:00Z').getTime(),      // 2020년 1월 1일 (코로나 빔 포함)
  '1d': new Date('2017-01-01T00:00:00Z').getTime(),      // 2017년 1월 1일 (BTC 전체)
  '1w': new Date('2017-01-01T00:00:00Z').getTime(),      // 2017년 1월 1일
  '1M': new Date('2017-01-01T00:00:00Z').getTime(),      // 2017년 1월 1일
};

// 기존 TIMEFRAME_LIMITS는 호환성을 위해 유지 (단순 limit용)
export const TIMEFRAME_LIMITS: Record<TimeframeType, number> = {
  '1h': 168,  // 7일치 (7 * 24)
  '4h': 180,  // 30일치 (30 * 6)
  '1d': 90,   // 90일치
  '1w': 52,   // 1년치
  '1M': 24,   // 2년치
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
  // 동적으로 startLimit 계산 (모듈 캐시 문제 방지)
  const now = Date.now();
  const startLimit = interval === '1h'
    ? now - 90 * 24 * 60 * 60 * 1000  // 최근 90일
    : TIMEFRAME_START_LIMITS[interval];
  const allCandles: CandleData[] = [];
  let endTime: number | null = null; // null이면 최신부터
  let reachedStart = false;

  console.log(`[fetchBTCCandlesClient] Starting fetch for ${interval}`);
  console.log(`[fetchBTCCandlesClient] Current time: ${new Date(now).toISOString()}`);
  console.log(`[fetchBTCCandlesClient] startLimit: ${new Date(startLimit).toISOString()}`);

  try {
    while (!reachedStart) {
      // API URL 구성 (캐시 버스팅 추가)
      const cacheBuster = Date.now();
      let url = `${BINANCE_API}/klines?symbol=BTCUSDT&interval=${interval}&limit=${BINANCE_MAX_LIMIT}&_t=${cacheBuster}`;
      if (endTime !== null) {
        url += `&endTime=${endTime}`;
      }

      console.log(`[fetchBTCCandlesClient] Fetching: ${url.replace(`&_t=${cacheBuster}`, '')}`);
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

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

      // 가장 오래된/최신 캔들의 시간 (밀리초)
      const oldestCandleTime = data[0][0];
      const newestCandleTime = data[data.length - 1][0];
      console.log(`[fetchBTCCandlesClient] Fetched ${data.length} candles`);
      console.log(`[fetchBTCCandlesClient] Oldest: ${new Date(oldestCandleTime).toISOString()}`);
      console.log(`[fetchBTCCandlesClient] Newest: ${new Date(newestCandleTime).toISOString()}`);

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
    if (filtered.length > 0) {
      const firstCandle = filtered[0];
      const lastCandle = filtered[filtered.length - 1];
      console.log(`[fetchBTCCandlesClient] First candle: ${new Date(firstCandle.time * 1000).toISOString()} (${firstCandle.time})`);
      console.log(`[fetchBTCCandlesClient] Last candle: ${new Date(lastCandle.time * 1000).toISOString()} (${lastCandle.time})`);
    }
    return filtered;
  } catch (error) {
    console.error('[fetchBTCCandlesClient] Error:', error);
    return [];
  }
}

// CoinGecko API로 과거 BTC 가격 가져오기 (Vercel에서 차단 안 됨)
async function fetchHistoricalBTCPriceCoinGecko(unixTimestamp: number): Promise<number | null> {
  try {
    // CoinGecko market_chart/range API 사용
    // 해당 시점 전후 5분 범위로 조회
    const from = unixTimestamp - 300;
    const to = unixTimestamp + 300;

    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${from}&to=${to}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      console.log('[CoinGecko] Failed to fetch:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.prices || data.prices.length === 0) {
      console.log('[CoinGecko] No price data for timestamp:', unixTimestamp);
      return null;
    }

    // 가장 가까운 시점의 가격 반환
    // prices: [[timestamp_ms, price], ...]
    const targetMs = unixTimestamp * 1000;
    let closestPrice = data.prices[0][1];
    let closestDiff = Math.abs(data.prices[0][0] - targetMs);

    for (const [timestamp, price] of data.prices) {
      const diff = Math.abs(timestamp - targetMs);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestPrice = price;
      }
    }

    console.log('[CoinGecko] Found price:', Math.round(closestPrice));
    return Math.round(closestPrice);
  } catch (error) {
    console.error('[CoinGecko] Error:', error);
    return null;
  }
}

// BTC/USDT 특정 시점의 과거 가격 가져오기 (Binance → CoinGecko fallback)
export async function fetchHistoricalBTCPrice(unixTimestamp: number): Promise<number | null> {
  // 1. Binance 시도
  try {
    const timestampMs = unixTimestamp * 1000;

    const response = await fetch(
      `${BINANCE_API}/klines?symbol=BTCUSDT&interval=1m&startTime=${timestampMs}&limit=1`,
      { cache: 'no-store' }
    );

    if (response.ok) {
      const data: number[][] = await response.json();

      if (data.length > 0) {
        const closePrice = parseFloat(data[0][4] as unknown as string);
        console.log('[Binance] Found price:', Math.round(closePrice));
        return Math.round(closePrice);
      }
    }

    console.log('[Binance] Failed or no data, trying CoinGecko...');
  } catch (error) {
    console.log('[Binance] Error, trying CoinGecko...', error);
  }

  // 2. CoinGecko fallback
  return fetchHistoricalBTCPriceCoinGecko(unixTimestamp);
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
