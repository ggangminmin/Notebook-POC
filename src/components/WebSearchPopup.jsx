import React, { useState, useEffect } from 'react'
import { X, Search, Sparkles, Loader2, ArrowLeft } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { isMeaninglessQuery } from '../services/aiService'
import { recommendationChain } from '../lib/recommendation'

/**
 * WebSearchPopup - 웹 검색 전 검색 계획 수립 및 추천 질문을 제공하는 프리미엄 팝업
 */
const WebSearchPopup = ({ isOpen, onClose, initialQuery, documentContext, onStartSearch }) => {
    const { t, language } = useLanguage()
    const [searchQuery, setSearchQuery] = useState('')
    const [suggestedQuestions, setSuggestedQuestions] = useState([])
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
    const [isMeaningless, setIsMeaningless] = useState(false)

    useEffect(() => {
        if (isOpen) {
            const query = initialQuery || ''
            setSearchQuery(query)

            if (isMeaninglessQuery(query)) {
                setIsMeaningless(true)
                setSuggestedQuestions([])
            } else {
                setIsMeaningless(false)
                loadSuggestions(query)
            }
        }
    }, [isOpen, initialQuery])

    const loadSuggestions = async (queryToUse) => {
        const query = queryToUse || searchQuery || initialQuery
        if (!query || isMeaninglessQuery(query)) {
            setIsMeaningless(true)
            return
        }

        setIsMeaningless(false)
        setIsLoadingSuggestions(true)
        try {
            // LangChain Chain 실행
            const response = await recommendationChain.invoke({ keyword: query })

            // 응답 파싱 (줄바꿈 등으로 분리 및 정제)
            const draftList = response
                .split('\n')
                .map(s => s.trim())
                .map(s => s.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*•]\s*/, '').trim())
                .filter(s => s.length > 2)

            // 결과가 부족할 경우를 대비한 기본 포맷 보장
            let finalSuggestions = draftList.slice(0, 4)

            // 4개가 안 되면 기본 키워드 조합으로라도 채우기
            if (finalSuggestions.length === 0) {
                finalSuggestions = [
                    `${query}의 최신 시장 트렌드 분석`,
                    `${query} 관련 주요 기술적 도전 과제`,
                    `${query}의 산업별 실제 적용 사례`,
                    `${query} 분야의 향후 전망 및 시사점`
                ]
            } else {
                while (finalSuggestions.length < 4) {
                    finalSuggestions.push(`${query}에 관한 추가 리서치 주제 ${finalSuggestions.length + 1}`)
                }
            }

            setSuggestedQuestions(finalSuggestions)
        } catch (error) {
            console.error('[WebSearchPopup] 추천 생성 오류:', error)
            // 통신 장애 시 정적인 추천 표시
            setSuggestedQuestions([
                `${query}의 핵심 개념과 기초 지식`,
                `${query}의 다양한 활용 사례 조사`,
                `${query} 관련 전문가 의견 및 논문 요약`,
                `${query}의 향후 발전 방향과 글로벌 트렌드`
            ])
        } finally {
            setIsLoadingSuggestions(false)
        }
    }

    const handleStartSearch = (queryOverride) => {
        const finalQuery = queryOverride || searchQuery || initialQuery
        onStartSearch(finalQuery, [])
        onClose()
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            loadSuggestions(searchQuery)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-blue-100 overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-white p-8 flex flex-col h-full overflow-y-auto custom-scrollbar">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-8 flex-shrink-0">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                                    {language === 'ko' ? 'AI 웹 검색' : 'AI Web Search'}
                                </h3>
                                <p className="text-[13px] text-blue-600 font-medium">
                                    {language === 'ko' ? 'AI가 추천하는 질문으로 깊이 있는 리서치를 시작해보세요.' : 'Start in-depth research with AI-recommended questions.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/60 rounded-full transition-colors text-slate-400"
                        >
                            <X className="w-7 h-7" />
                        </button>
                    </div>

                    {/* Search Input Area */}
                    <div className="mb-10 flex-shrink-0">
                        <p className="text-sm text-slate-500 mb-4 font-bold">
                            {language === 'ko' ? '검색 키워드 입력' : 'Search Keyword'}
                        </p>
                        <div className="relative group flex items-center">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={language === 'ko' ? '리서치하고 싶은 주제를 입력해보세요' : 'Enter a topic to research'}
                                className="w-full pl-6 pr-14 py-4 bg-white border-2 border-blue-50 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-gray-800 text-[15px] shadow-sm placeholder:text-gray-300"
                            />
                            <button
                                onClick={() => loadSuggestions(searchQuery)}
                                className="absolute right-4 p-2 text-blue-400 hover:text-blue-600 transition-colors"
                            >
                                <Search className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* AI Suggestions List */}
                    <div className="flex-grow min-h-0 flex flex-col">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <p className="text-sm text-slate-500 font-bold">
                                {language === 'ko' ? 'AI 추천 질문' : 'AI Suggested Questions'}
                            </p>
                            {isLoadingSuggestions && (
                                <div className="flex items-center space-x-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    <span className="text-[11px] text-blue-600 font-bold">AI 분석 중...</span>
                                </div>
                            )}
                        </div>

                        {isMeaningless ? (
                            <div className="flex-grow flex flex-col items-center justify-center py-12 space-y-4 bg-white/50 rounded-[32px] border border-dashed border-blue-100">
                                <Search className="w-10 h-10 text-blue-100" />
                                <div className="text-center">
                                    <p className="text-base text-slate-600 font-bold tracking-tight">상세 키워드를 입력해 주세요</p>
                                    <p className="text-[13px] text-slate-400 font-medium mt-1">구체적인 키워드일수록 더 나은 추천 질문이 생성됩니다.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {(isLoadingSuggestions ? [1, 2, 3, 4] : suggestedQuestions).map((item, idx) => (
                                    <button
                                        key={idx}
                                        disabled={isLoadingSuggestions}
                                        onClick={() => !isLoadingSuggestions && item && handleStartSearch(item)}
                                        className={`w-full group relative flex items-center p-5 rounded-2xl border transition-all duration-300 text-left ${isLoadingSuggestions
                                            ? 'bg-white/50 border-blue-50 animate-pulse'
                                            : 'bg-white border-blue-50 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mr-5 transition-colors ${isLoadingSuggestions
                                            ? 'bg-gray-100'
                                            : 'bg-blue-50 group-hover:bg-blue-600'
                                            }`}>
                                            <span className={`text-[14px] font-bold transition-colors ${isLoadingSuggestions ? 'text-gray-300' : 'text-blue-600 group-hover:text-white'
                                                }`}>
                                                {idx + 1}
                                            </span>
                                        </div>

                                        <div className="flex-grow min-w-0">
                                            {isLoadingSuggestions ? (
                                                <div className="h-4 bg-gray-100 rounded-full w-3/4" />
                                            ) : (
                                                <p className="text-[15px] font-bold text-slate-700 leading-relaxed truncate group-hover:text-slate-900">
                                                    {item}
                                                </p>
                                            )}
                                        </div>

                                        {!isLoadingSuggestions && (
                                            <div className="ml-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <ArrowLeft className="w-5 h-5 text-blue-500 rotate-180" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bottom Padding */}
                    <div className="h-4 flex-shrink-0" />
                </div>
            </div>
        </div>
    )
}

export default WebSearchPopup
