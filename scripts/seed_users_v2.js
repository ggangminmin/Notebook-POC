
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// .env 파일 수동 로드 (dotenv 없을 때 대비)
const env = Object.fromEntries(
    fs.readFileSync('.env', 'utf8')
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => {
            const [k, ...v] = l.split('=')
            return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')]
        })
)

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const users = [
    // 마스터 관리자 (기본)
    { email: 'admin@test.com', password: 'admin123!', name: '마스터 관리자', role: 'admin' },
    { email: 'admin.master@gptko.co.kr', password: 'admin123!', name: '마스터 관리자', role: 'admin' },

    // 회사 관리자
    { email: 'admin@gptko.co.kr', password: 'gptkorea123!', name: 'GPTKOREA관리자', company: '지피티코리아', position: '대표', role: 'company_admin' },
    { email: 'admin@aiweb.kr', password: 'aiweb123!', name: 'AIWEB관리자', company: 'AIWEB', position: '부사장', role: 'company_admin' },

    // 회사 소속 사용자 (지피티코리아)
    { email: 'yw.hwang@gptko.co.kr', password: 'ywhwang123!', name: '황용운', company: '지피티코리아', department: '-', position: '이사', role: 'company_user' },
    { email: 'sc.ahn@gptko.co.kr', password: 'scahn123!', name: '안수찬', company: '지피티코리아', department: 'AI 사업부', position: '실장', role: 'company_user' },
    { email: 'iw.ku@gptko.co.kr', password: 'iwku123!', name: '구일완', company: '지피티코리아', department: 'AI 사업부', position: '대리', role: 'company_user' },
    { email: 'yj.kwon@gptko.co.kr', password: 'yjkwon123!', name: '권용재', company: '지피티코리아', department: 'AI 사업부', position: '사원', role: 'company_user' },
    { email: 'js.song@gptko.co.kr', password: 'jssong123!', name: '송제성', company: '지피티코리아', department: '지피티 1팀', position: '팀장', role: 'company_user' },
    { email: 'jy.seok@gptko.co.kr', password: 'jyseok123!', name: '석준용', company: '지피티코리아', department: '지피티 1팀', position: '대리', role: 'company_user' },
    { email: 'sy.lim@gptko.co.kr', password: 'sylim123!', name: '임승연', company: '지피티코리아', department: '지피티 1팀', position: '사원', role: 'company_user' },
    { email: 'jy.park@gptko.co.kr', password: 'jypark123!', name: '박진영', company: '지피티코리아', department: '지피티 2팀', position: '팀장', role: 'company_user' },
    { email: 'ay.lee@gptko.co.kr', password: 'aylee123!', name: '이아영', company: '지피티코리아', department: '지피티 2팀', position: '대리', role: 'company_user' },
    { email: 'hj.kim@gptko.co.kr', password: 'hjkim123!', name: '김학종', company: '지피티코리아', department: '지피티 2팀', position: '사원', role: 'company_user' },
    { email: 'hy.bang@gptko.co.kr', password: 'hybang123!', name: '방효윤', company: '지피티코리아', department: '지피티 2팀', position: '사원', role: 'company_user' },

    // 회사 소속 사용자 (AIWEB)
    { email: 'bw.so@aiweb.kr', password: 'bwso123!', name: '소병우', company: 'AIWEB', department: 'ADM사업부', position: '실장', role: 'company_user' },
    { email: 'jh.jun@aiweb.kr', password: 'jhjun123!', name: '전주희', company: 'AIWEB', department: 'ADM사업부', position: '팀장', role: 'company_user' },
    { email: 'sy.park@aiweb.kr', password: 'sypark123!', name: '박선영', company: 'AIWEB', department: 'ADM사업부', position: '팀장', role: 'company_user' },

    // 일반 사용자
    { email: 'cort53@naver.com', password: 'user123!', name: '일반사용자', role: 'user' }
]

async function seedUsers() {
    console.log('--- Supabase 새 계정 체계 생성 시작 ---')
    console.log(`Supabase URL: ${supabaseUrl ? '로드됨' : '실패'}`)

    for (const user of users) {
        console.log(`계정 생성 시도: ${user.email}...`)

        const { data, error } = await supabase.auth.signUp({
            email: user.email,
            password: user.password,
            options: {
                data: {
                    full_name: user.name,
                    company: user.company || '',
                    department: user.department || '',
                    position: user.position || '',
                    role: user.role
                }
            }
        })

        if (error) {
            if (error.message.includes('already registered')) {
                console.log(`[알림] ${user.email}은 이미 등록된 계정입니다.`)
            } else {
                console.error(`[오류] ${user.email} 생성 실패:`, error.message)
            }
        } else {
            console.log(`[성공] ${user.email} 계정이 생성되었습니다. (역할: ${user.role})`)
        }

        // 속도 제한 대응을 위한 대기
        await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.log('--- 계정 생성 완료 ---')
}

seedUsers()
