import { Signal } from '@/types';

/**
 * 오늘 시그널인지 판단 (로컬 타임존 기준)
 * @param signalTimestamp - 시그널 타임스탬프 (Unix timestamp, 초 단위)
 * @returns 오늘 시그널이면 true
 */
export function isTodaySignal(signalTimestamp: number): boolean {
  const now = new Date();
  const signalDate = new Date(signalTimestamp * 1000);

  // 로컬 타임존 기준으로 날짜 비교
  return (
    signalDate.getFullYear() === now.getFullYear() &&
    signalDate.getMonth() === now.getMonth() &&
    signalDate.getDate() === now.getDate()
  );
}

/**
 * 실시간 수익률 계산
 * @param signal - 시그널 정보
 * @param currentPrice - 현재 가격
 * @returns 수익률 (%) 또는 null
 */
export function calculateRealtimeProfit(
  signal: Signal,
  currentPrice: number
): number | null {
  const entryPrice = signal.entry_price;
  if (!entryPrice || entryPrice === 0 || currentPrice === 0) return null;

  const priceDiff = currentPrice - entryPrice;
  const returnPct = (priceDiff / entryPrice) * 100;

  // SHORT의 경우 부호 반전
  return signal.sentiment === 'LONG' ? returnPct : -returnPct;
}

/**
 * 하이브리드 수익률 가져오기
 * - 오늘 시그널: 실시간 계산
 * - 과거 시그널: DB 값 사용 (없으면 실시간 계산)
 *
 * @param signal - 시그널 정보
 * @param currentPrice - 현재 가격
 * @returns 수익률 (%) 또는 null
 */
export function getHybridProfit(
  signal: Signal,
  currentPrice: number
): number | null {
  // 오늘 시그널은 항상 실시간 계산
  if (isTodaySignal(signal.signal_timestamp)) {
    return calculateRealtimeProfit(signal, currentPrice);
  }

  // 과거 시그널: DB 값이 있으면 사용
  if (signal.current_profit !== null && signal.current_profit !== undefined) {
    return signal.current_profit;
  }

  // DB 값이 없으면 실시간 계산 (마이그레이션 전 데이터)
  return calculateRealtimeProfit(signal, currentPrice);
}

/**
 * 시그널 배열에서 오늘 시그널 개수
 * (디버깅/모니터링용)
 */
export function countTodaySignals(signals: Signal[]): number {
  return signals.filter((s) => isTodaySignal(s.signal_timestamp)).length;
}
