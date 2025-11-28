'use client';

import { useEffect, useState, useCallback } from 'react';

interface Signal {
  id: string;
  sentiment: 'LONG' | 'SHORT';
  original_text: string;
  summary: string;
  source_url: string;
  signal_timestamp: number;
  entry_price: number;
  influencer?: {
    twitter_handle: string;
    display_name: string;
    profile_image_url: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface VerificationResult {
  verification: 'CORRECT' | 'INCORRECT';
  correct_sentiment: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number;
  reason: string;
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{
    signalId: string;
    result: VerificationResult;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
        ...(sentimentFilter && { sentiment: sentimentFilter }),
      });
      const res = await fetch(`/api/admin/signals?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSignals(data.signals);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch signals:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, sentimentFilter]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 시그널을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/admin/signals?id=${id}`, { method: 'DELETE' });
      fetchSignals();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleDeleteAll = async () => {
    const confirmText = prompt('모든 시그널을 삭제하려면 "DELETE ALL" 을 입력하세요:');
    if (confirmText !== 'DELETE ALL') return;

    setDeleting(true);
    try {
      await fetch('/api/admin/signals?all=true', { method: 'DELETE' });
      fetchSignals();
    } catch (err) {
      console.error('Failed to delete all:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleVerify = async (signalId: string) => {
    setVerifying(signalId);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/admin/signals/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signalId }),
      });
      if (!res.ok) throw new Error('Failed to verify');
      const data = await res.json();
      setVerifyResult({ signalId, result: data.verification });
    } catch (err) {
      console.error('Failed to verify:', err);
      alert('검증 실패');
    } finally {
      setVerifying(null);
    }
  };

  const handleApplyCorrection = async (signalId: string, newSentiment: string) => {
    try {
      const res = await fetch('/api/admin/signals/verify', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signalId, newSentiment }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setVerifyResult(null);
      fetchSignals();
    } catch (err) {
      console.error('Failed to apply correction:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fg-primary">Signals</h1>
        <button
          onClick={handleDeleteAll}
          disabled={deleting}
          className="px-4 py-2 bg-danger/10 text-danger rounded-lg text-sm font-medium hover:bg-danger/20 transition-colors disabled:opacity-50"
        >
          {deleting ? '삭제 중...' : '전체 삭제'}
        </button>
      </div>

      {/* 필터 */}
      <div className="flex gap-4 flex-wrap">
        <input
          type="text"
          placeholder="텍스트 검색..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 min-w-[200px] px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-fg-primary"
        />
        <select
          value={sentimentFilter}
          onChange={(e) => {
            setSentimentFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-fg-primary"
        >
          <option value="">All</option>
          <option value="LONG">LONG</option>
          <option value="SHORT">SHORT</option>
        </select>
      </div>

      {/* 통계 */}
      {pagination && (
        <div className="text-sm text-fg-tertiary">
          Total: {pagination.total} signals
        </div>
      )}

      {/* 테이블 */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-tertiary/50">
                <th className="text-left py-3 px-4 text-fg-tertiary font-medium">
                  Influencer
                </th>
                <th className="text-left py-3 px-4 text-fg-tertiary font-medium">
                  Content
                </th>
                <th className="text-center py-3 px-4 text-fg-tertiary font-medium">
                  Sentiment
                </th>
                <th className="text-center py-3 px-4 text-fg-tertiary font-medium">
                  Time
                </th>
                <th className="text-right py-3 px-4 text-fg-tertiary font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-fg-tertiary">
                    로딩 중...
                  </td>
                </tr>
              ) : signals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-fg-tertiary">
                    시그널이 없습니다.
                  </td>
                </tr>
              ) : (
                signals.map((signal) => (
                  <tr
                    key={signal.id}
                    className="border-t border-border-primary/50 hover:bg-bg-tertiary/30"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {signal.influencer?.profile_image_url && (
                          <img
                            src={signal.influencer.profile_image_url}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <span className="text-point text-xs">
                          @{signal.influencer?.twitter_handle || 'unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-fg-secondary text-xs line-clamp-2 max-w-xs">
                        {signal.summary || signal.original_text}
                      </p>
                      <a
                        href={signal.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-point/60 text-xs hover:underline"
                      >
                        원본 보기
                      </a>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          signal.sentiment === 'LONG'
                            ? 'bg-success/20 text-success'
                            : 'bg-danger/20 text-danger'
                        }`}
                      >
                        {signal.sentiment}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-fg-tertiary text-xs">
                      {new Date(signal.signal_timestamp * 1000).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleVerify(signal.id)}
                        disabled={verifying === signal.id}
                        className="text-point hover:text-point/80 text-xs disabled:opacity-50"
                      >
                        {verifying === signal.id ? '검증중...' : '재검증'}
                      </button>
                      <button
                        onClick={() => handleDelete(signal.id)}
                        className="text-danger hover:text-danger/80 text-xs"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm bg-bg-tertiary rounded-lg disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-3 py-1.5 text-sm text-fg-secondary">
            {page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-3 py-1.5 text-sm bg-bg-tertiary rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* 검증 결과 모달 */}
      {verifyResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card-highlight rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-fg-primary mb-4">
              검증 결과
            </h2>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-lg text-sm font-bold ${
                    verifyResult.result.verification === 'CORRECT'
                      ? 'bg-success/20 text-success'
                      : 'bg-danger/20 text-danger'
                  }`}
                >
                  {verifyResult.result.verification}
                </span>
                <span className="text-fg-tertiary text-sm">
                  ({verifyResult.result.confidence}% 확신)
                </span>
              </div>

              {verifyResult.result.verification === 'INCORRECT' && (
                <div className="p-3 bg-bg-tertiary/50 rounded-lg">
                  <p className="text-sm text-fg-secondary">
                    올바른 분류: <strong>{verifyResult.result.correct_sentiment}</strong>
                  </p>
                </div>
              )}

              <p className="text-sm text-fg-secondary">
                {verifyResult.result.reason}
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setVerifyResult(null)}
                className="flex-1 py-2 text-fg-secondary hover:text-fg-primary"
              >
                닫기
              </button>
              {verifyResult.result.verification === 'INCORRECT' && (
                <button
                  onClick={() =>
                    handleApplyCorrection(
                      verifyResult.signalId,
                      verifyResult.result.correct_sentiment
                    )
                  }
                  className="flex-1 py-2 bg-point text-white rounded-lg font-medium hover:bg-point/90"
                >
                  {verifyResult.result.correct_sentiment === 'NEUTRAL'
                    ? '삭제하기'
                    : '수정 적용'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
