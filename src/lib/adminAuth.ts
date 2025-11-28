import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// ============================================
// Super Admin 인증 시스템
// ============================================

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_DURATION_HOURS = 24;

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 간단한 토큰 생성 (crypto 사용)
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// 비밀번호 해시 비교 (단순 비교 - 환경변수 사용)
function verifyPassword(inputPassword: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('[AdminAuth] ADMIN_PASSWORD environment variable not set');
    return false;
  }
  return inputPassword === adminPassword;
}

// Super admin 이메일 조회
async function getSuperAdminEmail(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'super_admin_email')
    .single();

  if (!data?.value) return null;
  // JSONB에서 문자열 추출 (따옴표 제거)
  return typeof data.value === 'string'
    ? data.value.replace(/^"|"$/g, '')
    : String(data.value);
}

// 로그인 처리
export async function loginAdmin(email: string, password: string): Promise<{
  success: boolean;
  error?: string;
  token?: string;
}> {
  // 1. Super admin 이메일 확인
  const superAdminEmail = await getSuperAdminEmail();
  if (!superAdminEmail || email !== superAdminEmail) {
    return { success: false, error: '권한이 없는 계정입니다.' };
  }

  // 2. 비밀번호 확인
  if (!verifyPassword(password)) {
    return { success: false, error: '비밀번호가 올바르지 않습니다.' };
  }

  // 3. 세션 토큰 생성 및 저장
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('admin_sessions').insert({
    session_token: token,
    email: email,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error('[AdminAuth] Failed to create session:', error);
    return { success: false, error: '세션 생성에 실패했습니다.' };
  }

  return { success: true, token };
}

// 로그아웃 처리
export async function logoutAdmin(token: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('admin_sessions').delete().eq('session_token', token);
}

// 세션 검증
export async function verifySession(token: string): Promise<{
  valid: boolean;
  email?: string;
}> {
  if (!token) {
    return { valid: false };
  }

  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('admin_sessions')
    .select('email, expires_at')
    .eq('session_token', token)
    .single();

  if (!data) {
    return { valid: false };
  }

  // 만료 확인
  if (new Date(data.expires_at) < new Date()) {
    // 만료된 세션 삭제
    await supabase.from('admin_sessions').delete().eq('session_token', token);
    return { valid: false };
  }

  return { valid: true, email: data.email };
}

// 쿠키에서 세션 토큰 가져오기
export async function getSessionFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

// 현재 세션 검증 (쿠키 기반)
export async function verifyCurrentSession(): Promise<{
  valid: boolean;
  email?: string;
}> {
  const token = await getSessionFromCookies();
  if (!token) {
    return { valid: false };
  }
  return verifySession(token);
}

// API 라우트용 인증 미들웨어
export async function requireAdminAuth(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  // 쿠키에서 세션 토큰 가져오기
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized: No session token' },
      { status: 401 }
    );
  }

  const session = await verifySession(token);
  if (!session.valid) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or expired session' },
      { status: 401 }
    );
  }

  return handler();
}

// 세션 쿠키 설정 헬퍼
export function createSessionCookie(token: string): string {
  const expires = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=${expires.toUTCString()}`;
}

// 세션 쿠키 삭제 헬퍼
export function deleteSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

// 만료된 세션 정리 (cron에서 호출 가능)
export async function cleanupExpiredSessions(): Promise<number> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('admin_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    console.error('[AdminAuth] Failed to cleanup sessions:', error);
    return 0;
  }

  return data?.length || 0;
}
