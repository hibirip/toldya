import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/adminAuth';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  // 인증 확인
  const token = request.cookies.get('admin_session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await verifySession(token);
  if (!session.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');

    // 최근 수집 실행 기록 조회
    const { data: runs, error: runsError } = await supabase
      .from('collection_runs')
      .select('*')
      .order('run_timestamp', { ascending: false })
      .limit(limit);

    if (runsError) {
      console.error('[Stats API] Error fetching runs:', runsError);
      return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
    }

    // 집계 통계 계산
    const { data: aggregateData } = await supabase
      .from('collection_runs')
      .select('total_fetched, after_url_dedup, after_claude, after_neutral_filter, saved, errors_count, success');

    const aggregate = {
      totalRuns: aggregateData?.length || 0,
      successfulRuns: aggregateData?.filter((r) => r.success).length || 0,
      totalFetched: aggregateData?.reduce((sum, r) => sum + (r.total_fetched || 0), 0) || 0,
      totalSaved: aggregateData?.reduce((sum, r) => sum + (r.saved || 0), 0) || 0,
      totalErrors: aggregateData?.reduce((sum, r) => sum + (r.errors_count || 0), 0) || 0,
      avgConversionRate: 0,
    };

    // 변환율 계산
    if (aggregate.totalFetched > 0) {
      aggregate.avgConversionRate = (aggregate.totalSaved / aggregate.totalFetched) * 100;
    }

    // 파이프라인 퍼널 데이터 (최근 runs 기준)
    const recentRuns = runs || [];
    const funnel = {
      totalFetched: recentRuns.reduce((sum, r) => sum + (r.total_fetched || 0), 0),
      afterUrlDedup: recentRuns.reduce((sum, r) => sum + (r.after_url_dedup || 0), 0),
      afterClaude: recentRuns.reduce((sum, r) => sum + (r.after_claude || 0), 0),
      afterNeutralFilter: recentRuns.reduce((sum, r) => sum + (r.after_neutral_filter || 0), 0),
      saved: recentRuns.reduce((sum, r) => sum + (r.saved || 0), 0),
    };

    return NextResponse.json({
      runs,
      aggregate,
      funnel,
    });
  } catch (error) {
    console.error('[Stats API] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
