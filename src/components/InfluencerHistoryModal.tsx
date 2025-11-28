'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Signal, Influencer, SignalPaginationResponse } from '@/types';
import ClientTime from '@/components/ClientTime';
import { getHybridProfit } from '@/lib/profitCalculator';

const SIGNALS_PER_PAGE = 20;

interface InfluencerHistoryModalProps {
  influencer: Influencer;
  currentPrice: number;
  onClose: () => void;
}

export default function InfluencerHistoryModal({
  influencer,
  currentPrice,
  onClose,
}: InfluencerHistoryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 시그널 데이터 상태
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [stats, setStats] = useState({ total: 0, longCount: 0, shortCount: 0 });

  // 모바일 감지 및 Bottom Sheet 상태
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 외부 클릭으로 닫기 (데스크톱)
  useEffect(() => {
    if (isMobile) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, isMobile]);

  // 초기 데이터 로드
  useEffect(() => {
    const fetchSignals = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/signals?influencer_id=${influencer.id}&limit=${SIGNALS_PER_PAGE}`
        );
        if (!response.ok) throw new Error('Failed to fetch signals');

        const data: SignalPaginationResponse = await response.json();
        setSignals(data.signals);
        setHasMore(data.hasMore);

        // 통계 계산
        const longCount = data.signals.filter((s) => s.sentiment === 'LONG').length;
        const shortCount = data.signals.filter((s) => s.sentiment === 'SHORT').length;
        setStats({
          total: data.total,
          longCount: Math.round((data.total * longCount) / (data.signals.length || 1)),
          shortCount: Math.round((data.total * shortCount) / (data.signals.length || 1)),
        });
      } catch (error) {
        console.error('Failed to fetch influencer signals:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignals();
  }, [influencer.id]);

  // 무한 스크롤 - 더 많은 시그널 로드
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const response = await fetch(
        `/api/signals?influencer_id=${influencer.id}&offset=${signals.length}&limit=${SIGNALS_PER_PAGE}`
      );
      if (!response.ok) throw new Error('Failed to fetch more signals');

      const data: SignalPaginationResponse = await response.json();
      setSignals((prev) => [...prev, ...data.signals]);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to load more signals:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [influencer.id, signals.length, isLoadingMore, hasMore]);

  // 무한 스크롤 Intersection Observer
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  // 수익률 계산
  const calculateReturn = (signal: Signal): number | null => {
    return getHybridProfit(signal, currentPrice);
  };

  // Bottom Sheet 드래그 핸들러 (모바일)
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isMobile) return;
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStartY(clientY);
  };

  const handleDragMove = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!isDragging || !isMobile) return;

      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const diff = clientY - dragStartY;

      // 아래로만 드래그 허용
      if (diff > 0) {
        setTranslateY(diff);
      }
    },
    [isDragging, dragStartY, isMobile]
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging || !isMobile) return;
    setIsDragging(false);

    // 100px 이상 드래그하면 닫기
    if (translateY > 100) {
      setIsClosing(true);
      setTimeout(onClose, 200);
    } else {
      setTranslateY(0);
    }
  }, [isDragging, translateY, isMobile, onClose]);

  // 글로벌 드래그 이벤트 리스너
  useEffect(() => {
    if (!isMobile) return;

    const handleMove = (e: TouchEvent | MouseEvent) => handleDragMove(e);
    const handleEnd = () => handleDragEnd();

    if (isDragging) {
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('mouseup', handleEnd);
    }

    return () => {
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('mouseup', handleEnd);
    };
  }, [isDragging, isMobile, handleDragMove, handleDragEnd]);

  // Overlay 클릭 핸들러 (모바일)
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (isMobile) {
        setIsClosing(true);
        setTimeout(onClose, 200);
      } else {
        onClose();
      }
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${
        isMobile
          ? 'flex items-end'
          : 'flex items-center justify-center p-4'
      } bg-black/60 backdrop-blur-sm`}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className={`
          ${isMobile
            ? `w-full max-h-[85vh] rounded-t-2xl ${isClosing ? 'sheet-exit' : 'sheet-enter'}`
            : 'w-full max-w-md max-h-[80vh] rounded-2xl animate-in fade-in zoom-in-95 duration-200'
          }
          glass-card-highlight shadow-2xl flex flex-col
        `}
        style={isMobile && !isClosing ? { transform: `translateY(${translateY}px)` } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
      >
        {/* 드래그 핸들 (모바일) */}
        {isMobile && (
          <div
            className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
            onTouchStart={handleDragStart}
            onMouseDown={handleDragStart}
          >
            <div className="w-10 h-1 bg-fg-tertiary/30 rounded-full" />
          </div>
        )}

        {/* 헤더 */}
        <header className={`flex items-center gap-3 p-4 border-b border-border-primary/50 ${isMobile ? 'pt-2' : ''}`}>
          <figure className="relative flex-shrink-0">
            <img
              src={influencer.avatar_url}
              alt={`${influencer.name} 프로필`}
              className="w-10 h-10 rounded-full ring-2 ring-bg-primary/50"
            />
          </figure>
          <div className="flex-1 min-w-0">
            <h2 id="history-modal-title" className="text-fg-primary font-semibold truncate">
              {influencer.name}
            </h2>
            <p className="text-fg-tertiary text-sm truncate">{influencer.handle}</p>
          </div>
          <button
            onClick={() => {
              if (isMobile) {
                setIsClosing(true);
                setTimeout(onClose, 200);
              } else {
                onClose();
              }
            }}
            className="p-1.5 rounded-lg text-fg-tertiary hover:text-fg-primary hover:bg-bg-tertiary/50 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* 통계 바 */}
        <div className="px-4 py-3 border-b border-border-primary/50 bg-bg-tertiary/20">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-fg-secondary">
              총 <strong className="text-fg-primary">{stats.total}</strong>개
            </span>
            <span className="text-fg-tertiary">·</span>
            <span className="text-success">
              LONG <strong>{stats.longCount}</strong>
            </span>
            <span className="text-fg-tertiary">·</span>
            <span className="text-danger">
              SHORT <strong>{stats.shortCount}</strong>
            </span>
          </div>
        </div>

        {/* 시그널 리스트 */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            // 로딩 스켈레톤
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse p-3 rounded-xl bg-bg-tertiary/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-16 bg-bg-tertiary rounded" />
                      <div className="h-5 w-12 bg-bg-tertiary rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-16 bg-bg-tertiary rounded" />
                      <div className="h-5 w-14 bg-bg-tertiary rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-full bg-bg-tertiary rounded" />
                </div>
              ))}
            </div>
          ) : signals.length === 0 ? (
            <div className="text-center py-12 text-fg-tertiary">
              <span className="text-4xl mb-3 block">📭</span>
              <p>시그널이 없습니다.</p>
            </div>
          ) : (
            <>
              {signals.map((signal) => {
                const returnPct = calculateReturn(signal);
                const hasPrice = returnPct !== null;
                const isProfit = hasPrice && returnPct >= 0;

                return (
                  <a
                    key={signal.id}
                    href={signal.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-xl glass-card hover:bg-bg-tertiary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      {/* 좌측: 날짜 + 뱃지 */}
                      <div className="flex items-center gap-2">
                        <ClientTime
                          timestamp={signal.signal_timestamp}
                          format="short"
                          className="text-xs text-fg-tertiary"
                        />
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            signal.sentiment === 'LONG'
                              ? 'bg-success/15 text-success'
                              : 'bg-danger/15 text-danger'
                          }`}
                        >
                          {signal.sentiment}
                        </span>
                      </div>
                      {/* 우측: 가격 + 수익률 */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-fg-tertiary">
                          ${signal.entry_price?.toLocaleString() || '-'}
                        </span>
                        {hasPrice ? (
                          <span
                            className={`font-mono font-bold text-sm ${
                              isProfit ? 'text-success' : 'text-danger'
                            }`}
                          >
                            {isProfit ? '+' : ''}
                            {returnPct!.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="font-mono text-fg-muted text-sm">-</span>
                        )}
                      </div>
                    </div>
                    {/* 요약 텍스트 */}
                    <p className="text-sm text-fg-secondary line-clamp-2 leading-relaxed">
                      {signal.original_text || signal.full_text}
                    </p>
                  </a>
                );
              })}

              {/* 무한 스크롤 트리거 */}
              {hasMore && (
                <div ref={loadMoreRef} className="py-4 text-center">
                  {isLoadingMore ? (
                    <div className="flex items-center justify-center gap-2 text-fg-tertiary">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span className="text-xs">더 불러오는 중...</span>
                    </div>
                  ) : (
                    <span className="text-xs text-fg-muted">스크롤하여 더 보기</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 푸터 */}
        <footer className="p-4 border-t border-border-primary/50">
          <button
            onClick={() => {
              if (isMobile) {
                setIsClosing(true);
                setTimeout(onClose, 200);
              } else {
                onClose();
              }
            }}
            className="w-full px-4 py-2.5 text-fg-tertiary hover:text-fg-secondary text-sm font-medium transition-colors rounded-xl hover:bg-bg-tertiary/50"
          >
            닫기
          </button>
        </footer>
      </div>
    </div>
  );
}
