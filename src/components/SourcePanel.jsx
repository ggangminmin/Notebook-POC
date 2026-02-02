import { useState, useRef, useEffect } from 'react'
import { Plus, FileText, Upload, X, Globe, Search, Sparkles, Loader2, BookOpen, ExternalLink, ChevronDown, ChevronRight, FileSpreadsheet, File, PanelLeft, Link, ClipboardType, History, ArrowLeft, Youtube, FileUp } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { parseFileContent, fetchWebMetadata, virtualizeText } from '../utils/fileParser'
import { performFastResearch, performDeepResearch } from '../services/webSearchService'
import Tooltip from './Tooltip'
import WebSearchPopup from './WebSearchPopup'

const SourcePanel = ({ sources, onAddSources, selectedSourceIds, onToggleSource, onDeleteSource, isAddModalOpen = false, onAddModalChange, isCollapsed, onToggleCollapse, showNotification }) => {
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
    if (!isOpen) {
      setModalView('main')
      setWebsiteInput('')
      setTextInput('')
      setTextTitle('')
    }
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
  const [modalView, setModalView] = useState('main') // 'main', 'website', 'text'
  const [websiteInput, setWebsiteInput] = useState('')
  const [textInput, setTextInput] = useState('')
  const [textTitle, setTextTitle] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const { t, language } = useLanguage()

  // 파일 타입별 아이콘 및 색상 반환 (확장자 기반)
  const getFileIconAndColor = (source) => {
    // 웹 소스
    if (source.type === 'web') {
      const isYouTube = source.url && (source.url.includes('youtube.com') || source.url.includes('youtu.be'))
      if (isYouTube) {
        return {
          icon: Youtube,
          bgColor: 'bg-red-50',
          iconColor: 'text-red-500'
        }
      }
      return {
        icon: Globe,
        bgColor: 'bg-blue-100',
        iconColor: 'text-blue-600'
      }
    }

    // 복사된 텍스트
    if (source.type === 'text') {
      return {
        icon: ClipboardType,
        bgColor: 'bg-purple-100',
        iconColor: 'text-purple-600'
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

  const processFiles = async (filesList) => {
    const files = Array.from(filesList)

    // 파일 개수 제한 체크 (기존 소스 + 추가할 소스)
    if (sources.length + files.length > 10) {
      showNotification?.(
        language === 'ko' ? '파일 추가 제한' : 'File Limit Exceeded',
        language === 'ko' ? `최대 10개의 소스까지만 추가할 수 있습니다. (현재: ${sources.length}개 / 추가 시도: ${files.length}개)` : `You can only add up to 10 sources. (Current: ${sources.length} / Attempted: ${files.length})`,
        'error'
      );
      return false
    }
    return files
  }

  const handleFileSelect = async (e) => {
    console.log('파일 선택 이벤트 발생:', e.target.files)
    const files = await processFiles(e.target.files)
    if (!files) {
      e.target.value = ''
      return
    }

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
            showNotification?.(
              language === 'ko' ? '파일 파싱 실패' : 'Parsing Failed',
              language === 'ko' ? `파일 "${file.name}"을(를) 읽는 중 오류가 발생했습니다.` : `Error reading file "${file.name}".`,
              'error'
            );
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

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (modalView === 'main') {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (modalView !== 'main') return

    const files = await processFiles(e.dataTransfer.files)
    if (!files || files.length === 0) return

    console.log('드롭된 파일:', files.map(f => f.name))
    const parsedSources = await Promise.all(
      files.map(async (file) => {
        try {
          console.log('파일 파싱 시작:', file.name)
          const parsedData = await parseFileContent(file)
          const fileBuffer = await file.arrayBuffer()

          return {
            id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            type: 'file',
            file: {
              name: file.name,
              type: file.type,
              size: file.size,
              lastModified: file.lastModified,
              data: fileBuffer
            },
            uploadedAt: new Date().toISOString(),
            parsedData: parsedData,
            selected: true
          }
        } catch (error) {
          console.error(`Error parsing ${file.name}:`, error)
          return null
        }
      })
    )

    const validSources = parsedSources.filter(s => s !== null)
    if (validSources.length > 0) {
      onAddSources(validSources)
      handleModalChange(false)
    }
  }

  const handleAddFileClick = () => {
    console.log('파일 추가 버튼 클릭, fileInputRef:', fileInputRef.current)
    if (fileInputRef.current) {
      fileInputRef.current.click()
    } else {
      console.error('fileInputRef가 null입니다!')
    }
  }

  const handleWebsiteSubmit = async () => {
    const urls = websiteInput.split(/[\n\s]+/).filter(url => url.trim())
    if (urls.length === 0) return

    // 개수 제한 체크
    if (sources.length + urls.length > 10) {
      showNotification?.(
        language === 'ko' ? '파일 추가 제한' : 'File Limit Exceeded',
        language === 'ko' ? `최대 10개의 소스까지만 추가할 수 있습니다. (현재: ${sources.length}개)` : `You can only add up to 10 sources. (Current: ${sources.length})`,
        'error'
      );
      return
    }

    setIsLoadingUrl(true)
    const newSources = []

    try {
      for (const url of urls) {
        try {
          const metadata = await fetchWebMetadata(url.trim())
          newSources.push({
            id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: metadata.metadata?.title || metadata.domain || url,
            type: 'web',
            url: url.trim(),
            uploadedAt: new Date().toISOString(),
            parsedData: metadata
          })
        } catch (err) {
          console.error(`Failed to fetch ${url}:`, err)
        }
      }

      if (newSources.length > 0) {
        onAddSources(newSources)
        handleModalChange(false)
      } else {
        setUrlError(language === 'ko' ? 'URL을 처리할 수 없습니다.' : 'Failed to process URLs.')
      }
    } finally {
      setIsLoadingUrl(false)
    }
  }

  const handleTextSubmit = () => {
    if (!textInput.trim()) return

    // 개수 제한 체크
    if (sources.length + 1 > 10) {
      showNotification?.(
        language === 'ko' ? '파일 추가 제한' : 'File Limit Exceeded',
        language === 'ko' ? '최대 10개의 소스까지만 추가할 수 있습니다.' : 'You can only add up to 10 sources.',
        'error'
      );
      return
    }

    const { pageCount, pageTexts } = virtualizeText(textInput)

    const newSource = {
      id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: textTitle.trim() || (language === 'ko' ? '복사된 텍스트' : 'Copied Text'),
      type: 'text',
      uploadedAt: new Date().toISOString(),
      parsedData: {
        fileType: 'text',
        extractedText: textInput,
        pageCount,
        pageTexts,
        metadata: {
          title: textTitle.trim() || (language === 'ko' ? '복사된 텍스트' : 'Copied Text'),
          type: 'text'
        }
      }
    }

    onAddSources([newSource])
    handleModalChange(false)
  }

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
              <span className="ml-2 text-sm font-bold text-slate-500 uppercase tracking-tighter">
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
                            <p className="text-sm font-medium text-gray-900 truncate leading-tight" title={source.name}>
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[100] animate-in fade-in duration-200" onClick={() => handleModalChange(false)}>
          <div
            className={`bg-[#f9fbfd] rounded-3xl shadow-2xl transition-all duration-300 overflow-hidden ${modalView === 'main' ? 'max-w-2xl w-full' : 'max-w-lg w-full'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            {modalView === 'main' ? (
              /* Image 1: Main Source Selection */
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-semibold text-gray-800 tracking-tight">
                    {language === 'ko' ? '소스 추가' : 'Add Source'}
                  </h2>
                  <button onClick={() => handleModalChange(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>



                {/* Drop Zone / Action Buttons */}
                <div
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative py-24 px-10 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center space-y-12 transition-all duration-300 ${isDragging
                    ? 'border-blue-500 bg-blue-50/50 scale-[1.02] shadow-lg'
                    : 'border-gray-200 bg-gray-50/50'
                    }`}
                >
                  <span className={`font-medium text-lg transition-colors ${isDragging ? 'text-blue-600' : 'text-gray-400'}`}>
                    {isDragging
                      ? (language === 'ko' ? '여기에 놓으세요' : 'Drop here')
                      : (language === 'ko' ? '또는 파일 드롭' : 'Or drop files')}
                  </span>

                  <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
                    <button
                      onClick={handleAddFileClick}
                      className="flex flex-col items-center justify-center p-3 space-y-2 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                        <FileUp className="w-5 h-5 text-orange-500" />
                      </div>
                      <span className="text-[13px] font-medium text-gray-700 whitespace-nowrap">
                        {language === 'ko' ? '파일 업로드' : 'File Upload'}
                      </span>
                    </button>

                    <button
                      onClick={() => setModalView('website')}
                      className="flex flex-col items-center justify-center p-3 space-y-2 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <div className="flex items-center -space-x-1">
                          <Link className="w-4 h-4 text-blue-500" />
                          <Youtube className="w-4 h-4 text-red-500" />
                        </div>
                      </div>
                      <span className="text-[13px] font-medium text-gray-700 whitespace-nowrap">
                        {language === 'ko' ? '웹사이트' : 'Website'}
                      </span>
                    </button>



                    <button
                      onClick={() => setModalView('text')}
                      className="flex flex-col items-center justify-center p-3 space-y-2 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                        <ClipboardType className="w-5 h-5 text-gray-600" />
                      </div>
                      <span className="text-[13px] font-medium text-gray-700 whitespace-nowrap">
                        {language === 'ko' ? '복사된 텍스트' : 'Copied Text'}
                      </span>
                    </button>
                  </div>
                </div>



                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.txt,.doc,.docx,.hwp,.hwpx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : modalView === 'website' ? (
              /* Image 2: Website URL Input */
              <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 transform scale-100">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-transparent">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setModalView('main')}
                      className="p-2.5 rounded-full hover:bg-gray-100 transition-all text-gray-600 active:scale-95 shadow-sm"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-xl font-bold text-gray-800 tracking-tight">
                      {language === 'ko' ? '웹사이트 및 YouTube URL' : 'Website & YouTube URL'}
                    </h3>
                  </div>
                  <button onClick={() => handleModalChange(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar no-scrollbar" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                  <p className="text-[15px] text-gray-600 leading-relaxed font-medium">
                    {language === 'ko'
                      ? '에이전트 챗봇에 소스로 업로드할 웹사이트 및 YouTube URL을 아래에 붙여넣으세요 (최대 10개)'
                      : 'Copy and paste the URL of a website or YouTube video below to upload as a source to Agent Chatbot (Max 10).'}
                  </p>

                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl opacity-10 group-focus-within:opacity-20 transition-opacity blur" />
                    <textarea
                      value={websiteInput}
                      onChange={(e) => setWebsiteInput(e.target.value)}
                      placeholder={language === 'ko' ? '링크를 붙여넣으세요.' : 'Paste links here.'}
                      className="relative w-full h-48 p-5 text-[15px] border border-gray-200 rounded-2xl focus:outline-none focus:ring-0 focus:border-blue-400 bg-white shadow-inner resize-none transition-all placeholder:text-gray-300"
                    />
                  </div>

                  <ul className="space-y-2 ml-1">
                    {[
                      language === 'ko' ? '여러 URL을 추가하려면 공백이나 줄 바꿈으로 구분하세요.' : 'Separate multiple URLs with spaces or newlines.',
                      language === 'ko' ? '현재는 웹사이트에 표시되는 텍스트만 가져옵니다.' : 'Currently, only the visible text is extracted.',
                      language === 'ko' ? '유료 기사는 지원되지 않습니다.' : 'Paid articles are not supported.',
                      language === 'ko' ? '현재는 YouTube의 텍스트 스크립트만 가져옵니다.' : 'Only YouTube transcripts are captured.',
                      language === 'ko' ? '공개 YouTube 동영상만 지원됩니다.' : 'Only public YouTube videos are supported.'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start text-[12.5px] text-gray-500 space-x-2">
                        <span className="mt-1 w-1 h-1 bg-gray-300 rounded-full flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                  <button
                    disabled={!websiteInput.trim() || isLoadingUrl}
                    onClick={handleWebsiteSubmit}
                    className="px-8 py-3 bg-gray-900 text-white rounded-full font-bold text-[15px] hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-lg active:scale-98"
                  >
                    {isLoadingUrl ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{language === 'ko' ? '가져오는 중...' : 'Fetching...'}</span>
                      </div>
                    ) : (
                      language === 'ko' ? '삽입' : 'Insert'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Image 3: Copied Text Input */
              <div className="flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-2xl transition-all duration-300">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-transparent">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setModalView('main')}
                      className="p-2.5 rounded-full hover:bg-gray-100 transition-all text-gray-600 active:scale-95 shadow-sm"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-xl font-bold text-gray-800 tracking-tight">
                      {language === 'ko' ? '복사한 텍스트 붙여넣기' : 'Paste Copied Text'}
                    </h3>
                  </div>
                  <button onClick={() => handleModalChange(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-8 space-y-6">
                  <p className="text-[15px] text-gray-600 leading-relaxed font-medium">
                    {language === 'ko'
                      ? '에이전트 챗봇에 소스로 업로드할 복사한 텍스트를 아래에 붙여넣으세요 (최대 10개)'
                      : 'Paste the text you want to upload as a source to Agent Chatbot below (Max 10).'}
                  </p>

                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder={language === 'ko' ? '제목 (선택사항)' : 'Title (Optional)'}
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                      className="w-full px-5 py-3 text-[15px] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all"
                    />
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl opacity-10 group-focus-within:opacity-20 transition-opacity blur" />
                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={language === 'ko' ? '여기에 텍스트를 붙여넣으세요.' : 'Paste your text here.'}
                        className="relative w-full h-64 p-5 text-[15px] border border-gray-200 rounded-2xl focus:outline-none focus:ring-0 focus:border-purple-400 bg-white shadow-inner resize-none transition-all placeholder:text-gray-300 custom-scrollbar"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                  <button
                    disabled={!textInput.trim()}
                    onClick={handleTextSubmit}
                    className="px-8 py-3 bg-gray-900 text-white rounded-full font-bold text-[15px] hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-lg active:scale-98"
                  >
                    {language === 'ko' ? '삽입' : 'Insert'}
                  </button>
                </div>
              </div>
            )}
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
