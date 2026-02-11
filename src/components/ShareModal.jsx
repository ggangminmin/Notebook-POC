import React, { useState, useEffect } from 'react'
import { X, Share2, User, Globe, Lock, MessageSquare, Copy, Link as LinkIcon, ChevronDown, Check, BookOpen, AlertCircle } from 'lucide-react'
import { getNotebookCount } from '../utils/storage'

/**
 * ShareModal - 노트북 공유 설정 모달
 * - 제공된 이미지 디자인 반영
 * - 사용자/그룹 추가, 액세스 권한 설정
 */
const ShareModal = ({ isOpen, onClose, notebook, language = 'ko', onSave, user }) => {
    const [accessLevel, setAccessLevel] = useState('restricted') // 'restricted' or 'public'
    const [viewLevel, setViewLevel] = useState('full') // 'full' or 'limited'
    const [isGreetingEnabled, setIsGreetingEnabled] = useState(false)
    const [isLinkCopied, setIsLinkCopied] = useState(false)
    const [selectedMembers, setSelectedMembers] = useState([])
    const [memberNotebookCounts, setMemberNotebookCounts] = useState({}) // 각 직원의 노트북 개수 추적

    // 현재 유저의 도메인 추출 (예: gptko.co.kr)
    const userDomain = user?.email?.split('@')[1] || 'gptko.co.kr'

    // 동일 도메인 소속 직원 명단 (본인 제외 필터링)
    const companyMembers = [
        { name: '마스터 관리자', email: `admin.master@${userDomain}`, initial: 'M' },
        { name: '회사 직원1', email: `ms.kang@${userDomain}`, initial: 'K1' },
        { name: '회사 직원2', email: `ms.kang2@${userDomain}`, initial: 'K2' }
    ].filter(member => member.email !== user?.email)

    // 초기 설정 반영 & 직원 노트북 개수 조회
    useEffect(() => {
        if (notebook?.sharingSettings) {
            setAccessLevel(notebook.sharingSettings.accessLevel || 'restricted')
            setViewLevel(notebook.sharingSettings.viewLevel || 'full')
            setIsGreetingEnabled(notebook.sharingSettings.isGreetingEnabled || false)
        }

        // 모달이 열릴 때 비동기로 직원들의 노트북 개수 파악
        if (isOpen && companyMembers.length > 0) {
            companyMembers.forEach(async (member) => {
                const count = await getNotebookCount(member.email)
                setMemberNotebookCounts(prev => ({ ...prev, [member.email]: count }))
            })
        }
    }, [isOpen, notebook])

    if (!isOpen || !notebook) return null

    const handleCopyLink = () => {
        const shareUrl = `${window.location.origin}/notebook/${notebook.id}`
        navigator.clipboard.writeText(shareUrl)
        setIsLinkCopied(true)
        setTimeout(() => setIsLinkCopied(false), 2000)
    }

    const toggleMember = (email) => {
        // 이미 50개 이상인 경우 선택 불가
        if (memberNotebookCounts[email] >= 50) return;

        setSelectedMembers(prev =>
            prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
        )
    }

    const selectAllMembers = () => {
        const joinableMembers = companyMembers.filter(m => (memberNotebookCounts[m.email] || 0) < 50)

        if (selectedMembers.length === joinableMembers.length) {
            setSelectedMembers([])
        } else {
            setSelectedMembers(joinableMembers.map(m => m.email))
        }
    }

    const handleSave = () => {
        onSave?.({
            accessLevel,
            viewLevel,
            isGreetingEnabled,
            sharedWith: selectedMembers
        })
        onClose()
    }

    // 소유자 이름 및 이메일 결정 (로그인 유저 정보 기반)
    const ownerName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '사용자'
    const ownerEmail = user?.email || 'user@example.com'
    const ownerInitial = ownerName.substring(0, 1)

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative bg-white w-full max-w-[500px] rounded-[28px] shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 flex items-center justify-between border-b border-slate-50">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <Share2 className="w-5 h-5 text-slate-600 flex-shrink-0" />
                        <h2 className="text-[17px] font-bold text-slate-800 truncate">
                            "{notebook.title}" 공유
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-400"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="px-6 py-4 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* 사용자 추가 입력창 & 자동완성 느낌 */}
                    <div className="space-y-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={language === 'ko' ? "사용자 및 그룹 추가*" : "Add people and groups*"}
                                className="w-full h-14 px-5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-[15px] placeholder:text-slate-400"
                            />
                        </div>

                        {/* 회사 직원 선택 섹션 */}
                        <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                                    {language === 'ko' ? "추천 직원" : "Suggested Colleagues"}
                                </span>
                                <button
                                    onClick={selectAllMembers}
                                    className="text-[12px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    {selectedMembers.length === companyMembers.length
                                        ? (language === 'ko' ? '전체 해제' : 'Deselect All')
                                        : (language === 'ko' ? '전체 선택' : 'Select All')}
                                </button>
                            </div>
                            <div className="space-y-2">
                                {companyMembers.map(member => {
                                    const count = memberNotebookCounts[member.email] || 0;
                                    const isLimitReached = count >= 50;
                                    const isSelected = selectedMembers.includes(member.email);

                                    return (
                                        <div
                                            key={member.email}
                                            onClick={() => !isLimitReached && toggleMember(member.email)}
                                            className={`flex items-center justify-between p-2.5 rounded-xl transition-all border ${isLimitReached ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed' :
                                                isSelected ? 'bg-blue-50 border-blue-100 cursor-pointer' :
                                                    'bg-white border-transparent hover:bg-gray-100 cursor-pointer'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${isLimitReached ? 'bg-slate-200' :
                                                    isSelected ? 'bg-blue-600' :
                                                        'bg-slate-300'
                                                    }`}>
                                                    {member.initial}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-[13px] font-bold text-slate-800">{member.name}</span>
                                                        {isLimitReached && (
                                                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold flex items-center">
                                                                <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                                                                용량 초과 (50/50)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] text-slate-500">{member.email}</span>
                                                </div>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 액세스 권한이 있는 사용자 */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[14px] font-bold text-slate-700">
                                {language === 'ko' ? "액세스 권한이 있는 사용자" : "People with access"}
                            </h3>
                            <div className="flex items-center space-x-2">
                                <span className="text-[12px] text-slate-500">
                                    {language === 'ko' ? "사용자에게 알림" : "Notify people"}
                                </span>
                                <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600" />
                            </div>
                        </div>

                        {/* 소유자 정보 (로그인 유저) */}
                        <div className="flex items-center justify-between p-1">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-[15px] shadow-sm">
                                    {ownerInitial}
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center space-x-1.5">
                                        <span className="text-[14px] font-bold text-slate-800">{ownerName}</span>
                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Me</span>
                                    </div>
                                    <span className="text-[12px] text-slate-500">{ownerEmail}</span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-1 text-[13px] text-slate-400 font-medium">
                                <span>{language === 'ko' ? "소유자" : "Owner"}</span>
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex items-center justify-end bg-white mt-auto">
                    <button
                        onClick={handleSave}
                        className="h-11 px-10 bg-slate-900 text-white rounded-full text-[13px] font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                    >
                        {language === 'ko' ? "공유" : "Share"}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ShareModal
