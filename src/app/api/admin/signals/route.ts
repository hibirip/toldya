import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/adminAuth';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 시그널 목록 조회
export async function GET(request: NextRequest) {
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

    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const sentiment = url.searchParams.get('sentiment') || '';

    const offset = (page - 1) * limit;

    let query = supabase
      .from('signals')
      .select('*, influencer:influencers(*)', { count: 'exact' });

    if (search) {
      query = query.or(`original_text.ilike.%${search}%,summary.ilike.%${search}%`);
    }

    if (sentiment && (sentiment === 'LONG' || sentiment === 'SHORT')) {
      query = query.eq('sentiment', sentiment);
    }

    const { data, count, error } = await query
      .order('signal_timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Signals API] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
    }

    return NextResponse.json({
      signals: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[Signals API] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// 시그널 삭제
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('admin_session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await verifySession(token);
  if (!session.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const deleteAll = url.searchParams.get('all') === 'true';

    const supabase = getSupabase();

    if (deleteAll) {
      // 모든 시그널 삭제
      const { error } = await supabase.from('signals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'All signals deleted' });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('signals').delete().eq('id', id);

    if (error) {
      console.error('[Signals API] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete signal' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Signals API] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
