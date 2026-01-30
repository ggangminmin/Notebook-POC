import { useState, useRef, useEffect } from 'react'
import React from 'react'
import { Send, Bot, User, Loader2, FileText, AlertCircle, Sparkles, Zap, Brain, Lightbulb, Gem, Settings, Copy, Check, Upload, ChevronDown, ArrowUp, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLanguage } from '../contexts/LanguageContext'
import { generateStrictRAGResponse, detectLanguage, generateDocumentSummary, generateSuggestedQuestions } from '../services/aiService'
import CitationBadge from './CitationBadge'

// ChatGPT 로고 SVG 컴포넌트
const ChatGPTLogo = ({ className, isActive }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.28 9.82c-.15 0-.3-.02-.45-.06a5.59 5.59 0 0 0-4.04-4.88c-.14-.04-.3-.06-.45-.06-.15 0-.3-.02-.45-.06A5.59 5.59 0 0 0 12.8 1.83c-.15 0-.3.02-.45.06-.15 0-.3-.02-.45-.06A5.59 5.59 0 0 0 7.85 4.82c-.15 0-.3.02-.45.06a5.59 5.59 0 0 0-4.04 4.88c-.15.04-.3.06-.45.06-.15 0-.3.02-.45.06a5.59 5.59 0 0 0 2.95 5.52c.15.04.3.06.45.06.15 0 .3.02.45.06a5.59 5.59 0 0 0 4.04 4.88c.15.04.3.06.45.06.15 0 .3.02.45.06a5.59 5.59 0 0 0 4.04-2.95c.15-.04.3-.06.45-.06.15 0 .3-.02.45-.06a5.59 5.59 0 0 0 4.04-4.88c.15-.04.3-.06.45-.06.15 0 .3-.02.45-.06a5.59 5.59 0 0 0-2.95-5.52Zm-10.28 10.7a3.57 3.57 0 0 1-2.61-1.12l.14-.08 4.2-2.42c.17-.1.27-.28.27-.47V10.5l1.64.94c.05.03.08.08.08.14v4.92a3.6 3.6 0 0 1-3.72 4.02ZM5.23 16.7a3.57 3.57 0 0 1-.09-2.85l.14.08 4.2 2.42c.17.1.38.1.55 0l5.44-3.14V15.1c0 .06-.03.11-.08.14l-4.26 2.46a3.6 3.6 0 0 1-5.9-1.1Zm-.1-10.8a3.57 3.57 0 0 1 2.52-1.73v.16l0 4.84c0 .19.1.37.27.47l5.44 3.14-1.64.94a.16.16 0 0 1-.16 0L7.3 11.26a3.6 3.6 0 0 1-2.17-5.36Zm9.8-1.55a3.57 3.57 0 0 1 2.61 1.12l-.14.08-4.2 2.42c-.17.1-.27.28-.27.47v5.93l-1.64-.94a.16.16 0 0 1-.08-.14V8.37a3.6 3.6 0 0 1 3.72-4.02ZM18.77 7.3a3.57 3.57 0 0 1 .09 2.85l-.14-.08-4.2-2.42c-.17-.1-.38-.1-.55 0l-5.44 3.14V8.9c0-.06.03-.11.08-.14L12.87 6.3a3.6 3.6 0 0 1 5.9 1ZM18.87 18.1a3.57 3.57 0 0 1-2.52 1.73v-.16l0-4.84c0-.19-.1-.37-.27-.47l-5.44-3.14 1.64-.94a.16.16 0 0 1 .16 0l4.26 2.46a3.6 3.6 0 0 1 2.17 5.36ZM12 13.73l-3.04-1.75v-3.5L12 6.72l3.04 1.75v3.5L12 13.73Z"
      fill={isActive ? "#10a37f" : "#6B7280"}
    />
  </svg>
)

// Gemini 로고 SVG 컴포넌트 (다이아몬드 형태)
const GeminiLogo = ({ className, isActive }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4F46E5" />
        <stop offset="50%" stopColor="#9333EA" />
        <stop offset="100%" stopColor="#EF4444" />
      </linearGradient>
    </defs>
    <path
      d="M12 3c.17 0 .3.13.3.3v1.4c0 .17-.13.3-.3.3s-.3-.13-.3-.3V3.3c0-.17.13-.3.3-.3Zm0 15c.17 0 .3.13.3.3v1.4c0 .17-.13.3-.3.3s-.3-.13-.3-.3v-1.4c0-.17.13-.3.3-.3Zm7.5-7.5c.17 0 .3.13.3.3h1.4c.17 0 .3-.13.3-.3s-.13-.3-.3-.3h-1.4c-.17 0-.3.13-.3.3ZM4.5 12c.17 0 .3.13.3.3H3.4c-.17 0-.3-.13-.3-.3s.13-.3.3-.3h1.4c.17 0 .3.13.3.3Zm12.02-5.52a.3.3 0 0 1 .42 0l1 1a.3.3 0 0 1-.42.42l-1-1a.3.3 0 0 1 0-.42ZM6.48 16.52a.3.3 0 0 1 .42 0l1 1a.3.3 0 0 1-.42.42l-1-1a.3.3 0 0 1 0-.42Zm0-10a.3.3 0 0 1 0-.42l1-1a.3.3 0 0 1 .42.42l-1 1a.3.3 0 0 1-.42 0Zm11.04 11.04a.3.3 0 0 1 0-.42l1-1a.3.3 0 0 1 .42.42l-1 1a.3.3 0 0 1-.42 0ZM12 6.5C12 6.5 12.5 10 16 12C12.5 14 12 17.5 12 17.5C12 17.5 11.5 14 8 12C11.5 10 12 6.5 12 6.5Z"
      fill={isActive ? "url(#gemini-gradient)" : "#6B7280"}
    />
  </svg>
)

