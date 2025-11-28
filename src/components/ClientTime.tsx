'use client';

import { useState, useEffect } from 'react';
import { toDisplayFormat } from '@/lib/timeUtils';

interface ClientTimeProps {
  timestamp: number;
  format?: 'short' | 'long' | 'datetime';
  className?: string;
}

/**
 * 클라이언트에서만 렌더링되는 시간 컴포넌트
 * SSR에서는 플레이스홀더를 표시하고, 클라이언트에서 마운트 후 실제 로컬 시간 표시
 * 이렇게 하면 SSR/CSR 타임존 불일치 문제를 해결할 수 있음
 */
export default function ClientTime({ timestamp, format = 'datetime', className }: ClientTimeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR에서는 플레이스홀더 표시
  if (!mounted) {
    return <span className={className}>--:--</span>;
  }

  // 클라이언트에서는 로컬 타임존으로 실제 시간 표시
  return (
    <time className={className} dateTime={new Date(timestamp * 1000).toISOString()}>
      {toDisplayFormat(timestamp, format)}
    </time>
  );
}
