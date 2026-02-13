// Supabase 계정 초기화 스크립트 (POC용)
// 사용법: node scripts/seed_users.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const users = [
    { email: 'admin@test.com', password: '1234', name: '마스터 관리자' },
    { email: 'ms.kang@gptko.co.kr', password: '1234', name: '회사 직원1' },
    { email: 'ms.kang2@gptko.co.kr', password: '1234', name: '회사 직원2' },
    { email: 'cort53@naver.com', password: '1234', name: '일반인' }
]

async function seedUsers() {
    console.log('--- Supabase 계정 생성 시작 ---')

    for (const user of users) {
        console.log(`계정 생성 시도: ${user.email}...`)

        // 회원가입 시도
        const { data, error } = await supabase.auth.signUp({
            email: user.email,
            password: user.password,
            options: {
                data: {
                    full_name: user.name
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
            console.log(`[성공] ${user.email} 계정이 생성되었습니다.`)
        }
    }

    console.log('--- 계정 생성 완료 ---')
}

seedUsers()
