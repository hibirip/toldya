import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '@/lib/adminAuth';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 인플루언서 목록 조회
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

    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';
    const activeOnly = url.searchParams.get('active') === 'true';

    const offset = (page - 1) * limit;

    let query = supabase
      .from('influencers')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`twitter_handle.ilike.%${search}%,display_name.ilike.%${search}%`);
    }

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, count, error } = await query
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Influencers API] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch influencers' }, { status: 500 });
    }

    return NextResponse.json({
      influencers: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[Influencers API] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// 인플루언서 추가
export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { twitter_handle, display_name, profile_image_url, is_active, priority, notes } = body;

    if (!twitter_handle) {
      return NextResponse.json({ error: 'Twitter handle is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('influencers')
      .insert({
        twitter_handle: twitter_handle.replace('@', ''),
        display_name: display_name || twitter_handle,
        profile_image_url,
        is_active: is_active ?? true,
        priority: priority ?? 0,
        notes,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '이미 존재하는 트위터 핸들입니다.' }, { status: 400 });
      }
      console.error('[Influencers API] Create error:', error);
      return NextResponse.json({ error: 'Failed to create influencer' }, { status: 500 });
    }

    return NextResponse.json({ influencer: data });
  } catch (error) {
    console.error('[Influencers API] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// 인플루언서 수정
export async function PUT(request: NextRequest) {
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
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('influencers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Influencers API] Update error:', error);
      return NextResponse.json({ error: 'Failed to update influencer' }, { status: 500 });
    }

    return NextResponse.json({ influencer: data });
  } catch (error) {
    console.error('[Influencers API] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// 인플루언서 삭제
export async function DELETE(request: NextRequest) {
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
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('influencers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Influencers API] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete influencer' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Influencers API] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
