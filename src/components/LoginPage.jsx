import React, { useState } from 'react'
import { Mail, Lock, User, ShieldCheck, ArrowRight, Github, Sparkles, Box, Layout, Cpu } from 'lucide-react'
import { supabase } from '../utils/supabaseClient'

/**
 * LoginPage - 전용 로그인 페이지
 * - 서비스 진입 시 가장 먼저 보이는 풀 페이지 레이아웃
 * - 프리미엄 다크 테마 & 애니메이션 적용
 */
const LoginPage = ({ onLoginSuccess, language = 'ko', onNotification }) => {
    const [isLogin, setIsLogin] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')

    const handleAuth = async (e) => {
        if (e) e.preventDefault()
        setIsLoading(true)

        try {
            // 모든 회사 계정 프리셋 (POC 체계 전체 지원)
            const demoAccounts = {
                'admin@test.com': { full_name: '마스터 관리자', role: 'admin', pw: ['admin123!', '1234'] },
                'admin.master@gptko.co.kr': { full_name: '마스터 관리자', role: 'admin', pw: ['admin123!', '1234'] },
                // 회사 관리자
                'admin@gptko.co.kr': { full_name: 'GPTKOREA 관리자', role: 'company_admin', pw: 'gptkorea123!', company: '지피티코리아' },
                'admin@aiweb.kr': { full_name: 'AIWEB 관리자', role: 'company_admin', pw: 'aiweb123!', company: 'AIWEB' },
                // 지피티코리아 소속 사용자
                'yw.hwang@gptko.co.kr': { full_name: '황용운 이사', role: 'company_user', pw: 'ywhwang123!', company: '지피티코리아' },
                'sc.ahn@gptko.co.kr': { full_name: '안수찬 실장', role: 'company_user', pw: 'scahn123!', company: '지피티코리아' },
                'iw.ku@gptko.co.kr': { full_name: '구일완 대리', role: 'company_user', pw: 'iwku123!', company: '지피티코리아' },
                'yj.kwon@gptko.co.kr': { full_name: '권용재 사원', role: 'company_user', pw: 'yjkwon123!', company: '지피티코리아' },
                'js.song@gptko.co.kr': { full_name: '송제성 팀장', role: 'company_user', pw: 'jssong123!', company: '지피티코리아' },
                'jy.seok@gptko.co.kr': { full_name: '석준용 대리', role: 'company_user', pw: 'jyseok123!', company: '지피티코리아' },
                'sy.lim@gptko.co.kr': { full_name: '임승연 사원', role: 'company_user', pw: 'sylim123!', company: '지피티코리아' },
                'jy.park@gptko.co.kr': { full_name: '박진영 팀장', role: 'company_user', pw: 'jypark123!', company: '지피티코리아' },
                'ay.lee@gptko.co.kr': { full_name: '이아영 대리', role: 'company_user', pw: 'aylee123!', company: '지피티코리아' },
                'hj.kim@gptko.co.kr': { full_name: '김학종 사원', role: 'company_user', pw: 'hjkim123!', company: '지피티코리아' },
                'hy.bang@gptko.co.kr': { full_name: '방효윤 사원', role: 'company_user', pw: 'hybang123!', company: '지피티코리아' },
                // AIWEB 소속 사용자
                'bw.so@aiweb.kr': { full_name: '소병우 실장', role: 'company_user', pw: 'bwso123!', company: 'AIWEB' },
                'jh.jun@aiweb.kr': { full_name: '전주희 팀장', role: 'company_user', pw: 'jhjun123!', company: 'AIWEB' },
                'sy.park@aiweb.kr': { full_name: '박선영 팀장', role: 'company_user', pw: 'sypark123!', company: 'AIWEB' },
                // 레거시/일반
                'ms.kang@gptko.co.kr': { full_name: '회사 직원1', role: 'company_user', pw: '1234', company: '지피티코리아' },
                'cort53@naver.com': { full_name: '일반 사용자', role: 'user', pw: 'user123!' }
            }

            const demoUser = demoAccounts[email];
            const isPasswordCorrect = demoUser && (
                Array.isArray(demoUser.pw)
                    ? demoUser.pw.includes(password)
                    : password === demoUser.pw
            );

            if (demoUser && isPasswordCorrect) {
                const mockUser = {
                    id: `demo-${email.split('@')[0]}`,
                    email: email,
                    user_metadata: {
                        full_name: demoUser.full_name,
                        role: demoUser.role,
                        company: demoUser.company || ''
                    }
                }
                onLoginSuccess(mockUser)
                onNotification?.(
                    language === 'ko' ? '로그인 성공' : 'Login Success',
                    language === 'ko' ? `${demoUser.full_name}님, 환영합니다!` : `Welcome, ${demoUser.full_name}!`,
                    'success'
                )
                return
            }

            // 일반 계정 로직 (1234 입력 시에도 보안 프리픽스 처리)
            const securePassword = password === '1234' ? `password1234` : password

            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password: securePassword
                })
                if (error) throw error
                onLoginSuccess(data.user)
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password: securePassword,
                    options: { data: { full_name: fullName } }
                })
                if (error) throw error
                onNotification?.(
                    language === 'ko' ? '회원가입 성공' : 'Sign Up Success',
                    language === 'ko' ? '이메일을 확인해주세요.' : 'Please check your email.',
                    'success'
                )
            }
        } catch (error) {
            console.error('Auth Error:', error.message)
            onNotification?.(
                language === 'ko' ? '로그인 오류' : 'Login Error',
                error.message === 'Invalid login credentials'
                    ? (language === 'ko' ? '이메일 또는 비밀번호가 잘못되었습니다.' : 'Invalid email or password')
                    : error.message,
                'error'
            )
        } finally {
            setIsLoading(false)
        }
    }

    const setDemoAccount = (accEmail) => {
        setEmail(accEmail)
        setPassword('1234')
    }

    return (
        <div className="min-h-screen bg-[#0A0A0B] flex overflow-hidden">
            {/* Left Side: Visual Experience */}
            <div className="hidden lg:flex w-1/2 relative flex-col justify-center px-16 bg-gradient-to-br from-[#121214] to-[#0A0A0B] border-r border-white/5">
                {/* Background Decor */}
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full" />

                <div className="relative z-10 max-w-lg">
                    <div className="mb-10 inline-flex items-center px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                        <Sparkles className="w-5 h-5 text-blue-400 mr-2" />
                        <span className="text-sm font-bold text-gray-300">Next-Gen Intelligence Hub</span>
                    </div>

                    <h1 className="text-6xl font-black text-white leading-tight tracking-tighter mb-6">
                        Build your<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                            Knowledge Engine
                        </span>
                    </h1>

                    <p className="text-xl text-gray-400 leading-relaxed mb-12 font-medium">
                        여러분의 비즈니스와 아이디어를 AI 에이전트와 연결하세요.
                        더 빠르게 질문하고, 더 깊게 분석하고, 더 스마트하게 실행합니다.
                    </p>

                    <div className="grid grid-cols-2 gap-6">
                        {[
                            { icon: Layout, title: 'Note Chat', desc: '파일 기반 심층 분석' },
                            { icon: Cpu, title: 'Chat AI', desc: '실시간 하이엔드 챗' },
                        ].map((item, idx) => (
                            <div key={idx} className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                                <item.icon className="w-8 h-8 text-blue-400 mb-4" />
                                <h3 className="text-white font-bold mb-2">{item.title}</h3>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="absolute bottom-12 left-16 flex items-center space-x-2 text-gray-600">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[11px] font-bold tracking-widest uppercase">Enterprise-Grade Security by Supabase</span>
                </div>
            </div>

            {/* Right Side: Auth Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0A0A0B]">
                <div className="w-full max-w-[440px] space-y-8 animate-fade-in-up">
                    <div className="text-center lg:text-left">
                        <h2 className="text-4xl font-black text-white tracking-tight">
                            {isLogin ? (language === 'ko' ? '반갑습니다!' : 'Welcome Back') : (language === 'ko' ? '계정 만들기' : 'Create Account')}
                        </h2>
                        <p className="text-gray-500 mt-3 text-lg font-medium">
                            {isLogin ? (language === 'ko' ? 'Agent Hub에 오신 것을 환영합니다.' : 'Login to your personalized AI hub.') : (language === 'ko' ? '더 나은 비즈니스 지능을 경험하세요.' : 'Start your journey with us.')}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        {!isLogin && (
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-wider">{language === 'ko' ? '이름' : 'Full Name'}</label>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full h-16 pl-14 pr-6 bg-[#161618] border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-[#1C1C1E] transition-all text-white font-medium"
                                        placeholder="홍길동"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 ml-1 uppercase tracking-wider">{language === 'ko' ? '이메일' : 'Email'}</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-16 pl-14 pr-6 bg-[#161618] border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-[#1C1C1E] transition-all text-white font-medium"
                                    placeholder="admin@test.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">{language === 'ko' ? '비밀번호' : 'Password'}</label>
                                {isLogin && <button type="button" className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">{language === 'ko' ? '비밀번호 찾기' : 'Forgot?'}</button>}
                            </div>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-16 pl-14 pr-6 bg-[#161618] border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-[#1C1C1E] transition-all text-white font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 bg-white text-black rounded-2xl font-black text-lg hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-3 mt-6 shadow-xl shadow-white/5"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>{isLogin ? (language === 'ko' ? '로그인하기' : 'Sign In Now') : (language === 'ko' ? '가입하기' : 'Join Now')}</span>
                                    <ArrowRight className="w-6 h-6" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Quick Demo Accounts */}
                    <div className="mt-12">
                        <div className="relative mb-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/5" />
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em] text-gray-600 italic">
                                <span className="bg-[#0A0A0B] px-6">Quick Test Access</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: '마스터 (Admin)', email: 'admin@test.com', pw: 'admin123!' },
                                { label: 'GPTKOREA 관리자', email: 'admin@gptko.co.kr', pw: 'gptkorea123!' },
                                { label: 'AIWEB 관리자', email: 'admin@aiweb.kr', pw: 'aiweb123!' },
                                { label: '송제성 팀장 (지피티)', email: 'js.song@gptko.co.kr', pw: 'jssong123!' },
                                { label: '석준용 대리 (지피티)', email: 'jy.seok@gptko.co.kr', pw: 'jyseok123!' },
                                { label: '일반 사용자', email: 'cort53@naver.com', pw: 'user123!' }
                            ].map((acc) => (
                                <button
                                    key={acc.email}
                                    onClick={() => {
                                        setEmail(acc.email)
                                        setPassword(acc.pw)
                                    }}
                                    className="px-4 py-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all text-left group"
                                >
                                    <div className="text-[11px] font-black text-gray-500 uppercase tracking-wider mb-1 group-hover:text-blue-400 transition-colors">{acc.label}</div>
                                    <div className="text-[13px] text-gray-300 truncate font-medium">{acc.email}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-gray-500 hover:text-white transition-colors font-bold text-sm"
                        >
                            {isLogin ? (language === 'ko' ? '아직 계정이 없으신가요? 회원가입' : "New to Agent Hub? Create account") : (language === 'ko' ? '이미 계정이 있으신가요? 로그인' : "Already have an account? Sign in")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoginPage
