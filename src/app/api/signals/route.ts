import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import type { Signal, Influencer as FrontendInfluencer, SignalPaginationResponse } from '@/types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// DB 시그널 타입
interface DBSignalWithInfluencer {
  id: string;
  influencer_id: string;
  sentiment: 'LONG' | 'SHORT';
  entry_price: number;
  signal_timestamp: number;
  source_url: string;
  original_text: string;
  summary: string;
  current_profit: number | null;
  profit_updated_at: string | null;
  influencer: {
    id: string;
    twitter_handle: string;
    display_name: string;
    profile_image_url: string | null;
  } | null;
}

function transformToFrontend(dbSignal: DBSignalWithInfluencer): Signal {
  const influencer: FrontendInfluencer | undefined = dbSignal.influencer
    ? {
        id: dbSignal.influencer.id,
        name: dbSignal.influencer.display_name,
        handle: dbSignal.influencer.twitter_handle,
        avatar_url: dbSignal.influencer.profile_image_url || '/default-avatar.png',
        trust_score: 50,
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
    original_text: dbSignal.summary || dbSignal.original_text?.slice(0, 100) || '',
    full_text: dbSignal.original_text || '',
    source_url: dbSignal.source_url,
    has_media: false,
    current_profit: dbSignal.current_profit,
    profit_updated_at: dbSignal.profit_updated_at
      ? Math.floor(new Date(dbSignal.profit_updated_at).getTime() / 1000)
      : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)));
    const influencerId = searchParams.get('influencer_id');

    const supabase = getSupabase();

    // 전체 개수 조회 (influencer 필터 적용)
    let countQuery = supabase
      .from('signals')
      .select('*', { count: 'exact', head: true });

    if (influencerId) {
      countQuery = countQuery.eq('influencer_id', influencerId);
    }

    const { count: total } = await countQuery;

    // 페이지네이션된 시그널 조회
    let dataQuery = supabase
      .from('signals')
      .select(`
        *,
        influencer:influencers(*)
      `)
      .order('signal_timestamp', { ascending: false });

    if (influencerId) {
      dataQuery = dataQuery.eq('influencer_id', influencerId);
    }

    const { data, error } = await dataQuery.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching signals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch signals' },
        { status: 500 }
      );
    }

    const signals = (data || []).map((item) =>
      transformToFrontend(item as DBSignalWithInfluencer)
    );

    const response: SignalPaginationResponse = {
      signals,
      hasMore: offset + signals.length < (total || 0),
      nextOffset: offset + signals.length,
      total: total || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
