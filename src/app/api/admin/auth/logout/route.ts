import { NextRequest, NextResponse } from 'next/server';
import { logoutAdmin, deleteSessionCookie } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value;

    if (token) {
      await logoutAdmin(token);
    }

    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', deleteSessionCookie());

    return response;
  } catch (error) {
    console.error('[Logout API] Error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