const ChatInterface = ({ selectedSources = [], selectedModel = 'thinking', onModelChange, onChatUpdate, onPageClick, systemPromptOverrides = [], onTogglePromptModal, initialMessages = [], analyzedSourceIds = [], onAnalyzedSourcesUpdate, onOpenAddSource }) => {
  // 초기 메시지 설정 (노트북에서 불러온 데이터 또는 빈 배열)
  // initialMessages의 allSources 데이터가 누락된 경우를 대비하여 재계산
  const processInitialMessages = () => {
    if (!initialMessages || initialMessages.length === 0) return []

    return initialMessages.map(msg => {
      // Supabase에서 불러온 메시지는 role 필드를 type으로 변환
      const normalizedMsg = {
        ...msg,
        type: msg.type || msg.role // role을 type으로 변환
      }

      // AI 메시지이고 allSources가 있지만 startPage/endPage가 없는 경우
      if (normalizedMsg.type === 'assistant' && normalizedMsg.allSources && normalizedMsg.allSources.length > 0) {
        const hasPageRanges = normalizedMsg.allSources.every(s => s.startPage && s.endPage)

        if (!hasPageRanges) {
          // 페이지 범위 재계산
          let cumulativePageOffset = 0
          const updatedAllSources = normalizedMsg.allSources.map((s) => {
            const pageCount = s.pageCount || s.pageTexts?.length || 0
            const startPage = cumulativePageOffset + 1
            const endPage = cumulativePageOffset + pageCount
            cumulativePageOffset = endPage

            return {
              ...s,
              startPage,
              endPage
            }
          })

          return {
            ...normalizedMsg,
            allSources: updatedAllSources
          }
        }
      }

      return normalizedMsg
    })
  }

  const [messages, setMessages] = useState([]) // 빈 배열로 시작
  const [isTyping, setIsTyping] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState([])
  const [copiedMessageId, setCopiedMessageId] = useState(null)
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const prevSourceIdsRef = useRef('') // 이전 소스 ID 추적 (무한 루프 방지)
  const hasAnalyzedRef = useRef(false) // 분석 실행 여부 추적
  const isInitialLoadRef = useRef(true) // 최초 로드 여부 추적
  const { t, language } = useLanguage()

  // 🔥 초기 메시지 로드 (initialMessages가 변경될 때만 실행)
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      console.log('[ChatInterface] 초기 메시지 로드:', initialMessages.length, '개')

      // 메시지 상태 완전 초기화 후 새 메시지 설정
      const processedMessages = processInitialMessages()
      setMessages(processedMessages)

      // 분석 완료 플래그 설정 (자동 분석 방지)
      if (processedMessages.length > 0) {
        hasAnalyzedRef.current = true
      }

      isInitialLoadRef.current = false
    } else if (isInitialLoadRef.current) {
      // 초기 메시지가 없으면 빈 배열로 시작
      setMessages([])
      isInitialLoadRef.current = false
    }
  }, [initialMessages?.length]) // initialMessages 길이가 변경될 때만 실행

  // 메시지가 변경될 때마다 부모 컴포넌트로 전달 (자동 저장)
  useEffect(() => {
    // 초기 로드 중에는 저장하지 않음
    if (isInitialLoadRef.current) {
      return
    }

    // 분석 중 메시지나 환영 메시지는 제외하고 전달
    const permanentMessages = messages.filter(msg => !msg.isAnalyzing && !msg.isWelcome)
    if (onChatUpdate && permanentMessages.length > 0) {
      onChatUpdate(permanentMessages)
    }
  }, [messages, onChatUpdate])

  // 텍스트 블록에서 대괄호 없는 페이지 패턴을 처리하는 헬퍼 함수
  const processBarePagePatterns = (textBlock, pageTexts, pageClickHandler, keyPrefix) => {
    if (!textBlock || typeof textBlock !== 'string') return [textBlock]

    let processedText = textBlock
    const badges = []
    let badgeCounter = 0

    // 플레이스홀더로 교체하기 위해 역순으로 처리 (인덱스 유지)
    const replacements = []

    // 1단계: "페이지 15", "페이지 15 17" 패턴 처리
    const pagePrefixPattern = /페이지\s+((?:\d+(?:\s+\d+)*))/g
    let pageMatch
    while ((pageMatch = pagePrefixPattern.exec(textBlock)) !== null) {
      const numbers = pageMatch[1].trim().split(/\s+/).filter(n => /^\d+$/.test(n))
      const placeholder = `__PAGE_BADGE_${keyPrefix}_${badgeCounter++}__`

      replacements.push({
        original: pageMatch[0],
        placeholder: placeholder,
        numbers: numbers,
        type: 'page-prefix',
        index: pageMatch.index
      })
    }

    // 2단계: 범위 패턴 처리 (예: 15-18 또는 15–18 en dash 지원)
    const rangePattern = /\b(\d+)\s*[-–]\s*(\d+)\b/g
    let rangeMatch
    while ((rangeMatch = rangePattern.exec(textBlock)) !== null) {
      // 이미 처리된 "페이지" 패턴과 겹치지 않는지 확인
      const isOverlapping = replacements.some(r =>
        rangeMatch.index >= r.index &&
        rangeMatch.index + rangeMatch[0].length <= r.index + r.original.length
      )

      if (!isOverlapping) {
        const placeholder = `__RANGE_BADGE_${keyPrefix}_${badgeCounter++}__`
        replacements.push({
          original: rangeMatch[0],
          placeholder: placeholder,
          startPage: parseInt(rangeMatch[1]),
          endPage: parseInt(rangeMatch[2]),
          type: 'range',
          index: rangeMatch.index
        })
      }
    }

    // 3단계: 콤마(,)로 구분된 숫자 패턴 처리 (예: 16, 18 또는 3, 7, 12)
    const commaNumberPattern = /\b(\d+)(?:\s*,\s*(\d+))+\b/g
    let commaMatch
    while ((commaMatch = commaNumberPattern.exec(textBlock)) !== null) {
      const isOverlapping = replacements.some(r =>
        commaMatch.index >= r.index &&
        commaMatch.index + commaMatch[0].length <= r.index + r.original.length
      )

      if (!isOverlapping) {
        // 콤마로 구분된 모든 숫자 추출
        const numbers = commaMatch[0].split(/\s*,\s*/).map(n => n.trim()).filter(n => /^\d+$/.test(n))
        const placeholder = `__COMMA_NUM_BADGE_${keyPrefix}_${badgeCounter++}__`
        replacements.push({
          original: commaMatch[0],
          placeholder: placeholder,
          numbers: numbers,
          type: 'comma-numbers',
          index: commaMatch.index
        })
      }
    }

    // 4단계: 띄어쓰기로 구분된 숫자 패턴 처리 (예: 15 17, 22 27)
    const numberSequencePattern = /\b(\d+(?:\s+\d+)+)\b/g
    let numSeqMatch
    while ((numSeqMatch = numberSequencePattern.exec(textBlock)) !== null) {
      const isOverlapping = replacements.some(r =>
        numSeqMatch.index >= r.index &&
        numSeqMatch.index + numSeqMatch[0].length <= r.index + r.original.length
      )

      if (!isOverlapping) {
        const numbers = numSeqMatch[1].trim().split(/\s+/).filter(n => /^\d+$/.test(n))
        // 범위 패턴이 아닌 경우만 (예: "15 17"은 포함, "15-17" 또는 "15–17"은 제외)
        if (!/\d+\s*[-–]\s*\d+/.test(numSeqMatch[0])) {
          const placeholder = `__NUM_SEQ_BADGE_${keyPrefix}_${badgeCounter++}__`
          replacements.push({
            original: numSeqMatch[0],
            placeholder: placeholder,
            numbers: numbers,
            type: 'number-sequence',
            index: numSeqMatch.index
          })
        }
      }
    }

    // 역순으로 정렬하여 뒤에서부터 교체 (인덱스 유지)
    replacements.sort((a, b) => b.index - a.index)

    // 텍스트에 플레이스홀더 삽입
    replacements.forEach(rep => {
      processedText = processedText.substring(0, rep.index) +
        rep.placeholder +
        processedText.substring(rep.index + rep.original.length)
    })

    // replacement를 맵으로 변환 (플레이스홀더로 쉽게 찾기 위해)
    const replacementMap = new Map()
    replacements.forEach((rep, idx) => {
      replacementMap.set(rep.placeholder, rep)
    })

    // 플레이스홀더를 배지 컴포넌트로 교체
    const parts = []
    let currentIndex = 0
    const placeholderPattern = /__(PAGE|RANGE|NUM_SEQ|COMMA_NUM)_BADGE_.+?__/g
    let placeholderMatch

    // 디버깅: 처리된 텍스트와 플레이스홀더 확인
    if (processedText.includes('__') && processedText.includes('BADGE')) {
      console.log('[플레이스홀더 디버깅] 처리된 텍스트:', processedText.substring(0, 300))
      console.log('[플레이스홀더 디버깅] replacementMap 크기:', replacementMap.size)
    }

    while ((placeholderMatch = placeholderPattern.exec(processedText)) !== null) {
      // 플레이스홀더 이전 텍스트
      if (placeholderMatch.index > currentIndex) {
        parts.push(processedText.substring(currentIndex, placeholderMatch.index))
      }

      // 해당하는 replacement 찾기
      const placeholder = placeholderMatch[0]
      const replacement = replacementMap.get(placeholder)

      if (replacement) {
        if (replacement.type === 'range') {
          // 범위를 개별 배지로 분리 (시작 페이지와 끝 페이지)
          const startPageContent = pageTexts[replacement.startPage - 1]?.text || `Page ${replacement.startPage} content preview`
          const endPageContent = pageTexts[replacement.endPage - 1]?.text || `Page ${replacement.endPage} content preview`

          // 시작 페이지 배지
          parts.push(
            <CitationBadge
              key={`${keyPrefix}-range-start-${replacement.startPage}`}
              pageNumber={replacement.startPage}
              pageContent={startPageContent}
              onPageClick={pageClickHandler}
            />
          )

          // 끝 페이지 배지 (시작과 끝이 다를 경우에만)
          if (replacement.startPage !== replacement.endPage) {
            parts.push(
              <CitationBadge
                key={`${keyPrefix}-range-end-${replacement.endPage}`}
                pageNumber={replacement.endPage}
                pageContent={endPageContent}
                onPageClick={pageClickHandler}
              />
            )
          }
        } else if (replacement.numbers) {
          // 여러 숫자를 개별 배지로
          replacement.numbers.forEach((num, idx) => {
            const pageNum = parseInt(num)
            const pageContent = pageTexts[pageNum - 1]?.text || `Page ${pageNum} content preview`
            parts.push(
              <CitationBadge
                key={`${keyPrefix}-${replacement.type}-${idx}-${pageNum}`}
                pageNumber={pageNum}
                pageContent={pageContent}
                onPageClick={pageClickHandler}
              />
            )
          })
        }
      }

      currentIndex = placeholderMatch.index + placeholderMatch[0].length
    }

    // 남은 텍스트
    if (currentIndex < processedText.length) {
      parts.push(processedText.substring(currentIndex))
    }

    return parts.length > 0 ? parts : [textBlock]
  }

  // 페이지 번호로 해당 파일 찾기 (다중 파일 지원)
  const findFileByPageNumber = (pageNumber, allSources) => {
    if (!allSources || allSources.length === 0) return null

    // 단일 파일인 경우
    if (allSources.length === 1) {
      return {
        file: allSources[0],
        localPageNumber: pageNumber  // 파일 내 로컬 페이지 번호
      }
    }

    // 다중 파일인 경우: 누적 페이지 범위로 찾기
    for (const file of allSources) {
      if (pageNumber >= file.startPage && pageNumber <= file.endPage) {
        const localPageNumber = pageNumber - file.startPage + 1
        return {
          file: file,
          localPageNumber: localPageNumber
        }
      }
    }

    // 찾지 못한 경우 첫 번째 파일 기본값
    return {
      file: allSources[0],
      localPageNumber: pageNumber
    }
  }

  // [숫자] 패턴을 CitationBadge로 변환하는 함수 (NotebookLM 스타일 강화)
  // [숫자] 패턴을 CitationBadge로 변환하는 함수 (NotebookLM 스타일 강화)
  const renderTextWithCitations = (text, allSources = [], pageClickHandler = onPageClick) => {
    if (!text || typeof text !== 'string') return text

    // 대괄호 [] 또는 중괄호 {} 모두 지원
    const citationPattern = /[\[\{]([^\]\}]+)[\]\}]/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = citationPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }

      const citationContent = match[1]
      const items = citationContent.split(',').map(item => item.trim())

      // 숫자/범위 항목과 텍스트 항목 분리
      items.forEach((item, idx) => {
        // [문서번호:페이지번호] 형식 체크 (예: 1:5, 2:10-12)
        const multiDocMatch = item.match(/^(\d+)\s*:\s*(.+)$/)

        if (multiDocMatch) {
          const docIdx = parseInt(multiDocMatch[1]) - 1
          const pagePart = multiDocMatch[2].trim()

          const targetFile = allSources[docIdx] || allSources[0]

          // 페이지 부분 분석 (단일 또는 범위)
          const rangeMatch = pagePart.match(/^(\d+)\s*[-–]\s*(\d+)$/)

          if (rangeMatch) {
            const startLocalPage = parseInt(rangeMatch[1])
            const endLocalPage = parseInt(rangeMatch[2])

            const startPageContent = targetFile?.pageTexts?.[startLocalPage - 1]?.text || `Page ${startLocalPage} content`
            const endPageContent = targetFile?.pageTexts?.[endLocalPage - 1]?.text || `Page ${endLocalPage} content`

            parts.push(
              <CitationBadge
                key={`citation-${match.index}-${idx}-start-${docIdx}-${startLocalPage}`}
                pageNumber={startLocalPage} // UI에는 로컬 페이지 번호만 표시
                pageContent={startPageContent}
                onPageClick={pageClickHandler}
                sourceId={targetFile?.id}
                localPageNumber={startLocalPage}
                sourceName={targetFile?.name}
              />
            )

            if (startLocalPage !== endLocalPage) {
              parts.push(
                <CitationBadge
                  key={`citation-${match.index}-${idx}-end-${docIdx}-${endLocalPage}`}
                  pageNumber={endLocalPage}
                  pageContent={endPageContent}
                  onPageClick={pageClickHandler}
                  sourceId={targetFile?.id}
                  localPageNumber={endLocalPage}
                  sourceName={targetFile?.name}
                />
              )
            }
          } else if (/^\d+$/.test(pagePart)) {
            const localPage = parseInt(pagePart)
            const pageContent = targetFile?.pageTexts?.[localPage - 1]?.text || `Page ${localPage} content`

            parts.push(
              <CitationBadge
                key={`citation-${match.index}-${idx}-page-${docIdx}-${localPage}`}
                pageNumber={localPage}
                pageContent={pageContent}
                onPageClick={pageClickHandler}
                sourceId={targetFile?.id}
                localPageNumber={localPage}
                sourceName={targetFile?.name}
              />
            )
          }
        }
        // 하위 호환성 또는 단일 문서용 (기존 로직 유지하되 현재는 로컬 페이지로 간주)
        else {
          const isNumeric = /^\d+$/.test(item)
          const rangeMatch = item.match(/^(\d+)\s*[-–]\s*(\d+)$/)

          if (rangeMatch) {
            const startPage = parseInt(rangeMatch[1])
            const endPage = parseInt(rangeMatch[2])
            const targetFile = allSources[0]

            parts.push(
              <CitationBadge
                key={`citation-${match.index}-${idx}-legacy-start-${startPage}`}
                pageNumber={startPage}
                pageContent={targetFile?.pageTexts?.[startPage - 1]?.text || `Page ${startPage} content`}
                onPageClick={pageClickHandler}
                sourceId={targetFile?.id}
                localPageNumber={startPage}
                sourceName={targetFile?.name}
              />
            )
          } else if (isNumeric) {
            const pageNum = parseInt(item)
            const targetFile = allSources[0]

            parts.push(
              <CitationBadge
                key={`citation-${match.index}-${idx}-legacy-page-${pageNum}`}
                pageNumber={pageNum}
                pageContent={targetFile?.pageTexts?.[pageNum - 1]?.text || `Page ${pageNum} content`}
                onPageClick={pageClickHandler}
                sourceId={targetFile?.id}
                localPageNumber={pageNum}
                sourceName={targetFile?.name}
              />
            )
          } else {
            parts.push(`${idx > 0 ? ', ' : ''}${item}`)
          }
        }
      })

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    if (parts.length > 1) {
      return <React.Fragment>{parts.map((part, i) => <React.Fragment key={i}>{part}</React.Fragment>)}</React.Fragment>
    } else if (parts.length === 1) {
      return parts[0]
    }
    return text
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 대화 이력을 App.jsx로 전달 (DataPreview JSON 동기화용)
  useEffect(() => {
    if (onChatUpdate && messages.length > 0) {
      onChatUpdate(messages)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]) // onChatUpdate는 useCallback으로 메모이제이션되어 있으므로 제외

  // 인용 배지 기능 제거됨

  // 소스 선택이 변경되면 자동 요약 및 추천 질문 생성
  useEffect(() => {
    const analyzeDocument = async () => {
      if (selectedSources.length > 0) {
        // 현재 소스 ID 문자열 생성
        const currentSourceIdsStr = selectedSources.map(s => s.id).sort().join(',')

        // 소스가 변경되지 않았으면 건너뛰기 (무한 루프 방지)
        if (prevSourceIdsRef.current === currentSourceIdsStr) {
          return
        }

        // 새로운 파일이 있는지 확인 (analyzedSourceIds에 없는 파일)
        const currentSourceIds = selectedSources.map(s => s.id)
        const newSourceIds = currentSourceIds.filter(id => !analyzedSourceIds.includes(id))

        console.log('[ChatInterface] 현재 소스:', currentSourceIds)
        console.log('[ChatInterface] 이전 소스:', prevSourceIdsRef.current)
        console.log('[ChatInterface] 이미 분석된 소스:', analyzedSourceIds)
        console.log('[ChatInterface] 새로운 소스:', newSourceIds)

        // 새로운 파일이 없으면 자동 분석 건너뛰기
        if (newSourceIds.length === 0) {
          console.log('[ChatInterface] ✅ 모든 파일이 이미 분석됨 - 자동 분석 건너뛰기')
          prevSourceIdsRef.current = currentSourceIdsStr
          return
        }

        // 기존 메시지가 있으면 자동 분석 건너뛰기 (노트북 재열기 시)
        const permanentMessages = messages.filter(msg => !msg.isAnalyzing && !msg.isWelcome)
        if (permanentMessages.length > 0 && hasAnalyzedRef.current) {
          console.log('[ChatInterface] ✅ 기존 대화 기록 존재 - 자동 분석 건너뛰기')
          prevSourceIdsRef.current = currentSourceIdsStr
          return
        }

        // 이전 소스 ID 업데이트
        prevSourceIdsRef.current = currentSourceIdsStr
        hasAnalyzedRef.current = true

        // 기존 대화 기록 유지 (초기화하지 않음)
        // 단, 분석 중 메시지나 환영 메시지는 제거
        setMessages(prev => prev.filter(msg => !msg.isAnalyzing && !msg.isWelcome))
        setSuggestedQuestions([])

        const sourceNames = selectedSources.map(s => s.name).join(', ')
        const isMultipleFiles = selectedSources.length > 1

        // 1. 분석 중 메시지 (임시 메시지, 저장하지 않음)
        const analyzingMessage = {
          id: Date.now(),
          type: 'assistant',
          content: language === 'ko'
            ? `📄 ${selectedSources.length}개의 문서를 분석하고 있습니다...\n${sourceNames}`
            : `📄 Analyzing ${selectedSources.length} document(s)...\n${sourceNames}`,
          timestamp: new Date().toISOString(),
          isAnalyzing: true
        }
        setMessages(prev => [...prev, analyzingMessage])

        try {
          let summary, questions

          if (isMultipleFiles) {
            // 여러 파일 선택 시: 통합 요약 및 비교 질문 생성
            console.log('[ChatInterface] 다중 파일 분석 모드')

            // 첫 번째 파일 기준으로 요약 (향후 개선 가능)
            summary = await generateDocumentSummary(
              { name: selectedSources[0].name, parsedData: selectedSources[0].parsedData },
              language
            )

            // 다중 파일 비교 질문 생성
            questions = language === 'ko' ? [
              `${selectedSources[0].name}과 ${selectedSources[1].name}의 주요 차이점은?`,
              `두 문서에서 공통적으로 다루는 내용은?`,
              `전체 문서들의 핵심 내용 요약해줘`
            ] : [
              `What are the key differences between ${selectedSources[0].name} and ${selectedSources[1].name}?`,
              `What topics are common across documents?`,
              `Summarize the key points from all documents`
            ]

            setSuggestedQuestions(questions)
          } else {
            // 단일 파일: 기존 로직
            console.log('[ChatInterface] 단일 파일 분석 모드')
            console.log('- 파일명:', selectedSources[0].name)
            console.log('- parsedData 존재:', !!selectedSources[0].parsedData)
            console.log('- extractedText 길이:', selectedSources[0].parsedData?.extractedText?.length || 0)

            // 2. 자동 요약 생성
            summary = await generateDocumentSummary(
              { name: selectedSources[0].name, parsedData: selectedSources[0].parsedData },
              language
            )

            console.log('[ChatInterface] 요약 생성 완료:', summary?.substring(0, 100))

            // 3. 추천 질문 생성
            console.log('[ChatInterface] 추천 질문 생성 시작...')
            questions = await generateSuggestedQuestions(
              { name: selectedSources[0].name, parsedData: selectedSources[0].parsedData },
              language
            )

            console.log('[ChatInterface] 추천 질문 생성 완료:', questions)
            console.log('[ChatInterface] 추천 질문 개수:', questions?.length || 0)

            setSuggestedQuestions(questions || [])
          }

          // 4. 완료 메시지 (요약 포함) - 통합 모드
          const hasQuestions = questions && questions.length > 0
          console.log('[ChatInterface] hasSuggestedQuestions:', hasQuestions)

          // 다중 파일 선택 시 통합 메시지 생성
          let summaryContent
          if (isMultipleFiles) {
            summaryContent = language === 'ko'
              ? `✅ **${selectedSources.length}개 문서 통합 분석 완료!**\n\n📄 **선택된 문서:**\n${selectedSources.map((s, i) => `${i + 1}. ${s.name}`).join('\n')}\n\n💡 아래 추천 질문을 클릭하거나, 문서들에 대해 자유롭게 질문해주세요!`
              : `✅ **Analysis complete for ${selectedSources.length} documents!**\n\n📄 **Selected documents:**\n${selectedSources.map((s, i) => `${i + 1}. ${s.name}`).join('\n')}\n\n💡 Click suggested questions below or ask freely about the documents!`
          } else {
            summaryContent = summary || (language === 'ko'
              ? `✅ 문서 분석 완료!\n\n${selectedSources.length}개의 문서가 준비되었습니다 (${sourceNames}).\n\n궁금하신 내용을 물어보세요!`
              : `✅ Document analysis complete!\n\n${selectedSources.length} document(s) ready (${sourceNames}).\n\nFeel free to ask questions!`)
          }

          const summaryMessage = {
            id: Date.now() + 1,
            type: 'assistant',
            content: summaryContent,
            timestamp: new Date().toISOString(),
            isSummary: true,
            hasSuggestedQuestions: hasQuestions,
            isMultipleFiles: isMultipleFiles  // 다중 파일 플래그 추가
          }

          // 기존 메시지 유지하고 요약 메시지만 추가 (중복 제거)
          setMessages(prev => {
            const filtered = prev.filter(msg => !msg.isAnalyzing && !msg.isWelcome && !msg.isSummary)
            return [...filtered, summaryMessage]
          })

          console.log('[ChatInterface] summaryMessage 설정 완료:', summaryMessage)

          // 분석 완료 후 analyzedSourceIds 업데이트
          const updatedAnalyzedIds = [...new Set([...analyzedSourceIds, ...currentSourceIds])]
          if (onAnalyzedSourcesUpdate) {
            onAnalyzedSourcesUpdate(updatedAnalyzedIds)
            console.log('[ChatInterface] ✅ analyzedSourceIds 업데이트:', updatedAnalyzedIds)
          }

        } catch (error) {
          console.error('문서 분석 오류:', error)

          // 오류 발생 시 메타데이터 기반 기본 요약 생성
          const metadata = selectedSources[0]?.parsedData
          if (metadata) {
            const pageCount = metadata.pageCount || metadata.numPages || 1
            const fileName = metadata.fileName || selectedSources[0].name
            const fileType = metadata.fileType || 'document'

            const fallbackSummary = language === 'ko'
              ? `### 📄 문서 정보\n\n**파일명**: ${fileName}[1]\n**파일 형식**: ${fileType.toUpperCase()}\n**전체 페이지**: ${pageCount}페이지[1]\n\n### 📌 안내\n\n이 문서는 **${pageCount}개의 페이지**로 구성되어 있습니다[1]. AI 요약 생성에 실패했지만, 문서 내용에 대해 자유롭게 질문해 주세요!\n\n채팅창에서 인용 배지[1]를 클릭하면 우측 패널에서 해당 페이지를 바로 확인할 수 있습니다.`
              : `### 📄 Document Information\n\n**Filename**: ${fileName}[1]\n**File Type**: ${fileType.toUpperCase()}\n**Total Pages**: ${pageCount} pages[1]\n\n### 📌 Guide\n\nThis document consists of **${pageCount} pages**[1]. Summary generation failed, but feel free to ask questions about the content!\n\nClick citation badges[1] in the chat to view the corresponding page in the right panel.`

            const fallbackMessage = {
              id: Date.now() + 1,
              type: 'assistant',
              content: fallbackSummary,
              timestamp: new Date().toISOString(),
              isSummary: true,
              sourceData: selectedSources[0].parsedData,
              allSources: selectedSources.map(s => ({
                id: s.id,
                name: s.name,
                fileName: s.parsedData?.fileName || s.name,
                pageTexts: s.parsedData?.pageTexts || [],
                pageCount: s.parsedData?.pageCount || 0
              }))
            }
            setMessages(prev => {
              const filtered = prev.filter(msg => !msg.isAnalyzing && !msg.isWelcome)
              return [...filtered, fallbackMessage]
            })
          } else {
            const errorMessage = {
              id: Date.now() + 1,
              type: 'assistant',
              content: language === 'ko'
                ? `문서 분석 중 오류가 발생했습니다. 하지만 문서 기반 질문은 가능합니다.`
                : `An error occurred during analysis. However, you can still ask questions about the document.`,
              timestamp: new Date().toISOString()
            }
            setMessages(prev => {
              const filtered = prev.filter(msg => !msg.isAnalyzing && !msg.isWelcome)
              return [...filtered, errorMessage]
            })
          }
        }
      } else {
        // 파일이 없을 때: 환영 메시지 없이 빈 상태 유지 (업로드 안내 UI가 대신 표시됨)
        setMessages(prev => prev.filter(msg => !msg.isAnalyzing && !msg.isWelcome))
        setSuggestedQuestions([])
      }
    }

    analyzeDocument()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSources.length, analyzedSourceIds.length]) // 배열 참조 대신 길이만 추적



  // 메시지 복사 핸들러
  const handleCopyMessage = async (messageId, content) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => {
        setCopiedMessageId(null)
      }, 2000) // 2초 후 체크 표시 사라짐
    } catch (error) {
      console.error('복사 실패:', error)
    }
  }

  // 📝 개별 메시지 아이템 컴포넌트 (메모이제이션으로 성능 최적화)
  const MessageItem = React.memo(({ message, language, onPageClick, handleCopyMessage, copiedMessageId, suggestedQuestions, handleSuggestedQuestionClick, renderTextWithCitations }) => {
    return (
      <div className={`flex flex-col ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
        <div className={`flex max-w-[85%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar - Compact */}
          <div className={`flex-shrink-0 ${message.type === 'user' ? 'ml-2' : 'mr-2'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.type === 'user' ? 'bg-blue-500' : message.isError ? 'bg-red-500' : 'bg-gradient-to-br from-purple-500 to-blue-500'
              }`}>
              {message.type === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
          </div>

          {/* Message Content */}
          <div className="flex-1">
            <div className={`px-3.5 py-2.5 rounded-xl ${message.type === 'user' ? 'bg-blue-500 text-white' : message.isError ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
              }`}>
              <div className="text-[12px] leading-[1.7] prose prose-sm max-w-none markdown-content font-medium">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    strong: ({ node, ...props }) => (
                      <span
                        className="font-medium text-gray-900"
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }) => <h3 className="text-[14px] font-black mt-4 mb-2 text-gray-900 border-l-4 border-blue-500 pl-2" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
                    li: ({ node, children, ...props }) => {
                      const allSources = message.allSources || []
                      const processNodes = (nodes) => {
                        return React.Children.map(nodes, (child) => {
                          if (typeof child === 'string') return renderTextWithCitations(child, allSources, onPageClick)
                          if (React.isValidElement(child) && child.props.children) {
                            return React.cloneElement(child, {
                              ...child.props,
                              children: processNodes(child.props.children)
                            })
                          }
                          return child
                        })
                      }
                      return <li className="ml-2" {...props}><span className="inline">{processNodes(children)}</span></li>
                    },
                    td: ({ node, children, ...props }) => {
                      const allSources = message.allSources || []
                      const processNodes = (nodes) => {
                        return React.Children.map(nodes, (child) => {
                          if (typeof child === 'string') return renderTextWithCitations(child, allSources, onPageClick)
                          if (React.isValidElement(child) && child.props.children) {
                            return React.cloneElement(child, {
                              ...child.props,
                              children: processNodes(child.props.children)
                            })
                          }
                          return child
                        })
                      }
                      return <td className="border border-gray-200 px-3 py-1.5" {...props}>{processNodes(children)}</td>
                    },
                    th: ({ node, children, ...props }) => {
                      const allSources = message.allSources || []
                      const processNodes = (nodes) => {
                        return React.Children.map(nodes, (child) => {
                          if (typeof child === 'string') return renderTextWithCitations(child, allSources, onPageClick)
                          if (React.isValidElement(child) && child.props.children) {
                            return React.cloneElement(child, {
                              ...child.props,
                              children: processNodes(child.props.children)
                            })
                          }
                          return child
                        })
                      }
                      return <th className="border border-gray-200 px-3 py-1.5 bg-gray-50 font-bold" {...props}>{processNodes(children)}</th>
                    },
                    p: ({ node, children, ...props }) => {
                      const allSources = message.allSources || []
                      const processNodes = (nodes) => {
                        return React.Children.map(nodes, (child) => {
                          if (typeof child === 'string') return renderTextWithCitations(child, allSources, onPageClick)
                          if (React.isValidElement(child) && child.props.children) {
                            return React.cloneElement(child, {
                              ...child.props,
                              children: processNodes(child.props.children)
                            })
                          }
                          return child
                        })
                      }
                      const isInsideList = node?.position?.start?.line && message.content.split('\n')[node.position.start.line - 1]?.trim().match(/^\d+\.|^[-*]/)
                      return isInsideList ? <span {...props}>{processNodes(children)}</span> : <p className="my-1.5" {...props}>{processNodes(children)}</p>
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>

              {/* Source Info */}
              {message.source && message.foundInDocument && (
                <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-[11px] text-gray-500 font-medium">
                      <FileText className="w-3.5 h-3.5 mr-1 text-blue-400" />
                      <span>{language === 'ko' ? '기반 문서' : 'Source Document'}: <span className="text-gray-700 font-bold">{message.source}</span></span>
                    </div>
                    {message.isReasoningBased && (
                      <div className="flex items-center space-x-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                        <Lightbulb className="w-3 h-3" /><span className="text-[10px] font-black">{language === 'ko' ? 'AI 추론' : 'AI Reasoning'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Question Chips - Global per message */}
              {message.type === 'assistant' && message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center mb-2.5">
                    <Sparkles className="w-4 h-4 text-blue-600 mr-1.5 animate-pulse" />
                    <span className="text-[12px] font-black text-gray-900 tracking-tight">{language === 'ko' ? '추천 질문' : 'Suggested Questions'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {message.suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestedQuestionClick(q)}
                        className="px-4 py-1.5 bg-white hover:bg-blue-600 hover:text-white border border-gray-200 hover:border-blue-600 rounded-full text-[12px] font-bold text-gray-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Copy Button */}
            <div className="flex items-center justify-end mt-1 px-1">
              {message.type === 'assistant' && (
                <button onClick={() => handleCopyMessage(message.id, message.content)} className="flex items-center space-x-1 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100">
                  {copiedMessageId === message.id ? <><Check className="w-3.5 h-3.5 text-green-500" /><span className="text-[10px] text-green-500">{language === 'ko' ? '복사됨' : 'Copied'}</span></> : <><Copy className="w-3.5 h-3.5" /><span className="text-[10px]">{language === 'ko' ? '복사' : 'Copy'}</span></>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  })

  // 📝 입력창 컴포넌트 (입력 가속화를 위해 상태 분리)
  const ChatInput = ({ t, language, isTyping, selectedSources, onSubmit }) => {
    const [localInput, setLocalInput] = useState('')

    const onInternalSubmit = (e) => {
      e.preventDefault()
      if (!localInput.trim() || isTyping || selectedSources.length === 0) return
      onSubmit(localInput)
      setLocalInput('')
      // 높이 초기화
      const textarea = e.target.querySelector('textarea')
      if (textarea) textarea.style.height = 'auto'
    }

    const onKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onInternalSubmit(e)
      }
    }

    return (
      <div className="px-6 py-6 bg-[#F3F6FA] flex-shrink-0">
        <form onSubmit={onInternalSubmit} className="max-w-full mx-auto relative group">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 focus-within:border-slate-300 focus-within:ring-4 focus-within:ring-slate-50 transition-all flex items-center px-4 py-2 min-h-[56px]">
            <textarea
              value={localInput}
              onChange={(e) => {
                setLocalInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
              }}
              onKeyDown={onKeyDown}
              placeholder={language === 'ko' ? '입력을 시작하세요' : 'Type a message'}
              className="flex-1 text-[15px] bg-transparent border-none focus:outline-none focus:ring-0 resize-none py-2 leading-relaxed text-slate-700 custom-scrollbar placeholder:text-slate-400"
              rows="1"
              style={{ minHeight: '24px', maxHeight: '200px' }}
            />
            <div className="flex items-center space-x-3 ml-2 shrink-0">
              <span className="text-[13px] font-medium text-slate-400">
                {language === 'ko' ? `소스 ${selectedSources.length}개` : `${selectedSources.length} Sources`}
              </span>
              <button
                type="submit"
                disabled={!localInput.trim() || isTyping || selectedSources.length === 0}
                className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full flex items-center justify-center transition-all disabled:opacity-30 active:scale-95"
              >
                <ChevronRight className="w-5 h-5 translate-x-0.5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </form>
      </div>
    )
  }

  // 제출 핸들러 (ChatInput에서 호출됨)
  const handleChatSubmit = async (query) => {
    if (!query || !query.trim()) return

    const userMessage = { id: Date.now(), type: 'user', content: query, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    try {
      const detectedLang = detectLanguage(query)
      const documentContext = selectedSources.length > 0 ? selectedSources.map(s => ({ name: s.name, fileName: s.name, parsedData: s.parsedData })) : null
      const conversationHistory = messages.map(msg => ({ role: msg.type === 'user' ? 'user' : 'assistant', content: msg.content }))
      const response = await generateStrictRAGResponse(query, documentContext, detectedLang, selectedModel, conversationHistory, systemPromptOverrides)

      let processedAnswer = response.answer
      // [문서번호:페이지번호] 또는 [페이지번호] 형식 모두 체크
      const citationMatches = processedAnswer.match(/[\[\{]\d+(:\d+)?([-–]\d+)?(,\s*\d+(:\d+)?([-–]\d+)?)*[\]\}]/g)

      // 🚨 강제 인용 배지 삽입: AI가 인용을 생성하지 않았을 경우 자동 추가 (최소화)
      if (selectedSources.length > 0) {
        if (!citationMatches || citationMatches.length === 0) {
          console.warn('⚠️ [인용 누락 → 최소 삽입] AI가 인용을 생성하지 않아 대표 페이지 1개만 추가합니다')
          // 첫 번째 파일의 1페이지를 대표로 선택 (새로운 [1:1] 형식)
          processedAnswer += ` [1:1]`
        }
      }

      let cumulativePageOffset = 0
      const allSourcesData = selectedSources.map((s, index) => {
        const pageCount = s.parsedData?.pageCount || s.parsedData?.pageTexts?.length || 0
        const startPage = cumulativePageOffset + 1
        const endPage = cumulativePageOffset + pageCount
        cumulativePageOffset = endPage
        return {
          id: s.id,
          name: s.name,
          fileName: s.parsedData?.fileName || s.name,
          pageTexts: s.parsedData?.pageTexts || [],
          pageCount,
          fileType: s.parsedData?.fileType || 'unknown',
          startPage,
          endPage,
          fileIndex: index
        }
      })

      const aiMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: processedAnswer,
        timestamp: new Date().toISOString(),
        source: response.source,
        foundInDocument: response.foundInDocument,
        matchedKeywords: response.matchedKeywords,
        isReasoningBased: response.isReasoningBased,
        allSources: allSourcesData
      }
      setMessages(prev => [...prev, aiMessage])

      // AI 답변을 기반으로 추천 후속 질문 생성
      try {
        const followUpQuestions = await generateSuggestedQuestions(
          { name: 'AI Response', parsedData: { extractedText: processedAnswer } },
          language
        )
        if (followUpQuestions && followUpQuestions.length > 0) {
          setMessages(prev => prev.map(msg =>
            msg.id === aiMessage.id ? { ...msg, suggestedQuestions: followUpQuestions.slice(0, 3) } : msg
          ))
        }
      } catch (e) {
        console.warn('후속 질문 생성 실패:', e)
      }
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'assistant',
        content: t('errors.default'),
        timestamp: new Date().toISOString(),
        isError: true
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSuggestedQuestionClick = (question) => {
    handleChatSubmit(question)
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-end space-x-4">
          <div className="relative">
            <button
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 transition-all duration-200"
            >
              <span className="text-[15px] font-bold text-slate-700 tracking-tight">
                {selectedModel === 'instant' ? 'GPT-5.2 Instant' : selectedModel === 'thinking' ? 'GPT-5.2 Pro' : 'Gemini-3.0 Flash'}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isModelMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* 드롭다운 메뉴 (텍스트 전용) */}
            {isModelMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsModelMenuOpen(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-scale-in origin-top-right">
                  {[
                    { id: 'instant', name: 'GPT-5.2 Instant' },
                    { id: 'thinking', name: 'GPT-5.2 Pro' },
                    { id: 'gemini', name: 'Gemini-3.0 Flash' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onModelChange(m.id)
                        setIsModelMenuOpen(false)
                      }}
                      className={`w-full flex items-center px-5 py-3 transition-colors ${selectedModel === m.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <span className={`text-[14px] font-bold ${selectedModel === m.id ? 'text-blue-600' : 'text-slate-600'}`}>
                        {m.name}
                      </span>
                      {selectedModel === m.id && (
                        <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={onTogglePromptModal}
            className="flex items-center h-10 px-5 rounded-2xl text-[13px] font-bold transition-all border-2 border-purple-200 text-purple-700 hover:border-purple-300 hover:bg-purple-50"
          >
            {language === 'ko' ? 'AI 지침 설정' : 'AI Guidelines'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col bg-[#F3F6FA] overflow-y-auto">
        {messages.length === 0 && selectedSources.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-10 animate-fade-in py-20 px-6">
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter text-center">
              {language === 'ko' ? '시작하려면 소스 추가' : 'Add sources to start'}
            </h1>
            <button
              onClick={onOpenAddSource}
              className="px-10 h-14 bg-white border border-gray-300 rounded-[14px] hover:bg-gray-50 transition-all font-bold text-slate-800 text-[16px] shadow-sm active:scale-95"
            >
              {language === 'ko' ? '소스 업로드' : 'Upload Sources'}
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {messages.map((m) => (
              <MessageItem
                key={m.id}
                message={m}
                language={language}
                onPageClick={onPageClick}
                handleCopyMessage={handleCopyMessage}
                copiedMessageId={copiedMessageId}
                suggestedQuestions={suggestedQuestions}
                handleSuggestedQuestionClick={handleSuggestedQuestionClick}
                renderTextWithCitations={renderTextWithCitations}
              />
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        t={t}
        language={language}
        isTyping={isTyping}
        selectedSources={selectedSources}
        onSubmit={handleChatSubmit}
      />
    </div>
  )
}

export default ChatInterface
