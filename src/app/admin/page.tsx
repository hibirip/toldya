'use client';

import { useEffect, useState, useCallback } from 'react';

interface CollectionRun {
  id: string;
  run_timestamp: string;
  total_fetched: number;
  after_url_dedup: number;
  after_claude: number;
  after_neutral_filter: number;
  saved: number;
  errors_count: number;
  success: boolean;
}

interface StatsData {
  runs: CollectionRun[];
  aggregate: {
    totalRuns: number;
    successfulRuns: number;
    totalFetched: number;
    totalSaved: number;
    totalErrors: number;
    avgConversionRate: number;
  };
  funnel: {
    totalFetched: number;
    afterUrlDedup: number;
    afterClaude: number;
    afterNeutralFilter: number;
    saved: number;
  };
}

function FunnelBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const dropPct = total > 0 ? 100 - pct : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-fg-secondary">{label}</span>
        <span className="text-fg-primary font-mono">
          {value.toLocaleString()}
          {total > 0 && total !== value && (
            <span className="text-fg-tertiary ml-2 text-xs">
              ({pct.toFixed(1)}%)
            </span>
          )}
        </span>
      </div>
      <div className="h-6 bg-bg-tertiary rounded-lg overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {dropPct > 0 && total !== value && (
        <div className="text-xs text-fg-tertiary text-right">
          -{dropPct.toFixed(1)}% drop
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats?limit=20');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch {
      setError('통계 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-fg-secondary">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-danger">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  const { funnel, aggregate, runs } = stats;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-fg-primary">Dashboard</h1>

      {/* 집계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="text-2xl font-bold text-fg-primary">
            {aggregate.totalRuns}
          </div>
          <div className="text-sm text-fg-tertiary">Total Runs</div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-2xl font-bold text-success">
            {aggregate.successfulRuns}
          </div>
          <div className="text-sm text-fg-tertiary">Successful</div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-2xl font-bold text-point">
            {aggregate.totalSaved.toLocaleString()}
          </div>
          <div className="text-sm text-fg-tertiary">Total Saved</div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-2xl font-bold text-fg-primary">
            {aggregate.avgConversionRate.toFixed(1)}%
          </div>
          <div className="text-sm text-fg-tertiary">Avg Conversion</div>
        </div>
      </div>

      {/* 파이프라인 퍼널 */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="text-lg font-semibold text-fg-primary mb-4">
          Pipeline Funnel (Recent {runs.length} runs)
        </h2>
        <div className="space-y-4">
          <FunnelBar
            label="Apify Fetched"
            value={funnel.totalFetched}
            total={funnel.totalFetched}
            color="bg-point"
          />
          <FunnelBar
            label="After URL Dedup"
            value={funnel.afterUrlDedup}
            total={funnel.totalFetched}
            color="bg-blue-500"
          />
          <FunnelBar
            label="After Claude Analysis"
            value={funnel.afterClaude}
            total={funnel.totalFetched}
            color="bg-purple-500"
          />
          <FunnelBar
            label="After Neutral Filter"
            value={funnel.afterNeutralFilter}
            total={funnel.totalFetched}
            color="bg-orange-500"
          />
          <FunnelBar
            label="Saved to DB"
            value={funnel.saved}
            total={funnel.totalFetched}
            color="bg-success"
          />
        </div>
      </div>

      {/* 최근 실행 목록 */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="text-lg font-semibold text-fg-primary mb-4">
          Recent Collection Runs
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="text-left py-2 px-2 text-fg-tertiary font-medium">
                  Time
                </th>
                <th className="text-right py-2 px-2 text-fg-tertiary font-medium">
                  Fetched
                </th>
                <th className="text-right py-2 px-2 text-fg-tertiary font-medium">
                  Saved
                </th>
                <th className="text-right py-2 px-2 text-fg-tertiary font-medium">
                  Conv %
                </th>
                <th className="text-right py-2 px-2 text-fg-tertiary font-medium">
                  Errors
                </th>
                <th className="text-center py-2 px-2 text-fg-tertiary font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const convPct =
                  run.total_fetched > 0
                    ? ((run.saved / run.total_fetched) * 100).toFixed(1)
                    : '0';
                return (
                  <tr
                    key={run.id}
                    className="border-b border-border-primary/50 hover:bg-bg-tertiary/30"
                  >
                    <td className="py-2 px-2 text-fg-secondary">
                      {new Date(run.run_timestamp).toLocaleString('ko-KR')}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-fg-primary">
                      {run.total_fetched}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-success">
                      {run.saved}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-fg-secondary">
                      {convPct}%
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-danger">
                      {run.errors_count}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {run.success ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-success" />
                      ) : (
                        <span className="inline-block w-2 h-2 rounded-full bg-danger" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
