'use client';

import { useState, useEffect, useMemo } from 'react';
import { InfluencerWithStats } from '@/app/api/influencers/route';

interface InfluencerListProps {
  onInfluencerSelect: (influencerId: string | null) => void;
  selectedInfluencerId: string | null;
}

// localStorage 키
const TRACKED_INFLUENCERS_KEY = 'toldya_tracked_influencers';

// 트래킹된 인플루언서 목록 가져오기
function getTrackedInfluencers(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const stored = localStorage.getItem(TRACKED_INFLUENCERS_KEY);
  return stored ? new Set(JSON.parse(stored)) : new Set();
}

// 트래킹된 인플루언서 목록 저장
function setTrackedInfluencers(ids: Set<string>) {
  localStorage.setItem(TRACKED_INFLUENCERS_KEY, JSON.stringify([...ids]));
}

export default function InfluencerList({ onInfluencerSelect, selectedInfluencerId }: InfluencerListProps) {
  const [influencers, setInfluencers] = useState<InfluencerWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());
  const [showTrackedOnly, setShowTrackedOnly] = useState(false);

  // 인플루언서 데이터 가져오기
  useEffect(() => {
    async function fetchInfluencers() {
      try {
        const res = await fetch('/api/influencers');
        const data = await res.json();
        if (data.influencers) {
          setInfluencers(data.influencers);
        }
      } catch (error) {
        console.error('Failed to fetch influencers:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInfluencers();
    setTrackedIds(getTrackedInfluencers());
  }, []);

  // 트래킹 토글
  const toggleTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTrackedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      setTrackedInfluencers(newSet);
      return newSet;
    });
  };

  // 필터링된 인플루언서 목록
  const filteredInfluencers = useMemo(() => {
    let result = influencers;

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (inf) =>
          inf.display_name.toLowerCase().includes(query) ||
          inf.twitter_handle.toLowerCase().includes(query)
      );
    }

    // 트래킹된 인플루언서만 표시
    if (showTrackedOnly) {
      result = result.filter((inf) => trackedIds.has(inf.id));
    }

    return result;
  }, [influencers, searchQuery, showTrackedOnly, trackedIds]);

  // 시간 포맷
  const formatTimeAgo = (timestamp: number | null) => {
    if (!timestamp) return '-';
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
    return `${Math.floor(diff / 604800)}주 전`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-point" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 검색 및 필터 */}
      <div className="p-3 sm:p-4 space-y-3">
        {/* 검색창 */}
        <div className="relative">
          <input
            type="text"
            placeholder="인플루언서 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 pl-9 text-sm rounded-xl bg-bg-tertiary/50 border border-border/50
              text-fg-primary placeholder:text-fg-tertiary
              focus:outline-none focus:ring-2 focus:ring-point/50 focus:border-point/50"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-tertiary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* 필터 버튼 */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setShowTrackedOnly(!showTrackedOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              showTrackedOnly
                ? 'bg-point/20 text-point'
                : 'bg-bg-tertiary/50 text-fg-tertiary hover:text-fg-secondary'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill={showTrackedOnly ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            팔로잉만
          </button>

          {selectedInfluencerId && (
            <button
              onClick={() => onInfluencerSelect(null)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-danger/20 text-danger hover:bg-danger/30 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              필터 해제
            </button>
          )}
        </div>

        {/* 인플루언서 수 표시 */}
        <div className="flex items-center gap-2">
          <span className="text-fg-tertiary text-xs">
            {filteredInfluencers.length}명의 인플루언서
          </span>
          {trackedIds.size > 0 && (
            <span className="text-point text-xs">
              ({trackedIds.size}명 팔로잉)
            </span>
          )}
        </div>
      </div>

      {/* 인플루언서 리스트 */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-4">
        <ul className="space-y-2">
          {filteredInfluencers.map((influencer) => {
            const isSelected = selectedInfluencerId === influencer.id;
            const isTracked = trackedIds.has(influencer.id);

            return (
              <li key={influencer.id}>
                <button
                  onClick={() => onInfluencerSelect(isSelected ? null : influencer.id)}
                  className={`w-full p-3 rounded-xl transition-all text-left ${
                    isSelected
                      ? 'glass-card-highlight ring-2 ring-point/50'
                      : 'glass-card hover-lift'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* 프로필 이미지 */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={influencer.profile_image_url || '/default-avatar.png'}
                        alt={influencer.display_name}
                        className="w-10 h-10 rounded-full ring-2 ring-bg-primary/50 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/default-avatar.png';
                        }}
                      />
                      {isTracked && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-point flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </span>
                      )}
                    </div>

                    {/* 인플루언서 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-fg-primary text-sm truncate">
                          {influencer.display_name}
                        </span>
                      </div>
                      <span className="text-fg-tertiary text-xs block truncate">
                        @{influencer.twitter_handle}
                      </span>

                      {/* 통계 */}
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className="px-1.5 py-0.5 rounded bg-bg-tertiary/50 text-fg-tertiary">
                          {influencer.signal_count} 시그널
                        </span>
                        {influencer.long_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-success/10 text-success">
                            {influencer.long_count} L
                          </span>
                        )}
                        {influencer.short_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-danger/10 text-danger">
                            {influencer.short_count} S
                          </span>
                        )}
                      </div>

                      {/* 마지막 시그널 시간 */}
                      {influencer.latest_signal_at && (
                        <span className="text-fg-muted text-[10px] mt-1 block">
                          마지막 시그널: {formatTimeAgo(influencer.latest_signal_at)}
                        </span>
                      )}
                    </div>

                    {/* 팔로우 버튼 */}
                    <button
                      onClick={(e) => toggleTrack(influencer.id, e)}
                      className={`flex-shrink-0 p-2.5 rounded-lg transition-all ${
                        isTracked
                          ? 'bg-point/20 text-point'
                          : 'bg-bg-tertiary/50 text-fg-tertiary hover:text-fg-secondary hover:bg-bg-tertiary'
                      }`}
                      aria-label={isTracked ? '팔로우 취소' : '팔로우'}
                    >
                      <svg
                        className="w-4 h-4"
                        fill={isTracked ? "currentColor" : "none"}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  </div>
                </button>
              </li>
            );
          })}

          {filteredInfluencers.length === 0 && (
            <li className="text-center py-8 text-fg-tertiary">
              {showTrackedOnly ? (
                <>
                  <span className="text-2xl block mb-2">
                    <svg className="w-8 h-8 mx-auto text-fg-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </span>
                  <p className="text-sm">팔로우한 인플루언서가 없습니다</p>
                  <p className="text-xs text-fg-muted mt-1">별 아이콘을 눌러 팔로우하세요</p>
                </>
              ) : (
                <>
                  <span className="text-2xl block mb-2">
                    <svg className="w-8 h-8 mx-auto text-fg-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <p className="text-sm">검색 결과가 없습니다</p>
                </>
              )}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
