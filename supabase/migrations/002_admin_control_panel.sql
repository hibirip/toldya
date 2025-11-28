-- ============================================
-- Admin Control Panel 마이그레이션
-- ============================================

-- 1. collection_runs 테이블 (수집 실행 기록)
CREATE TABLE IF NOT EXISTS collection_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stats JSONB NOT NULL DEFAULT '{}',
  -- 주요 메트릭 (인덱싱/쿼리용)
  total_fetched INT NOT NULL DEFAULT 0,
  after_url_dedup INT NOT NULL DEFAULT 0,
  after_claude INT NOT NULL DEFAULT 0,
  after_neutral_filter INT NOT NULL DEFAULT 0,
  saved INT NOT NULL DEFAULT 0,
  errors_count INT NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_collection_runs_timestamp
  ON collection_runs(run_timestamp DESC);

-- 2. admin_settings 테이블 (설정 저장)
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 초기 설정값 삽입 (존재하지 않을 때만)
INSERT INTO admin_settings (key, value) VALUES
  ('claude_prompt', '"You are a crypto sentiment analyst.\nDetect the author''s **directional bias** on Bitcoin.\n\n## CRITICAL RULES (Read First!)\n\n1. **Sarcasm/Irony Detection**\n   - Criticizing Bitcoin critics = BULLISH (LONG)\n   - Mocking bears/boomers who hate BTC = BULLISH (LONG)\n   - \"Bitcoin haters are wrong\" = LONG\n   - \"Boomers don''t understand\" = LONG (defending BTC)\n\n2. **BTC Relevance Check**\n   - If tweet does NOT mention Bitcoin, BTC, crypto, or price → NEUTRAL\n   - General tech/business tweets without BTC context → NEUTRAL\n   - Altcoin-only tweets (ETH, SOL, DOGE without BTC) → NEUTRAL\n\n3. **Context Matters**\n   - WHO is being criticized? The author''s TARGET matters.\n   - Author criticizes BTC → SHORT\n   - Author criticizes BTC critics → LONG\n\n## Sentiment Labels\n\n**LONG** (Bullish): Expects price UP or positive about BTC\n- Direct: \"BTC looks strong\", \"Accumulating\", \"Support holding\"\n- Indirect: Dismissing FUD, mocking bears, defending against critics\n\n**SHORT** (Bearish): Expects price DOWN or negative about BTC\n- Direct: \"Taking profits\", \"Pullback coming\", \"Looks weak\"\n- Indirect: Warning of risks, expressing concerns about BTC\n\n**NEUTRAL**: No clear BTC directional bias\n- No BTC/Bitcoin mention at all\n- Questions without opinion\n- Pure altcoin discussion\n- Ambiguous or unclear stance\n\nOutput JSON only:\n{\"sentiment\":\"LONG\"|\"SHORT\"|\"NEUTRAL\",\"confidence\":0-100,\"summary\":\"한글 15자 요약\"}\n\nIMPORTANT: When in doubt about sarcasm/irony, consider the author''s typical stance and the overall tone. Crypto influencers criticizing \"boomers\" or \"no-coiners\" are almost always BULLISH."'),
  ('collection_params', '{"maxItems": 50, "confidenceThreshold": 50, "influencersPerRun": 40}'),
  ('super_admin_email', '"simple"')
ON CONFLICT (key) DO NOTHING;

-- 3. influencers 테이블 확장
ALTER TABLE influencers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS priority INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 인덱스 생성 (IF NOT EXISTS 지원 안함 - DO 블록 사용)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_influencers_active') THEN
    CREATE INDEX idx_influencers_active ON influencers(is_active);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_influencers_priority') THEN
    CREATE INDEX idx_influencers_priority ON influencers(priority DESC);
  END IF;
END $$;

-- 4. admin_sessions 테이블 (인증용)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token
  ON admin_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires
  ON admin_sessions(expires_at);
