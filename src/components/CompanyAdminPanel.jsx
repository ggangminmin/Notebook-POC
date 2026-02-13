import React, { useState } from 'react';
import {
    LayoutDashboard,
    Users,
    CreditCard,
    BarChart3,
    Settings,
    Search,
    ChevronDown,
    Building2,
    Coins,
    History,
    TrendingUp,
    PieChart,
    User,
    ArrowRight
} from 'lucide-react';

const CompanyAdminPanel = ({ companyName = '우리 회사' }) => {
    const [activeMenu, setActiveMenu] = useState('dashboard');

    const menuItems = [
        { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
        { id: 'staff', label: '직원/부서 관리', icon: Users },
        { id: 'credit', label: '크레딧 충전내역', icon: History },
        { id: 'report', label: '분석 및 리포트', icon: TrendingUp },
        { id: 'settings', label: '설정', icon: Settings },
    ];

    return (
        <div className="flex h-full bg-[#F8F9FB]">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col pt-6">
                <div className="px-6 mb-8">
                    <div className="flex items-center space-x-3 text-blue-600">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-[15px]">회사 관리자</h3>
                            <p className="text-[12px] text-gray-500 font-medium">분석 및 관리</p>
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
                                        ? 'bg-blue-50 text-blue-600 font-bold shadow-sm'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                <span className="text-[14px]">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-8 pt-8 pb-6 flex justify-between items-end">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold text-gray-900">회사 관리 대시보드</h1>
                        <p className="text-gray-500 mt-1 text-[14px]">{companyName}의 AI 에이전트 사용 현황을 한눈에 확인하세요</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                            <span>전체 기간</span>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Area */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
                    {/* Summary Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between">
                            <div>
                                <p className="text-gray-500 font-bold text-[14px] mb-1">크레딧 사용량</p>
                                <h2 className="text-3xl font-black text-gray-900">0</h2>
                                <p className="text-[12px] text-gray-400 mt-1 font-medium">잔여: 0</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                                <CreditCard className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between">
                            <div>
                                <p className="text-gray-500 font-bold text-[14px] mb-1">크레딧 충전</p>
                                <h2 className="text-3xl font-black text-gray-900">0원</h2>
                                <p className="text-[12px] text-gray-400 mt-1 font-medium">0회 충전</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between">
                            <div>
                                <p className="text-gray-500 font-bold text-[14px] mb-1">총 직원</p>
                                <h2 className="text-3xl font-black text-gray-900">11</h2>
                                <p className="text-[12px] text-gray-400 mt-1 font-medium">활성: 11명</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500">
                                <Users className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    {/* Usage Chart Section */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="p-6 border-b border-gray-50">
                            <h3 className="font-bold text-gray-900">크레딧 사용량</h3>
                        </div>
                        <div className="h-64 flex flex-col items-center justify-center text-gray-400 space-y-4">
                            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-gray-300" />
                            </div>
                            <p className="text-sm font-medium">크레딧 사용 내역이 없습니다</p>
                        </div>
                    </div>

                    {/* Bottom Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Staff Status */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-900">직원별 사용 현황</h3>
                                <button className="text-[12px] font-bold text-blue-500 flex items-center hover:underline">
                                    전체 보기 <ArrowRight className="w-3 h-3 ml-1" />
                                </button>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-bold text-gray-900">권용재 <span className="text-[12px] text-gray-400 font-medium ml-1">부서 미배정</span></p>
                                            <p className="text-[12px] text-gray-500">주요 사용: 없음</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[14px] font-bold text-blue-600">0 크레딧</p>
                                        <p className="text-[11px] text-gray-400">최근 활동: -</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-bold text-gray-900">방효윤 <span className="text-[12px] text-gray-400 font-medium ml-1">부서 미배정</span></p>
                                            <p className="text-[12px] text-gray-500">주요 사용: 없음</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[14px] font-bold text-blue-600">0 크레딧</p>
                                        <p className="text-[11px] text-gray-400">최근 활동: -</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Department Status */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                            <div className="p-6 border-b border-gray-50">
                                <h3 className="font-bold text-gray-900">부서별 사용 현황</h3>
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center space-y-4">
                                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                                    <Building2 className="w-8 h-8 text-gray-200" />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-gray-900">부서 사용 데이터가 없습니다</p>
                                    <p className="text-sm mt-1">선택한 기간에 에이전트를 사용한 부서가 없습니다.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyAdminPanel;
