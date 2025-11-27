import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseInstance;
}

export const getSupabase = () => getSupabaseClient();

// 인플루언서 타입
export interface Influencer {
  id: string;
  twitter_handle: string;
  display_name: string;
  profile_image_url: string | null;
  created_at: string;
}

// 시그널 타입 (DB 스키마)
export interface DBSignal {
  id: string;
  influencer_id: string;
  sentiment: 'LONG' | 'SHORT';
  entry_price: number;
  signal_timestamp: number;
  source_url: string;
  original_text: string;
  summary: string;
  created_at: string;
}

// 인플루언서 조회 또는 생성
export async function getOrCreateInfluencer(
  twitterHandle: string,
  displayName: string,
  profileImageUrl?: string
): Promise<Influencer | null> {
  const supabase = getSupabase();

  // 기존 인플루언서 조회
  const { data: existing } = await supabase
    .from('influencers')
    .select('*')
    .eq('twitter_handle', twitterHandle)
    .single();

  if (existing) {
    return existing as Influencer;
  }

  // 새 인플루언서 생성
  const { data: newInfluencer, error } = await supabase
    .from('influencers')
    .insert({
      twitter_handle: twitterHandle,
      display_name: displayName,
      profile_image_url: profileImageUrl || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating influencer:', error);
    return null;
  }

  return newInfluencer as Influencer;
}

// 시그널 저장 (source_url 중복 체크)
export async function saveSignal(signal: Omit<DBSignal, 'id' | 'created_at'>): Promise<DBSignal | null> {
  const supabase = getSupabase();

  // 중복 체크
  const { data: existing } = await supabase
    .from('signals')
    .select('id')
    .eq('source_url', signal.source_url)
    .single();

  if (existing) {
    console.log('Signal already exists:', signal.source_url);
    return null;
  }

  // 새 시그널 저장
  const { data, error } = await supabase
    .from('signals')
    .insert(signal)
    .select()
    .single();

  if (error) {
    console.error('Error saving signal:', error);
    return null;
  }

  return data as DBSignal;
}

// 시그널 목록 조회 (인플루언서 정보 포함)
export async function getSignalsWithInfluencers(limit: number = 50) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('signals')
    .select(`
      *,
      influencer:influencers(*)
    `)
    .order('signal_timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching signals:', error);
    return [];
  }

  return data;
}

// DB 시그널을 프론트엔드 Signal 타입으로 변환
import type { Signal, Influencer as FrontendInfluencer } from '@/types';

interface DBSignalWithInfluencer extends DBSignal {
  influencer: Influencer | null;
}

export function transformDBSignalToFrontend(dbSignal: DBSignalWithInfluencer): Signal {
  const influencer: FrontendInfluencer | undefined = dbSignal.influencer
    ? {
        id: dbSignal.influencer.id,
        name: dbSignal.influencer.display_name,
        handle: dbSignal.influencer.twitter_handle,
        avatar_url: dbSignal.influencer.profile_image_url || '/default-avatar.png',
        trust_score: 50, // 기본값 (추후 DB에 추가)
      }
    : undefined;

  return {
    id: dbSignal.id,
    influencer_id: dbSignal.influencer_id,
    influencer,
    coin_symbol: 'BTC',
    sentiment: dbSignal.sentiment,
    entry_price: dbSignal.entry_price,
    signal_timestamp: dbSignal.signal_timestamp,
    original_text: dbSignal.summary || dbSignal.original_text.slice(0, 100),
    full_text: dbSignal.original_text,
    source_url: dbSignal.source_url,
    has_media: false,
  };
}

// 프론트엔드용 시그널 목록 조회
export async function fetchSignalsForFrontend(limit: number = 50): Promise<Signal[]> {
  const data = await getSignalsWithInfluencers(limit);

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((item) => transformDBSignalToFrontend(item as DBSignalWithInfluencer));
}
