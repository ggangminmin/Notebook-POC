import { useState, useEffect, useRef } from 'react'
import { ChevronRight, ChevronDown, Copy, Check, Database, Loader2, Lightbulb, FileText, List, ChevronLeft, X, Edit2, Save } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import Tooltip from './Tooltip'
import * as pdfjsLib from 'pdfjs-dist'

// PDF.js worker 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// GPT-4o를 사용한 자연어 문서 분석 (NotebookLM 스타일)
const generateNaturalSummary = async (extractedText, language = 'ko') => {
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

  if (!extractedText || extractedText.length < 50) {
    return null
  }

  console.log('[DataPreview] 자연어 요약 생성 시작')
  console.log('[DataPreview] extractedText 길이:', extractedText.length)

  try {
    const prompt = language === 'ko'
      ? `다음 문서를 NotebookLM 스타일로 분석하여 아래 형식으로 요약해주세요:

**문서 내용:**
${extractedText.substring(0, 4000)}

**요구사항:**
1. **핵심 요약**: 이 문서의 핵심 내용을 2-3문장으로 명확하게 요약
2. **주요 내용**: 문서의 핵심 포인트를 3-5개의 간결한 문장으로 정리 (각 항목은 한 문장)
3. **핵심 키워드**: 문서에서 가장 중요한 단어 3-5개

JSON 형식으로 응답해주세요:
{
  "summary": "문서의 핵심 요약 (2-3문장)",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "keywords": ["키워드1", "키워드2", "키워드3"]
}`
      : `Analyze the following document in NotebookLM style:

**Document Content:**
${extractedText.substring(0, 4000)}

**Requirements:**
1. **Core Summary**: Clear summary of the document in 2-3 sentences
2. **Key Points**: 3-5 concise sentences highlighting core points (one sentence each)
3. **Key Keywords**: 3-5 most important words

Respond in JSON format:
{
  "summary": "Core summary (2-3 sentences)",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-5.1-chat-latest',  // GPT-5.1로 업데이트
        messages: [
          { role: 'system', content: 'You are an expert document analyst. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        // GPT-5.1은 temperature를 지원하지 않음 (내부적으로 1 고정)
        max_completion_tokens: 800  // GPT-5.1은 max_completion_tokens 사용
      })
    })

    if (!response.ok) {
      console.error('[DataPreview] OpenAI API 오류:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    const content = data.choices[0].message.content.trim()
    console.log('[DataPreview] GPT 응답 내용:', content)

    // JSON 파싱
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content

      const parsed = JSON.parse(jsonStr)
      console.log('[DataPreview] 파싱 성공:', parsed)
      return parsed
    } catch (e) {
      console.error('[DataPreview] JSON 파싱 실패:', e)
      return null
    }
  } catch (error) {
    console.error('[DataPreview] 자연어 요약 생성 오류:', error)
    return null
  }
}

const DataPreview = ({ selectedFile, rightPanelState, onPanelModeChange }) => {
  // 독립적인 상태 관리 (ChatInterface와 분리)
  const [expandedKeys, setExpandedKeys] = useState(new Set(['root']))
  const [isCopied, setIsCopied] = useState(false)
  const [viewMode, setViewMode] = useState('natural') // 'natural', 'json', 'pdf'
  const [naturalSummary, setNaturalSummary] = useState(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [pdfState, setPdfState] = useState({ pdf: null, currentPage: 1, numPages: 0, isLoading: false, renderedPages: [] })
  const scrollContainerRef = useRef(null)
  const pageRefs = useRef({})
  const { language } = useLanguage()

  // 편집 상태 관리
  const [isEditing, setIsEditing] = useState(null) // 'summary', 'keyPoints', 'keywords', null
  const [editedContent, setEditedContent] = useState({
    summary: '',
    keyPoints: [],
    keywords: []
  })

  // 편집 모드 시작
  const handleStartEdit = (field) => {
    setIsEditing(field)
    if (naturalSummary) {
      setEditedContent({
        summary: naturalSummary.summary || '',
        keyPoints: naturalSummary.keyPoints || [],
        keywords: naturalSummary.keywords || []
      })
    }
  }

  // 편집 저장
  const handleSaveEdit = () => {
    setNaturalSummary({
      ...naturalSummary,
      ...editedContent
    })
    setIsEditing(null)
    console.log('[DataPreview] 편집 내용 저장:', editedContent)
  }

  // 편집 취소
  const handleCancelEdit = () => {
    setIsEditing(null)
    setEditedContent({
      summary: naturalSummary?.summary || '',
      keyPoints: naturalSummary?.keyPoints || [],
      keywords: naturalSummary?.keywords || []
    })
  }

  // 우측 패널 상태 변경 감지 및 스크롤 이동
  useEffect(() => {
    if (rightPanelState?.mode === 'pdf' && rightPanelState?.pdfPage) {
      setViewMode('pdf')

      // 페이지로 스크롤 (약간의 지연을 두어 DOM이 렌더링된 후 실행)
      setTimeout(() => {
        const pageElement = pageRefs.current[`page-${rightPanelState.pdfPage}`]
        if (pageElement && scrollContainerRef.current) {
          pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
          console.log('[DataPreview PDF] 페이지로 스크롤:', rightPanelState.pdfPage)
        }
      }, 300)
    }
  }, [rightPanelState])

  // PDF 파일 로드 및 전체 페이지 렌더링
  useEffect(() => {
    if (!selectedFile?.file || !selectedFile.file.type?.includes('pdf')) {
      setPdfState({ pdf: null, currentPage: 1, numPages: 0, isLoading: false, renderedPages: [] })
      return
    }

    const loadAndRenderAllPages = async () => {
      try {
        setPdfState(prev => ({ ...prev, isLoading: true, renderedPages: [] }))
        const arrayBuffer = await selectedFile.file.arrayBuffer()
        const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

        console.log('[DataPreview PDF] PDF 로드 완료 - 페이지 수:', loadedPdf.numPages)

        // 컨테이너 너비 계산 (우측 패널 42.5% 기준 - 채팅창과 1:1 대칭)
        // 우측 패널은 전체 화면의 42.5%, 여기서 padding(py-4)과 maxWidth(95%)를 고려
        const containerWidth = window.innerWidth * 0.425 * 0.95 // 42.5%의 95%
        console.log('[DataPreview PDF] 계산된 컨테이너 너비:', containerWidth)

        // 모든 페이지를 렌더링
        const renderedPages = []
        for (let pageNum = 1; pageNum <= loadedPdf.numPages; pageNum++) {
          const page = await loadedPdf.getPage(pageNum)
          const imageData = await renderPageToImage(page, containerWidth)
          renderedPages.push({
            pageNumber: pageNum,
            imageData: imageData
          })

          // 진행 상황 업데이트 (매 페이지마다)
          console.log(`[DataPreview PDF] 렌더링 진행: ${pageNum}/${loadedPdf.numPages}`)
        }

        setPdfState({
          pdf: loadedPdf,
          currentPage: 1,
          numPages: loadedPdf.numPages,
          isLoading: false,
          renderedPages: renderedPages
        })

        console.log('[DataPreview PDF] 모든 페이지 렌더링 완료')
      } catch (error) {
        console.error('[DataPreview PDF] PDF 로드 오류:', error)
        setPdfState(prev => ({ ...prev, isLoading: false }))
      }
    }

    // PDF 페이지를 이미지로 렌더링하는 헬퍼 함수 (고품질 렌더링: scale 2.0)
    const renderPageToImage = async (page, targetWidth) => {
      try {
        // 기본 viewport를 구해서 원본 너비 확인
        const baseViewport = page.getViewport({ scale: 1.0, rotation: 0 })

        // 목표 너비에 맞는 스케일 계산 후 2배로 확대 (고품질 렌더링)
        const baseScale = targetWidth / baseViewport.width
        const scale = baseScale * 2.0  // 2배 스케일로 선명도 향상
        console.log('[DataPreview PDF] 고품질 스케일 계산:', {
          원본너비: baseViewport.width,
          목표너비: targetWidth,
          기본스케일: baseScale,
          최종스케일: scale
        })

        const viewport = page.getViewport({ scale, rotation: 0 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')

        // Canvas 크기 설정 (고해상도)
        const outputScale = window.devicePixelRatio || 1
        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)

        // 배경 흰색으로 초기화
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)

        // Identity Matrix로 좌표계 완전 리셋 (반전 방지)
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0)

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise

        return canvas.toDataURL('image/png', 1.0)
      } catch (error) {
        console.error('[DataPreview PDF] 페이지 렌더링 오류:', error)
        return null
      }
    }

    loadAndRenderAllPages()
  }, [selectedFile?.file])

  // 파일 선택 시 자동으로 요약 생성 (Auto-Summary Trigger)
  useEffect(() => {
    const loadSummary = async () => {
      if (!selectedFile?.parsedData?.extractedText) {
        console.log('[DataPreview] extractedText 없음, 메타데이터 기반 기본 요약 생성')

        // 메타데이터 기반 기본 요약 생성 (Fallback)
        if (selectedFile?.parsedData) {
          const metadata = selectedFile.parsedData
          const pageCount = metadata.pageCount || metadata.numPages || 1
          const fileName = metadata.fileName || selectedFile.name
          const fileType = metadata.fileType || 'document'

          const fallbackSummary = language === 'ko'
            ? `### 📄 문서 정보\n\n**파일명**: ${fileName}[1]\n**파일 형식**: ${fileType.toUpperCase()}\n**전체 페이지**: ${pageCount}페이지[1]\n\n### 📌 안내\n\n이 문서는 **${pageCount}개의 페이지**로 구성되어 있습니다[1]. 문서 내용에 대해 궁금한 점이 있으시면 질문해 주세요!\n\n채팅창에서 인용 배지[1]를 클릭하면 우측 패널에서 해당 페이지를 바로 확인할 수 있습니다.`
            : `### 📄 Document Information\n\n**Filename**: ${fileName}[1]\n**File Type**: ${fileType.toUpperCase()}\n**Total Pages**: ${pageCount} pages[1]\n\n### 📌 Guide\n\nThis document consists of **${pageCount} pages**[1]. Feel free to ask questions about the content!\n\nClick citation badges[1] in the chat to view the corresponding page in the right panel.`

          setNaturalSummary(fallbackSummary)
          setIsLoadingSummary(false)
          console.log('[DataPreview] 메타데이터 기반 기본 요약 생성 완료')
          return
        }

        setNaturalSummary(null)
        setIsLoadingSummary(false)
        return
      }

      console.log('[DataPreview] 자동 요약 트리거 - 파일:', selectedFile.name)
      setIsLoadingSummary(true)

      const summary = await generateNaturalSummary(
        selectedFile.parsedData.extractedText,
        language
      )

      // AI 요약 생성 실패 시 메타데이터 기반 기본 요약 생성
      if (!summary && selectedFile?.parsedData) {
        console.log('[DataPreview] AI 요약 실패, 메타데이터 기반 기본 요약 생성')
        const metadata = selectedFile.parsedData
        const pageCount = metadata.pageCount || metadata.numPages || 1
        const fileName = metadata.fileName || selectedFile.name
        const fileType = metadata.fileType || 'document'

        const fallbackSummary = language === 'ko'
          ? `### 📄 문서 정보\n\n**파일명**: ${fileName}[1]\n**파일 형식**: ${fileType.toUpperCase()}\n**전체 페이지**: ${pageCount}페이지[1]\n\n### 📌 안내\n\n이 문서는 **${pageCount}개의 페이지**로 구성되어 있습니다[1]. 문서 내용에 대해 궁금한 점이 있으시면 질문해 주세요!\n\n채팅창에서 인용 배지[1]를 클릭하면 우측 패널에서 해당 페이지를 바로 확인할 수 있습니다.`
          : `### 📄 Document Information\n\n**Filename**: ${fileName}[1]\n**File Type**: ${fileType.toUpperCase()}\n**Total Pages**: ${pageCount} pages[1]\n\n### 📌 Guide\n\nThis document consists of **${pageCount} pages**[1]. Feel free to ask questions about the content!\n\nClick citation badges[1] in the chat to view the corresponding page in the right panel.`

        setNaturalSummary(fallbackSummary)
      } else {
        setNaturalSummary(summary)
      }

      setIsLoadingSummary(false)
      console.log('[DataPreview] 요약 생성 완료')
    }

    // 파일이 선택되면 즉시 요약 생성 시작
    if (selectedFile) {
      loadSummary()
    } else {
      setNaturalSummary(null)
      setIsLoadingSummary(false)
    }
  }, [selectedFile?.id, language]) // selectedFile.id가 변경될 때만 재생성

  // 이벤트 전파 차단으로 리렌더링 범위 제한
  const handleCopyToClipboard = async (e) => {
    e.stopPropagation()
    if (!selectedFile?.parsedData) return

    try {
      const jsonText = JSON.stringify(selectedFile.parsedData, null, 2)
      await navigator.clipboard.writeText(jsonText)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // 모드 전환 시 이벤트 전파 차단
  const handleToggleViewMode = (e) => {
    e.stopPropagation()
    const nextMode = viewMode === 'natural' ? 'json' : 'natural'
    setViewMode(nextMode)
    if (onPanelModeChange) {
      onPanelModeChange(nextMode)
    }
  }

  // 요약 보기로 돌아가기
  const handleBackToSummary = () => {
    setViewMode('natural')
    if (onPanelModeChange) {
      onPanelModeChange('natural')
    }
  }

  const toggleExpand = (key) => {
    setExpandedKeys(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const renderValue = (value, key, level = 0) => {
    const isExpanded = expandedKeys.has(key)

    if (value === null) {
      return <span className="text-purple-600">null</span>
    }

    if (typeof value === 'boolean') {
      return <span className="text-purple-600">{value.toString()}</span>
    }

    if (typeof value === 'number') {
      return <span className="text-blue-600">{value}</span>
    }

    if (typeof value === 'string') {
      // 긴 문자열은 축약
      if (value.length > 100 && !isExpanded) {
        return (
          <span>
            <span className="text-green-700">"{value.substring(0, 100)}..."</span>
            <button
              onClick={() => toggleExpand(key)}
              className="ml-2 text-xs text-blue-600 hover:underline"
            >
              [더보기]
            </button>
          </span>
        )
      }
      return <span className="text-green-700">"{value}"</span>
    }

    if (Array.isArray(value)) {
      return (
        <div>
          <div
            className="inline-flex items-center cursor-pointer hover:bg-gray-100 rounded px-1"
            onClick={() => toggleExpand(key)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
            <span className="text-gray-600 ml-1">
              Array[{value.length}]
            </span>
          </div>
          {isExpanded && (
            <div className="ml-6 mt-1">
              {value.map((item, index) => (
                <div key={`${key}-${index}`} className="my-1">
                  <span className="text-orange-600">{index}: </span>
                  {renderValue(item, `${key}-${index}`, level + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value)
      return (
        <div>
          <div
            className="inline-flex items-center cursor-pointer hover:bg-gray-100 rounded px-1"
            onClick={() => toggleExpand(key)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
            <span className="text-gray-600 ml-1">
              {'{'}...{'}'} ({entries.length} {entries.length === 1 ? 'property' : 'properties'})
            </span>
          </div>
          {isExpanded && (
            <div className="ml-6 mt-1">
              {entries.map(([k, v]) => (
                <div key={`${key}-${k}`} className="my-1">
                  <span className="text-red-600">"{k}"</span>
                  <span className="text-gray-600">: </span>
                  {renderValue(v, `${key}-${k}`, level + 1)}
                  {entries[entries.length - 1][0] !== k && (
                    <span className="text-gray-600">,</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return <span className="text-gray-700">{String(value)}</span>
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Studio Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {viewMode === 'pdf' ? (
              <>
                <button
                  onClick={handleBackToSummary}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-all"
                  title={language === 'ko' ? '요약 보기' : 'Back to Summary'}
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <h2 className="text-sm font-bold text-gray-900">
                  {language === 'ko' ? 'PDF 뷰어' : 'PDF Viewer'}
                </h2>
              </>
            ) : (
              <>
                <h2 className="text-sm font-bold text-gray-900">
                  {language === 'ko' ? '스튜디오' : 'Studio'}
                </h2>
                {viewMode === 'natural' && selectedFile && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-semibold">
                    AI
                  </span>
                )}
              </>
            )}
          </div>
          {selectedFile && viewMode !== 'pdf' && (
            <div className="flex items-center space-x-2">
              {/* 데이터 보기 토글 버튼 */}
              <Tooltip
                content={language === 'ko' ? 'JSON 데이터 보기' : 'View JSON data'}
                position="bottom"
              >
                <button
                  onClick={handleToggleViewMode}
                  className={`p-2 rounded-lg text-xs font-medium transition-all ${
                    viewMode === 'json'
                      ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  <Database className="w-4 h-4" />
                </button>
              </Tooltip>

              {/* 복사 버튼 (JSON 모드일 때만 표시) */}
              {viewMode === 'json' && (
                <button
                  onClick={handleCopyToClipboard}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isCopied
                      ? 'bg-green-500 text-white shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{language === 'ko' ? '복사됨' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{language === 'ko' ? '복사' : 'Copy'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
          {viewMode === 'pdf' && pdfState.numPages > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                {pdfState.numPages} {language === 'ko' ? '페이지' : 'pages'}
              </span>
              <button
                onClick={handleBackToSummary}
                className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-all"
                title={language === 'ko' ? '닫기' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        {selectedFile && viewMode === 'natural' && (
          <p className="text-xs text-gray-500">
            {language === 'ko' ? 'GPT-5.1 기반 문서 분석' : 'GPT-5.1 Document Analysis'}
          </p>
        )}
        {viewMode === 'pdf' && selectedFile && (
          <p className="text-xs text-gray-500 truncate" title={selectedFile.name}>
            {selectedFile.name}
          </p>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#F9FAFB]">
        {!selectedFile ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-200 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                {language === 'ko' ? '소스를 선택하면\n분석 결과가 표시됩니다' : 'Select a source\nto view analysis'}
              </p>
            </div>
          </div>
        ) : viewMode === 'pdf' ? (
          /* PDF 뷰어 모드 - 전체 스크롤형 (NotebookLM 스타일) */
          <div className="h-full flex flex-col">
            {pdfState.isLoading ? (
              <div className="flex items-center justify-center h-full bg-gradient-to-b from-gray-50 to-gray-100">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 text-blue-600 animate-spin" />
                  <p className="text-sm font-medium text-gray-700">
                    {language === 'ko' ? 'PDF 페이지 렌더링 중...' : 'Rendering PDF pages...'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'ko' ? '전체 페이지를 고해상도로 준비하고 있습니다' : 'Preparing all pages in high quality'}
                  </p>
                </div>
              </div>
            ) : pdfState.renderedPages.length > 0 ? (
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50"
                style={{ scrollBehavior: 'smooth' }}
              >
                <div className="py-6 px-4 space-y-6">
                  {pdfState.renderedPages.map((pageData) => (
                    <div
                      key={`page-${pageData.pageNumber}`}
                      ref={(el) => pageRefs.current[`page-${pageData.pageNumber}`] = el}
                      className="bg-white mx-auto shadow-xl rounded-xl overflow-hidden border border-gray-200 transition-all hover:shadow-2xl"
                      style={{ maxWidth: '100%' }}
                    >
                      {/* 페이지 번호 표시 - NotebookLM 스타일 */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700 flex items-center space-x-2">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>{language === 'ko' ? '페이지' : 'Page'} {pageData.pageNumber}</span>
                        </span>
                        <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full font-semibold">
                          {pageData.pageNumber} / {pdfState.numPages}
                        </span>
                      </div>
                      {/* 페이지 이미지 - 100% 너비, 2배 스케일 이미지를 50% 크기로 표시 (고품질) */}
                      {pageData.imageData ? (
                        <img
                          src={pageData.imageData}
                          alt={`Page ${pageData.pageNumber}`}
                          className="w-full h-auto"
                          style={{
                            imageRendering: 'high-quality',
                            transform: 'scale(0.5) rotate(0deg)',
                            transformOrigin: 'top left',
                            display: 'block',
                            width: '200%',
                            maxWidth: '200%'
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-64 bg-gray-50">
                          <p className="text-sm text-gray-500">
                            {language === 'ko' ? '페이지를 불러올 수 없습니다' : 'Cannot load page'}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    {language === 'ko' ? 'PDF 파일을 불러올 수 없습니다' : 'Cannot load PDF file'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : viewMode === 'natural' ? (
          /* 자연어 분석 모드 (기본) */
          <div className="space-y-4">
            {isLoadingSummary ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 text-blue-600 animate-spin" />
                  <p className="text-sm font-medium text-gray-700">
                    {language === 'ko' ? 'AI 분석 중...' : 'AI analyzing...'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'ko' ? 'GPT-5.1로 문서를 분석하고 있습니다' : 'Analyzing with GPT-5.1'}
                  </p>
                </div>
              </div>
            ) : naturalSummary ? (
              <>
                {/* NotebookLM 스타일 핵심 요약 - 편집 기능 */}
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 shadow-sm border border-indigo-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <Lightbulb className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wide mb-2">
                          {language === 'ko' ? '핵심 요약' : 'Core Summary'}
                        </h3>
                        {isEditing === 'summary' ? (
                          <textarea
                            value={editedContent.summary}
                            onChange={(e) => setEditedContent({ ...editedContent, summary: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-800 leading-relaxed font-medium resize-none"
                            rows={3}
                            autoFocus
                          />
                        ) : (
                          <p className="text-sm text-gray-800 leading-relaxed font-medium">
                            {naturalSummary.summary}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      {isEditing === 'summary' ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title={language === 'ko' ? '저장' : 'Save'}
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title={language === 'ko' ? '취소' : 'Cancel'}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleStartEdit('summary')}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                          title={language === 'ko' ? '편집' : 'Edit'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* NotebookLM 스타일 주요 내용 리스트 - 편집 기능 */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <List className="w-4 h-4 text-gray-600" />
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                        {language === 'ko' ? '주요 내용' : 'Key Points'}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-1">
                      {isEditing === 'keyPoints' ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title={language === 'ko' ? '저장' : 'Save'}
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title={language === 'ko' ? '취소' : 'Cancel'}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleStartEdit('keyPoints')}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title={language === 'ko' ? '편집' : 'Edit'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {isEditing === 'keyPoints' ? (
                      editedContent.keyPoints.map((point, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                            {index + 1}
                          </div>
                          <input
                            type="text"
                            value={point}
                            onChange={(e) => {
                              const newKeyPoints = [...editedContent.keyPoints]
                              newKeyPoints[index] = e.target.value
                              setEditedContent({ ...editedContent, keyPoints: newKeyPoints })
                            }}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                          />
                        </div>
                      ))
                    ) : (
                      naturalSummary.keyPoints && naturalSummary.keyPoints.map((point, index) => (
                        <div key={index} className="flex items-start space-x-3 group">
                          <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                            {index + 1}
                          </div>
                          <p className="flex-1 text-sm text-gray-700 leading-relaxed pt-0.5">
                            {point}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 핵심 키워드 태그 - 편집 기능 */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      {language === 'ko' ? '핵심 키워드' : 'Keywords'}
                    </h3>
                    <div className="flex items-center space-x-1">
                      {isEditing === 'keywords' ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title={language === 'ko' ? '저장' : 'Save'}
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title={language === 'ko' ? '취소' : 'Cancel'}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleStartEdit('keywords')}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title={language === 'ko' ? '편집' : 'Edit'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isEditing === 'keywords' ? (
                      editedContent.keywords.map((keyword, index) => (
                        <input
                          key={index}
                          type="text"
                          value={keyword}
                          onChange={(e) => {
                            const newKeywords = [...editedContent.keywords]
                            newKeywords[index] = e.target.value
                            setEditedContent({ ...editedContent, keywords: newKeywords })
                          }}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border-2 border-blue-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          style={{ width: `${Math.max(keyword.length * 8 + 30, 60)}px` }}
                        />
                      ))
                    ) : (
                      naturalSummary.keywords && naturalSummary.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all cursor-default"
                        >
                          {keyword}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* 문서 메타데이터 */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">{language === 'ko' ? '파일명' : 'File'}</span>
                      <span className="text-gray-900 font-medium truncate max-w-[100px]" title={selectedFile.name}>
                        {selectedFile.name}
                      </span>
                    </div>
                    {selectedFile.parsedData?.pageCount && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">{language === 'ko' ? '페이지' : 'Pages'}</span>
                        <span className="text-gray-900 font-medium">
                          {selectedFile.parsedData.pageCount}
                        </span>
                      </div>
                    )}
                    {selectedFile.parsedData?.extractedText && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">{language === 'ko' ? '문자 수' : 'Characters'}</span>
                        <span className="text-gray-900 font-medium">
                          {selectedFile.parsedData.extractedText.length.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">{language === 'ko' ? '타입' : 'Type'}</span>
                      <span className="text-gray-900 font-medium uppercase">
                        {selectedFile.type}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    {language === 'ko' ? '문서 분석 정보를 생성할 수 없습니다.' : 'Cannot generate document analysis.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* JSON 데이터 모드 */
          <div className="space-y-3">
            {/* File Info Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{language === 'ko' ? '파일명' : 'File'}</span>
                  <span className="text-gray-900 font-medium text-right truncate max-w-[150px]" title={selectedFile.name}>
                    {selectedFile.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{language === 'ko' ? '타입' : 'Type'}</span>
                  <span className="text-gray-900 font-medium">
                    {selectedFile.type === 'web' ? '🌐 Web' : selectedFile.type === 'report' ? '📊 Report' : '📄 File'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{language === 'ko' ? '상태' : 'Status'}</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                    {language === 'ko' ? '준비완료' : 'Ready'}
                  </span>
                </div>
              </div>
            </div>

            {/* JSON Data */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="mb-2">
                <h3 className="text-xs font-semibold text-gray-700">
                  {language === 'ko' ? '구조화된 데이터' : 'Structured Data'}
                </h3>
              </div>
              <div className="font-mono text-xs bg-gray-50 rounded-md p-3 overflow-x-auto">
                <div className="text-gray-600">{'{'}</div>
                <div className="ml-3">
                  {selectedFile.parsedData && Object.entries(selectedFile.parsedData).map(([key, value]) => (
                    <div key={key} className="my-0.5">
                      <span className="text-red-600">"{key}"</span>
                      <span className="text-gray-600">: </span>
                      {renderValue(value, `root-${key}`, 0)}
                      <span className="text-gray-600">,</span>
                    </div>
                  ))}
                </div>
                <div className="text-gray-600">{'}'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {selectedFile && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            <span>{language === 'ko' ? '업데이트' : 'Updated'}: {new Date(selectedFile.uploadedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataPreview
