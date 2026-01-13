// Supabase 클라이언트 설정
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase 환경 변수가 설정되지 않았습니다.');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '설정됨' : '미설정');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'notebooklm-dashboard',
    },
  },
});

// 연결 테스트 함수
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('notebooks')
      .select('count')
      .limit(1);

    if (error) {
      console.error('[Supabase] 연결 테스트 실패:', error);
      return false;
    }

    console.log('[Supabase] 연결 성공 ✅');
    return true;
  } catch (err) {
    console.error('[Supabase] 연결 테스트 예외:', err);
    return false;
  }
}
