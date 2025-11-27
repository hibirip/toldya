'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { MarkerCluster, Signal } from '@/types';
import { calculateExpandedPositions } from '@/lib/clusterSignals';

interface ExpandedClusterProps {
  cluster: MarkerCluster;
  onClose: () => void;
  onSignalClick: (signalId: string) => void;
  containerBounds?: DOMRect;
}

export default function ExpandedCluster({
  cluster,
  onClose,
  onSignalClick,
  containerBounds,
}: ExpandedClusterProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (backdropRef.current && e.target === backdropRef.current) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 펼쳐진 위치 계산
  const expandedPositions = calculateExpandedPositions(cluster, 55);

  // 컨테이너 경계 내에 위치 조정
  const adjustPosition = (x: number, y: number) => {
    if (!containerBounds) return { x, y };

    const padding = 20;
    const adjustedX = Math.max(padding, Math.min(x, containerBounds.width - padding));
    const adjustedY = Math.max(padding, Math.min(y, containerBounds.height - padding));

    return { x: adjustedX, y: adjustedY };
  };

  return (
    <>
      {/* 반투명 배경 */}
      <div
        ref={backdropRef}
        className="absolute inset-0 z-30 bg-black/20"
        aria-hidden="true"
      />

      {/* 중심점 표시 */}
      <div
        className="absolute w-3 h-3 rounded-full bg-point/50 z-40"
        style={{
          left: cluster.x,
          top: cluster.y,
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* 펼쳐진 시그널들 */}
      {expandedPositions.map(({ signal, x, y }, index) => {
        const adjusted = adjustPosition(x, y);

        return (
          <ExpandedSignalMarker
            key={signal.id}
            signal={signal}
            x={adjusted.x}
            y={adjusted.y}
            index={index}
            onClick={() => onSignalClick(signal.id)}
          />
        );
      })}

      {/* 닫기 버튼 */}
      <button
        className="absolute z-50 w-6 h-6 rounded-full bg-bg-elevated border border-border
          flex items-center justify-center text-fg-secondary hover:text-fg-primary
          hover:bg-bg-tertiary transition-colors"
        style={{
          left: cluster.x + 60,
          top: cluster.y - 60,
          transform: 'translate(-50%, -50%)',
        }}
        onClick={onClose}
        aria-label="클러스터 닫기"
      >
        ×
      </button>
    </>
  );
}

// 펼쳐진 개별 시그널 마커
interface ExpandedSignalMarkerProps {
  signal: Signal;
  x: number;
  y: number;
  index: number;
  onClick: () => void;
}

function ExpandedSignalMarker({
  signal,
  x,
  y,
  index,
  onClick,
}: ExpandedSignalMarkerProps) {
  const borderColor =
    signal.sentiment === 'LONG' ? 'border-emerald-400' : 'border-rose-400';
  const bgColor =
    signal.sentiment === 'LONG' ? 'bg-emerald-400/10' : 'bg-rose-400/10';

  return (
    <div
      className={`absolute z-40 cursor-pointer transition-all hover:scale-110 marker-expand`}
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        animationDelay: `${index * 50}ms`,
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* 아바타 */}
      <div
        className={`w-9 h-9 rounded-full border-2 ${borderColor} ${bgColor}
          overflow-hidden shadow-lg flex items-center justify-center`}
      >
        {signal.influencer?.avatar_url ? (
          <Image
            src={signal.influencer.avatar_url}
            alt={signal.influencer.name || 'User'}
            width={36}
            height={36}
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="text-sm text-fg-secondary">
            {signal.influencer?.name?.[0] || '?'}
          </span>
        )}
      </div>

      {/* 이름 라벨 */}
      <div
        className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap
          text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated/90 border border-border
          text-fg-secondary max-w-[80px] truncate"
      >
        @{signal.influencer?.handle || 'unknown'}
      </div>

      {/* sentiment 표시 */}
      <div
        className="absolute -top-1 -right-1 text-[10px]"
      >
        {signal.sentiment === 'LONG' ? (
          <span className="text-emerald-400">▲</span>
        ) : (
          <span className="text-rose-400">▼</span>
        )}
      </div>
    </div>
  );
}
