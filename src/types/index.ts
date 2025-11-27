export interface Influencer {
  id: string;
  name: string;
  handle: string;
  avatar_url: string;
  trust_score: number;
  follower_count?: number;  // 팔로워 수 (중요도 테스트용)
}

export interface Signal {
  id: string;
  influencer_id: string;
  influencer?: Influencer;
  coin_symbol: string;
  sentiment: 'LONG' | 'SHORT';
  entry_price: number;
  signal_timestamp: number;  // Unix timestamp (초 단위)
  original_text: string;
  full_text: string;         // 전체 텍스트 (확장 시 표시)
  source_url: string;
  has_media: boolean;        // 미디어 포함 여부
  media_url?: string;        // 이미지/비디오 URL
  media_type?: 'image' | 'video';
}

export interface CandleData {
  time: number;  // 항상 Unix timestamp (초 단위)
  open: number;
  high: number;
  low: number;
  close: number;
}

export type FilterType = 'ALL' | 'LONG' | 'SHORT';

export type TimeframeType = '1h' | '4h' | '1d' | '1w' | '1M';

// 마커 클러스터링을 위한 타입
export interface MarkerPosition {
  signal: Signal;
  x: number;
  y: number;
}

export interface MarkerCluster {
  id: string;
  signals: Signal[];
  x: number;  // 클러스터 중심 X좌표
  y: number;  // 클러스터 중심 Y좌표
}
