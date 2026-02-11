import React, { useState, useEffect } from 'react'
import { X, Settings, MessageSquare, List } from 'lucide-react'

/**
 * NotebookSettingsModal - 노트북 전용 설정 모달
 * - 채팅 및 요약 프롬프트 관리
 */
const NotebookSettingsModal = ({ isOpen, onClose, language = 'ko', onSave, initialChatPrompt = '' }) => {
    const [activeTab, setActiveTab] = useState('chat') // 'chat' or 'summary'
    const [chatPrompt, setChatPrompt] = useState(initialChatPrompt || `당신은 모든 문서의 구조를 꿰뚫어 보는 **Universal Document Analyzer**입니다. 문서의 종류(PDF, TXT, Web)에 상관없이 다음 규칙을 무조건 적용하세요.

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

{chunks}`)
    const [summaryPrompt, setSummaryPrompt] = useState(language === 'ko'
        ? '선택된 문서들을 종합하여 핵심 내용을 5개의 불렛포인트로 요약해주세요.'
        : 'Summarize the selected documents into 5 key bullet points.')

    // 마지막 수정 시간 (현재 시간으로 초기화, 실제로는 저장된 값을 사용하거나 저장 시 업데이트)
    const [lastModified, setLastModified] = useState(() => {
        const now = new Date()
        return `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${now.getHours() >= 12 ? '오후' : '오전'} ${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    })

    if (!isOpen) return null

    const handleSave = () => {
        onSave?.({
            chatPrompt,
            summaryPrompt
        })
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="p-6 pb-0 flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-bold text-slate-800">
                                {language === 'ko' ? '노트북 설정' : 'Notebook Settings'}
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                {language === 'ko' ? '노트북의 채팅 및 요약 프롬프트를 관리합니다.' : 'Manage chat and summary prompts for the notebook.'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-400"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center space-x-8 border-b border-gray-100">
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`pb-3 text-[15px] font-bold transition-all relative ${activeTab === 'chat' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {language === 'ko' ? '채팅 프롬프트' : 'Chat Prompt'}
                            {activeTab === 'chat' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('summary')}
                            className={`pb-3 text-[15px] font-bold transition-all relative ${activeTab === 'summary' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {language === 'ko' ? '요약 프롬프트' : 'Summary Prompt'}
                            {activeTab === 'summary' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {activeTab === 'chat' ? (
                        <div className="space-y-4">
                            <div className="text-[13px] text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
                                {language === 'ko'
                                    ? <>사용자 질문에 답변할 때 사용되는 시스템 프롬프트입니다. AI 지침이 없을 때 사용됩니다.<br /><code className="text-blue-600 font-bold bg-blue-50 px-1 rounded">{"{chunks}"}</code> 는 실제 문서 청크로 자동 치환됩니다.</>
                                    : <>System prompt used when answering user questions. Used when AI guidelines are not set.<br /><code className="text-blue-600 font-bold bg-blue-50 px-1 rounded">{"{chunks}"}</code> is automatically replaced with actual document chunks.</>
                                }
                            </div>
                            <textarea
                                value={chatPrompt}
                                onChange={(e) => setChatPrompt(e.target.value)}
                                className="w-full h-96 p-5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-[14px] leading-relaxed text-slate-800 custom-scrollbar font-medium"
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-[13px] text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
                                {language === 'ko'
                                    ? '문서를 처음 분석하거나 요약할 때 사용되는 지침입니다.'
                                    : 'Guidelines used when initially analyzing or summarizing documents.'}
                            </div>
                            <textarea
                                value={summaryPrompt}
                                onChange={(e) => setSummaryPrompt(e.target.value)}
                                className="w-full h-96 p-5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-[14px] leading-relaxed text-slate-800 custom-scrollbar font-medium"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 border-t border-gray-50 flex items-center justify-between mt-auto">
                    <span className="text-[11px] text-slate-400">
                        {language === 'ko' ? '마지막 수정: ' : 'Last modified: '}{lastModified}
                    </span>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-white border border-gray-200 text-slate-600 rounded-xl text-[14px] font-bold hover:bg-gray-50 transition-all"
                        >
                            {language === 'ko' ? '취소' : 'Cancel'}
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-10 py-2.5 bg-blue-600 text-white rounded-xl text-[14px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                        >
                            {language === 'ko' ? '저장' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default NotebookSettingsModal
