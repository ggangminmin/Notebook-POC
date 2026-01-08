import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronRight, ChevronDown, Copy, Check, Loader2, Lightbulb, FileText, List, ChevronLeft, X, Edit2, Save } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import Tooltip from './Tooltip'
import SystemPromptPanel from './SystemPromptPanel'
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

const DataPreview = ({ selectedFile, rightPanelState, onPanelModeChange, onUpdateData, onUpdateName, onSystemPromptUpdate, chatHistory = [], lastSyncTime, systemPromptOverrides: propSystemPromptOverrides = [], targetPage = null, onClose }) => {
  // 독립적인 상태 관리 (ChatInterface와 분리)
  const [expandedKeys, setExpandedKeys] = useState(new Set(['root']))
  const [isCopied, setIsCopied] = useState(false)
  const [viewMode, setViewMode] = useState('natural') // 🎯 초기 모드: 자연어 분석 모드 (인용 배지 클릭 시 PDF 모드로 전환)
  const [naturalSummary, setNaturalSummary] = useState(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [pdfState, setPdfState] = useState({ pdf: null, currentPage: 1, numPages: 0, isLoading: false, renderedPages: [] })
  const scrollContainerRef = useRef(null)
  const pageRefs = useRef({})
  const { language } = useLanguage()
  const [showSyncNotification, setShowSyncNotification] = useState(false)
  const [highlightedPage, setHighlightedPage] = useState(null) // 페이지 이동 시 하이라이트 효과

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

  // 시스템 프롬프트 주입 함수
  const addSystemPromptOverride = (instruction) => {
    const override = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      instruction,
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
        alert(language === 'ko'
          ? `처리할 수 없는 명령입니다: ${editInstruction.description}`
          : `Cannot process command: ${editInstruction.description}`
        )
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

        alert(language === 'ko'
          ? `✅ ${commandTypeLabel} 완료!\n\n📝 ${editInstruction.description}\n\n🤖 AI 시스템 프롬프트에 적용:\n"${promptInstruction}"\n\n${editInstruction.requiresRegeneration ? '📊 문서 정보가 새 지침에 따라 재생성됩니다.' : ''}`
          : `✅ ${commandTypeLabel} Complete!\n\n📝 ${editInstruction.description}\n\n🤖 Applied to AI System Prompt:\n"${promptInstruction}"\n\n${editInstruction.requiresRegeneration ? '📊 Document info will be regenerated according to new instruction.' : ''}`
        )

        // 5. 편집 모드 종료
        setIsEditingData(false)
        setEditPrompt('')
      }

    } catch (error) {
      console.error('[DataPreview] 자연어 편집 오류:', error)
      alert(language === 'ko'
        ? `편집 처리 중 오류가 발생했습니다: ${error.message}`
        : `Error processing edit: ${error.message}`
      )
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

      // ✅ 강제 PDF 뷰어 모드로 전환
      if (viewMode !== 'pdf') {
        console.log('[DataPreview] ⚙️ PDF 뷰어 모드로 전환 중...')
        setViewMode('pdf')
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
      // PDF 모드인 경우 기존 로직 실행
      else {
        handlePageNavigate({ pageNumber: targetPage })
        // 하이라이트 효과 추가
        handlePageHighlight({ pageNumber: targetPage, duration: 3000 })
      }
    }
  }, [targetPage, viewMode, handlePageNavigate, handlePageHighlight])

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

  // 우측 패널 상태 변경 감지 (모드 전환)
  useEffect(() => {
    if (rightPanelState?.mode) {
      console.log('[DataPreview] 🔄 rightPanelState 모드 변경 감지:', rightPanelState.mode)

      // 🚀 즉시 모드 전환 (PDF 포함)
      setViewMode(rightPanelState.mode)
      console.log('[DataPreview] ✅ viewMode 전환 완료 →', rightPanelState.mode)

      // PDF 모드 + pdfPage가 있으면 해당 페이지로 스크롤
      if (rightPanelState.mode === 'pdf' && rightPanelState.pdfPage) {
        console.log('[DataPreview] 📖 PDF 페이지 스크롤 요청:', rightPanelState.pdfPage)
        // 약간의 지연 후 스크롤 (DOM 렌더링 대기)
        setTimeout(() => {
          handlePageNavigate({ pageNumber: rightPanelState.pdfPage })
          handlePageHighlight({ pageNumber: rightPanelState.pdfPage, duration: 3000 })
        }, 100)
      }
    }
  }, [rightPanelState?.mode, rightPanelState?.pdfPage, handlePageNavigate, handlePageHighlight])

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
      {/* Studio Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 flex-1">
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
                  {language === 'ko' ? 'AI 행동 지침 설정' : 'AI Behavior Settings'}
                </h2>
                {viewMode === 'natural' && selectedFile && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-semibold">
                    설정
                  </span>
                )}
              </>
            )}
          </div>
          {/* 닫기 버튼 */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all"
              title={language === 'ko' ? '닫기' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
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
              /* 스켈레톤 UI - 부드러운 로딩 경험 */
              <div className="flex-1 bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50" style={{ overflowY: 'scroll' }}>
                <div className="py-4 px-3 space-y-4">
                  {/* 스켈레톤 페이지 카드 (3개) */}
                  {[1, 2, 3].map((idx) => (
                    <div key={`skeleton-${idx}`} className="bg-white mx-auto shadow-lg rounded-lg overflow-hidden border border-gray-200 animate-pulse">
                      {/* 헤더 스켈레톤 */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                        <div className="h-3 bg-gray-300 rounded w-20"></div>
                        <div className="h-3 bg-gray-300 rounded-full w-12"></div>
                      </div>
                      {/* 페이지 콘텐츠 스켈레톤 */}
                      <div className="w-full bg-gray-200 aspect-[8.5/11]"></div>
                    </div>
                  ))}
                  {/* 로딩 상태 표시 */}
                  <div className="text-center py-4">
                    <Loader2 className="w-6 h-6 mx-auto mb-2 text-blue-600 animate-spin" />
                    <p className="text-[11px] font-medium text-gray-700">
                      {language === 'ko' ? 'PDF 렌더링 중...' : 'Rendering PDF...'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {language === 'ko' ? '고해상도로 준비하고 있습니다' : 'Preparing in high quality'}
                    </p>
                  </div>
                </div>
              </div>
            ) : pdfState.renderedPages.length > 0 ? (
              <div
                ref={scrollContainerRef}
                className="flex-1 bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50"
                style={{ overflowY: 'scroll', scrollBehavior: 'smooth' }}
              >
                <div className="py-4 px-3 space-y-4">
                  {pdfState.renderedPages.map((pageData) => (
                    <div
                      key={`page-${pageData.pageNumber}`}
                      ref={(el) => pageRefs.current[`page-${pageData.pageNumber}`] = el}
                      className={`bg-white mx-auto shadow-lg rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl ${
                        highlightedPage === pageData.pageNumber
                          ? 'border-4 border-blue-500 ring-8 ring-blue-300 ring-opacity-50 animate-pulse scale-105 shadow-2xl'
                          : 'border border-gray-200'
                      }`}
                      style={highlightedPage === pageData.pageNumber ? {
                        transform: 'scale(1.02)',
                        boxShadow: '0 20px 60px rgba(59, 130, 246, 0.4)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      } : {}}
                    >
                      {/* 페이지 번호 표시 - NotebookLM 스타일 (슬림화) + 하이라이트 효과 */}
                      <div className={`px-3 py-2 border-b border-gray-200 flex items-center justify-between transition-all ${
                        highlightedPage === pageData.pageNumber
                          ? 'bg-gradient-to-r from-blue-100 to-indigo-100'
                          : 'bg-gradient-to-r from-blue-50 to-indigo-50'
                      }`}>
                        <span className={`text-[11px] font-bold flex items-center space-x-1.5 ${
                          highlightedPage === pageData.pageNumber ? 'text-blue-700' : 'text-gray-700'
                        }`}>
                          <FileText className={`w-3 h-3 ${highlightedPage === pageData.pageNumber ? 'text-blue-700' : 'text-blue-600'}`} />
                          <span>{language === 'ko' ? '페이지' : 'Page'} {pageData.pageNumber}</span>
                          {highlightedPage === pageData.pageNumber && (
                            <span className="ml-2 text-[9px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse">
                              {language === 'ko' ? '← 인용된 페이지' : '← Cited Page'}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-full font-semibold">
                          {pageData.pageNumber} / {pdfState.numPages}
                        </span>
                      </div>
                      {/* 페이지 이미지 또는 Mock 콘텐츠 */}
                      {pageData.imageData ? (
                        <div className="w-full overflow-hidden">
                          <img
                            src={pageData.imageData}
                            alt={`Page ${pageData.pageNumber}`}
                            className="w-full h-auto"
                            style={{
                              imageRendering: 'high-quality',
                              display: 'block',
                              maxWidth: '100%',
                              height: 'auto'
                            }}
                          />
                        </div>
                      ) : pageData.mockContent ? (
                        /* Mock 페이지 콘텐츠 (테스트용) */
                        <div className="p-8 bg-white min-h-[500px] flex flex-col items-center justify-center">
                          <div className="text-center mb-6">
                            <div className="text-6xl font-bold text-blue-500 mb-2">
                              {pageData.pageNumber}
                            </div>
                            <div className="text-sm text-gray-500 uppercase tracking-wide">
                              Mock Page
                            </div>
                          </div>
                          <div className="max-w-md text-sm text-gray-700 leading-relaxed text-center px-6">
                            <p className="mb-4">
                              {pageData.mockContent}
                            </p>
                            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-left">
                              <p className="font-semibold text-blue-800 mb-2">
                                💡 Test Citation Examples:
                              </p>
                              <ul className="list-disc list-inside space-y-1 text-blue-700">
                                <li>Single page: <code className="bg-white px-1 py-0.5 rounded">[{pageData.pageNumber}]</code></li>
                                <li>Range: <code className="bg-white px-1 py-0.5 rounded">[{pageData.pageNumber}-{Math.min(pageData.pageNumber + 2, 30)}]</code></li>
                                <li>Multiple: <code className="bg-white px-1 py-0.5 rounded">[{pageData.pageNumber}, {Math.min(pageData.pageNumber + 3, 30)}]</code></li>
                              </ul>
                            </div>
                          </div>
                        </div>
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
                <div className="text-center p-6 bg-red-50 rounded-lg border-2 border-red-200">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-red-400" />
                  <p className="text-lg font-bold text-red-700 mb-2">
                    {language === 'ko' ? '⚠️ PDF 파일을 불러올 수 없습니다' : '⚠️ Cannot load PDF file'}
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    {language === 'ko' ? 'PDF 뷰어 모드로 전환되었지만 렌더링된 페이지가 없습니다.' : 'Switched to PDF viewer mode but no rendered pages available.'}
                  </p>
                  <div className="text-xs text-left bg-white p-3 rounded border border-gray-300 font-mono">
                    <div className="mb-1"><strong>디버그 정보:</strong></div>
                    <div>• PDF 로드됨: {pdfState.pdf ? '✅ Yes' : '❌ No'}</div>
                    <div>• 전체 페이지: {pdfState.numPages}</div>
                    <div>• 렌더링된 페이지: {pdfState.renderedPages.length}</div>
                    <div>• 로딩 중: {pdfState.isLoading ? 'Yes' : 'No'}</div>
                    <div>• 파일명: {selectedFile?.name || 'N/A'}</div>
                    <div>• 파일 타입: {selectedFile?.file?.type || 'N/A'}</div>
                  </div>
                  <button
                    onClick={() => {
                      console.log('[PDF 디버그] 전체 pdfState:', pdfState)
                      console.log('[PDF 디버그] selectedFile:', selectedFile)
                      alert('콘솔 로그를 확인하세요 (F12)')
                    }}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    {language === 'ko' ? '상세 디버그 정보 출력' : 'Print Debug Info'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : viewMode === 'text-preview' ? (
          /* 텍스트 뷰어 모드 (Word/TXT/Excel 파일 - NotebookLM 스타일 전체 문서 표시) */
          <div className="h-full flex flex-col">
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50"
              style={{ scrollBehavior: 'smooth' }}
            >
              <div className="py-4 px-3 space-y-4">
                {/* 전체 페이지를 순회하며 표시 (텍스트만 추출됨 - 이미지/레이아웃 제외) */}
                {selectedFile?.parsedData?.pageTexts?.map((section, index) => {
                  const pageNumber = index + 1
                  const isHighlighted = rightPanelState.highlightSectionIndex === pageNumber

                  return (
                    <div
                      key={`section-${pageNumber}`}
                      id={`section-${pageNumber}`}
                      className={`bg-white mx-auto shadow-md rounded-lg overflow-hidden border transition-all duration-300 ${
                        isHighlighted
                          ? 'border-yellow-400 ring-4 ring-yellow-200 shadow-xl'
                          : 'border-gray-200'
                      }`}
                      style={{ maxWidth: '800px' }}
                    >
                      {/* 페이지 헤더 */}
                      <div className={`px-4 py-2 border-b flex items-center justify-between ${
                        isHighlighted
                          ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
                          : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200'
                      }`}>
                        <span className={`text-xs font-semibold ${
                          isHighlighted ? 'text-yellow-800' : 'text-blue-700'
                        }`}>
                          {language === 'ko' ? `페이지 ${pageNumber}` : `Page ${pageNumber}`}
                        </span>
                        {isHighlighted && (
                          <span className="text-[10px] bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded-full font-bold">
                            {language === 'ko' ? '인용됨' : 'Cited'}
                          </span>
                        )}
                      </div>

                      {/* 페이지 내용 (텍스트만) */}
                      <div className="p-4">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {section.text}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : viewMode === 'natural' ? (
          <div className="h-full">
            {/* AI 행동 지침 설정 패널만 표시 */}
            <SystemPromptPanel
              language={language}
              onSystemPromptUpdate={onSystemPromptUpdate}
              suggestedPersonas={personaAnalysis?.suggestedPersonas || null}
              detectedEntity={personaAnalysis?.detectedEntity || null}
              documentType={personaAnalysis?.documentType || null}
            />
          </div>
        ) : (
          /* 자연어 데이터 설명 모드 */
          <div className="space-y-4">
            {/* 문서 정보 자연어 설명 */}
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>{language === 'ko' ? '문서 정보' : 'Document Information'}</span>
                </h3>
              </div>

              <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
                {/* 파일명 - 인라인 편집 가능 */}
                <div className="flex items-start justify-between group">
                  <div className="flex-1">
                    {editingField === 'filename' ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        <button
                          onClick={() => {
                            onUpdateName?.(selectedFile.id, editValue)
                            setEditingField(null)
                          }}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingField(null)}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p>
                        {language === 'ko'
                          ? `이 문서의 파일명은 "${selectedFile.name}" 입니다.`
                          : `The document filename is "${selectedFile.name}".`
                        }
                      </p>
                    )}
                  </div>
                  {editingField !== 'filename' && (
                    <button
                      onClick={() => {
                        setEditingField('filename')
                        setEditValue(selectedFile.name)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-blue-600 hover:bg-blue-50 rounded ml-2"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 파일 타입 */}
                <p>
                  {language === 'ko'
                    ? `파일 유형은 ${selectedFile.type === 'web' ? '웹 페이지' : selectedFile.type === 'report' ? '리포트 문서' : selectedFile.file?.type?.includes('pdf') ? 'PDF 문서' : '텍스트 파일'}입니다.`
                    : `This is a ${selectedFile.type === 'web' ? 'web page' : selectedFile.type === 'report' ? 'report document' : selectedFile.file?.type?.includes('pdf') ? 'PDF document' : 'text file'}.`
                  }
                </p>

                {/* 페이지 수 (PDF인 경우) - 인라인 편집 가능 */}
                {selectedFile.parsedData?.pageCount && (
                  <div className="flex items-start justify-between group">
                    <div className="flex-1">
                      {editingField === 'pageCount' ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onUpdateData?.(selectedFile.id, 'pageCount', parseInt(editValue))
                                setEditingField(null)
                              } else if (e.key === 'Escape') {
                                setEditingField(null)
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              onUpdateData?.(selectedFile.id, 'pageCount', parseInt(editValue))
                              setEditingField(null)
                            }}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <p>
                          {language === 'ko'
                            ? `총 ${selectedFile.parsedData.pageCount}페이지로 구성되어 있습니다.`
                            : `It contains ${selectedFile.parsedData.pageCount} pages in total.`
                          }
                        </p>
                      )}
                    </div>
                    {editingField !== 'pageCount' && (
                      <button
                        onClick={() => {
                          setEditingField('pageCount')
                          setEditValue(selectedFile.parsedData.pageCount.toString())
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-blue-600 hover:bg-blue-50 rounded ml-2"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* 내용 길이 */}
                {selectedFile.parsedData?.extractedText && (
                  <p>
                    {language === 'ko'
                      ? `문서에는 약 ${selectedFile.parsedData.extractedText.length.toLocaleString()}자의 텍스트가 포함되어 있습니다.`
                      : `The document contains approximately ${selectedFile.parsedData.extractedText.length.toLocaleString()} characters of text.`
                    }
                  </p>
                )}

                {/* 파일 크기 */}
                {selectedFile.parsedData?.fileSize && (
                  <p>
                    {language === 'ko'
                      ? `파일 크기는 ${selectedFile.parsedData.fileSize}입니다.`
                      : `The file size is ${selectedFile.parsedData.fileSize}.`
                    }
                  </p>
                )}
              </div>

              {/* AI 행동 지침 제어기 (Prompt Editor) */}
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
                          className={`text-xs p-2 rounded ${
                            index === currentHistoryIndex
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

                {/* 활성화된 AI 지침 표시 */}
                {aiGuidelines.systemPromptOverrides.length > 0 && (
                  <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold text-purple-800">
                        {language === 'ko' ? '🤖 활성 AI 지침' : '🤖 Active AI Instructions'}
                      </h4>
                      <span className="text-xs text-purple-600">
                        {aiGuidelines.systemPromptOverrides.length}개 적용됨
                      </span>
                    </div>
                    <div className="space-y-2">
                      {aiGuidelines.systemPromptOverrides.map((override) => (
                        <div key={override.id} className="bg-white border border-purple-200 rounded p-2 text-xs">
                          <div className="flex items-start justify-between">
                            <p className="text-gray-700 flex-1 pr-2">{override.instruction}</p>
                            <button
                              onClick={() => removeSystemPromptOverride(override.id)}
                              className="text-red-600 hover:bg-red-50 p-1 rounded flex-shrink-0"
                              title={language === 'ko' ? '제거' : 'Remove'}
                            >
                              <X className="w-3 h-3" />
                            </button>
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
            </div>

            {/* 원본 JSON 데이터 (개발자용) - 아코디언 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setIsJsonExpanded(!isJsonExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isJsonExpanded ? 'rotate-90' : ''}`} />
                  <span className="text-xs font-semibold text-gray-700">
                    {language === 'ko' ? '구조화된 데이터 (개발자용)' : 'Structured Data (Developer)'}
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
        )}
      </div>

      {/* Footer */}
      {selectedFile && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          {/* 동기화 알림 배너 */}
          {showSyncNotification && (
            <div className="mb-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 flex items-center space-x-2">
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

          <div className="text-xs text-gray-500">
            <span>{language === 'ko' ? '업데이트' : 'Updated'}: {new Date(selectedFile.uploadedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataPreview
