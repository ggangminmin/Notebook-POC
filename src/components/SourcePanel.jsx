import { useState, useRef, useEffect } from 'react'
import { Plus, FileText, Upload, X, Globe, Search, Sparkles, Loader2, BookOpen, ExternalLink, ChevronDown, ChevronRight, FileSpreadsheet, File, PanelLeft } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { parseFileContent, fetchWebMetadata, virtualizeText } from '../utils/fileParser'
import { performFastResearch, performDeepResearch } from '../services/webSearchService'
import Tooltip from './Tooltip'
import WebSearchPopup from './WebSearchPopup'

const SourcePanel = ({ sources, onAddSources, selectedSourceIds, onToggleSource, onDeleteSource, isAddModalOpen = false, onAddModalChange, isCollapsed, onToggleCollapse }) => {
  const [showAddModal, setShowAddModal] = useState(false)

  // 외부에서 모달 열림 상태 제어
  useEffect(() => {
    if (isAddModalOpen && !showAddModal) {
      setShowAddModal(true)
    }
  }, [isAddModalOpen])

  // 모달 상태 변경 시 부모에게 알림
  const handleModalChange = (isOpen) => {
    setShowAddModal(isOpen)
    if (onAddModalChange) {
      onAddModalChange(isOpen)
    }
  }
  const [activeTab, setActiveTab] = useState('file') // 'file' or 'url'
  const [urlInput, setUrlInput] = useState('')
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [researchType, setResearchType] = useState('fast')
  const [isSearching, setIsSearching] = useState(false)
  const [searchProgress, setSearchProgress] = useState({ percent: 0, message: '' })
  const [isSearchPopupOpen, setIsSearchPopupOpen] = useState(false)
  const [expandedSourceIds, setExpandedSourceIds] = useState(new Set()) // 펼쳐진 소스 ID 추적
  const fileInputRef = useRef(null)
  const { t, language } = useLanguage()

  // 파일 타입별 아이콘 및 색상 반환 (확장자 기반)
  const getFileIconAndColor = (source) => {
    // 웹 소스
    if (source.type === 'web') {
      return {
        icon: Globe,
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600'
      }
    }

    // 파일 확장자 추출
    const fileName = source.name || ''
    const extension = fileName.split('.').pop()?.toLowerCase()

    // 확장자 기반 아이콘 매핑
    switch (extension) {
      case 'pdf':
        return {
          icon: FileText,
          bgColor: 'bg-red-50',
          iconColor: 'text-red-600'
        }
      case 'doc':
      case 'docx':
        return {
          icon: FileText,
          bgColor: 'bg-blue-50',
          iconColor: 'text-blue-600'
        }
      case 'txt':
        return {
          icon: File,
          bgColor: 'bg-gray-50',
          iconColor: 'text-gray-600'
        }
      case 'xls':
      case 'xlsx':
        return {
          icon: FileSpreadsheet,
          bgColor: 'bg-green-50',
          iconColor: 'text-green-600'
        }
      case 'json':
        return {
          icon: File,
          bgColor: 'bg-purple-50',
          iconColor: 'text-purple-600'
        }
      default:
        return {
          icon: FileText,
          bgColor: 'bg-gray-50',
          iconColor: 'text-gray-500'
        }
    }
  }

  // 소스 펼치기/접기 토글
  const toggleExpand = (sourceId) => {
    setExpandedSourceIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sourceId)) {
        newSet.delete(sourceId)
      } else {
        newSet.add(sourceId)
      }
      return newSet
    })
  }

  const handleFileSelect = async (e) => {
    console.log('파일 선택 이벤트 발생:', e.target.files)
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      console.log('선택된 파일:', files.map(f => f.name))
      const parsedSources = await Promise.all(
        files.map(async (file) => {
          try {
            console.log('파일 파싱 시작:', file.name)
            const parsedData = await parseFileContent(file)
            console.log('파일 파싱 완료:', file.name, parsedData)
            console.log('parsedData.extractedText 존재:', !!parsedData.extractedText)
            console.log('parsedData.extractedText 길이:', parsedData.extractedText?.length || 0)
            // File 객체를 ArrayBuffer로 변환하여 IndexedDB에 저장 가능하도록 처리
            const fileBuffer = await file.arrayBuffer()

            return {
              id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              type: 'file',
              fileType: file.type,
              size: file.size,
              uploadedAt: new Date().toISOString(),
              parsedData: parsedData,
              fileBuffer: fileBuffer, // ArrayBuffer로 저장 (IndexedDB 호환)
              fileMetadata: {
                name: file.name,
                type: file.type,
                size: file.size,
                lastModified: file.lastModified
              }
            }
          } catch (error) {
            const parsingErrorMsg = language === 'ko'
              ? `파일 "${file.name}" 파싱 실패: ${error.message}`
              : `Failed to parse file "${file.name}": ${error.message}`
            alert(parsingErrorMsg)
            return null
          }
        })
      )

      const validSources = parsedSources.filter(s => s !== null)
      console.log('✅ 유효한 소스:', validSources)
      console.log('✅ fileBuffer 존재 여부:', validSources.map(s => ({ name: s.name, hasBuffer: !!s.fileBuffer, bufferSize: s.fileBuffer?.byteLength })))
      console.log('✅ onAddSources 호출 직전')
      onAddSources(validSources)
      console.log('✅ onAddSources 호출 완료')
      handleModalChange(false)
    }
    // input 초기화 - 같은 파일 재선택 가능하도록
    e.target.value = ''
  }

  const handleAddFileClick = () => {
    console.log('파일 추가 버튼 클릭, fileInputRef:', fileInputRef.current)
    if (fileInputRef.current) {
      fileInputRef.current.click()
    } else {
      console.error('fileInputRef가 null입니다!')
    }
  }

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      setUrlError(t('sources.urlRequired') || 'URL을 입력해주세요.')
      return
    }

    setIsLoadingUrl(true)
    setUrlError('')

    try {
      const metadata = await fetchWebMetadata(urlInput.trim())
      const newSource = {
        id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: metadata.metadata?.title || metadata.domain,
        type: 'web',
        url: urlInput.trim(),
        uploadedAt: new Date().toISOString(),
        parsedData: metadata
      }

      onAddSources([newSource])
      handleModalChange(false)
      setUrlInput('')
      setUrlError('')
    } catch (error) {
      setUrlError(error.message || t('errors.urlFetch'))
    } finally {
      setIsLoadingUrl(false)
    }
  }

  // 웹 검색 핸들러 (팝업 열기)
  const handleWebSearchClick = () => {
    if (!searchQuery.trim()) return
    setIsSearchPopupOpen(true)
  }

  // 실제 웹 검색 실행 (팝업에서 호출)
  const executeWebSearch = async (query, plans = []) => {
    setIsSearching(true)
    setSearchProgress({ percent: 0, message: language === 'ko' ? '웹 검색 시작...' : 'Starting web search...' })

    // 계획/추가 명령어가 있으면 쿼리에 보완 (명확한 리서치 질문 생성)
    let finalSearchQuery = query
    if (plans && plans.length > 0) {
      const combinedPlans = plans.filter(p => p.trim()).join(', ')
      if (combinedPlans) {
        finalSearchQuery = `${query} (${combinedPlans})`
      }
    }

    try {
      let result

      if (researchType === 'fast') {
        // Fast Research
        setSearchProgress({ percent: 20, message: language === 'ko' ? 'GPT가 추천 URL 생성 중...' : 'GPT generating recommended URLs...' })
        result = await performFastResearch(finalSearchQuery, language)

        // Tavily 크레딧 소진 경고 표시
        if (result.warning) {
          setSearchProgress({ percent: 100, message: result.warning })
          setTimeout(() => setIsSearching(false), 3000)
          return
        }

        setSearchProgress({ percent: 80, message: language === 'ko' ? `인터넷에서 관련 자료 ${result.totalSources}개를 찾았습니다!` : `Found ${result.totalSources} related sources!` })
      } else {
        // Deep Research
        result = await performDeepResearch(finalSearchQuery, language, (percent, message) => {
          setSearchProgress({ percent, message })
        })

        // Tavily 크레딧 소진 경고 표시
        if (result.warning) {
          setSearchProgress({ percent: 100, message: result.warning })
          setTimeout(() => setIsSearching(false), 3000)
          return
        }
      }

      // 웹 소스를 파일 소스와 동일한 형식으로 변환 (가상 페이지 적용)
      const webSources = result.sources.map((source, index) => {
        const virtualization = virtualizeText(source.extractedText)

        return {
          id: `web_${Date.now()}_${index}`,
          name: source.title,
          type: 'web',
          url: source.url,
          uploadedAt: new Date().toISOString(),
          parsedData: {
            extractedText: source.extractedText,
            summary: source.summary,
            pageCount: virtualization.pageCount,
            pageTexts: virtualization.pageTexts,
            metadata: {
              title: source.title,
              url: source.url,
              searchQuery: searchQuery,
              researchType: researchType,
              report: result.report
            }
          }
        }
      })

      // Deep Research 리포트가 있으면 별도 소스로 추가
      if (result.report) {
        const reportSource = {
          id: `report_${Date.now()}`,
          name: `📊 ${language === 'ko' ? '리서치 리포트' : 'Research Report'}: ${searchQuery}`,
          type: 'report',
          url: result.sources[0]?.url, // 첫 번째 소스 URL 연결
          uploadedAt: new Date().toISOString(),
          parsedData: {
            extractedText: result.report,
            metadata: {
              title: `Deep Research Report: ${searchQuery}`,
              searchQuery: searchQuery,
              sourcesCount: result.totalSources,
              isReport: true,
              sources: result.sources.map(s => ({ title: s.title, url: s.url }))
            }
          }
        }
        webSources.unshift(reportSource)
      }

      console.log('[SourcePanel] 웹 소스 추가:', webSources)

      onAddSources(webSources)
      setSearchQuery('')
      setSearchProgress({ percent: 100, message: language === 'ko' ? '완료!' : 'Complete!' })

      // 1초 후 진행률 초기화
      setTimeout(() => {
        setIsSearching(false)
        setSearchProgress({ percent: 0, message: '' })
      }, 1000)

    } catch (error) {
      console.error('[SourcePanel] 웹 검색 오류:', error)

      // 사용자 친화적인 에러 메시지
      let errorMessage = error.message
      if (error.message.includes('CORS')) {
        errorMessage = language === 'ko'
          ? '일부 사이트에 접근할 수 없습니다. 다른 검색어를 시도해보세요.'
          : 'Cannot access some sites. Please try a different query.'
      } else if (error.message.includes('URL')) {
        errorMessage = language === 'ko'
          ? '검색 URL 생성에 실패했습니다. API 키를 확인해주세요.'
          : 'Failed to generate search URLs. Please check API keys.'
      }

      setSearchProgress({
        percent: 0,
        message: language === 'ko'
          ? `❌ 오류: ${errorMessage}`
          : `❌ Error: ${errorMessage}`
      })
      setTimeout(() => {
        setIsSearching(false)
        setSearchProgress({ percent: 0, message: '' })
      }, 5000) // 5초로 연장
    }
  }

  // 문서 컨텍스트 생성 (AI 추천 시스템용)
  const getDocumentContext = () => {
    const selected = sources.filter(s => selectedSourceIds.includes(s.id))
    if (selected.length === 0) return null
    return selected.map(s => ({
      name: s.name,
      fileName: s.name,
      parsedData: s.parsedData
    }))
  }

  // Enter 키로 검색
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter' && !isSearching) {
      handleWebSearchClick()
    }
  }

  const allSelected = sources.length > 0 && selectedSourceIds.length === sources.length

  const toggleAll = () => {
    if (allSelected) {
      // 모두 선택 해제
      sources.forEach(source => {
        if (selectedSourceIds.includes(source.id)) {
          onToggleSource(source.id)
        }
      })
    } else {
      // 모두 선택
      sources.forEach(source => {
        if (!selectedSourceIds.includes(source.id)) {
          onToggleSource(source.id)
        }
      })
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">

      {isCollapsed ? (
        /* Collapsed View */
        <div className="flex-1 flex flex-col items-center py-4 space-y-4 overflow-y-auto custom-scrollbar no-scrollbar">
          {/* Toggle Button - Collapsed */}
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-all active:scale-95 mb-2"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          {/* Add Button - Collapsed */}
          <button
            onClick={() => handleModalChange(true)}
            className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 transition-all active:scale-95 shadow-sm"
            title={t('sources.addSource')}
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Sources Icons List */}
          <div className="flex-1 flex flex-col items-center space-y-3 w-full">
            {sources.map(source => {
              const { icon: Icon, bgColor, iconColor } = getFileIconAndColor(source)
              const isSelected = selectedSourceIds.includes(source.id)

              return (
                <button
                  key={source.id}
                  onClick={() => onToggleSource(source.id)}
                  className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all group ${isSelected ? 'ring-2 ring-blue-500 shadow-sm' : 'hover:bg-gray-50'
                    }`}
                  title={source.name}
                >
                  <div className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center overflow-hidden`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>

                  {/* Tooltip on Hover (Optional but good) */}
                  <div className="fixed left-16 px-2 py-1 bg-gray-800 text-white text-[11px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                    {source.name}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        /* Full View (Previous Content) */
        <>
          {/* Sidebar Header */}
          <div className="p-4 space-y-4">
            {/* Add Source Button + Sidebar Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleModalChange(true)}
                className="flex-1 h-12 bg-gradient-to-r from-[#4c2f6d] to-[#0d4a58] rounded-lg hover:opacity-90 transition-all flex items-center justify-center space-x-2 text-white shadow-md active:scale-[0.98]"
              >
                <Plus className="w-5 h-5" />
                <span className="text-sm font-bold">{t('sources.addSource')}</span>
              </button>
              <button
                onClick={onToggleCollapse}
                className="w-12 h-12 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all active:scale-95 border border-gray-100 shadow-sm"
                title={language === 'ko' ? '사이드바 접기' : 'Collapse Sidebar'}
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Web Search Bar */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={language === 'ko' ? '웹 검색' : 'Search Web'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  disabled={isSearching}
                  className="w-full pl-10 pr-4 py-3 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9B4DEE]/20 focus:border-[#9B4DEE] bg-white transition-all"
                />
              </div>

              {/* Search Progress */}
              {isSearching && (
                <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg animate-fade-in shadow-sm">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                    <span className="text-[11px] font-bold text-blue-800">{searchProgress.message}</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-1">
                    <div
                      className="bg-blue-600 h-1 rounded-full transition-all duration-500"
                      style={{ width: `${searchProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sources List Section */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* List Header */}
            <div className="px-4 py-2 flex items-center border-y border-gray-50 mt-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-gray-300 text-[#9B4DEE] focus:ring-[#9B4DEE]"
              />
              <span className="ml-2 text-[12px] font-bold text-slate-500 uppercase tracking-tighter">
                {t('sources.allSources')}
              </span>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {sources.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                    <File className="w-6 h-6 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-400">
                      {language === 'ko' ? '추가된 소스가 없습니다' : t('sources.noSources')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sources.map((source) => {
                    const isExpanded = expandedSourceIds.has(source.id)
                    const hasSummary = source.parsedData?.summary || source.summary

                    return (
                      <div
                        key={source.id}
                        className={`px-3 py-2 hover:bg-gray-50 transition-colors group ${selectedSourceIds.includes(source.id) ? 'bg-blue-50' : 'bg-white'
                          }`}
                      >
                        {/* Main Row */}
                        <div className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedSourceIds.includes(source.id)}
                            onChange={() => onToggleSource(source.id)}
                            className="mt-0.5 w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />

                          {/* Expand/Collapse Button */}
                          {hasSummary && (
                            <button
                              onClick={() => toggleExpand(source.id)}
                              className="flex-shrink-0 mt-0.5 p-0.5 rounded hover:bg-gray-200 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3 h-3 text-gray-600" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-gray-600" />
                              )}
                            </button>
                          )}

                          <div
                            className="flex-shrink-0 cursor-pointer"
                            onClick={() => onToggleSource(source.id)}
                          >
                            {source.type === 'report' ? (
                              <div className="w-7 h-7 bg-purple-100 rounded flex items-center justify-center">
                                <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                              </div>
                            ) : (() => {
                              const { icon: Icon, bgColor, iconColor } = getFileIconAndColor(source)
                              return (
                                <div className={`w-7 h-7 ${bgColor} rounded flex items-center justify-center`}>
                                  <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                                </div>
                              )
                            })()}
                          </div>

                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => onToggleSource(source.id)}
                          >
                            <p className="text-xs font-medium text-gray-900 truncate leading-tight" title={source.name}>
                              {source.name}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-0.5 truncate" title={source.url || ''}>
                              {source.type === 'web' ? source.url : new Date(source.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>

                          {/* External Link Button for Web Sources - Compact */}
                          {(source.type === 'web' || source.type === 'report') && source.url && (
                            <Tooltip text={language === 'ko' ? '원본 웹사이트 방문하기' : 'Visit original website'} position="top">
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </Tooltip>
                          )}

                          <Tooltip text={language === 'ko' ? '삭제' : 'Delete'} position="top">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteSource(source.id)
                              }}
                              className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Tooltip>
                        </div>

                        {/* Expanded Summary Section */}
                        {isExpanded && hasSummary && (
                          <div className="mt-2 ml-10 p-2 bg-gray-50 rounded border border-gray-200">
                            <p className="text-[10px] text-gray-700 leading-relaxed">
                              {source.parsedData?.summary || source.summary}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => handleModalChange(false)}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('sources.addSource')}</h3>
              <button
                onClick={() => handleModalChange(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* File Upload Content */}
            <div className="space-y-4">
              <div className="space-y-3">
                <button
                  onClick={handleAddFileClick}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-gray-900">{t('sources.uploadFile')}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('sources.uploadFileDesc')}</p>
                  </div>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.txt,.doc,.docx,.hwp,.hwpx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Web Search Refinement Popup */}
      <WebSearchPopup
        isOpen={isSearchPopupOpen}
        onClose={() => setIsSearchPopupOpen(false)}
        initialQuery={searchQuery}
        documentContext={getDocumentContext()}
        onStartSearch={(finalQuery, plans) => {
          setSearchQuery(finalQuery)
          executeWebSearch(finalQuery, plans)
        }}
        language={language}
      />
    </div>
  )
}

export default SourcePanel
