'use client';

import { useEffect, useState, useCallback } from 'react';

interface CollectionParams {
  maxItems: number;
  confidenceThreshold: number;
  influencersPerRun: number;
}

export default function SettingsPage() {
  const [claudePrompt, setClaudePrompt] = useState('');
  const [params, setParams] = useState<CollectionParams>({
    maxItems: 50,
    confidenceThreshold: 50,
    influencersPerRun: 40,
  });
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const settings = data.settings;

      if (settings.claude_prompt) {
        const prompt =
          typeof settings.claude_prompt === 'string'
            ? settings.claude_prompt
            : JSON.stringify(settings.claude_prompt);
        setClaudePrompt(prompt.replace(/^"|"$/g, '').replace(/\\n/g, '\n'));
      }

      if (settings.collection_params) {
        setParams(settings.collection_params);
      }

      if (settings.super_admin_email) {
        const email =
          typeof settings.super_admin_email === 'string'
            ? settings.super_admin_email.replace(/^"|"$/g, '')
            : settings.super_admin_email;
        setSuperAdminEmail(email);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (key: string, value: unknown) => {
    setSaving(key);
    setMessage('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });

      if (!res.ok) throw new Error('Failed to save');
      setMessage('저장되었습니다.');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      console.error('Failed to save:', err);
      setMessage('저장에 실패했습니다.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-fg-secondary">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-fg-primary">Settings</h1>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.includes('실패') ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
          }`}
        >
          {message}
        </div>
      )}

      {/* 수집 파라미터 */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg-primary">
          Collection Parameters
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm text-fg-secondary mb-1">
              Max Items (트윗 수)
            </label>
            <input
              type="number"
              value={params.maxItems}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  maxItems: parseInt(e.target.value) || 50,
                }))
              }
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-fg-primary"
            />
          </div>

          <div>
            <label className="block text-sm text-fg-secondary mb-1">
              Confidence Threshold
            </label>
            <input
              type="number"
              value={params.confidenceThreshold}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  confidenceThreshold: parseInt(e.target.value) || 50,
                }))
              }
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-fg-primary"
              min={0}
              max={100}
            />
          </div>

          <div>
            <label className="block text-sm text-fg-secondary mb-1">
              Influencers Per Run
            </label>
            <input
              type="number"
              value={params.influencersPerRun}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  influencersPerRun: parseInt(e.target.value) || 40,
                }))
              }
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-fg-primary"
            />
          </div>
        </div>

        <button
          onClick={() => saveSettings('collection_params', params)}
          disabled={saving === 'collection_params'}
          className="px-4 py-2 bg-point text-white rounded-lg text-sm font-medium hover:bg-point/90 disabled:opacity-50"
        >
          {saving === 'collection_params' ? 'Saving...' : 'Save Parameters'}
        </button>
      </div>

      {/* Claude 프롬프트 */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg-primary">Claude Prompt</h2>
        <p className="text-sm text-fg-tertiary">
          Claude가 트윗을 분석할 때 사용하는 시스템 프롬프트입니다.
        </p>

        <textarea
          value={claudePrompt}
          onChange={(e) => setClaudePrompt(e.target.value)}
          className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-fg-primary font-mono text-sm h-96 resize-none"
        />

        <button
          onClick={() => saveSettings('claude_prompt', claudePrompt)}
          disabled={saving === 'claude_prompt'}
          className="px-4 py-2 bg-point text-white rounded-lg text-sm font-medium hover:bg-point/90 disabled:opacity-50"
        >
          {saving === 'claude_prompt' ? 'Saving...' : 'Save Prompt'}
        </button>
      </div>

      {/* Super Admin 설정 */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-fg-primary">Super Admin</h2>

        <div>
          <label className="block text-sm text-fg-secondary mb-1">
            Admin Email
          </label>
          <input
            type="email"
            value={superAdminEmail}
            onChange={(e) => setSuperAdminEmail(e.target.value)}
            className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-fg-primary"
          />
        </div>

        <button
          onClick={() => saveSettings('super_admin_email', superAdminEmail)}
          disabled={saving === 'super_admin_email'}
          className="px-4 py-2 bg-point text-white rounded-lg text-sm font-medium hover:bg-point/90 disabled:opacity-50"
        >
          {saving === 'super_admin_email' ? 'Saving...' : 'Save Email'}
        </button>

        <p className="text-xs text-fg-tertiary">
          비밀번호는 환경변수(ADMIN_PASSWORD)에서 설정하세요.
        </p>
      </div>
    </div>
  );
}
