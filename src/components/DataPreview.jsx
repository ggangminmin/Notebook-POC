import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronRight, ChevronDown, Copy, Check, Loader2, Lightbulb, FileText, List, ChevronLeft, X, Edit2, Save, Sparkles, Globe, ExternalLink, AlertCircle } from 'lucide-react'
import { virtualizeText } from '../utils/fileParser'
import { useLanguage } from '../contexts/LanguageContext'
import Tooltip from './Tooltip'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import * as pdfjsLib from 'pdfjs-dist'
import pdfViewerController from '../utils/pdfViewerController'
import { analyzeDocumentForPersonas } from '../services/aiService'

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

const DataPreview = ({ selectedFile, rightPanelState, onPanelModeChange, onUpdateData, onUpdateName, onSystemPromptUpdate, chatHistory = [], lastSyncTime, systemPromptOverrides: propSystemPromptOverrides = [], targetPage = null, targetTime = null, onClose, showNotification, isReadOnly = false }) => {
  // 독립적인 상태 관리 (ChatInterface와 분리)
  const [expandedKeys, setExpandedKeys] = useState(new Set(['root']))
  const [isCopied, setIsCopied] = useState(false)

  // 🔥 데이터 흐름 추적을 위한 디버그 로그
  useEffect(() => {
    if (selectedFile) {
      console.log('═══════════════════════════════════════════════════════')
      console.log('[DataPreview] 현재 선택된 파일:', selectedFile.name, `(${selectedFile.type})`)
      console.log('[DataPreview] parsedData 존재 여부:', !!selectedFile.parsedData)
      console.log('[DataPreview] extractedText 길이:', selectedFile.parsedData?.extractedText?.length || 0)
      console.log('═══════════════════════════════════════════════════════')
    }
  }, [selectedFile?.id])
  const [viewMode, setViewMode] = useState('natural') // 🎯 초기 모드: 자연어 분석 모드 (인용 배지 클릭 시 PDF 모드로 전환)
  const [naturalSummary, setNaturalSummary] = useState(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [pdfState, setPdfState] = useState({ pdf: null, currentPage: 1, numPages: 0, isLoading: false, renderedPages: [] })
  const scrollContainerRef = useRef(null)
  const pageRefs = useRef({})
  const { language } = useLanguage()
  const [showSyncNotification, setShowSyncNotification] = useState(false)
  const [highlightedPage, setHighlightedPage] = useState(null) // 페이지 이동 시 하이라이트 효과
  const pendingTargetPageRef = useRef(null) // PDF 로드 완료 후 이동할 페이지 (비동기 체인용)
  const previousFileIdRef = useRef(null) // 🔥 이전 파일 ID 추적 (파일 전환 감지용)
  const playerRef = useRef(null) // 유튜브 플레이어 DOM Ref
  const [player, setPlayer] = useState(null) // 유튜브 플레이어 인스턴스
  const playerReadyRef = useRef(false)
  const [highlightedChunkId, setHighlightedChunkId] = useState(null) // 하이라이트된 청크 ID
  const chunkRefs = useRef({}) // 청크 DOM Ref들을 저장할 맵

  // 🔍 PDF 뷰어 제어 상태
  const [zoomScale, setZoomScale] = useState(1.0)
  const [targetPageInput, setTargetPageInput] = useState('')
  const [activePage, setActivePage] = useState(1)

  // 🎥 유튜브 비디오 ID 추출 헬퍼 (모든 형태의 URL 대응)
  const getYouTubeId = (url) => {
    if (!url) return null
    try {
      // standard youtube.com/watch?v=...
      const urlObj = new URL(url)
      if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v')
      }
      // youtu.be/...
      if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.slice(1)
      }
    } catch (e) {
      // URL 객체 생성 실패 시 정규식 사용
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
      const match = url.match(regExp)
      return (match && match[2].length === 11) ? match[2] : null
    }
    return null
  }

  const youtubeId = selectedFile?.url ? getYouTubeId(selectedFile.url) : (selectedFile?.parsedData?.url ? getYouTubeId(selectedFile.parsedData.url) : null)
  const isYouTube = !!youtubeId

  // 🌐 웹/유튜브 소스인 경우 자동으로 아티클 모드(뷰어)로 전환
  useEffect(() => {
    if (selectedFile?.type === 'web' || selectedFile?.parsedData?.fileType === 'web') {
      console.log('[DataPreview] 웹 소스 감지 - 아티클 모드 강제 전환')
      setViewMode('article')
    } else if (selectedFile) {
      setViewMode('natural')
    }
  }, [selectedFile?.id, selectedFile?.type, selectedFile?.parsedData?.fileType])

  // 유튜브 IFrame API 로드 및 플레이어 초기화
  useEffect(() => {
    if (!youtubeId || viewMode !== 'article') return

    // API 로드 확인
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    }

    // 전역 콜백 등록
    window.onYouTubeIframeAPIReady = () => {
      console.log('[Youtube] API 준비됨')
      initPlayer()
    }

    const initPlayer = () => {
      if (playerRef.current && window.YT) {
        const newPlayer = new window.YT.Player('youtube-player', {
          height: '100%',
          width: '100%',
          videoId: youtubeId,
          playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0
          },
          events: {
            onReady: (event) => {
              console.log('[Youtube] 플레이어 준비 완료')
              setPlayer(event.target)
              playerReadyRef.current = true
            }
          }
        })
      }
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
    }

    return () => {
      // 컴포넌트 언마운트 시 플레이어 파괴할 수 있지만, 
      // 이 POC에서는 단순화함
    }
  }, [youtubeId, viewMode])

  // 시간 이동 핸들러
  const handleTimeSeek = (timeStr, chunkId = null) => {
    if (!player || !playerReadyRef.current) return

    // "1:23" -> 83, "1:12:34" -> 4354 변환
    const parts = timeStr.toString().split(':').map(Number)
    let seconds = 0
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
    } else if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1]
    } else {
      seconds = parts[0]
    }

    console.log(`[Youtube] 시간 이동 시도: ${timeStr} (${seconds}초)`)
    player.seekTo(seconds, true)
    player.playVideo()

    if (chunkId) {
      setHighlightedChunkId(chunkId)
      const element = chunkRefs.current[`chunk-${chunkId}`]
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  // targetTime prop 변경 시 시간 이동 (인용 배지 클릭 시)
  useEffect(() => {
    if (targetTime && player && playerReadyRef.current) {
      // 만약 targetTime이 청크 ID라면 (숫자 형태)
      if (/^\d+$/.test(targetTime)) {
        const chunkId = parseInt(targetTime)
        const chunk = selectedFile.parsedData?.youtubeData?.chunks?.find(c => c.id === chunkId)
        if (chunk) {
          const formatTime = (seconds) => {
            const h = Math.floor(seconds / 3600)
            const m = Math.floor((seconds % 3600) / 60)
            const s = Math.floor(seconds % 60)
            return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
          }
          handleTimeSeek(formatTime(chunk.start), chunkId)
        }
      } else {
        handleTimeSeek(targetTime)
      }
    }
  }, [targetTime, player, selectedFile])

  // 📄 텍스트/웹 소스 가상 페이지 분할 자동 적용 (Safeguard)
  useEffect(() => {
    if (selectedFile?.parsedData && (selectedFile.type === 'web' || selectedFile.parsedData.fileType === 'web' || selectedFile.parsedData.fileType === 'text')) {
      const { extractedText, pageCount, pageTexts } = selectedFile.parsedData

      // 텍스트는 긴데 페이지가 1개뿐인 경우 자동 분할
      if (extractedText && extractedText.length > 2500 && (!pageTexts || pageTexts.length <= 1)) {
        console.log('[DataPreview] 📄 긴 텍스트 감지 - 가상 페이지 분할 자동 적용')
        const virtualization = virtualizeText(extractedText)

        // 원본 데이터 업데이트 (불변성 유지)
        const updatedFile = {
          ...selectedFile,
          parsedData: {
            ...selectedFile.parsedData,
            pageCount: virtualization.pageCount,
            pageTexts: virtualization.pageTexts
          }
        }

        // 부모 컴포넌트에 업데이트 알림 (필요한 경우)
        if (onUpdateData) {
          onUpdateData(updatedFile)
        }
      }
    }
  }, [selectedFile?.id, selectedFile?.parsedData?.extractedText])

  // 편집 상태 관리
  const [isEditing, setIsEditing] = useState(null) // 'summary', 'keyPoints', 'keywords', 'dataDescription', null
  const [editedContent, setEditedContent] = useState({
    summary: '',
    keyPoints: [],
    keywords: []
  })

  // 자연어 편집 상태
  const [isEditingData, setIsEditingData] = useState(false)
  const [editPrompt, setEditPrompt] = useState('')
  const [isProcessingEdit, setIsProcessingEdit] = useState(false)

  // 인라인 편집 상태 (각 필드별)
  const [editingField, setEditingField] = useState(null) // 'filename', 'pageCount', 'textLength' 등
  const [editValue, setEditValue] = useState('')

  // JSON 아코디언 상태
  const [isJsonExpanded, setIsJsonExpanded] = useState(false)

  // AI 행동 지침 제어 상태
  const [aiGuidelines, setAiGuidelines] = useState({
    coreSummary: '', // AI 추출 핵심 요약
    analysisGuidelines: '', // 분석 가이드라인
    systemPromptOverrides: [] // 시스템 프롬프트 덮어쓰기 지침들
  })

  // 동적 페르소나 분석 결과 상태
  const [personaAnalysis, setPersonaAnalysis] = useState(null) // { detectedEntity, documentType, suggestedPersonas }

  // 편집 이력 관리
  const [editHistory, setEditHistory] = useState([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)

  // 편집 이력 보기 상태
  const [showHistory, setShowHistory] = useState(false)

  // 편집 이력에 추가
  const addToHistory = (action, field, oldValue, newValue) => {
    const historyEntry = {
      timestamp: new Date().toISOString(),
      action, // 'edit', 'prompt_override'
      field,
      oldValue,
      newValue,
      description: `${field}을(를) "${oldValue}"에서 "${newValue}"로 변경`
    }

    setEditHistory(prev => {
      // 현재 인덱스 이후의 이력은 삭제 (새 분기 생성)
      const newHistory = prev.slice(0, currentHistoryIndex + 1)
      return [...newHistory, historyEntry]
    })
    setCurrentHistoryIndex(prev => prev + 1)

    console.log('[편집 이력] 추가:', historyEntry)
  }

  // Undo 기능
  const handleUndo = () => {
    if (currentHistoryIndex >= 0) {
      const entry = editHistory[currentHistoryIndex]
      // 이전 값으로 복원
      if (entry.field === 'filename') {
        onUpdateName?.(selectedFile.id, entry.oldValue)
      } else {
        onUpdateData?.(selectedFile.id, entry.field, entry.oldValue)
      }
      setCurrentHistoryIndex(prev => prev - 1)
      console.log('[Undo] 복원:', entry)
    }
  }

  // Redo 기능
  const handleRedo = () => {
    if (currentHistoryIndex < editHistory.length - 1) {
      const entry = editHistory[currentHistoryIndex + 1]
      // 새 값으로 다시 적용
      if (entry.field === 'filename') {
        onUpdateName?.(selectedFile.id, entry.newValue)
      } else {
        onUpdateData?.(selectedFile.id, entry.field, entry.newValue)
      }
      setCurrentHistoryIndex(prev => prev + 1)
      console.log('[Redo] 재적용:', entry)
    }
  }

  // 🔥 데이터 동기화: 부모로부터 전달받은 systemPromptOverrides를 로컬 상태와 동기화
  useEffect(() => {
    if (propSystemPromptOverrides && propSystemPromptOverrides.length > 0) {
      setAiGuidelines(prev => ({
        ...prev,
        systemPromptOverrides: propSystemPromptOverrides
      }))
    } else {
      setAiGuidelines(prev => ({
        ...prev,
        systemPromptOverrides: []
      }))
    }
  }, [propSystemPromptOverrides])

  // 시스템 프롬프트 주입 함수
  const addSystemPromptOverride = (instruction) => {
    const override = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      content: instruction, // instruction -> content로 변경 (통일)
      isActive: true
    }

    const newOverrides = [...aiGuidelines.systemPromptOverrides, override]

    setAiGuidelines(prev => ({
      ...prev,
      systemPromptOverrides: newOverrides
    }))

    // App.jsx를 통해 ChatInterface에 전달
    if (onSystemPromptUpdate) {
      onSystemPromptUpdate(newOverrides)
    }

    // 이력에 추가
    addToHistory('prompt_override', 'AI 행동 지침', '', instruction)

    console.log('[시스템 프롬프트] 주입 및 ChatInterface 동기화:', override)
    return override
  }

  // 시스템 프롬프트 덮어쓰기 제거
  const removeSystemPromptOverride = (id) => {
    const newOverrides = aiGuidelines.systemPromptOverrides.filter(o => o.id !== id)

    setAiGuidelines(prev => ({
      ...prev,
      systemPromptOverrides: newOverrides
    }))

    // App.jsx를 통해 ChatInterface에 전달
    if (onSystemPromptUpdate) {
      onSystemPromptUpdate(newOverrides)
    }

    console.log('[시스템 프롬프트] 제거 및 ChatInterface 동기화')
  }

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

  // 자연어 편집 처리 (GPT API 사용)
  const handleNaturalLanguageEdit = async () => {
    if (!editPrompt.trim() || !selectedFile) return

    setIsProcessingEdit(true)
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

    try {
      console.log('[DataPreview] 자연어 편집 시작:', editPrompt)

      // 현재 데이터 정보를 텍스트로 변환
      const currentData = {
        filename: selectedFile.name,
        fileType: selectedFile.type,
        pageCount: selectedFile.parsedData?.pageCount,
        textLength: selectedFile.parsedData?.extractedText?.length,
        fileSize: selectedFile.parsedData?.fileSize
      }

      const prompt = language === 'ko'
        ? `당신은 지능형 문서 제어 센터의 AI 분석기입니다. 사용자의 자연어 명령을 분석하여 시스템 동작을 결정합니다.

**현재 문서 상태:**
- 파일명: ${currentData.filename}
- 파일 유형: ${currentData.fileType}
- 페이지 수: ${currentData.pageCount || '없음'}
- 텍스트 길이: ${currentData.textLength || '없음'}자
- 파일 크기: ${currentData.fileSize || '없음'}

**사용자 명령:**
"${editPrompt}"

**명령 유형 분류:**
1. **데이터 수정 명령** (예: "페이지를 50으로", "파일명 변경")
   → field: 수정할 필드명, newValue: 새 값

2. **분석 관점 지정** (예: "비용 중심으로 요약해줘", "기술적 관점에서")
   → field: "analysis_perspective", newValue: 관점 설명

3. **범위 제한 명령** (예: "15페이지 이후 제외", "첫 10페이지만")
   → field: "content_range", newValue: 범위 설명

4. **요약 방식 지정** (예: "3페이지로 요약", "핵심만 추출")
   → field: "summary_style", newValue: 요약 방식

JSON 응답 형식:
{
  "commandType": "data_edit | analysis_style | content_filter | summary_mode",
  "field": "필드명 또는 분석 유형",
  "newValue": "새로운 값 또는 지침",
  "description": "무엇을 어떻게 변경하는지 설명",
  "systemPrompt": "LLM에 주입할 최상위 시스템 지침 (선택사항)",
  "requiresRegeneration": true/false (문서 정보 재생성 필요 여부)
}

수정/분석할 수 없는 요청이면 field를 "invalid"로 설정하세요.`
        : `You are an AI analyzer for an intelligent document control center. Analyze user's natural language commands to determine system behavior.

**Current Document State:**
- Filename: ${currentData.filename}
- File Type: ${currentData.fileType}
- Page Count: ${currentData.pageCount || 'None'}
- Text Length: ${currentData.textLength || 'None'} characters
- File Size: ${currentData.fileSize || 'None'}

**User Command:**
"${editPrompt}"

**Command Type Classification:**
1. **Data Edit** (e.g., "set pages to 50", "rename file")
   → field: field name, newValue: new value

2. **Analysis Perspective** (e.g., "summarize from cost perspective", "technical viewpoint")
   → field: "analysis_perspective", newValue: perspective description

3. **Content Range** (e.g., "exclude pages after 15", "only first 10 pages")
   → field: "content_range", newValue: range description

4. **Summary Style** (e.g., "summarize in 3 pages", "extract key points only")
   → field: "summary_style", newValue: summary method

JSON Response Format:
{
  "commandType": "data_edit | analysis_style | content_filter | summary_mode",
  "field": "field name or analysis type",
  "newValue": "new value or instruction",
  "description": "explain what and how to change",
  "systemPrompt": "top-level system instruction to inject into LLM (optional)",
  "requiresRegeneration": true/false (whether document info needs regeneration)
}

Set field to "invalid" if the request cannot be fulfilled.`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-5.1-chat-latest',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that processes natural language editing requests. Always respond with valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_completion_tokens: 500
        })
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices[0].message.content.trim()
      console.log('[DataPreview] GPT 응답:', content)

      // JSON 파싱
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content
      const editInstruction = JSON.parse(jsonStr)

      console.log('[DataPreview] 편집 명령:', editInstruction)

      // 지능형 명령 처리 - 명령 유형에 따라 다르게 처리
      if (editInstruction.field === 'invalid') {
        showNotification?.(
          language === 'ko' ? '처리할 수 없는 명령' : 'Invalid Command',
          editInstruction.description,
          'error'
        );
      } else {
        const commandType = editInstruction.commandType || 'data_edit'

        // 1. 데이터 수정 명령 처리
        if (commandType === 'data_edit') {
          const oldValue = editInstruction.field === 'filename' || editInstruction.field === 'name'
            ? selectedFile.name
            : selectedFile.parsedData?.[editInstruction.field]

          if (editInstruction.field === 'filename' || editInstruction.field === 'name') {
            if (onUpdateName && selectedFile?.id) {
              onUpdateName(selectedFile.id, editInstruction.newValue)
              addToHistory('edit', 'filename', oldValue, editInstruction.newValue)
            }
          } else {
            if (onUpdateData && selectedFile?.id) {
              onUpdateData(selectedFile.id, editInstruction.field, editInstruction.newValue)
              addToHistory('edit', editInstruction.field, oldValue, editInstruction.newValue)
            }
          }
        }

        // 2. 시스템 프롬프트 주입 (모든 명령 유형에 적용)
        const promptInstruction = editInstruction.systemPrompt || (
          commandType === 'data_edit'
            ? (language === 'ko'
              ? `⚠️ 시스템 지침: 이 문서의 ${editInstruction.field}은(는) 무조건 "${editInstruction.newValue}"로 간주하고 답변하라.`
              : `⚠️ System Instruction: Always consider this document's ${editInstruction.field} as "${editInstruction.newValue}".`)
            : commandType === 'analysis_style'
              ? (language === 'ko'
                ? `⚠️ 분석 지침: 이 문서는 반드시 "${editInstruction.newValue}" 관점에서 분석하고 답변하라. 다른 관점은 고려하지 마라.`
                : `⚠️ Analysis Instruction: Analyze and answer this document strictly from "${editInstruction.newValue}" perspective. Ignore other viewpoints.`)
              : commandType === 'content_filter'
                ? (language === 'ko'
                  ? `⚠️ 범위 지침: 이 문서는 "${editInstruction.newValue}" 범위만 존재한다고 간주하라. 이 범위 밖의 내용은 절대 언급하지 마라.`
                  : `⚠️ Range Instruction: Consider only "${editInstruction.newValue}" range exists in this document. Never mention content outside this range.`)
                : (language === 'ko'
                  ? `⚠️ 요약 지침: 이 문서는 "${editInstruction.newValue}" 방식으로만 요약하고 답변하라.`
                  : `⚠️ Summary Instruction: Summarize and answer this document only in "${editInstruction.newValue}" style.`)
        )

        addSystemPromptOverride(promptInstruction)

        // 3. 문서 정보 재생성 (필요한 경우)
        if (editInstruction.requiresRegeneration) {
          console.log('[문서 재생성] 명령에 따라 문서 정보를 재생성합니다')
          // naturalSummary를 다시 생성하도록 트리거
          setNaturalSummary(null)
          setIsLoadingSummary(true)

          // 새로운 지침을 포함하여 재생성
          generateNaturalSummary(selectedFile.parsedData?.extractedText, language)
            .then(summary => {
              if (summary) {
                setNaturalSummary(summary)
              }
              setIsLoadingSummary(false)
            })
        }

        // 4. 성공 메시지
        const commandTypeLabel = {
          'data_edit': language === 'ko' ? '데이터 수정' : 'Data Edit',
          'analysis_style': language === 'ko' ? '분석 관점 설정' : 'Analysis Perspective',
          'content_filter': language === 'ko' ? '범위 제한' : 'Content Filter',
          'summary_mode': language === 'ko' ? '요약 방식 설정' : 'Summary Mode'
        }[commandType] || commandType

        showNotification?.(
          language === 'ko' ? `${commandTypeLabel} 완료` : `${commandTypeLabel} Complete`,
          editInstruction.description,
          'success'
        );

        // 5. 편집 모드 종료
        setIsEditingData(false)
        setEditPrompt('')
      }

    } catch (error) {
      console.error('[DataPreview] 자연어 편집 오류:', error)
      showNotification?.(
        language === 'ko' ? '편집 오류 발생' : 'Edit Error',
        error.message,
        'error'
      );
    } finally {
      setIsProcessingEdit(false)
    }
  }


  // viewMode 변경 감지 디버깅
  useEffect(() => {
    console.log('[DataPreview viewMode 변경] viewMode:', viewMode)
    console.log('[DataPreview viewMode 변경] pdfState:', pdfState)
    console.log('[DataPreview viewMode 변경] selectedFile:', selectedFile?.name)
  }, [viewMode, pdfState.renderedPages.length])

  // 페이지 이동 핸들러 (NotebookLM 스타일 - useCallback으로 메모이제이션)
  // 🚀 Retry 로직 추가: DOM이 준비될 때까지 최대 5번 재시도
  const handlePageNavigate = useCallback(({ pageNumber }) => {
    console.log('═══════════════════════════════════════════════════════')
    console.log('[DataPreview] 📖 페이지 이동 요청:', pageNumber)
    console.log('[현재 상태] viewMode:', viewMode, '| 렌더링된 페이지:', pdfState.renderedPages.length)
    console.log('═══════════════════════════════════════════════════════')

    const isWeb = selectedFile?.type === 'web' || selectedFile?.parsedData?.fileType === 'web'

    // ✅ 일반 텍스트나 웹 소스인 경우 텍스트 미리보기 모드 지원
    if (viewMode !== 'pdf' && viewMode !== 'text-preview' && viewMode !== 'article') {
      console.log('[DataPreview] ⚙️ 뷰어 모드로 전환 중...')
      if (isWeb) {
        setViewMode('article') // 기본은 아티클 모드
      } else {
        setViewMode('pdf')
      }
    }

    // 🎯 Retry 스크롤 함수: DOM이 그려질 때까지 재시도
    const tryScroll = (attempt = 1, maxAttempts = 5) => {
      const pageKey = `page-${pageNumber}`
      const pageElement = pageRefs.current[pageKey]
      const scrollContainer = scrollContainerRef.current

      console.log(`[DataPreview Scroll] 시도 ${attempt}/${maxAttempts} - 페이지 ${pageNumber}`)

      if (pageElement && scrollContainer) {
        // ✅ 성공: 페이지 요소 발견
        const elementTop = pageElement.offsetTop
        const offset = 20

        console.log(`[DataPreview Scroll] ✨ 페이지 ${pageNumber} 발견! 스크롤 시작 (offset: ${offset}px)`)

        // Smooth scroll 실행
        scrollContainer.scrollTo({
          top: elementTop - offset,
          behavior: 'smooth'
        })

        console.log('✅ [DataPreview] 페이지 이동 완료:', pageNumber)
      } else {
        // ⚠️ 실패: 페이지 요소 아직 없음
        if (attempt < maxAttempts) {
          console.warn(`⚠️ [DataPreview] 페이지 ${pageKey} 아직 없음. ${100 * attempt}ms 후 재시도...`)

          // 재귀 호출: 점진적 지연 (100ms, 200ms, 300ms, ...)
          setTimeout(() => {
            tryScroll(attempt + 1, maxAttempts)
          }, 100 * attempt)
        } else {
          // ❌ 최종 실패
          console.error('❌ [DataPreview] 최대 재시도 횟수 초과! 페이지를 찾을 수 없습니다:', pageKey)
          console.error('사용 가능한 페이지 refs:', Object.keys(pageRefs.current))
          console.error('viewMode:', viewMode)
          console.error('렌더링된 페이지 수:', pdfState.renderedPages.length)
        }
      }
    }

    // 초기 지연 후 스크롤 시작 (모드 전환 시간 고려)
    setTimeout(() => {
      tryScroll()
    }, viewMode === 'pdf' ? 50 : 200) // PDF 모드면 빠르게, 아니면 여유 있게
  }, [viewMode, pdfState.renderedPages.length])

  // 페이지 하이라이트 핸들러 (useCallback으로 메모이제이션)
  const handlePageHighlight = useCallback(({ pageNumber, duration }) => {
    console.log('[DataPreview] 페이지 하이라이트 효과:', pageNumber, '지속 시간:', duration)
    setHighlightedPage(pageNumber)
    setTimeout(() => setHighlightedPage(null), duration)
  }, [])

  // targetPage prop 변경 시 페이지/섹션 이동
  useEffect(() => {
    if (targetPage && targetPage > 0) {
      console.log('[DataPreview] targetPage prop 변경 감지:', targetPage)
      console.log('[DataPreview] PDF 로딩 상태:', pdfState.isLoading, '| 렌더링된 페이지 수:', pdfState.renderedPages?.length)

      // 텍스트 뷰어 모드인 경우 섹션으로 스크롤
      if (viewMode === 'text-preview') {
        const sectionElement = document.getElementById(`section-${targetPage}`)
        if (sectionElement && scrollContainerRef.current) {
          console.log('[DataPreview] 텍스트 섹션으로 스크롤:', targetPage)
          // 부모 스크롤 컨테이너 기준으로 스크롤
          const container = scrollContainerRef.current
          const offsetTop = sectionElement.offsetTop - container.offsetTop - 20 // 20px 여백
          container.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          })
        }
      }
      // PDF 모드인 경우
      else {
        // 🔥 PDF가 아직 로딩 중이면 pendingTargetPageRef에 저장 (비동기 체인)
        if (pdfState.isLoading || pdfState.renderedPages?.length === 0) {
          console.log('[DataPreview] ⏳ PDF 로딩 중 - 페이지 대기열에 저장:', targetPage)
          pendingTargetPageRef.current = targetPage
        } else {
          // PDF 로드 완료된 상태면 즉시 스크롤
          console.log('[DataPreview] ✅ PDF 로드 완료 상태 - 즉시 스크롤:', targetPage)
          handlePageNavigate({ pageNumber: targetPage })
          handlePageHighlight({ pageNumber: targetPage, duration: 3000 })
        }
      }
    }
  }, [targetPage, viewMode, pdfState.isLoading, pdfState.renderedPages?.length, handlePageNavigate, handlePageHighlight])

  // 전역 PDF 뷰어 컨트롤러 이벤트 리스너 등록 (Event Bus 패턴)
  useEffect(() => {
    console.log('[DataPreview] PDF 뷰어 컨트롤러 리스너 등록')

    // 리스너 등록
    pdfViewerController.on('pageNavigate', handlePageNavigate)
    pdfViewerController.on('pageHighlight', handlePageHighlight)

    // 클린업
    return () => {
      console.log('[DataPreview] PDF 뷰어 컨트롤러 리스너 제거')
      pdfViewerController.off('pageNavigate', handlePageNavigate)
      pdfViewerController.off('pageHighlight', handlePageHighlight)
    }
  }, [handlePageNavigate, handlePageHighlight])

  // 우측 패널 상태 변경 감지 (모드 전환 + 파일 전환)
  useEffect(() => {
    if (rightPanelState?.mode) {
      console.log('[DataPreview] 🔄 rightPanelState 모드 변경 감지:', rightPanelState.mode)
      console.log('[DataPreview] 🔄 현재 selectedFile:', selectedFile?.name)
      console.log('[DataPreview] 🔄 이전 파일 ID (ref):', previousFileIdRef.current)

      // 🚀 즉시 모드 전환 (PDF 포함)
      setViewMode(rightPanelState.mode)
      console.log('[DataPreview] ✅ viewMode 전환 완료 →', rightPanelState.mode)

      // 🔥 파일 전환 감지: 이전 파일 ID와 현재 파일 ID 비교
      // App.jsx에서 selectedFile이 이미 targetFile로 설정되어 전달되므로
      // previousFileIdRef를 사용하여 실제 파일 전환을 감지
      const isFileChanging = selectedFile &&
        previousFileIdRef.current !== null &&
        previousFileIdRef.current !== selectedFile.id

      if (isFileChanging) {
        console.log('[DataPreview] 🔄 파일 전환 감지!')
        console.log('[DataPreview] 이전 파일 ID:', previousFileIdRef.current)
        console.log('[DataPreview] 새 파일:', selectedFile?.name, '(ID:', selectedFile?.id, ')')

        // 파일 전환 중이면 pendingTargetPageRef에 페이지 저장
        if (rightPanelState.pdfPage) {
          console.log('[DataPreview] ⏳ 파일 전환 중 - 페이지 대기열에 저장:', rightPanelState.pdfPage)
          pendingTargetPageRef.current = rightPanelState.pdfPage
        } else if (rightPanelState.highlightSectionIndex) {
          console.log('[DataPreview] ⏳ 파일 전환 중 - 섹션 대기열에 저장:', rightPanelState.highlightSectionIndex)
          pendingTargetPageRef.current = rightPanelState.highlightSectionIndex
        }
      } else {
        // 파일 전환이 아닌 경우 (같은 파일 내 페이지 이동)
        // PDF 모드 + pdfPage가 있으면 해당 페이지로 스크롤
        if (rightPanelState.mode === 'pdf' && rightPanelState.pdfPage) {
          console.log('[DataPreview] 📖 PDF 페이지 스크롤 요청:', rightPanelState.pdfPage)
          // 약간의 지연 후 스크롤 (DOM 렌더링 대기)
          setTimeout(() => {
            handlePageNavigate({ pageNumber: rightPanelState.pdfPage })
            handlePageHighlight({ pageNumber: rightPanelState.pdfPage, duration: 3000 })
          }, 100)
        }

        // 텍스트 미리보기 모드 + highlightSectionIndex가 있으면 해당 섹션으로 스크롤
        if (rightPanelState.mode === 'text-preview' && rightPanelState.highlightSectionIndex) {
          console.log('[DataPreview] 📝 텍스트 섹션 스크롤 요청:', rightPanelState.highlightSectionIndex)
          setTimeout(() => {
            const sectionElement = document.getElementById(`section-${rightPanelState.highlightSectionIndex}`)
            if (sectionElement && scrollContainerRef.current) {
              const container = scrollContainerRef.current
              const offsetTop = sectionElement.offsetTop - container.offsetTop - 20
              container.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
              })
              // 하이라이트 효과
              setHighlightedPage(rightPanelState.highlightSectionIndex)
              setTimeout(() => setHighlightedPage(null), 3000)
            }
          }, 100)
        }
      }

      // 🔥 현재 파일 ID를 이전 파일로 저장 (다음 비교를 위해)
      previousFileIdRef.current = selectedFile?.id || null
    }
  }, [rightPanelState?.mode, rightPanelState?.pdfPage, rightPanelState?.highlightSectionIndex, selectedFile?.id, handlePageNavigate, handlePageHighlight])

  // Mock PDF 페이지 데이터 생성 (테스트용 - 1~30 페이지)
  const generateMockPages = () => {
    const mockPages = []
    for (let i = 1; i <= 30; i++) {
      mockPages.push({
        pageNumber: i,
        imageData: null, // Mock에서는 이미지 대신 텍스트 표시
        mockContent: `Page ${i} content: This demonstrates the NotebookLM citation system. Key information on this page includes data point #${i}, research finding ${i * 2}, and analysis result ${i * 3}. You can reference this page using citations like [${i}] in your answers.`
      })
    }
    return mockPages
  }

  // 🎯 컴포넌트 마운트 시 Mock 페이지 즉시 로드
  useEffect(() => {
    console.log('[DataPreview] 📖 NotebookLM 모드: Mock PDF 페이지 초기화 (1-30)')
    const mockPages = generateMockPages()
    setPdfState({
      pdf: null,
      currentPage: 1,
      numPages: 30,
      isLoading: false,
      renderedPages: mockPages,
      isMockMode: true
    })
  }, []) // 빈 배열: 컴포넌트 마운트 시 1회만 실행

  // 🔥 파일 전환 완료 감지: selectedFile이 변경될 때 pendingTargetPageRef 확인 및 스크롤 실행
  useEffect(() => {
    if (selectedFile && pendingTargetPageRef.current && pendingTargetPageRef.current > 0) {
      console.log('[DataPreview] 🔄 파일 전환 완료 감지! selectedFile:', selectedFile.name)
      console.log('[DataPreview] 🔄 대기 중인 페이지:', pendingTargetPageRef.current)

      const pendingPage = pendingTargetPageRef.current

      // 파일 타입에 따라 다른 처리
      const fileType = selectedFile?.parsedData?.fileType

      if (fileType === 'pdf') {
        // PDF 파일인 경우: 로딩 완료 후 스크롤 (PDF 로드 useEffect에서 처리)
        console.log('[DataPreview] 📖 PDF 파일 - PDF 로드 완료 후 스크롤 예정')
        // pendingTargetPageRef는 유지 (PDF 로드 완료 후 사용)
      } else {
        // 텍스트 파일인 경우: 즉시 스크롤 시도 (약간의 딜레이로 DOM 렌더링 대기)
        console.log('[DataPreview] 📝 텍스트 파일 - 섹션 스크롤 시도')
        setTimeout(() => {
          const sectionElement = document.getElementById(`section-${pendingPage}`)
          if (sectionElement && scrollContainerRef.current) {
            console.log('[DataPreview] ✅ 섹션 요소 찾음 - 스크롤 실행:', pendingPage)
            const container = scrollContainerRef.current
            const offsetTop = sectionElement.offsetTop - container.offsetTop - 20
            container.scrollTo({
              top: offsetTop,
              behavior: 'smooth'
            })
            // 하이라이트 효과
            setHighlightedPage(pendingPage)
            setTimeout(() => setHighlightedPage(null), 3000)
          } else {
            console.log('[DataPreview] ⚠️ 섹션 요소를 찾지 못함:', `section-${pendingPage}`)
          }
          pendingTargetPageRef.current = null // 대기 페이지 초기화
        }, 300) // 텍스트 렌더링 대기
      }
    }
  }, [selectedFile?.id, selectedFile?.name])

  // PDF 파일 로드 및 전체 페이지 렌더링
  useEffect(() => {
    console.log('[DataPreview PDF 로드 체크] selectedFile:', selectedFile?.name)
    console.log('[DataPreview PDF 로드 체크] file 객체:', selectedFile?.file)
    console.log('[DataPreview PDF 로드 체크] file.type:', selectedFile?.file?.type)
    console.log('[DataPreview PDF 로드 체크] file.name:', selectedFile?.file?.name)

    // PDF 파일 여부 확인 (MIME type 또는 파일 확장자로 판단)
    const isPDF = selectedFile?.file && (
      selectedFile.file.type?.includes('pdf') ||
      selectedFile.file.name?.toLowerCase().endsWith('.pdf') ||
      selectedFile.name?.toLowerCase().endsWith('.pdf')
    )

    console.log('[DataPreview PDF 로드 체크] isPDF:', isPDF)

    // 🎯 Mock 모드: PDF 없을 때 테스트용 페이지 생성
    if (!selectedFile || !isPDF) {
      console.log('[DataPreview PDF 로드 체크] Mock 모드 활성화 - 테스트용 30페이지 생성')
      const mockPages = generateMockPages()
      setPdfState({
        pdf: null,
        currentPage: 1,
        numPages: 30,
        isLoading: false,
        renderedPages: mockPages,
        isMockMode: true
      })
      return
    }

    // 실제 PDF가 있을 때
    if (!selectedFile?.file) {
      setPdfState({ pdf: null, currentPage: 1, numPages: 0, isLoading: false, renderedPages: [], isMockMode: false })
      pdfViewerController.reset()
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

        // 전역 PDF 뷰어 컨트롤러에 준비 완료 알림
        pdfViewerController.setReady(loadedPdf.numPages)
        console.log('[DataPreview PDF] 전역 컨트롤러에 준비 완료 알림:', loadedPdf.numPages, '페이지')

        // 🔥 파일 변경 후 대기 중인 페이지가 있으면 스크롤 실행 (비동기 체인 완성)
        if (pendingTargetPageRef.current && pendingTargetPageRef.current > 0) {
          console.log('[DataPreview PDF] ✅ 대기 중인 페이지로 스크롤:', pendingTargetPageRef.current)
          // 약간의 딜레이 후 스크롤 실행 (렌더링 완료 보장)
          setTimeout(() => {
            handlePageNavigate({ pageNumber: pendingTargetPageRef.current })
            handlePageHighlight({ pageNumber: pendingTargetPageRef.current, duration: 3000 })
            pendingTargetPageRef.current = null // 대기 페이지 초기화
          }, 100)
        }
      } catch (error) {
        console.error('[DataPreview PDF] PDF 로드 오류:', error)
        setPdfState(prev => ({ ...prev, isLoading: false }))
      }
    }

    // PDF 페이지를 이미지로 렌더링하는 헬퍼 함수 (고품질 렌더링: aspect ratio 유지)
    const renderPageToImage = async (page, targetWidth) => {
      try {
        // 기본 viewport를 구해서 원본 크기 확인
        const baseViewport = page.getViewport({ scale: 1.0, rotation: 0 })

        // 목표 너비에 맞는 스케일 계산 (고해상도를 위해 devicePixelRatio 적용)
        const deviceScale = window.devicePixelRatio || 1
        const baseScale = targetWidth / baseViewport.width
        const scale = baseScale * Math.max(deviceScale, 2.0)  // 최소 2배 스케일 보장

        console.log('[DataPreview PDF] 고품질 스케일 계산:', {
          원본너비: baseViewport.width,
          원본높이: baseViewport.height,
          목표너비: targetWidth,
          기본스케일: baseScale,
          디바이스스케일: deviceScale,
          최종스케일: scale
        })

        const viewport = page.getViewport({ scale, rotation: 0 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d', {
          alpha: false, // 투명도 비활성화 (성능 향상)
          desynchronized: true, // 비동기 렌더링 활성화
          willReadFrequently: false // 픽셀 읽기 최적화 비활성화 (성능 향상)
        })

        // Canvas 크기를 뷰포트 크기로 설정 (aspect ratio 자동 유지)
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)

        // 고품질 렌더링 설정
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'

        // 배경 흰색으로 초기화
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)

        // PDF 렌더링 옵션 개선 (텍스트 렌더링 품질 향상)
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          // 텍스트 렌더링 활성화
          enableWebGL: false,
          // 고품질 렌더링 플래그
          renderInteractiveForms: true,
          // 배경 투명도 처리
          background: 'white'
        }

        await page.render(renderContext).promise

        return canvas.toDataURL('image/png', 1.0)
      } catch (error) {
        console.error('[DataPreview PDF] 페이지 렌더링 오류:', error)
        return null
      }
    }

    loadAndRenderAllPages()
  }, [selectedFile?.id, selectedFile?.file]) // selectedFile.id 추가로 파일 전환 감지

  // 파일 변경 시 페르소나 분석 및 기존 지침 초기화
  useEffect(() => {
    if (!selectedFile) {
      setPersonaAnalysis(null)
      return
    }

    const analyzePersonas = async () => {
      console.log('[DataPreview] 파일 변경 감지 - 페르소나 분석 시작:', selectedFile.name)

      // 기존 행동 지침 초기화
      setAiGuidelines(prev => ({
        ...prev,
        systemPromptOverrides: []
      }))
      if (onSystemPromptUpdate) {
        onSystemPromptUpdate([])
      }
      console.log('[DataPreview] 기존 행동 지침 초기화 완료')

      // 페르소나 분석 실행
      try {
        const analysis = await analyzeDocumentForPersonas(
          { name: selectedFile.name, parsedData: selectedFile.parsedData },
          language
        )

        if (analysis) {
          setPersonaAnalysis(analysis)
          console.log('[DataPreview] 페르소나 분석 완료:', analysis)
        } else {
          setPersonaAnalysis(null)
          console.log('[DataPreview] 페르소나 분석 실패 또는 결과 없음')
        }
      } catch (error) {
        console.error('[DataPreview] 페르소나 분석 오류:', error)
        setPersonaAnalysis(null)
      }
    }

    analyzePersonas()
  }, [selectedFile?.id, language]) // 파일 ID 변경 시에만 실행

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
  }, [selectedFile?.id]) // 언어 변경 시에는 재생성하지 않음 (대화 보존)

  // 대화 이력 업데이트 시 동기화 알림 표시
  useEffect(() => {
    if (lastSyncTime && chatHistory.length > 0) {
      setShowSyncNotification(true)
      const timer = setTimeout(() => setShowSyncNotification(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [lastSyncTime, chatHistory.length])

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
      {/* Studio Header - 높이 48.95px 고정 (ChatInterface와 동일) */}
      <div className="px-4 border-b border-gray-200 bg-white flex items-center justify-between" style={{ height: '48.95px' }}>
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {viewMode === 'pdf' ? (
            <h2 className="text-sm font-medium text-gray-700 truncate" title={selectedFile?.name}>
              {selectedFile?.name || (language === 'ko' ? 'PDF 문서' : 'PDF Document')}
            </h2>
          ) : viewMode === 'text-preview' ? (
            <h2 className="text-sm font-medium text-gray-700 truncate" title={rightPanelState.targetFile?.name || selectedFile?.name}>
              {rightPanelState.targetFile?.name || selectedFile?.name || (language === 'ko' ? '문서 뷰어' : 'Document Viewer')}
            </h2>
          ) : (
            <h2 className="text-base font-bold text-gray-900">
              {language === 'ko' ? 'AI 행동 지침 설정' : 'AI Behavior Settings'}
            </h2>
          )}
        </div>
        {/* 닫기 버튼 */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all flex-shrink-0"
            title={language === 'ko' ? '닫기' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
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
            <div className="flex-1 bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50 relative overflow-hidden">
              <div
                ref={scrollContainerRef}
                className="h-full scroll-smooth custom-scrollbar"
                style={{ overflowY: 'scroll' }}
                onScroll={(e) => {
                  // 현재 스크롤 위치를 기반으로 활성 페이지 계산
                  const container = e.target
                  const scrollMiddle = container.scrollTop + (container.clientHeight / 2)

                  // 각 페이지 요소의 위치 확인
                  Object.entries(pageRefs.current).forEach(([key, el]) => {
                    if (el && key.startsWith('page-')) {
                      const pageNum = parseInt(key.replace('page-', ''))
                      const elTop = el.offsetTop
                      const elBottom = elTop + el.clientHeight

                      if (scrollMiddle >= elTop && scrollMiddle <= elBottom) {
                        if (activePage !== pageNum) setActivePage(pageNum)
                      }
                    }
                  })
                }}
              >
                <div className="py-8 px-4 space-y-8 flex flex-col items-center">
                  {pdfState.renderedPages.length > 0 ? (
                    <>
                      {pdfState.renderedPages.map((pageData) => (
                        <div
                          key={`page-${pageData.pageNumber}`}
                          ref={(el) => pageRefs.current[`page-${pageData.pageNumber}`] = el}
                          className={`bg-white transition-all duration-500 shadow-2xl relative group ${highlightedPage === pageData.pageNumber
                            ? 'ring-8 ring-blue-500 ring-opacity-30 scale-[1.02] z-10'
                            : 'border border-gray-200'
                            }`}
                          style={{
                            width: `${Math.min(100, 100 * zoomScale)}%`,
                            maxWidth: zoomScale > 1 ? 'none' : '850px',
                            transform: zoomScale < 1 ? `scale(${zoomScale})` : 'none',
                            transformOrigin: 'top center',
                            marginBottom: zoomScale < 1 ? `-${(1 - zoomScale) * 100}%` : '2rem'
                          }}
                        >
                          {/* 페이지 번호 배지 (Floating) */}
                          <div className="absolute top-4 left-4 z-20">
                            <span className="bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                              P.{pageData.pageNumber}
                            </span>
                          </div>

                          {/* 페이지 이미지 또는 Mock 콘텐츠 */}
                          {pageData.imageData ? (
                            <div className="w-full h-auto overflow-hidden">
                              <img
                                src={pageData.imageData}
                                alt={`Page ${pageData.pageNumber}`}
                                className="w-full h-auto"
                                style={{ imageRendering: 'high-quality' }}
                              />
                            </div>
                          ) : (
                            <div className="p-12 bg-white min-h-[600px] flex items-center justify-center text-gray-400">
                              {pageData.mockContent || (language === 'ko' ? '콘텐츠를 불러오는 중...' : 'Loading content...')}
                            </div>
                          )}

                          {/* 하이라이트 오버레이 */}
                          {highlightedPage === pageData.pageNumber && (
                            <div className="absolute inset-0 bg-blue-500/5 pointer-events-none animate-pulse border-4 border-blue-500" />
                          )}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                      <div className="text-center p-6 bg-red-50 rounded-lg border-2 border-red-200 shadow-lg max-w-md">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-red-400" />
                        <p className="text-lg font-bold text-red-700 mb-2">
                          {language === 'ko' ? '⚠️ PDF 파일을 불러올 수 없습니다' : '⚠️ Cannot load PDF file'}
                        </p>
                        <p className="text-sm text-gray-600 mb-4">
                          {language === 'ko' ? 'PDF 뷰어 모드로 전환되었지만 렌더링된 페이지가 없습니다.' : 'Switched to PDF viewer mode but no rendered pages available.'}
                        </p>
                        <div className="text-xs text-left bg-white p-3 rounded border border-gray-300 font-mono space-y-1 mb-4">
                          <div><span className="font-bold">PDF 로드:</span> {pdfState.pdf ? '✅' : '❌'}</div>
                          <div><span className="font-bold">페이지 수:</span> {pdfState.numPages}</div>
                          <div><span className="font-bold">렌더링됨:</span> {pdfState.renderedPages.length}</div>
                          <div><span className="font-bold">로딩 중:</span> {pdfState.isLoading ? 'Yes' : 'No'}</div>
                          <div className="truncate"><span className="font-bold">파일명:</span> {selectedFile?.name || 'N/A'}</div>
                        </div>
                        <button
                          onClick={() => {
                            console.log('[PDF 디버그] 전체 pdfState:', pdfState)
                            console.log('[PDF 디버그] selectedFile:', selectedFile)
                            alert('콘솔 로그를 확인하세요 (F12)')
                          }}
                          className="w-full py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold shadow-md shadow-blue-200"
                        >
                          {language === 'ko' ? '상세 디버그 정보 출력' : 'Print Debug Info'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 🛠 PDF 플로팅 네비게이션 툴바 */}
              {pdfState.renderedPages.length > 0 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-2 bg-white/80 backdrop-blur-xl border border-gray-200/50 p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] ring-1 ring-black/5">
                  <div className="flex items-center bg-gray-100/50 rounded-xl px-2 py-1 space-x-1">
                    <button
                      onClick={() => handlePageNavigate({ pageNumber: Math.max(1, activePage - 1) })}
                      disabled={activePage <= 1}
                      className="p-1.5 hover:bg-white rounded-lg transition-all disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-700" />
                    </button>

                    <div className="flex items-center px-2 space-x-1.5 min-w-[80px] justify-center">
                      <input
                        type="text"
                        value={targetPageInput !== '' ? targetPageInput : activePage}
                        onFocus={() => setTargetPageInput(activePage.toString())}
                        onChange={(e) => setTargetPageInput(e.target.value)}
                        onBlur={() => setTargetPageInput('')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const num = parseInt(targetPageInput)
                            if (!isNaN(num)) handlePageNavigate({ pageNumber: num })
                            setTargetPageInput('')
                          }
                        }}
                        className="w-8 bg-transparent text-center text-sm font-black text-blue-600 focus:outline-none"
                      />
                      <span className="text-[10px] font-black text-gray-400">/</span>
                      <span className="text-xs font-black text-gray-500">{pdfState.numPages}</span>
                    </div>

                    <button
                      onClick={() => handlePageNavigate({ pageNumber: Math.min(pdfState.numPages, activePage + 1) })}
                      disabled={activePage >= pdfState.numPages}
                      className="p-1.5 hover:bg-white rounded-lg transition-all disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>

                  <div className="w-px h-6 bg-gray-200 mx-1"></div>

                  <div className="flex items-center space-x-1 px-1">
                    <button
                      onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.1))}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                      title="Zoom Out"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>

                    <button
                      onClick={() => setZoomScale(1.0)}
                      className="px-2 py-1 text-[10px] font-black text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all uppercase"
                    >
                      {Math.round(zoomScale * 100)}%
                    </button>

                    <button
                      onClick={() => setZoomScale(prev => Math.min(2.0, prev + 0.1))}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                      title="Zoom In"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'text-preview' ? (
          /* 텍스트 뷰어 모드 (Word/TXT/Excel 파일 - NotebookLM 스타일 전체 문서 표시) */
          <div className="h-full flex flex-col">
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 via-slate-100 to-slate-50"
              style={{ scrollBehavior: 'smooth' }}
            >
              <div className="py-0 px-0">
                {/* 전체 문서 (하나의 긴 종이 스타일로 통합) */}
                <div className="max-w-4xl mx-auto my-8 bg-white shadow-2xl min-h-[calc(100vh-200px)] border border-slate-200 rounded-sm relative overflow-hidden">
                  <div className="h-1 bg-blue-600/20 w-full" />

                  <div className="p-12 sm:p-20">
                    {selectedFile?.parsedData?.pageTexts?.map((section, index) => {
                      const pageNumber = index + 1
                      const isHighlighted = rightPanelState.highlightSectionIndex === pageNumber || highlightedPage === pageNumber

                      return (
                        <div
                          key={`section-${pageNumber}`}
                          id={`section-${pageNumber}`}
                          className="relative group mb-1 scroll-mt-32 px-4 py-2 transition-all duration-500"
                        >
                          {/* 내용 렌더링 */}
                          <div className={`prose prose-slate max-w-none transition-colors duration-700 ${isHighlighted ? 'prose-p:text-slate-900' : 'text-slate-600'
                            }`}>
                            {section.isHtml ? (
                              <div
                                className={`word-content-render transition-all duration-500 ${isHighlighted ? '[&_p]:bg-purple-50 [&_p]:inline-block [&_p]:px-1 [&_p]:rounded-sm' : ''}`}
                                dangerouslySetInnerHTML={{ __html: section.text }}
                              />
                            ) : (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  table: ({ node, ...props }) => (
                                    <div className="my-8 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                                      <table className="min-w-full divide-y divide-slate-200" {...props} />
                                    </div>
                                  ),
                                  thead: ({ node, ...props }) => <thead className="bg-slate-50/50" {...props} />,
                                  th: ({ node, ...props }) => <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest" {...props} />,
                                  td: ({ node, ...props }) => <td className="px-5 py-4 text-sm text-slate-600 border-t border-slate-100" {...props} />,
                                  h1: ({ node, ...props }) => (
                                    <h1 className="text-4xl font-extrabold text-slate-900 mt-14 mb-10 tracking-tight leading-tight">
                                      <span className={`transition-all duration-500 ${isHighlighted ? 'bg-purple-100/70 px-2 py-0.5 rounded-sm' : ''}`}>
                                        {props.children}
                                      </span>
                                    </h1>
                                  ),
                                  h2: ({ node, ...props }) => (
                                    <h2 className="text-2xl font-bold text-slate-800 mt-12 mb-8 tracking-tight border-b border-slate-100 pb-3">
                                      <span className={`transition-all duration-500 ${isHighlighted ? 'bg-purple-50/80 px-1.5 py-0.5 rounded-sm' : ''}`}>
                                        {props.children}
                                      </span>
                                    </h2>
                                  ),
                                  h3: ({ node, ...props }) => (
                                    <h3 className="text-xl font-bold text-slate-800 mt-10 mb-6 tracking-tight">
                                      <span className={`transition-all duration-500 ${isHighlighted ? 'bg-purple-50/80 px-1 py-0.5 rounded-sm' : ''}`}>
                                        {props.children}
                                      </span>
                                    </h3>
                                  ),
                                  strong: ({ node, ...props }) => <strong className="font-bold text-slate-900 underline decoration-slate-200 underline-offset-4" {...props} />,
                                  blockquote: ({ node, ...props }) => (
                                    <blockquote className="border-l-4 border-slate-300 pl-8 py-3 my-10 italic text-slate-600 bg-slate-50/50 rounded-r-2xl" {...props} />
                                  ),
                                  p: ({ node, ...props }) => (
                                    <p className="leading-relaxed my-4 first:mt-0 last:mb-0">
                                      <span className={`transition-all duration-700 ${isHighlighted ? 'bg-purple-50/90 box-decoration-clone px-1 py-0.5 rounded-sm shadow-[0_0_0_2px_rgba(250,245,255,0.9)]' : ''}`}>
                                        {props.children}
                                      </span>
                                    </p>
                                  ),
                                }}
                              >
                                {section.text}
                              </ReactMarkdown>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 문서 푸터 가이드 삭제 */}
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'article' ? (
          /* 🌐 웹 검색 소스 디지털 리포트 (NotebookLM 스타일) */
          <div className="h-full bg-white overflow-y-auto" ref={scrollContainerRef}>
            <div className="max-w-3xl mx-auto py-16 px-10">
              {/* 🎥 유튜브 플레이어 (유튜브 링크인 경우) */}
              {youtubeId && (
                <div className="mb-12 overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] bg-black aspect-video border border-slate-100 ring-1 ring-black/5 animate-in fade-in slide-in-from-top-4 duration-700">
                  <div id="youtube-player" className="w-full h-full" ref={playerRef}></div>
                </div>
              )}

              {/* 📜 유튜브 자막 리스트 (청크/타임스탬프 지원) */}
              {isYouTube && selectedFile.parsedData?.youtubeData?.chunks && (
                <div className="mb-16 bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-slate-900/5">
                  <div className="px-10 py-7 border-b border-slate-100 bg-slate-50/50 backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-red-500 p-2.5 rounded-xl shadow-lg shadow-red-200">
                        <List className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">
                          {language === 'ko' ? '인텔리전트 스크립트 분석' : 'Intelligent Script Analysis'}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          {selectedFile.parsedData.youtubeData.chunks.length} Segments Identified
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-2xl border border-slate-200/60 shadow-sm">
                      <span className="block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Interactive Sync</span>
                    </div>
                  </div>
                  <div className="max-h-[750px] overflow-y-auto p-10 space-y-6 bg-white scroll-smooth custom-scrollbar">
                    {selectedFile.parsedData.youtubeData.chunks.map((item, idx) => {
                      const formatTime = (seconds) => {
                        const h = Math.floor(seconds / 3600)
                        const m = Math.floor((seconds % 3600) / 60)
                        const s = Math.floor(seconds % 60)
                        return h > 0
                          ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                          : `${m}:${String(s).padStart(2, '0')}`
                      }
                      const timeStr = formatTime(item.start)
                      const isHighlighted = highlightedChunkId === item.id

                      return (
                        <div
                          key={idx}
                          ref={(el) => chunkRefs.current[`chunk-${item.id}`] = el}
                          onClick={() => handleTimeSeek(timeStr, item.id)}
                          className={`flex items-start group cursor-pointer p-6 rounded-[1.5rem] transition-all duration-500 border-2 ${isHighlighted
                            ? 'bg-blue-50/40 border-blue-500 shadow-[0_20px_50px_rgba(59,130,246,0.1)] scale-[1.02] ring-[12px] ring-blue-50/50'
                            : 'hover:bg-slate-50/80 hover:border-slate-200 border-transparent hover:translate-x-1'
                            }`}
                        >
                          <div className="flex flex-col items-center w-24 flex-shrink-0 pt-1 mr-8 border-r border-slate-200/50 pr-6">
                            <span className={`text-[12px] font-black px-4 py-2 rounded-xl ${isHighlighted ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-slate-100 text-slate-500 group-hover:bg-red-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-red-200'} transition-all duration-300`}>
                              {timeStr}
                            </span>
                            <span className={`text-[9px] mt-4 font-black uppercase tracking-[0.3em] ${isHighlighted ? 'text-blue-500' : 'text-slate-300'} transition-all`}>
                              INDEX-{item.id}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className={`text-[17px] leading-[1.8] font-medium transition-all duration-300 ${isHighlighted ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900 underline decoration-transparent group-hover:decoration-slate-200 underline-offset-8'}`}>
                              {item.text}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ⚠️ 자막 없음 알림 (chunks와 transcript 모두 체크) */}
              {isYouTube && !selectedFile.parsedData?.youtubeData?.transcript && !selectedFile.parsedData?.youtubeData?.chunks && (
                <div className="mb-12 p-6 bg-amber-50 rounded-2xl border border-amber-200 flex items-start space-x-4 shadow-sm animate-pulse">
                  <div className="bg-amber-100 p-2 rounded-full">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 mb-1">
                      {language === 'ko' ? '자막을 가져올 수 없습니다' : 'No Subtitles Found'}
                    </h4>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      {language === 'ko'
                        ? '이 영상은 자막이 비활성화되어 있거나 자동 생성 자막만 존재할 수 있습니다. 영상 플레이어에서 직접 확인하시거나 브라우저에서 시청해 주세요.'
                        : 'Subtitles for this video might be disabled or only auto-generated. Please check directly on the player or browser.'}
                    </p>
                  </div>
                </div>
              )}

              {/* 1. 리포트 메타데이터 (헤더) */}
              <header className="mb-12">
                <div className="flex items-center space-x-2 text-slate-400 mb-6">
                  <Globe className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Digital Web Report</span>
                  <span className="text-slate-200 px-1">•</span>
                  <span className="text-[10px] font-medium tracking-wider">
                    {new Date(selectedFile.uploadedAt || Date.now()).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                <div className="flex items-start justify-between group">
                  <h1 className="text-4xl font-black text-slate-900 leading-[1.2] tracking-tight flex-1">
                    {selectedFile.parsedData?.metadata?.title || selectedFile.name}
                  </h1>
                  <a
                    href={selectedFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-6 p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 shadow-sm border border-slate-100"
                    title={language === 'ko' ? '원문 보기' : 'View Original'}
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>

                <div className="mt-6 flex items-center space-x-3 text-sm text-slate-500 font-medium">
                  <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${selectedFile.url}&sz=32`}
                      alt="favicon"
                      className="w-4 h-4 rounded-sm"
                      onError={(e) => { e.target.src = 'https://www.google.com/s2/favicons?domain=google.com&sz=32' }}
                    />
                    <span>{new URL(selectedFile.url || 'https://google.com').hostname}</span>
                  </div>
                </div>
              </header>

              {/* 3. 본문 리포트 (Prose Typography) */}
              <article className="prose prose-slate prose-lg max-w-none prose-headings:font-black prose-h1:text-4xl prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-p:text-slate-600 prose-p:leading-[1.8] prose-strong:text-slate-900 prose-strong:bg-yellow-50 prose-strong:px-1 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-slate-50 prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-img:rounded-3xl prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedFile.parsedData?.extractedText || selectedFile.extractedText || selectedFile.text || selectedFile.fullText || (language === 'ko' ? '> ⚠️ 웹 페이지 본문 내용을 가져오지 못했습니다. 원본 사이트에서 직접 확인하시거나 AI 답변을 참고해주세요.' : '> ⚠️ Could not fetch web page content. Please visit the site or refer to the AI response.')}
                </ReactMarkdown>
              </article>
            </div>
          </div>
        ) : (
          /* 자연어 데이터 설명 모드 */
          <div className="space-y-6 pb-10">
            {/* 🎥 유튜브 플레이어 (자연어 모드에서도 표시) */}
            {youtubeId && (
              <div className="mb-6 overflow-hidden rounded-2xl shadow-xl bg-black aspect-video border border-gray-200">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0&modestbranding=1`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
            )}

            {/* ✨ AI 분석 캔버스 (NotebookLM 스타일) */}
            <div className="space-y-6">
              {isLoadingSummary ? (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
                  <div className="flex items-center space-x-2 mb-4">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-3 bg-gray-100 rounded w-full"></div>
                    <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                    <div className="h-3 bg-gray-100 rounded w-4/6"></div>
                  </div>
                </div>
              ) : naturalSummary ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {/* 핵심 요약 카드 */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="bg-blue-50 p-2 rounded-xl">
                          <Sparkles className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                          {language === 'ko' ? 'AI 핵심 요약' : 'AI Core Summary'}
                        </h3>
                      </div>
                      {!isReadOnly && isEditing !== 'summary' && (
                        <button
                          onClick={() => handleStartEdit('summary')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {isEditing === 'summary' ? (
                      <div className="space-y-3">
                        <textarea
                          value={editedContent.summary}
                          onChange={(e) => setEditedContent({ ...editedContent, summary: e.target.value })}
                          className="w-full p-3 text-sm border-2 border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px]"
                        />
                        <div className="flex justify-end space-x-2">
                          <button onClick={handleCancelEdit} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">
                            {language === 'ko' ? '취소' : 'Cancel'}
                          </button>
                          <button onClick={handleSaveEdit} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            {language === 'ko' ? '저장' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="prose prose-slate prose-sm max-w-none text-gray-700 leading-relaxed">
                        {typeof naturalSummary === 'string' ? (
                          <ReactMarkdown>{naturalSummary}</ReactMarkdown>
                        ) : (
                          <p>{naturalSummary.summary}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 주요 내용 (Key Points) */}
                  {typeof naturalSummary === 'object' && naturalSummary.keyPoints && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="bg-indigo-50 p-2 rounded-xl">
                            <Lightbulb className="w-5 h-5 text-indigo-600" />
                          </div>
                          <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                            {language === 'ko' ? '주요 인사이트' : 'Key Insights'}
                          </h3>
                        </div>
                        {!isReadOnly && isEditing !== 'keyPoints' && (
                          <button
                            onClick={() => handleStartEdit('keyPoints')}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {isEditing === 'keyPoints' ? (
                        <div className="space-y-3">
                          {editedContent.keyPoints.map((point, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                              <input
                                value={point}
                                onChange={(e) => {
                                  const newPoints = [...editedContent.keyPoints]
                                  newPoints[idx] = e.target.value
                                  setEditedContent({ ...editedContent, keyPoints: newPoints })
                                }}
                                className="flex-1 p-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          ))}
                          <div className="flex justify-end space-x-2">
                            <button onClick={handleCancelEdit} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">
                              {language === 'ko' ? '취소' : 'Cancel'}
                            </button>
                            <button onClick={handleSaveEdit} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                              {language === 'ko' ? '저장' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <ul className="space-y-3">
                          {naturalSummary.keyPoints.map((point, idx) => (
                            <li key={idx} className="flex items-start space-x-3 text-sm text-gray-700">
                              <div className="mt-1.5 w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0" />
                              <span className="leading-relaxed">{point}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* 키워드 (Keywords) */}
                  {typeof naturalSummary === 'object' && naturalSummary.keywords && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="bg-purple-50 p-2 rounded-xl">
                            <ExternalLink className="w-5 h-5 text-purple-600" />
                          </div>
                          <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                            {language === 'ko' ? '핵심 키워드' : 'Core Keywords'}
                          </h3>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {naturalSummary.keywords.map((keyword, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-100 hover:bg-purple-100 transition-colors cursor-default"
                          >
                            # {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* 페르소나 추천 (Persona Analysis) */}
              {personaAnalysis && (
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl shadow-indigo-100 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold tracking-tight">
                        {language === 'ko' ? '추천 AI 페르소나' : 'Suggested AI Personas'}
                      </h3>
                      <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest mt-0.5">
                        {personaAnalysis.documentType} Detected
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {personaAnalysis.suggestedPersonas?.map((persona, idx) => (
                      <div
                        key={idx}
                        onClick={() => addSystemPromptOverride(`${persona.role}: ${persona.description}`)}
                        className="bg-white/10 hover:bg-white/20 transition-all rounded-xl p-3 border border-white/10 backdrop-blur-md cursor-pointer group active:scale-[0.98]"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black tracking-tight">{persona.role}</span>
                          <div className="bg-white/20 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all">
                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                        <p className="text-[11px] text-indigo-50 leading-relaxed font-medium">
                          {persona.description}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="mt-4 text-[10px] text-indigo-200/80 font-medium text-center italic">
                    {language === 'ko'
                      ? '* 페르소나를 선택하여 특화된 분석을 시작하세요'
                      : '* Select a persona for specialized analysis'}
                  </p>
                </div>
              )}

              {/* 기본 상세 정보 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/30">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center space-x-2">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{language === 'ko' ? '상세 명세' : 'Technical Specifications'}</span>
                  </h3>
                </div>

                <div className="p-6 space-y-4 text-sm text-gray-700">
                  {/* 파일명 */}
                  <div className="flex items-start justify-between group">
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Filename</p>
                      {editingField === 'filename' ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border-2 border-blue-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onUpdateName?.(selectedFile.id, editValue)
                                setEditingField(null)
                              } else if (e.key === 'Escape') {
                                setEditingField(null)
                              }
                            }}
                          />
                          <button onClick={() => { onUpdateName?.(selectedFile.id, editValue); setEditingField(null); }} className="p-2 text-green-600 hover:bg-green-50 rounded-xl">
                            <Save className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{selectedFile.name}</p>
                      )}
                    </div>
                    {editingField !== 'filename' && !isReadOnly && (
                      <button onClick={() => { setEditingField('filename'); setEditValue(selectedFile.name); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* 파일 유형 및 정보 그리드 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Mime Type</p>
                      <p className="font-bold text-gray-800 truncate">
                        {selectedFile.type === 'web' ? 'Web Interface' : selectedFile.file?.type || 'Standard Text'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group relative">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Page Count</p>
                      {editingField === 'pageCount' ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-blue-200 rounded focus:outline-none"
                            autoFocus
                          />
                          <button onClick={() => { onUpdateData?.(selectedFile.id, 'pageCount', parseInt(editValue)); setEditingField(null); }} className="text-green-600">
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-gray-800">{selectedFile.parsedData?.pageCount || '1'} Pages</p>
                          {!isReadOnly && (
                            <button onClick={() => { setEditingField('pageCount'); setEditValue((selectedFile.parsedData?.pageCount || 1).toString()); }} className="opacity-0 group-hover:opacity-100 p-1 text-blue-600">
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 데이터 메타데이터 */}
                  <div className="pt-2">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="h-px bg-gray-100 flex-1"></div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Metadata</span>
                      <div className="h-px bg-gray-100 flex-1"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-500 font-bold">Characters</span>
                        <span className="text-gray-900 font-black">{(selectedFile.parsedData?.extractedText?.length || 0).toLocaleString()} chars</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-gray-500 font-bold">Source ID</span>
                        <span className="text-gray-400 font-mono">{selectedFile.id.substring(0, 12)}...</span>
                      </div>
                    </div>
                  </div>

                  {/* AI 행동 지침 제어기 (Prompt Editor - 공유받은 유저는 숨김) */}
                  {!isReadOnly && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setIsEditingData(!isEditingData)}
                          className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span>
                            {isEditingData
                              ? (language === 'ko' ? '편집 취소' : 'Cancel Edit')
                              : (language === 'ko' ? '🤖 AI 행동 지침 제어' : '🤖 AI Behavior Control')
                            }
                          </span>
                        </button>

                        {/* Undo/Redo 버튼 */}
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={handleUndo}
                            disabled={currentHistoryIndex < 0}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title={language === 'ko' ? '실행 취소 (Undo)' : 'Undo'}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleRedo}
                            disabled={currentHistoryIndex >= editHistory.length - 1}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            title={language === 'ko' ? '다시 실행 (Redo)' : 'Redo'}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded ml-1"
                            title={language === 'ko' ? '편집 이력 보기' : 'View Edit History'}
                          >
                            <List className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* 편집 이력 표시 */}
                      {showHistory && editHistory.length > 0 && (
                        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2">
                            {language === 'ko' ? '📝 편집 이력' : '📝 Edit History'}
                          </h4>
                          <div className="space-y-2">
                            {editHistory.map((entry, index) => (
                              <div
                                key={index}
                                className={`text-xs p-2 rounded ${index === currentHistoryIndex
                                  ? 'bg-blue-100 border border-blue-300'
                                  : 'bg-white border border-gray-200'
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-700">
                                    {entry.action === 'prompt_override' ? '🤖' : '✏️'} {entry.field}
                                  </span>
                                  <span className="text-gray-500 text-[10px]">
                                    {new Date(entry.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                {entry.oldValue && (
                                  <div className="mt-1 text-gray-600">
                                    <span className="line-through">{String(entry.oldValue).substring(0, 30)}</span>
                                    {' → '}
                                    <span className="text-green-600 font-medium">
                                      {String(entry.newValue).substring(0, 30)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 활성화된 AI 지침 표시 (공유받은 유저는 숨김) */}
                      {!isReadOnly && propSystemPromptOverrides.length > 0 && (
                        <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-semibold text-purple-800">
                              {language === 'ko' ? '🤖 활성 AI 지침' : '🤖 Active AI Instructions'}
                            </h4>
                            <span className="text-xs text-purple-600">
                              {propSystemPromptOverrides.length}개 적용됨
                            </span>
                          </div>
                          <div className="space-y-2">
                            {propSystemPromptOverrides.map((override) => (
                              <div key={override.id} className="bg-white border border-purple-200 rounded p-2 text-xs">
                                <div className="flex items-start justify-between">
                                  <p className="text-gray-700 flex-1 pr-2">{override.content}</p>
                                  {!isReadOnly && (
                                    <button
                                      onClick={() => removeSystemPromptOverride(override.id)}
                                      className="text-red-600 hover:bg-red-50 p-1 rounded flex-shrink-0"
                                      title={language === 'ko' ? '제거' : 'Remove'}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isEditingData && (
                        <div className="mt-3 space-y-3">
                          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                            <h5 className="text-xs font-bold text-purple-900 mb-3 flex items-center space-x-2">
                              <span className="text-lg">🧠</span>
                              <span>{language === 'ko' ? '지능형 문서 제어 센터' : 'Intelligent Document Control Center'}</span>
                            </h5>

                            <div className="space-y-2 text-xs">
                              <p className="text-gray-700 font-medium">
                                {language === 'ko'
                                  ? '📌 지원하는 명령 유형:'
                                  : '📌 Supported Command Types:'
                                }
                              </p>

                              <div className="grid grid-cols-1 gap-1.5">
                                <div className="bg-white bg-opacity-60 rounded px-2 py-1">
                                  <span className="text-purple-700 font-semibold">1. </span>
                                  <span className="text-gray-800">
                                    {language === 'ko'
                                      ? '"비용 중심으로 요약해줘"'
                                      : '"Summarize from cost perspective"'
                                    }
                                  </span>
                                </div>

                                <div className="bg-white bg-opacity-60 rounded px-2 py-1">
                                  <span className="text-purple-700 font-semibold">2. </span>
                                  <span className="text-gray-800">
                                    {language === 'ko'
                                      ? '"15페이지 이후는 제외해줘"'
                                      : '"Exclude content after page 15"'
                                    }
                                  </span>
                                </div>

                                <div className="bg-white bg-opacity-60 rounded px-2 py-1">
                                  <span className="text-purple-700 font-semibold">3. </span>
                                  <span className="text-gray-800">
                                    {language === 'ko'
                                      ? '"3페이지로 요약해줘"'
                                      : '"Summarize in 3 pages"'
                                    }
                                  </span>
                                </div>

                                <div className="bg-white bg-opacity-60 rounded px-2 py-1">
                                  <span className="text-purple-700 font-semibold">4. </span>
                                  <span className="text-gray-800">
                                    {language === 'ko'
                                      ? '"페이지 수를 100으로 인식해"'
                                      : '"Recognize page count as 100"'
                                    }
                                  </span>
                                </div>
                              </div>

                              <p className="text-purple-600 font-medium mt-2">
                                {language === 'ko'
                                  ? '⚡ 명령이 LLM 시스템 프롬프트에 즉시 반영되어 채팅 답변 스타일이 변경됩니다!'
                                  : '⚡ Commands will be immediately reflected in LLM system prompt, changing chat response style!'
                                }
                              </p>
                            </div>
                          </div>

                          <textarea
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder={language === 'ko'
                              ? '예: "비용 절감 관점으로 분석해줘", "처음 20페이지만 고려해", "핵심만 3줄로 요약"...'
                              : 'e.g., "Analyze from cost-saving perspective", "Only consider first 20 pages", "Summarize key points in 3 lines"...'
                            }
                            className="w-full px-4 py-3 text-sm border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none placeholder-gray-500"
                            rows={4}
                            disabled={isProcessingEdit}
                          />

                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                setIsEditingData(false)
                                setEditPrompt('')
                              }}
                              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                              disabled={isProcessingEdit}
                            >
                              {language === 'ko' ? '취소' : 'Cancel'}
                            </button>
                            <button
                              onClick={handleNaturalLanguageEdit}
                              disabled={!editPrompt.trim() || isProcessingEdit}
                              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                            >
                              {isProcessingEdit ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>{language === 'ko' ? '처리 중...' : 'Processing...'}</span>
                                </>
                              ) : (
                                <span>{language === 'ko' ? '적용' : 'Apply'}</span>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 원본 JSON 데이터 (개발자용) - 아코디언 */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mt-4">
                    <button
                      onClick={() => setIsJsonExpanded(!isJsonExpanded)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isJsonExpanded ? 'rotate-90' : ''}`} />
                        <span className="text-xs font-semibold text-gray-700">
                          {language === 'ko' ? '구조화 데이터 (개발자용)' : 'Structured Data (Developer)'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {isJsonExpanded ? (language === 'ko' ? '접기' : 'Collapse') : (language === 'ko' ? '펼치기' : 'Expand')}
                      </span>
                    </button>

                    {isJsonExpanded && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="font-mono text-xs bg-white rounded-md p-3 overflow-x-auto border border-gray-200">
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
                            {/* 실시간 대화 이력 추가 */}
                            {chatHistory.length > 0 && (
                              <div className="my-0.5">
                                <span className="text-red-600">"chatHistory"</span>
                                <span className="text-gray-600">: </span>
                                {renderValue(chatHistory, 'chatHistory', 0)}
                                <span className="text-gray-600">,</span>
                              </div>
                            )}
                            {/* AI 시스템 프롬프트 덮어쓰기 추가 */}
                            {propSystemPromptOverrides.length > 0 && (
                              <div className="my-0.5">
                                <span className="text-red-600">"systemPromptOverrides"</span>
                                <span className="text-gray-600">: </span>
                                {renderValue(propSystemPromptOverrides, 'systemPromptOverrides', 0)}
                                <span className="text-gray-600">,</span>
                              </div>
                            )}
                          </div>
                          <div className="text-gray-600">{'}'}</div>
                        </div>

                        <div className="mt-3 text-xs text-gray-500">
                          {language === 'ko'
                            ? '💡 위 데이터는 시스템 내부 처리용 정보입니다. 상단의 자연어 설명을 편집하면 이 데이터도 자동으로 동기화됩니다.'
                            : '💡 This data is for internal system processing. Editing the natural language descriptions above will automatically sync this data.'
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer (Sticky at bottom, outside main scrollable area) */}
      {selectedFile && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          {/* 동기화 알림 배너 */}
          {showSyncNotification && (
            <div className="mb-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>
                {language === 'ko'
                  ? '대화 이력이 구조화 데이터로 동기화되었습니다'
                  : 'Chat history synchronized to structured data'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DataPreview
