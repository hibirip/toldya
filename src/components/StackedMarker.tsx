'use client';

import Image from 'next/image';
import { MarkerCluster } from '@/types';
import { getMajoritySentiment } from '@/lib/clusterSignals';

interface StackedMarkerProps {
  cluster: MarkerCluster;
  onClick: () => void;
}

export default function StackedMarker({ cluster, onClick }: StackedMarkerProps) {
  const { signals } = cluster;
  const count = signals.length;
  const majority = getMajoritySentiment(cluster);

  // 최대 3개까지만 표시
  const displaySignals = signals.slice(0, 3);

  // majority에 따른 테두리 색상
  const borderColor =
    majority === 'LONG'
      ? 'border-emerald-400'
      : majority === 'SHORT'
        ? 'border-rose-400'
        : 'border-amber-400';

  const glowColor =
    majority === 'LONG'
      ? 'shadow-emerald-400/50'
      : majority === 'SHORT'
        ? 'shadow-rose-400/50'
        : 'shadow-amber-400/50';

  return (
    <div
      className="relative cursor-pointer transition-transform hover:scale-110"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`${count}개의 시그널 클러스터`}
    >
      {/* 겹쳐진 아바타들 */}
      <div className="relative" style={{ width: 32, height: 32 }}>
        {displaySignals.map((signal, index) => {
          const offset = index * -4;
          const zIndex = 30 - index * 10;
          const scale = 1 - index * 0.05;

          return (
            <div
              key={signal.id}
              className={`absolute rounded-full border-2 ${borderColor} overflow-hidden bg-bg-secondary`}
              style={{
                width: 28,
                height: 28,
                left: offset,
                top: offset,
                zIndex,
                transform: `scale(${scale})`,
              }}
            >
              {signal.influencer?.avatar_url ? (
                <Image
                  src={signal.influencer.avatar_url}
                  alt={signal.influencer.name || 'User'}
                  width={28}
                  height={28}
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-fg-secondary">
                  {signal.influencer?.name?.[0] || '?'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 카운트 뱃지 */}
      {count > 1 && (
        <div
          className={`absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1
            rounded-full bg-bg-elevated border border-border text-[10px]
            font-bold text-fg-primary flex items-center justify-center
            shadow-md ${glowColor}`}
          style={{ zIndex: 40 }}
        >
          {count}
        </div>
      )}

      {/* 방향 표시 (majority sentiment) */}
      <div
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px]"
        style={{ zIndex: 40 }}
      >
        {majority === 'LONG' && <span className="text-emerald-400">▲</span>}
        {majority === 'SHORT' && <span className="text-rose-400">▼</span>}
        {majority === 'MIXED' && <span className="text-amber-400">◆</span>}
      </div>
    </div>
  );
}
