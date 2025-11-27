import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export interface InfluencerWithStats {
  id: string;
  twitter_handle: string;
  display_name: string;
  profile_image_url: string | null;
  signal_count: number;
  long_count: number;
  short_count: number;
  latest_signal_at: number | null;
}

export async function GET() {
  try {
    const supabase = getSupabase();

    // 인플루언서 목록과 시그널 통계를 함께 가져오기
    const { data: influencers, error: influencersError } = await supabase
      .from('influencers')
      .select('*')
      .order('display_name', { ascending: true });

    if (influencersError) {
      console.error('Error fetching influencers:', influencersError);
      return NextResponse.json({ error: 'Failed to fetch influencers' }, { status: 500 });
    }

    // 각 인플루언서별 시그널 통계 계산
    const { data: signals, error: signalsError } = await supabase
      .from('signals')
      .select('influencer_id, sentiment, signal_timestamp');

    if (signalsError) {
      console.error('Error fetching signals:', signalsError);
      return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
    }

    // 인플루언서별 통계 맵 생성
    const statsMap = new Map<string, {
      signal_count: number;
      long_count: number;
      short_count: number;
      latest_signal_at: number | null;
    }>();

    signals?.forEach((signal) => {
      const stats = statsMap.get(signal.influencer_id) || {
        signal_count: 0,
        long_count: 0,
        short_count: 0,
        latest_signal_at: null,
      };

      stats.signal_count++;
      if (signal.sentiment === 'LONG') stats.long_count++;
      if (signal.sentiment === 'SHORT') stats.short_count++;

      if (!stats.latest_signal_at || signal.signal_timestamp > stats.latest_signal_at) {
        stats.latest_signal_at = signal.signal_timestamp;
      }

      statsMap.set(signal.influencer_id, stats);
    });

    // 통계와 인플루언서 데이터 병합
    const influencersWithStats: InfluencerWithStats[] = influencers?.map((inf) => {
      const stats = statsMap.get(inf.id) || {
        signal_count: 0,
        long_count: 0,
        short_count: 0,
        latest_signal_at: null,
      };

      return {
        id: inf.id,
        twitter_handle: inf.twitter_handle,
        display_name: inf.display_name,
        profile_image_url: inf.profile_image_url,
        ...stats,
      };
    }) || [];

    // 시그널 수가 많은 순으로 정렬 (활성도 순)
    influencersWithStats.sort((a, b) => b.signal_count - a.signal_count);

    return NextResponse.json({ influencers: influencersWithStats });
  } catch (error) {
    console.error('Error in influencers API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
