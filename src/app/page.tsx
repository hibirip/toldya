import Dashboard from '@/components/Dashboard';
import { fetchBTCCandles, fetchBTCTicker } from '@/lib/binance';
import { fetchSignalsForFrontend } from '@/lib/supabase';

// Supabase 시그널 fetch (에러 시 빈 배열 반환)
async function fetchSignalsSafe() {
  try {
    return await fetchSignalsForFrontend(100);
  } catch (error) {
    console.error('Failed to fetch signals from Supabase:', error);
    return []; // DB 연결 실패 시 빈 배열 → Mock 데이터 사용
  }
}

export default async function Home() {
  // 서버에서 데이터 fetch (기본값: 4h)
  const [candleData, ticker, signals] = await Promise.all([
    fetchBTCCandles('4h'),
    fetchBTCTicker(),
    fetchSignalsSafe(),
  ]);

  return (
    <Dashboard
      initialCandleData={candleData}
      ticker={ticker}
      initialSignals={signals}
    />
  );
}
