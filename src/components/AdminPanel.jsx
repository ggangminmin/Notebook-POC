import React, { useState } from 'react';
import {
    LayoutDashboard,
    Users,
    User,
    MessageSquare,
    HelpCircle,
    CreditCard,
    Package,
    Layers,
    Bot,
    Search,
    Filter,
    ChevronDown,
    Plus,
    MoreVertical,
    ShieldCheck,
    ExternalLink,
    Edit,
    Eye,
    CheckCircle2,
    Building2,
    Coins
} from 'lucide-react';

const AdminPanel = () => {
    const [activeMenu, setActiveMenu] = useState('users');
    const [searchTerm, setSearchTerm] = useState('');

    // Mock data based on the provided user list
    const mockUsers = [
        {
            id: 1,
            name: 'GPTKOREA관리자',
            email: 'admin@gptko.co.kr',
            type: '회사관리자',
            company: '지피티코리아',
            department: '-',
            position: '대표',
            status: '활성',
            credit: 1000,
            usedCredit: 120,
            lastLogin: '2026-02-12',
            avatar: 'https://ui-avatars.com/api/?name=GPTKOREA관리자&background=E53E3E&color=fff'
        },
        {
            id: 2,
            name: 'AIWEB관리자',
            email: 'admin@aiweb.kr',
            type: '회사관리자',
            company: 'AIWEB',
            department: '-',
            position: '부사장',
            status: '활성',
            credit: 1000,
            usedCredit: 85,
            lastLogin: '2026-02-11',
            avatar: 'https://ui-avatars.com/api/?name=AIWEB관리자&background=4F46E5&color=fff'
        },
        {
            id: 3,
            name: '황용운',
            email: 'yw.hwang@gptko.co.kr',
            type: '회사소속사용자',
            company: '지피티코리아',
            department: '-',
            position: '이사',
            status: '활성',
            credit: 500,
            usedCredit: 45,
            lastLogin: '2026-02-12',
            avatar: 'https://ui-avatars.com/api/?name=황용운&background=random'
        },
        {
            id: 4,
            name: '안수찬',
            email: 'sc.ahn@gptko.co.kr',
            type: '회사소속사용자',
            company: '지피티코리아',
            department: 'AI 사업부',
            position: '실장',
            status: '활성',
            credit: 500,
            usedCredit: 200,
            lastLogin: '2026-02-12',
            avatar: 'https://ui-avatars.com/api/?name=안수찬&background=random'
        },
        {
            id: 5,
            name: '구일완',
            email: 'iw.ku@gptko.co.kr',
            type: '회사소속사용자',
            company: '지피티코리아',
            department: 'AI 사업부',
            position: '대리',
            status: '활성',
            credit: 300,
            usedCredit: 50,
            lastLogin: '2026-02-10',
            avatar: 'https://ui-avatars.com/api/?name=구일완&background=random'
        },
        {
            id: 6,
            name: '권용재',
            email: 'yj.kwon@gptko.co.kr',
            type: '회사소속사용자',
            company: '지피티코리아',
            department: 'AI 사업부',
            position: '사원',
            status: '활성',
            credit: 300,
            usedCredit: 10,
            lastLogin: '2026-02-12',
            avatar: 'https://ui-avatars.com/api/?name=권용재&background=random'
        },
        {
            id: 7,
            name: '송제성',
            email: 'js.song@gptko.co.kr',
            type: '회사소속사용자',
            company: '지피티코리아',
            department: '지피티 1팀',
            position: '팀장',
            status: '활성',
            credit: 400,
            usedCredit: 150,
            lastLogin: '2026-02-11',
            avatar: 'https://ui-avatars.com/api/?name=송제성&background=random'
        },
        {
            id: 8,
            name: '석준용',
            email: 'jy.seok@gptko.co.kr',
            type: '회사소속사용자',
            company: '지피티코리아',
            department: '지피티 1팀',
            position: '대리',
            status: '활성',
            credit: 300,
            usedCredit: 80,
            lastLogin: '2026-02-12',
            avatar: 'https://ui-avatars.com/api/?name=석준용&background=random'
        },
        {
            id: 9,
            name: '임승연',
            email: 'sy.lim@gptko.co.kr',
            type: '회사소속사용자',
            company: '지피티코리아',
            department: '지피티 1팀',
            position: '사원',
            status: '활성',
            credit: 300,
            usedCredit: 25,
            lastLogin: '2026-02-12',
            avatar: 'https://ui-avatars.com/api/?name=임승연&background=random'
        },
        {
            id: 10,
            name: '박진영',
            email: 'jy.park@gptko.co.kr',
            type: '회사소속사용자',
            company: '지피티코리아',
            department: '지피티 2팀',
            position: '팀장',
            status: '활성',
            credit: 400,
            usedCredit: 110,
            lastLogin: '2026-02-11',
            avatar: 'https://ui-avatars.com/api/?name=박진영&background=random'
        },
        {
            id: 11,
            name: '이아영',
            email: 'ay.lee@gptko.co.kr',
            type: '회사소속사용자',
            company: '지피티코리아',
            department: '지피티 2팀',
            position: '대리',
            status: '활성',
            credit: 300,
            usedCredit: 40,
            lastLogin: '2026-02-10',
            avatar: 'https://ui-avatars.com/api/?name=이아영&background=random'
        },
        {
            id: 12,
            name: '김학종',
            email: 'hj.kim@gptko.co.kr',
            type: '회사소속사용자',
            company: '지피티코리아',
            department: '지피티 2팀',
            position: '사원',
            status: '활성',
            credit: 300,
            usedCredit: 15,
            lastLogin: '2026-02-12',
            avatar: 'https://ui-avatars.com/api/?name=김학종&background=random'
        },
        {
            id: 13,
            name: '방효윤',
            email: 'hy.bang@gptko.co.kr',
            type: '회사소속사용자',
            company: '지피티코리아',
            department: '지피티 2팀',
            position: '사원',
            status: '활성',
            credit: 300,
            usedCredit: 5,
            lastLogin: '2026-02-12',
            avatar: 'https://ui-avatars.com/api/?name=방효윤&background=random'
        },
        {
            id: 14,
            name: '소병우',
            email: 'bw.so@aiweb.kr',
            type: '회사소속사용자',
            company: 'AIWEB',
            department: 'ADM사업부',
            position: '실장',
            status: '활성',
            credit: 500,
            usedCredit: 180,
            lastLogin: '2026-02-11',
            avatar: 'https://ui-avatars.com/api/?name=소병우&background=random'
        },
        {
            id: 15,
            name: '전주희',
            email: 'jh.jun@aiweb.kr',
            type: '회사소속사용자',
            company: 'AIWEB',
            department: 'ADM사업부',
            position: '팀장',
            status: '활성',
            credit: 400,
            usedCredit: 95,
            lastLogin: '2026-02-12',
            avatar: 'https://ui-avatars.com/api/?name=전주희&background=random'
        },
        {
            id: 16,
            name: '박선영',
            email: 'sy.park@aiweb.kr',
            type: '회사소속사용자',
            company: 'AIWEB',
            department: 'ADM사업부',
            position: '팀장',
            status: '활성',
            credit: 400,
            usedCredit: 60,
            lastLogin: '2026-02-12',
            avatar: 'https://ui-avatars.com/api/?name=박선영&background=random'
        }
    ];

    const menuItems = [
        { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
        { id: 'users', label: '사용자 관리', icon: Users },
        { id: 'inquiries', label: '문의 관리', icon: MessageSquare },
        { id: 'faq', label: 'FAQ 관리', icon: HelpCircle },
        { id: 'payment', label: '결제 관리', icon: CreditCard },
        { id: 'credit', label: '크레딧 패키지 관리', icon: Package },
        { id: 'category', label: '카테고리 관리', icon: Layers },
        { id: 'agents', label: '에이전트 관리', icon: Bot },
    ];

    return (
        <div className="flex h-full bg-[#F8F9FB]">
            {/* Left Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col pt-6">
                <div className="px-6 mb-8">
                    <div className="flex items-center space-x-3 text-[#E53E3E]">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100 shadow-sm">
                            <ShieldCheck className="w-6 h-6 " />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-[15px]">관리자</h3>
                            <p className="text-[12px] text-gray-500 font-medium">시스템 관리</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 space-y-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeMenu === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveMenu(item.id)}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-[#FFF5F5] text-[#E53E3E] font-bold shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-[#E53E3E]' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                <span className="text-[14px]">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Page Header */}
                <div className="px-8 pt-8 pb-6">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
                        <p className="text-gray-500 mt-1 text-[14px]">플랫폼 사용자들을 관리하고 현황을 확인하세요</p>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
                    {/* Stat Cards Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Total Users */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start space-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Users className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-gray-500 font-bold text-[14px]">전체 사용자</p>
                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 text-sm">전체 사용자</span>
                                        <span className="font-bold text-lg">22</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 text-sm">활성 사용자</span>
                                        <span className="font-bold text-lg text-emerald-600">22</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 text-sm">비활성 사용자</span>
                                        <span className="font-bold text-lg">0</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 text-sm">정지</span>
                                        <span className="font-bold text-lg text-red-500">0</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Normal Users */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start space-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                                <User className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-gray-500 font-bold text-[14px]">일반 사용자</p>
                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 text-sm">전체 일반 사용자</span>
                                        <span className="font-bold text-lg">2</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 text-sm">활성 일반 사용자</span>
                                        <span className="font-bold text-lg text-emerald-600">2</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 text-sm">비활성 일반 사용자</span>
                                        <span className="font-bold text-lg">0</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 text-sm">정지 일반 사용자</span>
                                        <span className="font-bold text-lg text-red-500">0</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Company Users */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start space-x-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-gray-500 font-bold text-[14px]">회사 사용자</p>
                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 text-sm">전체 회사 계정</span>
                                        <span className="font-bold text-lg text-gray-900">19</span>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 font-medium">회사 사용자</div>
                                    <div className="flex items-center space-x-3 text-sm">
                                        <div className="flex items-center space-x-1.5">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            <span className="text-gray-500">활성:</span>
                                            <span className="font-bold">16</span>
                                        </div>
                                        <div className="flex items-center space-x-1.5">
                                            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                            <span className="text-gray-500">비활성:</span>
                                            <span className="font-bold">0</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-400 font-medium">회사 관리자</div>
                                    <div className="flex items-center space-x-3 text-sm">
                                        <div className="flex items-center space-x-1.5">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            <span className="text-gray-500">활성:</span>
                                            <span className="font-bold">3</span>
                                        </div>
                                        <div className="flex items-center space-x-1.5">
                                            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                            <span className="text-gray-500">비활성:</span>
                                            <span className="font-bold">0</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-gray-600 text-sm font-medium">정지 회사 계정</span>
                                        <span className="font-bold text-lg text-red-500">0</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table & Filter Section */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Filter Bar */}
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <div className="flex items-center space-x-4 flex-1 max-w-4xl">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="이름, 이메일, 회사명으로 검색..."
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button className="flex items-center space-x-2 px-4 py-2 border border-gray-100 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                                    <span>전체 역할</span>
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                </button>
                                <button className="flex items-center space-x-2 px-4 py-2 border border-gray-100 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                                    <span>전체 상태</span>
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                </button>
                                <button className="flex items-center space-x-2 px-4 py-2 border border-gray-100 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                                    <span>전체 기간</span>
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                            <button className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/10 hover:bg-blue-700 transition-all transform active:scale-95">
                                <Plus className="w-4 h-4" />
                                <span>회사관리자 추가</span>
                            </button>
                        </div>

                        {/* User Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 text-gray-400 font-bold text-[12px] uppercase tracking-wider">
                                        <th className="px-6 py-4 border-b border-gray-50">사용자</th>
                                        <th className="px-6 py-4 border-b border-gray-50 text-center">유형</th>
                                        <th className="px-6 py-4 border-b border-gray-50 text-center">상태</th>
                                        <th className="px-6 py-4 border-b border-gray-50 text-center">크레딧</th>
                                        <th className="px-6 py-4 border-b border-gray-50 text-center">사용 크레딧</th>
                                        <th className="px-6 py-4 border-b border-gray-50 text-center">최근 로그인</th>
                                        <th className="px-6 py-4 border-b border-gray-50 text-center">작업</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {mockUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50/50 transition-all group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center space-x-3">
                                                    <img src={user.avatar} className="w-10 h-10 rounded-xl shadow-sm border border-white" alt="" />
                                                    <div>
                                                        <div className="flex items-center space-x-1.5">
                                                            <p className="text-[14px] font-bold text-gray-900">{user.name}</p>
                                                            {user.position && (
                                                                <span className="text-[11px] text-gray-400 font-medium">({user.position})</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[12px] text-gray-500 font-medium">{user.email}</p>
                                                        {user.company && (
                                                            <div className="flex items-center space-x-1 mt-0.5">
                                                                <Building2 className="w-3 h-3 text-gray-300" />
                                                                <span className="text-[11px] text-gray-400">{user.company} {user.department !== '-' ? `· ${user.department}` : ''}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[12px] font-bold border border-purple-100/50 shadow-sm inline-flex items-center space-x-1">
                                                    <Building2 className="w-3 h-3" />
                                                    <span>{user.type}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex justify-center">
                                                    <span className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[12px] font-bold border border-emerald-100/50">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        <span>{user.status}</span>
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center font-bold text-gray-600">
                                                <div className="flex items-center justify-center space-x-1.5">
                                                    <Coins className="w-4 h-4 text-amber-500" />
                                                    <span>{user.credit}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center font-bold text-gray-600">
                                                <div className="flex items-center justify-center space-x-1.5">
                                                    <CreditCard className="w-4 h-4 text-indigo-500" />
                                                    <span>{user.usedCredit}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center text-[13px] text-gray-500 font-medium">
                                                {user.lastLogin}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="상세보기">
                                                        <Eye className="w-4.5 h-4.5" />
                                                    </button>
                                                    <button className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="수정">
                                                        <Edit className="w-4.5 h-4.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Placeholder */}
                        <div className="p-6 bg-gray-50/30 flex items-center justify-center border-t border-gray-50">
                            <div className="flex space-x-1 items-center">
                                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-all">&lt;</button>
                                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">1</button>
                                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-all">&gt;</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
