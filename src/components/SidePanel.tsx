'use client';

import { useState } from 'react';
import { Signal, FilterType } from '@/types';
import SignalFeed from './SignalFeed';
import InfluencerList from './InfluencerList';

type TabType = 'signals' | 'influencers';

interface SidePanelProps {
  signals: Signal[];
  highlightedId: string | null;
  currentPrice: number;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  selectedInfluencerId: string | null;
  onInfluencerSelect: (influencerId: string | null) => void;
  onCardClick?: (signalId: string) => void;
}

export default function SidePanel({
  signals,
  highlightedId,
  currentPrice,
  filter,
  onFilterChange,
  selectedInfluencerId,
  onInfluencerSelect,
  onCardClick,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('signals');

  return (
    <section className="h-full flex flex-col bg-bg-primary/50 min-w-[280px]">
      {/* 탭 헤더 */}
      <div className="flex border-b border-border-primary/50 px-2 sm:px-3">
        <button
          onClick={() => setActiveTab('signals')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'signals'
              ? 'text-point'
              : 'text-fg-tertiary hover:text-fg-secondary'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span>Signals</span>
          {signals.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              activeTab === 'signals' ? 'bg-point/20' : 'bg-bg-tertiary/50'
            }`}>
              {signals.length}
            </span>
          )}
          {activeTab === 'signals' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-point rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('influencers')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'influencers'
              ? 'text-point'
              : 'text-fg-tertiary hover:text-fg-secondary'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Influencers</span>
          {selectedInfluencerId && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-point rounded-full" />
          )}
          {activeTab === 'influencers' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-point rounded-t-full" />
          )}
        </button>
      </div>

      {/* 선택된 인플루언서 표시 (Signals 탭일 때) */}
      {activeTab === 'signals' && selectedInfluencerId && (
        <div className="px-3 py-2 bg-point/10 border-b border-point/20">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-point font-medium truncate">
              선택된 인플루언서로 필터링됨
            </span>
            <button
              onClick={() => onInfluencerSelect(null)}
              className="flex-shrink-0 text-xs text-point/80 hover:text-point underline"
            >
              해제
            </button>
          </div>
        </div>
      )}

      {/* 탭 컨텐츠 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'signals' ? (
          <SignalFeed
            signals={signals}
            highlightedId={highlightedId}
            currentPrice={currentPrice}
            filter={filter}
            onFilterChange={onFilterChange}
            onCardClick={onCardClick}
          />
        ) : (
          <InfluencerList
            onInfluencerSelect={(id) => {
              onInfluencerSelect(id);
              if (id) setActiveTab('signals'); // 인플루언서 선택 시 시그널 탭으로 이동
            }}
            selectedInfluencerId={selectedInfluencerId}
          />
        )}
      </div>
    </section>
  );
}
