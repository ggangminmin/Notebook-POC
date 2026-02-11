import React, { useState } from 'react'
import {
    Search, LayoutGrid, Megaphone, PenTool, Briefcase, Plus, Heart, User,
    Folder, Star, Target, BarChart, Lightbulb, Pin, Gem, Save, Send, X,
    FileText, Clipboard, Mail, Newspaper, BookOpen, MessageSquare, Sparkles,
    HelpCircle, Code2, Tags, Share2, UserCheck, Camera, Layout, Edit3, FileSearch, Play
} from 'lucide-react'

const AGENT_DATA = [
    {
        category: '일반사무',
        color: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', hover: 'hover:border-blue-400', btnHover: 'hover:bg-blue-50', heartHover: 'hover:text-blue-500' },
        agents: [
            { id: 1, title: '회의록 작성', category: '일반사무', description: '회의 메모로부터 회의록 정보를 생성합니다.', cost: '30C', icon: FileText },
            { id: 2, title: '보고서 작성', category: '일반사무', description: '회의 메모로부터 보고서 정보를 생성합니다.', cost: '30C', icon: Clipboard },
            { id: 3, title: '이메일 작성', category: '일반사무', description: '회의 메모로부터 이메일 정보를 생성합니다.', cost: '30C', icon: Mail },
            { id: 4, title: '뉴스크사 요약', category: '일반사무', description: '회의 메모로부터 키워드 정보를 생성합니다.', cost: '20C', icon: Newspaper },
            { id: 5, title: '문서 요약', category: '일반사무', description: '회의 메모로부터 키워드 정보를 생성합니다.', cost: '20C', icon: BookOpen },
            { id: 6, title: '사업계획서 작성', category: '일반사무', description: '회의 메모로부터 키워드 정보를 생성합니다.', cost: '30C', icon: BarChart },
            { id: 7, title: '계약서 작성', category: '일반사무', description: '회의 메모로부터 키워드 정보를 생성합니다.', cost: '30C', icon: PenTool },
            { id: 8, title: '문의 내용 정리', category: '일반사무', description: '회의 메모로부터 키워드 정보를 생성합니다.', cost: '30C', icon: MessageSquare },
            { id: 9, title: '프롬프트 생성', category: '일반사무', description: '회의 메모로부터 키워드 정보를 생성합니다.', cost: '30C', icon: Sparkles },
            { id: 10, title: '문서 기반 Q&A', category: '일반사무', description: '회의 메모로부터 키워드 정보를 생성합니다.', cost: '20C', icon: HelpCircle },
            { id: 11, title: 'VBA 코드 생성', category: '일반사무', description: '회의 메모로부터 키워드 정보를 생성합니다.', cost: '20C', icon: Code2 },
            { id: 26, title: '이미지 텍스트 변환', category: '일반사무', description: '이미지 파일 내 텍스트를 인식하여 편집 가능한 텍스트로 전환합니다.', cost: '30C', icon: FileSearch },
        ]
    },
    {
        category: '마케팅/광고',
        color: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', hover: 'hover:border-amber-400', btnHover: 'hover:bg-amber-50', heartHover: 'hover:text-amber-500' },
        agents: [
            { id: 12, title: '키워드 분석', category: '마케팅/광고', description: '회의 메모로부터 키워드 정보를 생성합니다.', cost: '30C', icon: Tags },
            { id: 13, title: 'SNS 이벤트 기획', category: '마케팅/광고', description: '회의 메모로부터 키워드 정보를 생성합니다.', cost: '30C', icon: Share2 },
            { id: 14, title: '고객 리뷰 분석', category: '마케팅/광고', description: '회의 메모로부터 키워드 정보를 생성합니다.', cost: '30C', icon: UserCheck },
            { id: 15, title: '인스타그램 스토리보드', category: '마케팅/광고', description: '회의 메모로부터 키워드 정보를 생성합니다.', cost: '30C', icon: Camera },
            { id: 16, title: '카드뉴스 기획', category: '마케팅/광고', description: '회의 메모로부터 키워드 정보를 생성합니다.', cost: '30C', icon: Layout },
            { id: 27, title: '뉴스기사 크롤링', category: '마케팅/광고', description: '원하는 주제의 최신 뉴스 기사를 실시간으로 수집하여 요약 리포트를 제공합니다.', cost: '30C', icon: Search },
        ]
    },
    {
        category: '콘텐츠 제작',
        color: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', hover: 'hover:border-emerald-400', btnHover: 'hover:bg-emerald-50', heartHover: 'hover:text-emerald-500' },
        agents: [
            { id: 17, title: '블로그 콘텐츠 작성', category: '콘텐츠 제작', description: '회의 메모로부터 가이드 정보를 생성합니다.', cost: '30C', icon: Edit3 },
        ]
    },
    {
        category: '경영지원',
        color: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', hover: 'hover:border-rose-400', btnHover: 'hover:bg-rose-50', heartHover: 'hover:text-rose-500' },
        agents: [
            { id: 18, title: '면접 질문지 생성', category: '경영지원', description: '학부/직무별 면접 질문을 생성합니다.', cost: '30C', icon: Briefcase },
        ]
    }
]

