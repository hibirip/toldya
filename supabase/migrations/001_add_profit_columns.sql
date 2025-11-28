-- 시그널 테이블에 수익률 관련 컬럼 추가
-- Supabase SQL Editor에서 실행하세요

-- 1. 수익률 컬럼 추가 (과거 시그널용 - 배치로 업데이트)
ALTER TABLE signals
ADD COLUMN IF NOT EXISTS current_profit DECIMAL(10, 4) DEFAULT NULL;

-- 2. 수익률 계산 시점
ALTER TABLE signals
ADD COLUMN IF NOT EXISTS profit_updated_at TIMESTAMPTZ DEFAULT NULL;

-- 3. 인덱스 추가 (시간순 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_signals_timestamp_desc
ON signals(signal_timestamp DESC);

-- 4. 수익률 업데이트 함수 (배치 job에서 사용)
CREATE OR REPLACE FUNCTION update_signal_profit(
  p_signal_id UUID,
  p_current_price DECIMAL
)
RETURNS VOID AS $$
DECLARE
  v_entry_price DECIMAL;
  v_sentiment TEXT;
  v_profit DECIMAL;
BEGIN
  SELECT entry_price, sentiment INTO v_entry_price, v_sentiment
  FROM signals WHERE id = p_signal_id;

  IF v_entry_price IS NOT NULL AND v_entry_price > 0 THEN
    v_profit := ((p_current_price - v_entry_price) / v_entry_price) * 100;

    -- SHORT의 경우 부호 반전
    IF v_sentiment = 'SHORT' THEN
      v_profit := -v_profit;
    END IF;

    UPDATE signals
    SET current_profit = v_profit, profit_updated_at = NOW()
    WHERE id = p_signal_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. 전체 시그널 수익률 일괄 업데이트 함수
CREATE OR REPLACE FUNCTION update_all_signals_profit(p_current_price DECIMAL)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_signal RECORD;
BEGIN
  FOR v_signal IN
    SELECT id FROM signals
    WHERE entry_price IS NOT NULL AND entry_price > 0
  LOOP
    PERFORM update_signal_profit(v_signal.id, p_current_price);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 사용법 (수동 또는 Cron으로):
-- SELECT update_all_signals_profit(95000.00);
