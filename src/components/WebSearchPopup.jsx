import React, { useState, useEffect } from 'react'
import { X, Search, Sparkles, Loader2, ArrowLeft, Globe, BookOpen, ExternalLink, Check, FileText, Settings } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { isMeaninglessQuery } from '../services/aiService'
import { recommendationChain } from '../lib/recommendation'
import { performFastResearch } from '../services/webSearchService'

/**
 * WebSearchPopup - 웹 검색 전 검색 계획 수립 및 추천 질문을 제공하는 프리미엄 팝업
 */
const WebSearchPopup = ({ isOpen, onClose, initialQuery, documentContext, onStartSearch, onAddSources }) => {
    const { t, language } = useLanguage()
    const [searchQuery, setSearchQuery] = useState('')
    const [suggestedQuestions, setSuggestedQuestions] = useState([])
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
    const [isMeaningless, setIsMeaningless] = useState(false)

    // 리서치 상태 관리
    const [step, setStep] = useState('initial') // 'initial', 'loading', 'results'
    const [choiceQuery, setChoiceQuery] = useState('')
    const [results, setResults] = useState([])
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [searchError, setSearchError] = useState('')

    // 프롬프트 설정 관련 상태
    const [showPromptSettings, setShowPromptSettings] = useState(false)
    const [recommendationPrompt, setRecommendationPrompt] = useState(() => {
        return localStorage.getItem('web_search_recommendation_prompt') ||
            (language === 'ko'
                ? '다음 키워드에 대해 사용자가 궁금해할 만한 심화 리서치 주제 4개를 추천해줘. 각 주제는 한 줄로 짧고 명확하게 작성해줘.'
                : 'Suggest 4 in-depth research topics the user might be curious about for the following keyword. Each topic should be short and clear in one line.')
    })

    useEffect(() => {
        if (isOpen) {
            const query = initialQuery || ''
            setSearchQuery(query)
            setStep('initial')
            setResults([])
            setSelectedIds(new Set())
            setSearchError('')

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
        const query = (queryToUse || searchQuery || initialQuery).trim()
        if (!query || isMeaninglessQuery(query)) {
            setIsMeaningless(true)
            return
        }

        setIsMeaningless(false)
        setIsLoadingSuggestions(true)
        try {
            const response = await recommendationChain.invoke({
                keyword: query,
                customInstructions: recommendationPrompt
            })

            const draftList = response
                .split('\n')
                .map(s => s.trim())
                .map(s => s.replace(/^\d+[\.\)]\s*/, '').replace(/^[-*•]\s*/, '').trim())
                .filter(s => s.length > 2)

            let finalSuggestions = draftList.slice(0, 4)

            if (finalSuggestions.length === 0) {
                finalSuggestions = [
                    `${query}의 핵심 개념과 기초 지식`,
                    `${query}의 다양한 활용 사례 조사`,
                    `${query} 관련 전문가 의견 및 논문 요약`,
                    `${query}의 향후 발전 방향과 글로벌 트렌드`
                ]
            } else {
                while (finalSuggestions.length < 4) {
                    finalSuggestions.push(`${query}에 관한 추가 리서치 주제 ${finalSuggestions.length + 1}`)
                }
            }

            setSuggestedQuestions(finalSuggestions)
        } catch (error) {
            console.error('[WebSearchPopup] 추천 생성 오류:', error)
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

    const handleSuggestionClick = (query) => {
        handleStartResearch(query)
    }

    const handleStartResearch = async (queryOverride) => {
        const finalQuery = (queryOverride || searchQuery || initialQuery).trim()
        if (!finalQuery) return

        setChoiceQuery(finalQuery)
        setStep('loading')
        setSearchError('')

        try {
            const data = await performFastResearch(finalQuery, language)

            if (data.warning && (!data.sources || data.sources.length === 0)) {
                setSearchError(data.warning)
                setStep('initial')
                return
            }

            const searchResults = data.sources.map((s, idx) => ({
                id: `search_res_${Date.now()}_${idx}`,
                ...s
            }))

            setResults(searchResults)
            setSelectedIds(new Set(searchResults.map(r => r.id)))
            setStep('results')
        } catch (error) {
            console.error('[WebSearchPopup] 검색 오류:', error)
            setSearchError(language === 'ko' ? '검색 중 오류가 발생했습니다.' : 'Error occurred during search.')
            setStep('initial')
        }
    }

    const executeImport = () => {
        const selectedResults = results.filter(r => selectedIds.has(r.id))
        if (selectedResults.length === 0) return

        onStartSearch(choiceQuery, [], selectedResults)
        onClose()
    }

    const toggleResult = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleAll = () => {
        if (selectedIds.size === results.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(results.map(r => r.id)))
        }
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
            <div className={`relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl border transition-all duration-500 overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-8 flex flex-col max-h-[90vh] ${step === 'initial' ? 'border-blue-100' : 'border-gray-100'
                }`}>

                {step === 'initial' && (
                    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-white p-8 flex flex-col h-full overflow-y-auto custom-scrollbar no-scrollbar">
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
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setShowPromptSettings(true)}
                                    className="p-2 hover:bg-white/60 rounded-full transition-colors text-slate-400 hover:text-blue-600"
                                    title={language === 'ko' ? '추천 엔진 설정' : 'Recommendation Settings'}
                                >
                                    <Settings className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/60 rounded-full transition-colors text-slate-400"
                                >
                                    <X className="w-7 h-7" />
                                </button>
                            </div>
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
                                        <p className="text-base text-slate-600 font-bold tracking-tight">상세 키워드를 입력해 주세요.</p>
                                        <p className="text-[13px] text-slate-400 font-medium mt-1">구체적인 키워드일수록 더 나은 추천 질문이 생성됩니다.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {(isLoadingSuggestions ? [1, 2, 3, 4] : suggestedQuestions).map((item, idx) => (
                                        <button
                                            key={idx}
                                            disabled={isLoadingSuggestions}
                                            onClick={() => !isLoadingSuggestions && item && handleSuggestionClick(item)}
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
                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={() => handleStartResearch()}
                                disabled={!searchQuery.trim()}
                                className="px-10 py-3.5 bg-gray-900 text-white rounded-2xl text-[14px] font-bold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-lg active:scale-95"
                            >
                                {language === 'ko' ? '검색 시작' : 'Start Search'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'loading' && (
                    <div className="p-12 flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500 h-full min-h-[500px]">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                            <div className="relative w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] flex items-center justify-center shadow-2xl shadow-blue-200">
                                <Search className="w-10 h-10 text-white animate-bounce" />
                            </div>
                        </div>
                        <div className="text-center space-y-3">
                            <h3 className="text-2xl font-bold text-gray-900">{language === 'ko' ? '웹 리서치 진행 중' : 'Searching the Web...'}</h3>
                            <div className="flex flex-col items-center space-y-1">
                                <p className="text-[15px] font-medium text-blue-600 italic">"{choiceQuery}"</p>
                                <p className="text-[13px] text-gray-400">{language === 'ko' ? '에이전트가 가장 정확한 최신 소스를 탐색하고 있습니다.' : 'Agent is searching for the most accurate sources.'}</p>
                            </div>
                        </div>
                        <div className="w-64 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 animate-loading" style={{ width: '40%' }} />
                        </div>
                    </div>
                )}

                {step === 'results' && (
                    <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-500">
                        {/* Results Header */}
                        <div className="p-8 pb-4 border-b border-gray-100 bg-gray-50/30">
                            <div className="flex items-center space-x-3 mb-1">
                                <button
                                    onClick={() => setStep('initial')}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Globe className="w-4 h-4 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">{language === 'ko' ? '검색 결과 선택' : 'Select Search Results'}</h3>
                            </div>
                            <p className="text-[14px] text-gray-500 ml-10">
                                {language === 'ko' ? `${results.length}개의 검색 결과 중 추가할 항목을 선택하세요.` : `Select items to add from ${results.length} search results.`}
                            </p>
                        </div>

                        {/* All Select Control */}
                        <div className="px-10 py-4 border-b border-gray-50 flex items-center">
                            <div
                                className="flex items-center space-x-3 cursor-pointer group"
                                onClick={toggleAll}
                            >
                                <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${selectedIds.size === results.length
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'bg-white border-gray-300 group-hover:border-blue-400'
                                    }`}>
                                    {selectedIds.size === results.length && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                                </div>
                                <span className="text-[14px] font-bold text-gray-700">
                                    {language === 'ko' ? `모든 소스 선택 (${selectedIds.size}/${results.length})` : `Select All (${selectedIds.size}/${results.length})`}
                                </span>
                            </div>
                        </div>

                        {/* Results list */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                            {results.map((result) => (
                                <div
                                    key={result.id}
                                    className={`group relative p-5 rounded-2xl border transition-all duration-300 flex items-start space-x-4 ${selectedIds.has(result.id)
                                        ? 'bg-blue-50/50 border-blue-200'
                                        : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
                                        }`}
                                >
                                    <div className="w-10 h-10 bg-white border border-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <BookOpen className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="flex-grow min-w-0 pr-12">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <h4 className="text-[15px] font-bold text-gray-900 truncate tracking-tight">{result.title}</h4>
                                            {result.url && (
                                                <a href={result.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2">
                                            {result.summary || (result.extractedText ? result.extractedText.substring(0, 150) : '')}
                                        </p>
                                    </div>
                                    <div
                                        className="absolute right-5 top-1/2 -translate-y-1/2 cursor-pointer"
                                        onClick={() => toggleResult(result.id)}
                                    >
                                        <div className={`w-7 h-7 rounded-xl border transition-all flex items-center justify-center ${selectedIds.has(result.id)
                                            ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-200'
                                            : 'bg-white border-gray-300 hover:border-blue-400'
                                            }`}>
                                            {selectedIds.has(result.id) && <Check className="w-4 h-4 text-white stroke-[4px]" />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Results Footer */}
                        <div className="p-8 bg-white border-t border-gray-50 flex items-center justify-end space-x-3">
                            <button
                                onClick={() => setStep('initial')}
                                className="px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl text-[14px] font-bold hover:bg-gray-50 transition-all"
                            >
                                {language === 'ko' ? '뒤로' : 'Back'}
                            </button>
                            <button
                                onClick={executeImport}
                                disabled={selectedIds.size === 0}
                                className="px-12 py-3 bg-gray-900 text-white rounded-2xl text-[14px] font-bold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-lg shadow-gray-200 flex items-center space-x-2 active:scale-95"
                            >
                                <span>{language === 'ko' ? `소스 추가하기 (${selectedIds.size})` : `Add Sources (${selectedIds.size})`}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Prompt Settings Modal */}
            {showPromptSettings && (
                <div className="absolute inset-0 z-[210] flex items-center justify-center p-6 bg-black/20 backdrop-blur-[2px]">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-blue-100 p-8 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-xl font-bold text-gray-900 flex items-center">
                                <Settings className="w-6 h-6 mr-3 text-blue-600" />
                                {language === 'ko' ? '추천 프롬프트 설정' : 'Recommendation Prompt'}
                            </h4>
                            <button onClick={() => setShowPromptSettings(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <p className="text-[14px] text-gray-500 mb-6 leading-relaxed">
                            {language === 'ko'
                                ? 'AI가 추천 질문을 생성할 때 참고할 지침을 설정합니다. 입력한 내용에 따라 추천되는 질문의 스타일과 깊이가 달라집니다.'
                                : 'Set instructions for the AI to follow when generating recommendations. This affects the style and depth of suggested questions.'}
                        </p>
                        <textarea
                            value={recommendationPrompt}
                            onChange={(e) => setRecommendationPrompt(e.target.value)}
                            className="w-full h-48 px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-[15px] font-medium mb-8 resize-none shadow-inner"
                            placeholder={language === 'ko' ? '예: 대학생 수준의 전문적인 연구 주제를 추천해줘.' : 'e.g. Suggest professional research topics for university students.'}
                        />
                        <div className="flex justify-end items-center space-x-4">
                            <button
                                onClick={() => {
                                    const defaultPrompt = language === 'ko'
                                        ? '다음 키워드에 대해 사용자가 궁금해할 만한 심화 리서치 주제 4개를 추천해줘. 각 주제는 한 줄로 짧고 명확하게 작성해줘.'
                                        : 'Suggest 4 in-depth research topics the user might be curious about for the following keyword. Each topic should be short and clear in one line.'
                                    setRecommendationPrompt(defaultPrompt)
                                }}
                                className="px-5 py-2.5 text-[14px] font-bold text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {language === 'ko' ? '기본값으로 초기화' : 'Reset to Default'}
                            </button>
                            <button
                                onClick={() => {
                                    localStorage.setItem('web_search_recommendation_prompt', recommendationPrompt)
                                    setShowPromptSettings(false)
                                    // 현재 입력된 키워드가 있다면 즉시 새로운 프롬프트로 재생성
                                    if (searchQuery.trim()) {
                                        loadSuggestions(searchQuery)
                                    }
                                }}
                                className="px-10 py-3 bg-blue-600 text-white rounded-2xl text-[14px] font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
                            >
                                {language === 'ko' ? '저장 및 적용' : 'Save & Apply'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default WebSearchPopup
