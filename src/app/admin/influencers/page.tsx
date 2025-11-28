'use client';

import { useEffect, useState, useCallback } from 'react';

interface Influencer {
  id: string;
  twitter_handle: string;
  display_name: string;
  profile_image_url: string | null;
  is_active: boolean;
  priority: number;
  notes: string | null;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function InfluencersPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingInfluencer, setEditingInfluencer] = useState<Influencer | null>(null);

  const fetchInfluencers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
      });
      const res = await fetch(`/api/admin/influencers?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setInfluencers(data.influencers);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch influencers:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchInfluencers();
  }, [fetchInfluencers]);

  const handleToggleActive = async (inf: Influencer) => {
    try {
      await fetch('/api/admin/influencers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inf.id, is_active: !inf.is_active }),
      });
      fetchInfluencers();
    } catch (err) {
      console.error('Failed to update:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/admin/influencers?id=${id}`, { method: 'DELETE' });
      fetchInfluencers();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fg-primary">Influencers</h1>
        <button
          onClick={() => {
            setEditingInfluencer(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-point text-white rounded-lg text-sm font-medium hover:bg-point/90 transition-colors"
        >
          + Add Influencer
        </button>
      </div>

      {/* 검색 */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by handle or name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-fg-primary focus:outline-none focus:ring-2 focus:ring-point/50"
        />
      </div>

      {/* 통계 */}
      {pagination && (
        <div className="text-sm text-fg-tertiary">
          Total: {pagination.total} influencers | Active:{' '}
          {influencers.filter((i) => i.is_active).length} on this page
        </div>
      )}

      {/* 테이블 */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-tertiary/50">
                <th className="text-left py-3 px-4 text-fg-tertiary font-medium">
                  Handle
                </th>
                <th className="text-left py-3 px-4 text-fg-tertiary font-medium">
                  Name
                </th>
                <th className="text-center py-3 px-4 text-fg-tertiary font-medium">
                  Priority
                </th>
                <th className="text-center py-3 px-4 text-fg-tertiary font-medium">
                  Active
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
              ) : influencers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-fg-tertiary">
                    인플루언서가 없습니다.
                  </td>
                </tr>
              ) : (
                influencers.map((inf) => (
                  <tr
                    key={inf.id}
                    className="border-t border-border-primary/50 hover:bg-bg-tertiary/30"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {inf.profile_image_url && (
                          <img
                            src={inf.profile_image_url}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <span className="text-point font-mono">
                          @{inf.twitter_handle}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-fg-primary">
                      {inf.display_name}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-fg-secondary">
                      {inf.priority}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(inf)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          inf.is_active ? 'bg-success' : 'bg-bg-tertiary'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            inf.is_active ? 'left-5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditingInfluencer(inf);
                          setShowModal(true);
                        }}
                        className="text-fg-tertiary hover:text-point mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(inf.id)}
                        className="text-fg-tertiary hover:text-danger"
                      >
                        Delete
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

      {/* 모달 */}
      {showModal && (
        <InfluencerModal
          influencer={editingInfluencer}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchInfluencers();
          }}
        />
      )}
    </div>
  );
}

function InfluencerModal({
  influencer,
  onClose,
  onSave,
}: {
  influencer: Influencer | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    twitter_handle: influencer?.twitter_handle || '',
    display_name: influencer?.display_name || '',
    profile_image_url: influencer?.profile_image_url || '',
    priority: influencer?.priority || 0,
    notes: influencer?.notes || '',
    is_active: influencer?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const method = influencer ? 'PUT' : 'POST';
      const body = influencer ? { id: influencer.id, ...form } : form;

      const res = await fetch('/api/admin/influencers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md glass-card-highlight rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-fg-primary mb-4">
          {influencer ? 'Edit Influencer' : 'Add Influencer'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-fg-secondary mb-1">
              Twitter Handle
            </label>
            <input
              type="text"
              value={form.twitter_handle}
              onChange={(e) =>
                setForm((f) => ({ ...f, twitter_handle: e.target.value }))
              }
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-fg-primary"
              placeholder="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-fg-secondary mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, display_name: e.target.value }))
              }
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-fg-primary"
              placeholder="Display Name"
            />
          </div>

          <div>
            <label className="block text-sm text-fg-secondary mb-1">
              Priority
            </label>
            <input
              type="number"
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 0 }))
              }
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-fg-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-fg-secondary mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-fg-primary h-20 resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_active: e.target.checked }))
              }
              className="w-4 h-4"
            />
            <label htmlFor="is_active" className="text-sm text-fg-secondary">
              Active
            </label>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-fg-secondary hover:text-fg-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-point text-white rounded-lg font-medium hover:bg-point/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
