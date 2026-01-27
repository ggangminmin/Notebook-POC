import React, { useState, useEffect } from 'react'
import { X, Search, Sparkles, Loader2 } from 'lucide-react'
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
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
                onClick={onClose}
            />

            <div className="relative bg-[#ffffff] w-full max-w-4xl rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[92vh] border border-white/20">

                {/* Header */}
                <div className="px-10 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center space-x-4">
                        <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-100 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">
                            {language === 'ko' ? 'AI 웹 검색' : 'AI Web Search'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-400 hover:text-gray-900"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">

                    {/* Search Term Input Area */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2 px-1">
                            <div className="w-1 h-3.5 bg-blue-600 rounded-full" />
                            <span className="text-[11px] font-black text-gray-500 tracking-wider">
                                {language === 'ko' ? '검색 키워드 입력' : 'SEARCH KEYWORD'}
                            </span>
                        </div>
                        <div className="relative group flex items-center">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={language === 'ko' ? '리서치하고 싶은 주제나 궁금한 내용을 구체적으로 입력해보세요' : 'Enter a specific topic or question you want to research'}
                                className="w-full pl-6 pr-14 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50/30 transition-all outline-none font-bold text-gray-900 text-[15px] placeholder:text-gray-400"
                            />
                            <button
                                onClick={() => loadSuggestions(searchQuery)}
                                className="absolute right-4 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                                <Search className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* AI Suggestions List */}
                    <div className="space-y-5 pb-6">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center space-x-2">
                                <div className="w-1 h-3.5 bg-blue-600 rounded-full" />
                                <span className="text-[11px] font-black text-gray-500 tracking-wider">
                                    {language === 'ko' ? 'AI 추천 질문' : 'AI SUGGESTED QUESTIONS'}
                                </span>
                            </div>
                            {isLoadingSuggestions && (
                                <div className="flex items-center space-x-2">
                                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                    <span className="text-[10px] text-blue-600 font-black">AI 분석 중</span>
                                </div>
                            )}
                        </div>

                        {isMeaningless ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-gray-50/30 rounded-[32px] border border-dashed border-gray-200">
                                <Search className="w-8 h-8 text-gray-200" />
                                <div className="text-center">
                                    <p className="text-sm text-gray-600 font-bold tracking-tight">상세 키워드를 입력해 주세요</p>
                                    <p className="text-[11px] text-gray-400 font-medium mt-1">입력하신 내용이 구체적일수록 정확한 추천 질문이 생성됩니다.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-3.5">
                                {(isLoadingSuggestions ? [1, 2, 3, 4] : suggestedQuestions).map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => !isLoadingSuggestions && item && handleStartSearch(item)}
                                        className={`flex items-stretch space-x-4 transition-all duration-300 ${isLoadingSuggestions ? 'pointer-events-none' : 'cursor-pointer'}`}
                                    >
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center font-black text-[14px] transition-all
                                            ${isLoadingSuggestions
                                                ? 'bg-gray-100 border-gray-100 text-gray-300 animate-pulse'
                                                : 'bg-white border-gray-100 text-blue-600 shadow-sm'
                                            }`}
                                        >
                                            {idx + 1}
                                        </div>

                                        <div className="flex-1 relative flex items-stretch">
                                            <div className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-[-45deg] z-0 transition-all
                                                ${isLoadingSuggestions
                                                    ? 'bg-gray-50'
                                                    : 'bg-blue-50/50 border-l border-t border-blue-50'
                                                }`}
                                            />
                                            <div className={`relative z-10 w-full px-6 py-4 rounded-xl rounded-tl-sm transition-all flex items-center min-h-[56px] border
                                                ${isLoadingSuggestions
                                                    ? 'bg-gray-50 border-gray-100 animate-pulse'
                                                    : 'bg-blue-50/20 border-blue-50/50 hover:bg-blue-600 hover:border-blue-600 hover:shadow-lg hover:shadow-blue-100 text-gray-700'
                                                } group`}
                                            >
                                                {isLoadingSuggestions ? (
                                                    <div className="w-full bg-gray-200/50 h-3 rounded-full animate-pulse" />
                                                ) : (
                                                    <p className="font-bold text-[14px] transition-colors whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-white">
                                                        {item}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-6 bg-gradient-to-t from-gray-50/30 to-transparent flex-shrink-0" />
            </div>
        </div>
    )
}

export default WebSearchPopup
