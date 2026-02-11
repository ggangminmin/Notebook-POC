import React, { useState } from 'react'
import { X, Mail, Lock, User, ShieldCheck, ArrowRight, Github } from 'lucide-react'
import { supabase } from '../utils/supabaseClient'

/**
 * AuthModal - 로그인 및 회원가입 모달
 * - Supabase Auth 연동
 * - 프리미엄 다크/화이트 모던 디자인
 */
const AuthModal = ({ isOpen, onClose, language = 'ko', onNotification, setUser }) => {
    const [isLogin, setIsLogin] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')

    if (!isOpen) return null

    const handleAuth = async (e) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            // 데모 계정 확인
            const demoAccounts = {
                'admin@test.com': { full_name: '마스터 관리자', role: 'admin' },
                'ms.kang@gptko.co.kr': { full_name: '회사 직원1', role: 'staff' },
                'ms.kang2@gptko.co.kr': { full_name: '회사 직원2', role: 'staff' },
                'cort53@naver.com': { full_name: '일반인', role: 'user' }
            }

            if (password === '1234' && demoAccounts[email]) {
                // 데모 계정은 서버 응답 대기 없이 즉시 로그인 처리 (POC 편의성)
                const mockUser = {
                    id: `demo-${email === 'admin@test.com' ? 'admin' : email}`,
                    email: email,
                    user_metadata: { full_name: demoAccounts[email].full_name }
                }
                setUser(mockUser)
                onNotification?.(
                    language === 'ko' ? '데모 로그인 성공' : 'Demo Login Success',
                    language === 'ko' ? `${demoAccounts[email].full_name}님, 환영합니다!` : `Welcome, ${demoAccounts[email].full_name}!`,
                    'success'
                )
                onClose()
                return
            }

            // 일반 계정 로직 (1234 입력 시에도 notebook_ 프리픽스 붙여서 6자 이상 충족)
            const securePassword = password === '1234' ? `password1234` : password

            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password: securePassword
                })
                if (error) throw error
                setUser(data.user)
                onNotification?.(
                    language === 'ko' ? '로그인 성공' : 'Login Success',
                    language === 'ko' ? '환영합니다!' : 'Welcome back!',
                    'success'
                )
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
            onClose()
        } catch (error) {
            console.error('Auth Error:', error.message)
            onNotification?.(
                language === 'ko' ? '로그인 오류' : 'Login Error',
                error.message === 'Invalid login credentials' ? (language === 'ko' ? '이메일 또는 비밀번호가 잘못되었습니다.' : 'Invalid email or password') : error.message,
                'error'
            )
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        // 실제 연동 시 Supabase 설정 필요
        onNotification?.(
            language === 'ko' ? '안내' : 'Notice',
            language === 'ko' ? '소셜 로그인은 환경 설정이 필요합니다.' : 'Social login requires configuration.',
            'info'
        )
    }

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className="relative bg-white w-full max-w-[440px] rounded-[32px] shadow-2xl overflow-hidden animate-scale-in border border-gray-100 flex flex-col">
                {/* Header Decor */}
                <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

                <div className="p-8">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-[28px] font-bold text-slate-900 tracking-tight">
                                {isLogin
                                    ? (language === 'ko' ? '로그인' : 'Sign In')
                                    : (language === 'ko' ? '계정 생성' : 'Create Account')}
                            </h2>
                            <p className="text-slate-500 text-[15px] mt-2">
                                {isLogin
                                    ? (language === 'ko' ? '다시 오신 것을 환영합니다.' : 'Welcome back to Agent Hub.')
                                    : (language === 'ko' ? 'Agent Hub의 일원이 되어보세요.' : 'Join the Agent Hub community.')}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-1">
                                <label className="text-[13px] font-bold text-slate-700 ml-1">
                                    {language === 'ko' ? '이름' : 'Full Name'}
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder={language === 'ko' ? '홍길동' : 'John Doe'}
                                        className="w-full h-14 pl-12 pr-5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-[15px]"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-[13px] font-bold text-slate-700 ml-1">
                                {language === 'ko' ? '이메일' : 'Email Address'}
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full h-14 pl-12 pr-5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-[15px]"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[13px] font-bold text-slate-700">
                                    {language === 'ko' ? '비밀번호' : 'Password'}
                                </label>
                                {isLogin && (
                                    <button type="button" className="text-[12px] font-bold text-blue-600 hover:underline">
                                        {language === 'ko' ? '비밀번호 찾기' : 'Forgot?'}
                                    </button>
                                )}
                            </div>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 pl-12 pr-5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-[15px]"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-bold text-[16px] shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none mt-4 flex items-center justify-center space-x-2"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>{isLogin ? (language === 'ko' ? '로그인하기' : 'Sign In Now') : (language === 'ko' ? '가입하기' : 'Create Account')}</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-100" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-4 text-slate-400 font-medium tracking-widest">
                                {language === 'ko' ? '또는 소셜 계정으로' : 'Or continue with'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={handleGoogleLogin}
                            className="flex items-center justify-center h-12 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors space-x-2 font-bold text-[14px] text-slate-700"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span>Google</span>
                        </button>
                        <button
                            onClick={handleGoogleLogin}
                            className="flex items-center justify-center h-12 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors space-x-2 font-bold text-[14px] text-slate-700"
                        >
                            <Github className="w-5 h-5" />
                            <span>GitHub</span>
                        </button>
                    </div>

                    <div className="mt-8">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-100" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-4 text-slate-400 font-medium tracking-widest">
                                    {language === 'ko' ? '데모 계정으로 테스트' : 'Try Demo Accounts'}
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: '마스터 (Admin)', email: 'admin@test.com' },
                                { label: '직원 1', email: 'ms.kang@gptko.co.kr' },
                                { label: '직원 2', email: 'ms.kang2@gptko.co.kr' },
                                { label: '일반인', email: 'cort53@naver.com' }
                            ].map((account) => (
                                <button
                                    key={account.email}
                                    onClick={() => {
                                        setEmail(account.email);
                                        setPassword('1234');
                                    }}
                                    className="px-3 py-2 text-[11px] font-bold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600 text-left"
                                >
                                    {account.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-slate-500 text-[14px]">
                            {isLogin
                                ? (language === 'ko' ? '아직 계정이 없으신가요?' : "Don't have an account?")
                                : (language === 'ko' ? '이미 계정이 있으신가요?' : "Already have an account?")}
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="ml-2 font-bold text-blue-600 hover:underline"
                            >
                                {isLogin
                                    ? (language === 'ko' ? '회원가입' : 'Sign Up')
                                    : (language === 'ko' ? '로그인' : 'Sign In')}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer Security Note */}
                <div className="bg-slate-50 p-6 flex justify-center items-center space-x-2 text-slate-400 border-t border-slate-100">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[11px] font-medium tracking-wider uppercase">
                        Secure Authentication by Supabase
                    </span>
                </div>
            </div>
        </div>
    )
}

export default AuthModal
