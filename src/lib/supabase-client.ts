import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 클라이언트 사이드용 Supabase 인스턴스 (지연 초기화)
let _supabaseClient: SupabaseClient | null = null;

export const supabaseClient = (() => {
  if (_supabaseClient) return _supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // 빌드 시점이나 env 미설정 시 더미 클라이언트 반환
    console.warn('[Supabase] Missing env vars, realtime features disabled');
    return createClient('https://placeholder.supabase.co', 'placeholder-key');
  }

  _supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return _supabaseClient;
})();
