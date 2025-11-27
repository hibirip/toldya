import { TimeframeType } from '@/types';

// 타임프레임별 초 단위 간격
export const TIMEFRAME_SECONDS: Record<TimeframeType, number> = {
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1w': 604800,    // 7일
  '1M': 2592000,   // 30일 (대략적)
};

/**
 * 시그널 타임스탬프를 해당 타임프레임의 캔들 시작 시간으로 정렬
 * 예: 14:35의 시그널 → 1H 차트에서는 14:00 캔들, 4H 차트에서는 12:00 캔들에 매칭
 *
 * 주의: Binance 캔들 시작 시간 기준
 * - 1H/4H/1D: UTC 기준 정각/4시간/자정
 * - 1W: 월요일 00:00 UTC
 * - 1M: 매월 1일 00:00 UTC
 */
export function getCandleStartTime(timestamp: number, timeframe: TimeframeType): number {
  // 1W, 1M은 특별 처리 필요
  if (timeframe === '1w') {
    // Binance 주봉은 월요일 00:00 UTC 시작
    const date = new Date(timestamp * 1000);
    const dayOfWeek = date.getUTCDay(); // 0=일요일, 1=월요일, ..., 6=토요일
    // 월요일까지의 일수 계산 (월요일이면 0, 화요일이면 1, ..., 일요일이면 6)
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    // 해당 주의 월요일 00:00 UTC로 설정
    const monday = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() - daysToMonday,
      0, 0, 0, 0
    ));
    return Math.floor(monday.getTime() / 1000);
  }

  if (timeframe === '1M') {
    // Binance 월봉은 매월 1일 00:00 UTC 시작
    const date = new Date(timestamp * 1000);
    const firstOfMonth = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      1, 0, 0, 0, 0
    ));
    return Math.floor(firstOfMonth.getTime() / 1000);
  }

  // 1H, 4H, 1D는 단순 모듈로 계산
  const interval = TIMEFRAME_SECONDS[timeframe];
  return Math.floor(timestamp / interval) * interval;
}

/**
 * 고정 기준 시간 기반 상대적 타임스탬프 생성 (목 데이터용)
 * SSR/CSR hydration 일치를 위해 Date.now() 대신 고정 시간 사용
 * @param hoursAgo - 몇 시간 전인지
 * @param minutesAgo - 추가 분 (선택)
 * @returns Unix timestamp (초 단위)
 */
export function getRelativeTimestamp(hoursAgo: number, minutesAgo: number = 0): number {
  // 고정 기준 시간: 2025년 11월 27일 00:00:00 KST (hydration 일치용)
  const FIXED_BASE_TIME = 1764169200; // 2025-11-27 00:00:00 KST in Unix timestamp
  return FIXED_BASE_TIME - (hoursAgo * 3600) - (minutesAgo * 60);
}

/**
 * Unix timestamp를 표시용 문자열로 변환
 * @param timestamp - Unix timestamp (초 단위)
 * @param format - 'short' | 'long' | 'datetime'
 */
export function toDisplayFormat(
  timestamp: number,
  format: 'short' | 'long' | 'datetime' = 'short'
): string {
  const date = new Date(timestamp * 1000);

  // 서버/클라이언트 hydration 일치를 위해 timeZone 명시
  const timeZone = 'Asia/Seoul';

  switch (format) {
    case 'long':
      return date.toLocaleDateString('ko-KR', {
        timeZone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'datetime':
      return date.toLocaleString('ko-KR', {
        timeZone,
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'short':
    default:
      return date.toLocaleDateString('ko-KR', {
        timeZone,
        month: 'short',
        day: 'numeric',
      });
  }
}
