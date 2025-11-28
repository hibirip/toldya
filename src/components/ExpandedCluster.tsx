'use client';

import { useEffect, useRef } from 'react';
import { MarkerCluster } from '@/types';

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
  const popupRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        backdropRef.current &&
        e.target === backdropRef.current
      ) {
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

  // 팝업 위치 계산 (화면 경계 벗어나지 않도록)
  const getPopupPosition = () => {
    const popupWidth = 240;
    const popupHeight = 280; // 예상 최대 높이
    const padding = 10;

    let left = cluster.x;
    let top = cluster.y + 20; // 클러스터 마커 아래에 표시

    if (containerBounds) {
      // 오른쪽 경계 체크
      if (left + popupWidth / 2 > containerBounds.width - padding) {
        left = containerBounds.width - popupWidth / 2 - padding;
      }
      // 왼쪽 경계 체크
      if (left - popupWidth / 2 < padding) {
        left = popupWidth / 2 + padding;
      }
      // 아래쪽 경계 체크 - 위로 표시
      if (top + popupHeight > containerBounds.height - padding) {
        top = cluster.y - popupHeight - 20;
      }
    }

    return { left, top };
  };

  const position = getPopupPosition();

  return (
    <>
      {/* 반투명 배경 */}
      <div
        ref={backdropRef}
        className="absolute inset-0 z-30 bg-black/10"
        aria-hidden="true"
      />

      {/* 리스트 팝업 */}
      <div
        ref={popupRef}
        className="absolute z-40 w-[240px] glass-tooltip popup-fade-in overflow-hidden"
        style={{
          left: position.left,
          top: position.top,
          transform: 'translateX(-50%)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`${cluster.signals.length}개의 시그널`}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-primary/50">
          <span className="text-xs font-medium text-fg-secondary">
            {cluster.signals.length} signals
          </span>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-fg-tertiary hover:text-fg-primary hover:bg-bg-tertiary transition-colors"
            aria-label="닫기"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 시그널 리스트 */}
        <div className="max-h-[224px] overflow-y-auto">
          {cluster.signals.map((signal) => (
            <button
              key={signal.id}
              onClick={() => onSignalClick(signal.id)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-tertiary/50 transition-colors text-left"
            >
              {/* 아바타 */}
              <div
                className={`w-7 h-7 rounded-full border-2 overflow-hidden flex-shrink-0 ${
                  signal.sentiment === 'LONG' ? 'border-success' : 'border-danger'
                }`}
              >
                <img
                  src={signal.influencer?.avatar_url || '/default-avatar.png'}
                  alt={signal.influencer?.name || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 핸들 + 텍스트 */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-fg-primary truncate">
                  @{signal.influencer?.handle || 'unknown'}
                </div>
                <div className="text-[10px] text-fg-tertiary truncate">
                  {signal.original_text?.slice(0, 40)}...
                </div>
              </div>

              {/* Sentiment 화살표 */}
              <span
                className={`text-sm flex-shrink-0 ${
                  signal.sentiment === 'LONG' ? 'text-success' : 'text-danger'
                }`}
              >
                {signal.sentiment === 'LONG' ? '▲' : '▼'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
