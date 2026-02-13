
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// .env 파일에서 설정 로드
const env = Object.fromEntries(
    fs.readFileSync('.env', 'utf8')
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => {
            const [k, ...v] = l.split('=');
            return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')];
        })
);

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY; // 관리자 키 권장

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function surgicalCleanup() {
    console.log('--- 🚀 노트북 데이터 정밀 세척 및 정규화 시작 ---');

    // 1. 모든 노트북 가져오기
    const { data: notebooks, error } = await supabase
        .from('notebooks')
        .select('*');

    if (error) {
        console.error('데이터 로드 실패:', error.message);
        return;
    }

    console.log(`전체 데이터 분석 중... (${notebooks.length}개 발견)`);

    const toDelete = [];
    const toUpdate = [];
    const seenNotebooks = new Map(); // id -> owner

    for (const nb of notebooks) {
        // metadata에서 실제 소유자 추출
        const metaOwner = nb.metadata?.ownerId || nb.metadata?.owner_id;
        // 현재 레코드에 기록된 소유자 (컬럼이 있다면)
        const colOwner = nb.ownerId || nb.owner_id;

        // 원칙 1: metadata 소유자와 실제 저장된 소유자가 다르면 제거 (가짜 데이터)
        // 단, colOwner가 없는 경우는 metadata를 기준으로 업데이트 대상
        if (colOwner && metaOwner && colOwner !== metaOwner) {
            console.log(`[삭제 예정] 가짜 소유권 발견: ${nb.title} (ID: ${nb.id}) - 레코드:${colOwner} VS 메타:${metaOwner}`);
            toDelete.push(nb.id);
            continue;
        }

        // 원칙 2: 중복 제거 (논리적으로 동일한 노트북이 여러 개 생성된 경우)
        // 여기선 ID가 유니크하므로, 만약 같은 내용의 다른 ID가 있다면 추가 로직 필요
        // 하지만 사용자의 요청은 "가짜 데이터(userId 불일치)"에 집중되어 있음

        // 원칙 3: sharedWith 정규화 및 ownerId 컬럼 보강
        const rawSharedWith = nb.sharingSettings?.sharedWith || [];
        const normalizedSharedWith = Array.isArray(rawSharedWith)
            ? rawSharedWith.map(m => (typeof m === 'string' ? m : m.email))
            : [];

        toUpdate.push({
            id: nb.id,
            ownerId: metaOwner || colOwner,
            sharingSettings: {
                ...nb.sharingSettings,
                sharedWith: normalizedSharedWith
            },
            metadata: {
                ...nb.metadata,
                sharingSettings: {
                    ...(nb.metadata?.sharingSettings || {}),
                    sharedWith: normalizedSharedWith
                }
            }
        });
    }

    // 실행: 삭제
    if (toDelete.length > 0) {
        console.log(`실제 삭제 진행 중... (${toDelete.length}개)`);
        const { error: delError } = await supabase.from('notebooks').delete().in('id', toDelete);
        if (delError) console.error('삭제 실패:', delError.message);
        else console.log('삭제 완료 ✅');
    }

    // 실행: 업데이트 (정규화 및 ownerId 보충)
    console.log(`데이터 정규화 진행 중... (${toUpdate.length}개)`);
    for (const item of toUpdate) {
        const { error: upError } = await supabase.from('notebooks').upsert(item, { onConflict: 'id' });
        if (upError) {
            // ownerId 컬럼이 없는 경우를 위해 fallback
            if (upError.code === '42703') {
                const fallback = { ...item };
                delete fallback.ownerId;
                await supabase.from('notebooks').upsert(fallback, { onConflict: 'id' });
            } else {
                console.error(`업데이트 실패 (${item.id}):`, upError.message);
            }
        }
    }

    console.log('--- ✨ 세척 및 정규화 완료 ---');
}

surgicalCleanup();
