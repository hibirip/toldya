'use client';

import { useEffect, useRef } from 'react';
import { Signal, Influencer } from '@/types';
import ClientTime from '@/components/ClientTime';
import { getHybridProfit } from '@/lib/profitCalculator';

interface SignalDetailModalProps {
  signal: Signal;
  currentPrice: number;
  onClose: () => void;
  onShowHistory?: (influencer: Influencer) => void;
}

export default function SignalDetailModal({
  signal,
  currentPrice,
  onClose,
  onShowHistory,
}: SignalDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 외부 클릭으로 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // setTimeout으로 클릭 이벤트가 바로 실행되지 않도록 방지
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const returnPct = getHybridProfit(signal, currentPrice);
  const hasPrice = returnPct !== null;
  const isProfit = hasPrice && returnPct >= 0;
  const trustScore = signal.influencer?.trust_score || 0;

  const getTrustColor = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-point';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-danger';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="w-full max-w-md glass-card-highlight rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* 헤더 */}
        <header className="flex items-center justify-between p-4 border-b border-border-primary/50">
          <h2 id="modal-title" className="text-fg-primary font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-point" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            시그널 상세
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-tertiary hover:text-fg-primary hover:bg-bg-tertiary/50 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* 본문 */}
        <div className="p-4 space-y-4">
          {/* 인플루언서 정보 */}
          <div className="flex items-center gap-3">
            <figure className="relative flex-shrink-0">
              <img
                src={signal.influencer?.avatar_url}
                alt={`${signal.influencer?.name} 프로필`}
                className="w-12 h-12 rounded-full ring-2 ring-bg-primary/50"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${getTrustColor(trustScore)} border-2 border-bg-elevated`}
                title={`신뢰도: ${trustScore}%`}
              />
            </figure>
            <div className="flex-1 min-w-0">
              <strong className="text-fg-primary font-semibold block truncate">
                {signal.influencer?.name}
              </strong>
              <span className="text-fg-tertiary text-sm truncate block">
                {signal.influencer?.handle}
              </span>
            </div>
            <span
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold ${
                signal.sentiment === 'LONG'
                  ? 'bg-success/15 text-success'
                  : 'bg-danger/15 text-danger'
              }`}
            >
              {signal.sentiment}
            </span>
          </div>

          {/* 시그널 내용 */}
          <div className="p-3 rounded-xl bg-bg-tertiary/30">
            <p className="text-fg-secondary text-sm whitespace-pre-wrap leading-relaxed">
              {signal.full_text || signal.original_text}
            </p>
          </div>

          {/* 미디어 */}
          {signal.has_media && signal.media_url && (
            <figure className="rounded-xl overflow-hidden bg-bg-tertiary/50">
              <img
                src={signal.media_url}
                alt="첨부된 이미지"
                className="w-full h-auto max-h-48 object-cover"
                loading="lazy"
              />
            </figure>
          )}

          {/* 가격 정보 */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-bg-tertiary/30">
            <div className="space-y-1">
              <div className="text-xs text-fg-tertiary">진입 가격</div>
              <div className="font-mono font-semibold text-fg-primary">
                ${signal.entry_price?.toLocaleString() || '-'}
              </div>
            </div>
            <div className="space-y-1 text-right">
              <div className="text-xs text-fg-tertiary">수익률</div>
              {hasPrice ? (
                <div
                  className={`font-mono font-bold text-lg ${
                    isProfit ? 'text-success' : 'text-danger'
                  }`}
                >
                  {isProfit ? '+' : ''}{returnPct!.toFixed(2)}%
                </div>
              ) : (
                <div className="font-mono text-fg-muted">-</div>
              )}
            </div>
          </div>

          {/* 시간 정보 */}
          <div className="flex items-center gap-2 text-xs text-fg-tertiary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <ClientTime timestamp={signal.signal_timestamp} format="datetime" />
          </div>
        </div>

        {/* 푸터 */}
        <footer className="p-4 border-t border-border-primary/50 flex items-center gap-3">
          <a
            href={signal.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-point/10 text-point rounded-xl hover:bg-point/20 transition-all font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            원본 트윗
          </a>
          {signal.influencer && onShowHistory && (
            <button
              onClick={() => {
                onClose();
                onShowHistory(signal.influencer!);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-tertiary/50 text-fg-secondary rounded-xl hover:bg-bg-tertiary hover:text-fg-primary transition-all font-medium text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              히스토리
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-fg-tertiary hover:text-fg-secondary text-sm font-medium transition-colors"
          >
            닫기
          </button>
        </footer>
      </div>
    </div>
  );
}