const Agents = ({ onExecute }) => {
    const [activeCategory, setActiveCategory] = useState('전체')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [newFolder, setNewFolder] = useState({
        name: '',
        icon: 'Folder',
        color: 'blue'
    })
    const [favorites, setFavorites] = useState([])

    const ICONS = [
        { name: 'Folder', icon: Folder, color: 'blue' },
        { name: 'Star', icon: Star, color: 'yellow' },
        { name: 'Briefcase', icon: Briefcase, color: 'brown' },
        { name: 'Target', icon: Target, color: 'red' },
        { name: 'BarChart', icon: BarChart, color: 'indigo' },
        { name: 'Lightbulb', icon: Lightbulb, color: 'amber' },
        { name: 'Pin', icon: Pin, color: 'emerald' },
        { name: 'Gem', icon: Gem, color: 'purple' },
        { name: 'Save', icon: Save, color: 'cyan' },
        { name: 'Send', icon: Send, color: 'blue' },
    ]

    const COLORS = [
        { name: 'Blue', id: 'blue', text: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', dot: 'bg-blue-500' },
        { name: 'Green', id: 'green', text: 'text-green-500', bg: 'bg-green-50', border: 'border-green-100', dot: 'bg-green-500' },
        { name: 'Teal', id: 'emerald', text: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', dot: 'bg-emerald-500' },
        { name: 'Orange', id: 'orange', text: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100', dot: 'bg-orange-500' },
        { name: 'Pink', id: 'pink', text: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-100', dot: 'bg-pink-500' },
        { name: 'Red', id: 'red', text: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', dot: 'bg-red-500' },
        { name: 'Indigo', id: 'indigo', text: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100', dot: 'bg-indigo-500' },
        { name: 'Cyan', id: 'cyan', text: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-100', dot: 'bg-cyan-500' },
    ]

    const handleCreateFolder = () => {
        if (!newFolder.name.trim()) return
        const folderToAdd = {
            id: Date.now(),
            ...newFolder
        }
        setFavorites([...favorites, folderToAdd])
        setIsModalOpen(false)
        setNewFolder({ name: '', icon: 'Folder', color: 'blue' })
    }

    const getIconComponent = (name) => {
        const found = ICONS.find(i => i.name === name)
        return found ? found.icon : Folder
    }

    const getFolderColor = (colorId) => {
        return COLORS.find(c => c.id === colorId) || COLORS[0]
    }

    return (
        <div className="flex-1 overflow-y-auto bg-white">
            <div className="flex flex-col min-h-full">
                <div className="flex flex-1">
                    {/* Sidebar - Clean Style */}
                    <aside className="w-64 border-r border-gray-100 bg-slate-50/50 flex flex-col p-4 shrink-0">
                        <div className="flex items-center space-x-2 px-2 mb-8">
                            <div className="w-8 h-8 bg-white shadow-sm rounded-lg flex items-center justify-center border border-gray-100">
                                <LayoutGrid className="w-5 h-5 text-gray-700" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">에이전트</h3>
                                <p className="text-[10px] text-gray-500">AI 도구 모음</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-gray-400 px-3 py-2 uppercase tracking-wider">Agent List</p>
                            {[
                                { name: '전체', icon: LayoutGrid, count: 20 },
                                { name: '일반사무', icon: User, count: 12 },
                                { name: '마케팅/광고', icon: Megaphone, count: 6 },
                                { name: '콘텐츠 제작', icon: PenTool, count: 1 },
                                { name: '경영지원', icon: Briefcase, count: 1 },
                            ].map((item) => (
                                <button
                                    key={item.name}
                                    onClick={() => setActiveCategory(item.name)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${activeCategory === item.name
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-gray-600 hover:bg-white hover:shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <item.icon className={`w-4 h-4 ${activeCategory === item.name ? 'text-white' : 'text-gray-400'}`} />
                                        <span className="text-sm font-medium">{item.name}</span>
                                    </div>
                                    <span className={`text-[11px] font-semibold ${activeCategory === item.name ? 'text-white/80' : 'text-gray-400'}`}>{item.count}개</span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between px-3 mb-4">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">즐겨찾기</p>
                                <Plus
                                    className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-gray-600"
                                    onClick={() => setIsModalOpen(true)}
                                />
                            </div>

                            {favorites.length > 0 ? (
                                <div className="space-y-1">
                                    {favorites.map((folder) => {
                                        const folderColor = getFolderColor(folder.color)
                                        const FolderIcon = getIconComponent(folder.icon)
                                        return (
                                            <button
                                                key={folder.id}
                                                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg hover:bg-gray-100/50 transition-all group text-left"
                                            >
                                                <div className={`w-7 h-7 rounded-lg ${folderColor.bg} flex items-center justify-center`}>
                                                    <FolderIcon className={`w-3.5 h-3.5 ${folderColor.text}`} />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 truncate">
                                                    {folder.name}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-[11px] text-gray-400 px-3 text-center py-4">
                                    아직 즐겨찾기 폴더가 없습니다.<br />
                                    <span className="text-blue-500 cursor-pointer" onClick={() => setIsModalOpen(true)}>첫 번째 폴더 만들기</span>
                                </p>
                            )}
                        </div>
                    </aside>

                    {/* Main Content Area - White Background */}
                    <main className="flex-1 px-8 py-6 bg-white relative min-h-[1000px]">
                        <div className="relative z-10">
                            {/* Search - Clean Style */}
                            <div className="max-w-2xl mx-auto mb-8 relative">
                                <input
                                    type="text"
                                    placeholder="어떤 업무를 도와드릴까요?"
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-[14px] focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm"
                                />
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            </div>

                            {/* Standard Banner */}
                            <div className="w-full h-44 rounded-[2rem] bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 mb-10 flex flex-col items-center justify-center text-white relative overflow-hidden shadow-lg shadow-blue-100">
                                {/* Abstract Glow Shapes */}
                                <div className="absolute top-[-50%] left-[-10%] w-[40%] h-[200%] bg-white/10 blur-[80px] rotate-12"></div>
                                <div className="absolute bottom-[-50%] right-[-10%] w-[30%] h-[150%] bg-cyan-200/20 blur-[60px] -rotate-12"></div>

                                <div className="z-10 text-center">
                                    <h2 className="text-2xl font-bold mb-2">우리 부서 전용 <span className="text-yellow-200">AI 에이전트</span></h2>
                                    <p className="text-lg opacity-90 font-medium">반복되는 업무는 맡기고, 당신은 핵심에 집중하세요.</p>
                                </div>

                                <div className="absolute right-12 top-1/2 -translate-y-1/2 w-24 h-24 bg-white/20 rounded-3xl rotate-45 flex items-center justify-center backdrop-blur-sm border border-white/20">
                                    <div className="w-14 h-14 bg-white/30 rounded-2xl flex items-center justify-center">
                                        <div className="w-6 h-6 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)]"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Agent Sections */}
                            {AGENT_DATA.filter(section => activeCategory === '전체' || section.category === activeCategory).map((section) => (
                                <div key={section.category} className="mb-12">
                                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                                        {section.category}
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {section.agents.map((agent) => (
                                            <div
                                                key={agent.id}
                                                className={`group bg-white rounded-2xl border border-gray-100 p-5 relative hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 ${section.color.hover} transition-all duration-300 shadow-sm cursor-pointer`}
                                            >
                                                <button className={`absolute top-4 right-4 text-gray-300 ${section.color.heartHover} transition-colors`}>
                                                    <Heart className="w-4 h-4" />
                                                </button>

                                                <div className="flex items-start space-x-4 mb-4">
                                                    <div className={`w-12 h-12 rounded-xl ${section.color.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm border border-transparent`}>
                                                        <agent.icon className={`w-6 h-6 ${section.color.text}`} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{agent.title}</h4>
                                                        <p className={`text-[10px] ${section.color.text} font-bold mt-0.5`}>{agent.category}</p>
                                                    </div>
                                                </div>

                                                <p className="text-[12.5px] text-gray-500 leading-relaxed mb-6 line-clamp-2">
                                                    {agent.description}
                                                </p>

                                                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                                    <div className="flex items-center space-x-1.5">
                                                        <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-sm">C</div>
                                                        <span className="text-[12px] font-bold text-gray-700">{agent.cost}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => onExecute && onExecute(agent)}
                                                        className={`text-[13px] font-bold ${section.color.text} px-3 py-1.5 rounded-lg hover:${section.color.bg} transition-all duration-300`}
                                                    >
                                                        실행
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </main>
                </div>

                {/* Footer Area */}
                <footer className="pt-12 pb-10 border-t border-gray-100 bg-[#1A1F2C] text-gray-300 px-12 mt-auto">
                    <div className="grid grid-cols-3 gap-12 max-w-6xl mx-auto">
                        <div>
                            <h4 className="text-white font-bold mb-5 text-base">AI 에이전트 허브</h4>
                            <p className="text-[14px] leading-relaxed text-gray-400">
                                (주)지피티코리아<br />
                                대표이사 임성기
                            </p>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-5 text-base">연락처</h4>
                            <p className="text-[14px] leading-relaxed text-gray-400">
                                📞 02-858-2023<br />
                                📧 team@gptko.co.kr
                            </p>
                        </div>
                        <div>
                            <h4 className="text-white font-bold mb-5 text-base">주소</h4>
                            <p className="text-[14px] leading-relaxed text-gray-400">
                                서울 금천구 가산디지털1로 128, 1804호<br />
                                (우: 08507)
                            </p>
                        </div>
                    </div>
                    <div className="mt-8 text-center text-gray-500 text-[10px] border-t border-gray-800/50 pt-6">
                        Copyright © 2025 GPTKOREA Corp. All rights reserved.
                    </div>
                </footer>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="px-6 py-5 flex items-center justify-between border-b border-gray-50">
                                <h3 className="text-lg font-bold text-gray-900">새 폴더 만들기</h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <div className="p-6 space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[13px] font-bold text-gray-700 flex items-center">
                                        폴더명 <span className="text-cyan-500 ml-1">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="폴더명을 입력하세요"
                                        value={newFolder.name}
                                        onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[13px] font-bold text-gray-700">아이콘 <span className="text-cyan-500 ml-1">*</span></label>
                                    <div className="grid grid-cols-5 gap-3">
                                        {ICONS.map((item) => (
                                            <button
                                                key={item.name}
                                                onClick={() => setNewFolder({ ...newFolder, icon: item.name })}
                                                className={`w-full aspect-square flex items-center justify-center rounded-xl border transition-all ${newFolder.icon === item.name ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:bg-gray-50'}`}
                                            >
                                                <item.icon className={`w-5 h-5 ${newFolder.icon === item.name ? 'text-blue-500' : 'text-gray-400'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[13px] font-bold text-gray-700">색상 <span className="text-cyan-500 ml-1">*</span></label>
                                    <div className="grid grid-cols-4 gap-4">
                                        {COLORS.map((color) => (
                                            <button key={color.id} onClick={() => setNewFolder({ ...color, color: color.id })} className="flex items-center justify-center">
                                                <div className={`w-8 h-8 rounded-full ${color.dot} ${newFolder.color === color.id ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : ''}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 pt-2 flex space-x-3">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 text-sm font-bold text-gray-500 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">취소</button>
                                <button onClick={handleCreateFolder} disabled={!newFolder.name.trim()} className="flex-1 py-3.5 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-black shadow-lg disabled:opacity-50">생성</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Agents
