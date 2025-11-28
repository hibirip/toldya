import { NextRequest, NextResponse } from 'next/server';
import { loginAdmin, createSessionCookie } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const result = await loginAdmin(email, password);

    if (!result.success || !result.token) {
      return NextResponse.json(
        { error: result.error || '로그인에 실패했습니다.' },
        { status: 401 }
      );
    }

    // 세션 쿠키 설정
    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', createSessionCookie(result.token));

    return response;
  } catch (error) {
    console.error('[Login API] Error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
