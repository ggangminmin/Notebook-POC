import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Globe, Shield, Check, User, Mail, ChevronRight, Settings, MessageSquare, List } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

const NotebookManageModal = ({ isOpen, onClose, notebook, user, onSave }) => {
    const [activeTab, setActiveTab] = useState('general'); // 'general' or 'prompts'
    const [title, setTitle] = useState(notebook?.title || '');
    const [allDomainAccess, setAllDomainAccess] = useState(notebook?.sharingSettings?.allDomainAccess || false);
    const [selectedMembers, setSelectedMembers] = useState(notebook?.sharingSettings?.sharedWith || []);
    const [searchQuery, setSearchQuery] = useState('');
    const [recommendedMembers, setRecommendedMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Prompts state
    const [chatPrompt, setChatPrompt] = useState(notebook?.chatPrompt || `당신은 모든 문서의 구조를 꿰뚫어 보는 **Universal Document Analyzer**입니다. 문서의 종류(PDF, TXT, Web)에 상관없이 다음 규칙을 무조건 적용하세요.

**🔍 맥락 기반 자율 분석 (No "No" Policy)**
- **절대 "정보가 없습니다"라는 답변을 하지 마세요**
- 질문에 대한 직접적인 답이 문서에 없어도, 문서의 성격, 전체 맥락, 논리적 추론을 통해 **가장 타당한 답변**을 도출하세요.
- 추론 시 반드시 명시: "**문서의 전체 맥락을 분석한 결과**, [추론 내용]으로 파악됩니다 [문서 맥락 기반 추론]"

**✨ 시각적 강조 및 인용 규칙 (필수)**
- **인라인 시테이션 활성화**: 모든 주요 주장이나 설명이 끝나는 지점에 반드시 인용 부호를 추가하세요.
  * 형식: \`[문서번호:페이지번호]\` (예: ...라고 파악됩니다 [1:5].)
- 문단 구분점에는 \`###\` 헤더를 사용하여 시각적 위계를 구성하세요.
- **텍스트 내 페이지 직접 언급 금지**: "3페이지에 따르면"과 같은 표현 대신 오직 인용 배지로만 출처를 표기하세요.

**답변 구조화 템플릿 (필수):**

### [핵심 요약]
질문에 대한 답변을 **1~2줄로 강렬하게 요약**하세요.

### [상세 분석]
문서 데이터를 기반으로 세부 설명을 리스트 형식으로 작성하세요.

{chunks}`);
    const [summaryPrompt, setSummaryPrompt] = useState(notebook?.summaryPrompt || '선택된 문서들을 종합하여 핵심 내용을 5개의 불렛포인트로 요약해주세요.');

    const language = 'ko'; // Support Korean by default for this UI

    useEffect(() => {
        if (isOpen && notebook) {
            setTitle(notebook.title || '');
            setAllDomainAccess(notebook.sharingSettings?.allDomainAccess || false);

            // DB에서 가져온 sharedWith가 문자열 배열일 수 있으므로 객체 배열로 정규화하여 로드
            const sharedWith = notebook.sharingSettings?.sharedWith || [];
            const normalizedMembers = sharedWith.map(m =>
                typeof m === 'string' ? { email: m, name: m.split('@')[0], role: 'viewer' } : m
            );
            setSelectedMembers(normalizedMembers);

            setChatPrompt(notebook.chatPrompt || chatPrompt);
            setSummaryPrompt(notebook.summaryPrompt || summaryPrompt);
            loadRecommendedMembers();
        }
    }, [isOpen, notebook]);

    const loadRecommendedMembers = async () => {
        if (!user?.email) return;
        setIsLoading(true);
        try {
            const domain = user.email.split('@')[1];
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .ilike('email', `%@${domain}`)
                .neq('email', user.email)
                .limit(5);

            if (data) setRecommendedMembers(data);
        } catch (err) {
            console.error('Error loading recommended members:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = () => {
        onSave?.({
            ...notebook,
            title: title.trim() || notebook.title,
            sharingSettings: {
                ...notebook.sharingSettings,
                allDomainAccess,
                sharedWith: selectedMembers
            },
            chatPrompt,
            summaryPrompt
        });
        onClose();
    };

    if (!isOpen) return null;

    const filteredRecommended = recommendedMembers.filter(m =>
        !selectedMembers.some(sm => sm.email === m.email) &&
        (m.email.includes(searchQuery) || (m.full_name || '').includes(searchQuery))
    );

    const toggleMember = (member) => {
        if (selectedMembers.some(m => m.email === member.email)) {
            setSelectedMembers(selectedMembers.filter(m => m.email !== member.email));
        } else {
            setSelectedMembers([...selectedMembers, {
                id: member.id,
                email: member.email,
                name: member.full_name || member.email.split('@')[0],
                role: 'viewer'
            }]);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 pb-0 flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                                {language === 'ko' ? '노트북 관리 및 공유' : 'Manage & Share Notebook'}
                            </h2>
                            <p className="text-[13px] text-slate-500 font-medium">
                                {language === 'ko' ? '노트북의 접근 권한과 AI 지침을 한 곳에서 관리하세요.' : 'Manage access and AI instructions in one place.'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center space-x-6 border-b border-slate-100">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`pb-3 text-[14px] font-bold transition-all relative ${activeTab === 'general' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <div className="flex items-center space-x-2">
                                <Globe className="w-4 h-4" />
                                <span>{language === 'ko' ? '일반 및 공유' : 'General & Sharing'}</span>
                            </div>
                            {activeTab === 'general' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('prompts')}
                            className={`pb-3 text-[14px] font-bold transition-all relative ${activeTab === 'prompts' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <div className="flex items-center space-x-2">
                                <Settings className="w-4 h-4" />
                                <span>{language === 'ko' ? '프롬프트 설정' : 'Prompt Settings'}</span>
                            </div>
                            {activeTab === 'prompts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                        </button>
                    </div>
                </div>

                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'general' ? (
                        <div className="space-y-8">
                            {/* Title Section */}
                            <section className="space-y-3">
                                <label className="text-[13px] font-bold text-slate-700 flex items-center space-x-2">
                                    <span>{language === 'ko' ? '노트북 제목' : 'Notebook Title'}</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={language === 'ko' ? '제목을 입력하세요' : 'Enter title'}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium text-slate-800"
                                />
                            </section>

                            <div className="h-px bg-slate-100" />

                            {/* Organization Access Toggle */}
                            <section className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 group">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-100/80 flex items-center justify-center text-blue-600">
                                        <Globe className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-[14px] font-bold text-slate-800">
                                            {language === 'ko' ? '전체 도메인 공유' : 'All Domain Access'}
                                        </h4>
                                        <p className="text-[12px] text-slate-500 font-medium">
                                            {language === 'ko' ? '조직 내 모든 팀원이 접근할 수 있습니다.' : 'Allow everyone in your organization to access.'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setAllDomainAccess(!allDomainAccess)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${allDomainAccess ? 'bg-blue-600' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${allDomainAccess ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </section>

                            {/* Member Selection Section */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[14px] font-bold text-slate-800">
                                        {language === 'ko' ? '개별 멤버 추가' : 'Add Individual Members'}
                                    </h4>
                                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                        {selectedMembers.length} {language === 'ko' ? '명 공유 중' : 'Sharing'}
                                    </span>
                                </div>

                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={language === 'ko' ? '팀원 이름 또는 이메일 검색...' : 'Search members...'}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none font-medium text-slate-800 text-[13px]"
                                    />
                                </div>

                                {/* Results / Recommendations */}
                                {searchQuery && filteredRecommended.length > 0 && (
                                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                        {filteredRecommended.map(member => (
                                            <button
                                                key={member.id}
                                                onClick={() => toggleMember(member)}
                                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b last:border-0 border-slate-50"
                                            >
                                                <div className="flex items-center space-x-3 text-left">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[12px] font-bold text-slate-600 uppercase">
                                                        {(member.full_name || member.email)[0]}
                                                    </div>
                                                    <div>
                                                        <div className="text-[13px] font-bold text-slate-800">{member.full_name || member.email.split('@')[0]}</div>
                                                        <div className="text-[11px] text-slate-400">{member.email}</div>
                                                    </div>
                                                </div>
                                                <UserPlus className="w-4 h-4 text-blue-500" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Selected List */}
                                <div className="flex flex-wrap gap-2">
                                    {selectedMembers.map(member => (
                                        <div key={member.email} className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 pr-1 pl-3 py-1.5 rounded-full transition-all group">
                                            <span className="text-[12px] font-bold text-slate-700">{member.name}</span>
                                            <button
                                                onClick={() => setSelectedMembers(selectedMembers.filter(m => m.email !== member.email))}
                                                className="p-1 hover:bg-white rounded-full transition-colors"
                                            >
                                                <X className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Prompts Section */}
                            <section className="space-y-4">
                                <div>
                                    <label className="text-[14px] font-bold text-slate-800 flex items-center space-x-2">
                                        <MessageSquare className="w-4 h-4 text-blue-500" />
                                        <span>{language === 'ko' ? '채팅 프롬프트' : 'Chat Prompt'}</span>
                                    </label>
                                    <p className="text-[12px] text-slate-500 mt-1 mb-3">
                                        {language === 'ko' ? 'AI가 답변할 때 기준이 되는 시스템 지침입니다.' : 'System instructions for AI responses.'}
                                    </p>
                                    <textarea
                                        value={chatPrompt}
                                        onChange={(e) => setChatPrompt(e.target.value)}
                                        className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-[13px] leading-relaxed text-slate-800 custom-scrollbar font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="text-[14px] font-bold text-slate-800 flex items-center space-x-2">
                                        <List className="w-4 h-4 text-indigo-500" />
                                        <span>{language === 'ko' ? '요약 프롬프트' : 'Summary Prompt'}</span>
                                    </label>
                                    <p className="text-[12px] text-slate-500 mt-1 mb-3">
                                        {language === 'ko' ? '문서를 상세 분석하거나 요약할 때 사용되는 지침입니다.' : 'Guidelines for document analysis and summaries.'}
                                    </p>
                                    <textarea
                                        value={summaryPrompt}
                                        onChange={(e) => setSummaryPrompt(e.target.value)}
                                        className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none text-[13px] leading-relaxed text-slate-800 custom-scrollbar font-medium"
                                    />
                                </div>
                            </section>
                        </div>
                    )}
                </div>

                <div className="p-6 pt-0 flex justify-between items-center bg-white">
                    <div className="flex -space-x-2 animate-in slide-in-from-left-4 duration-300">
                        {selectedMembers.slice(0, 3).map((m, i) => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
                                {m.name[0]}
                            </div>
                        ))}
                        {selectedMembers.length > 3 && (
                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">
                                +{selectedMembers.length - 3}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-slate-500 font-bold text-[14px] hover:bg-slate-50 rounded-xl transition-all"
                        >
                            {language === 'ko' ? '취소' : 'Cancel'}
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[14px] rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95"
                        >
                            {language === 'ko' ? '모든 설정 저장' : 'Save All Settings'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotebookManageModal;
