import Dashboard from '@/components/Dashboard';
import { fetchBTCCandles, fetchBTCTicker } from '@/lib/binance';
import { fetchSignalsForFrontend, getSignalCount } from '@/lib/supabase';

// 빌드 타임에 정적 생성하지 않고 런타임에 동적 렌더링
export const dynamic = 'force-dynamic';

const INITIAL_SIGNALS_LIMIT = 50;

// Supabase 시그널 fetch (에러 시 빈 배열 반환)
async function fetchSignalsSafe() {
  try {
    const [signals, totalCount] = await Promise.all([
      fetchSignalsForFrontend(INITIAL_SIGNALS_LIMIT),
      getSignalCount(),
    ]);
    return { signals, totalCount };
  } catch (error) {
    console.error('Failed to fetch signals from Supabase:', error);
    return { signals: [], totalCount: 0 };
  }
}

export default async function Home() {
  // 서버에서 데이터 fetch (기본값: 1h)
  const [candleData, ticker, signalData] = await Promise.all([
    fetchBTCCandles('1h'),
    fetchBTCTicker(),
    fetchSignalsSafe(),
  ]);

  return (
    <Dashboard
      initialCandleData={candleData}
      ticker={ticker}
      initialSignals={signalData.signals}
      initialTotalCount={signalData.totalCount}
    />
  );
}
