'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Signal, FilterType, Influencer } from '@/types';
import ClientTime from '@/components/ClientTime';
import { getHybridProfit } from '@/lib/profitCalculator';

interface SignalFeedProps {
  signals: Signal[];
  selectedId: string | null;
  currentPrice: number;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onSelect: (signalId: string) => void;
  onShowHistory?: (influencer: Influencer) => void;
  // 무한 스크롤 props
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  totalCount?: number;
}

export default function SignalFeed({
  signals,
  selectedId,
  currentPrice,
  filter,
  onFilterChange,
  onSelect,
  onShowHistory,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  totalCount,
}: SignalFeedProps) {
  const filters: FilterType[] = ['ALL', 'LONG', 'SHORT'];
  const itemRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const loadMoreRef = useRef<HTMLLIElement>(null);

  // 하이브리드 수익률 계산 (오늘 시그널만 실시간)
  const calculateReturn = useCallback(
    (signal: Signal): number | null => {
      return getHybridProfit(signal, currentPrice);
    },
    [currentPrice]
  );

  // 무한 스크롤 - Intersection Observer
  useEffect(() => {
    if (!hasMore || !onLoadMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, onLoadMore, isLoadingMore]);

  // 신뢰도 뱃지 색상
  const getTrustColor = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-point';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-danger';
  };

  // 신뢰도 레이블
  const getTrustLabel = (score: number) => {
    if (score >= 80) return '높은 신뢰도';
    if (score >= 60) return '중간 신뢰도';
    if (score >= 40) return '낮은 신뢰도';
    return '매우 낮은 신뢰도';
  };

  // 선택된 항목으로 스크롤
  useEffect(() => {
    if (selectedId && itemRefs.current[selectedId]) {
      itemRefs.current[selectedId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedId]);

  // signals 변경 시 사라진 항목의 refs 정리 (메모리 누수 방지)
  useEffect(() => {
    const currentIds = new Set(signals.map(s => s.id));
    Object.keys(itemRefs.current).forEach(id => {
      if (!currentIds.has(id)) {
        delete itemRefs.current[id];
      }
    });
  }, [signals]);

  return (
    <section
      className="h-full flex flex-col bg-bg-primary/50 min-w-[280px]"
      aria-label="시그널 피드"
    >
      {/* 피드 컨텐츠 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
            {/* Feed 헤더: 타이틀 + 필터 */}
            <header className="mb-3 sm:mb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-fg-tertiary text-xs font-medium px-2 py-1 rounded-full bg-bg-tertiary/80"
                    aria-label={`총 ${totalCount ?? signals.length}개의 시그널`}
                  >
                    {signals.length}{totalCount && totalCount > signals.length ? ` / ${totalCount}` : ''} signals
                  </span>
                </div>

                {/* 필터 버튼 */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-bg-tertiary/50">
                  {filters.map((f) => (
                    <button
                      key={f}
                      onClick={() => onFilterChange(f)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                        filter === f
                          ? f === 'LONG'
                            ? 'bg-success/20 text-success'
                            : f === 'SHORT'
                            ? 'bg-danger/20 text-danger'
                            : 'bg-point/20 text-point'
                          : 'text-fg-tertiary hover:text-fg-secondary'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </header>

            {/* 시그널 리스트 */}
            <ul className="space-y-3" role="list">
              {signals.map((signal) => {
                const returnPct = calculateReturn(signal);
                const hasPrice = returnPct !== null;
                const isProfit = hasPrice && returnPct >= 0;
                const isSelected = selectedId === signal.id;
                const trustScore = signal.influencer?.trust_score || 0;

                return (
                  <li key={signal.id}>
                    <article
                      ref={(el) => {
                        itemRefs.current[signal.id] = el;
                      }}
                      className={`rounded-2xl transition-all duration-300 ${
                        isSelected
                          ? 'glass-card-highlight'
                          : 'glass-card hover-lift'
                      }`}
                      aria-label={`${signal.influencer?.name}의 ${signal.sentiment} 시그널`}
                    >
                      <button
                        type="button"
                        className="w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-point/50 rounded-2xl"
                        onClick={() => onSelect(signal.id)}
                        aria-expanded={isSelected}
                        aria-controls={`signal-content-${signal.id}`}
                      >
                        <div className="flex items-start gap-3">
                          {/* 프로필 */}
                          <figure className="relative flex-shrink-0">
                            <img
                              src={signal.influencer?.avatar_url}
                              alt={`${signal.influencer?.name} 프로필 이미지`}
                              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full ring-2 ring-bg-primary/50"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full ${getTrustColor(trustScore)} border-2 border-bg-elevated shadow-sm`}
                              role="img"
                              aria-label={`${getTrustLabel(trustScore)}: ${trustScore}%`}
                              title={`신뢰도: ${trustScore}%`}
                            />
                          </figure>

                          {/* 내용 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1.5">
                              <strong className="text-fg-primary font-semibold text-sm sm:text-base truncate">
                                {signal.influencer?.name}
                              </strong>
                              <span className="text-fg-tertiary text-xs sm:text-sm truncate hidden sm:inline">
                                {signal.influencer?.handle}
                              </span>
                              <span
                                className={`ml-auto flex-shrink-0 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold ${
                                  signal.sentiment === 'LONG'
                                    ? 'bg-success/15 text-success'
                                    : 'bg-danger/15 text-danger'
                                }`}
                                role="status"
                                aria-label={`시그널 유형: ${signal.sentiment}`}
                              >
                                {signal.sentiment}
                              </span>
                            </div>

                            {/* 텍스트 */}
                            <div className="mb-2 sm:mb-3" id={`signal-content-${signal.id}`}>
                              {isSelected ? (
                                <p className="text-fg-secondary text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                                  {signal.full_text}
                                </p>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <p className="text-fg-secondary text-xs sm:text-sm line-clamp-2 flex-1 leading-relaxed">
                                    {signal.original_text}
                                  </p>
                                  {signal.has_media && (
                                    <span className="text-fg-tertiary flex-shrink-0 text-xs sm:text-sm" role="img" aria-label="미디어 첨부됨">
                                      🖼
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* 확장 시 이미지 */}
                            {isSelected && signal.has_media && signal.media_url && (
                              <figure className="mb-3 rounded-xl overflow-hidden bg-bg-tertiary/50">
                                <img
                                  src={signal.media_url}
                                  alt={`${signal.influencer?.name}의 트윗에 첨부된 차트 이미지`}
                                  className="w-full h-auto max-h-64 object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Image+Not+Available';
                                  }}
                                />
                              </figure>
                            )}

                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                              <ClientTime
                                timestamp={signal.signal_timestamp}
                                format="datetime"
                                className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md bg-bg-tertiary/50 text-fg-tertiary whitespace-nowrap"
                              />
                              <span
                                className="px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md bg-bg-tertiary/50 font-mono text-fg-tertiary whitespace-nowrap"
                                aria-label={hasPrice ? `진입 가격: ${signal.entry_price.toLocaleString()} 달러` : '가격 정보 없음'}
                              >
                                {hasPrice ? `$${signal.entry_price.toLocaleString()}` : '-'}
                              </span>
                              {hasPrice ? (
                                <span
                                  className={`ml-auto font-mono font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg whitespace-nowrap ${
                                    isProfit
                                      ? 'text-success bg-success/10'
                                      : 'text-danger bg-danger/10'
                                  }`}
                                  role="status"
                                  aria-label={`현재 수익률: ${isProfit ? '플러스' : '마이너스'} ${Math.abs(returnPct!).toFixed(2)}퍼센트`}
                                >
                                  {isProfit ? '+' : ''}
                                  {returnPct!.toFixed(2)}%
                                </span>
                              ) : (
                                <span className="ml-auto font-mono text-fg-muted px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg whitespace-nowrap bg-bg-tertiary/30">
                                  -
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 확장 힌트 */}
                        {!isSelected && (
                          <div className="mt-2 sm:mt-3 text-center">
                            <span className="text-fg-muted text-[10px] sm:text-xs inline-flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-bg-tertiary/30 whitespace-nowrap">
                              전체 보기
                              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </span>
                          </div>
                        )}
                      </button>

                      {/* 확장 시 하단 액션 바 */}
                      {isSelected && (
                        <footer className="px-3 py-2 sm:px-4 sm:py-3 border-t border-border-primary/50 bg-bg-tertiary/30 rounded-b-2xl">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <a
                                href={signal.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-point/10 text-point rounded-xl hover:bg-point/20 transition-all duration-200 font-medium text-xs sm:text-sm"
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`${signal.influencer?.name}의 원본 트윗 보기 (새 탭에서 열림)`}
                              >
                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                                <span>원본 트윗</span>
                              </a>
                              {signal.influencer && onShowHistory && (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-bg-tertiary/50 text-fg-secondary rounded-xl hover:bg-bg-tertiary hover:text-fg-primary transition-all duration-200 font-medium text-xs sm:text-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onShowHistory(signal.influencer!);
                                  }}
                                  aria-label={`${signal.influencer.name}의 시그널 히스토리 보기`}
                                >
                                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>히스토리</span>
                                </button>
                              )}
                            </div>
                            <button
                              type="button"
                              className="text-fg-tertiary hover:text-fg-secondary text-xs sm:text-sm transition-colors inline-flex items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelect(signal.id);
                              }}
                              aria-label="시그널 카드 접기"
                            >
                              접기
                              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                          </div>
                        </footer>
                      )}
                    </article>
                  </li>
                );
              })}

              {/* 무한 스크롤 로딩 트리거 */}
              {hasMore && (
                <li ref={loadMoreRef} className="py-4 text-center">
                  {isLoadingMore ? (
                    <div className="flex items-center justify-center gap-2 text-fg-tertiary">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-xs">더 불러오는 중...</span>
                    </div>
                  ) : (
                    <span className="text-xs text-fg-muted">스크롤하여 더 보기</span>
                  )}
                </li>
              )}

              {signals.length === 0 && (
                <li className="text-center py-12 text-fg-tertiary glass-card" role="status">
                  <span className="text-4xl mb-3 block" role="img" aria-label="빈 우편함">📭</span>
                  <p>해당하는 시그널이 없습니다.</p>
                </li>
              )}
            </ul>
          </div>
      </div>
    </section>
  );
}
