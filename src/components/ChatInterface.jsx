import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, FileText, AlertCircle, Sparkles, Zap, Brain, Lightbulb } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLanguage } from '../contexts/LanguageContext'
import { generateStrictRAGResponse, detectLanguage, generateDocumentSummary, generateSuggestedQuestions } from '../services/aiService'
import CitationBadge from './CitationBadge'

const ChatInterface = ({ selectedSources = [], selectedModel = 'thinking', onModelChange, onPageNavigate }) => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState([])
  const messagesEndRef = useRef(null)
  const { t, language } = useLanguage()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 인용 태그를 파싱하여 페이지 번호 추출
  const parseCitations = (text) => {
    const citations = []
    const regex = /<cite page="(\d+)">(.*?)<\/cite>/g
    let match

    while ((match = regex.exec(text)) !== null) {
      citations.push({
        pageNumber: parseInt(match[1]),
        text: match[2]
      })
    }

    return citations
  }

  // 인용 태그를 CitationBadge로 변환
  const renderContentWithCitations = (content, sourceData) => {
    if (!content) return null

    // <cite> 태그가 있는지 확인
    if (!content.includes('<cite')) {
      return content
    }

    const parts = []
    let lastIndex = 0
    const regex = /<cite page="(\d+)">(.*?)<\/cite>/g
    let match

    while ((match = regex.exec(content)) !== null) {
      // 태그 이전 텍스트 추가
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index))
      }

      // CitationBadge 추가
      const pageNumber = parseInt(match[1])
      const pageText = sourceData?.pageTexts?.find(p => p.pageNumber === pageNumber)?.text || match[2]

      parts.push(
        `[p.${pageNumber}]`
      )

      lastIndex = match.index + match[0].length
    }

    // 마지막 남은 텍스트 추가
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex))
    }

    return parts.join('')
  }

  // 페이지 이동 핸들러
  const handlePageClick = (pageNumber) => {
    if (onPageNavigate) {
      onPageNavigate(pageNumber)
    }
  }

  // 텍스트에서 인용 태그를 찾아 CitationBadge로 변환
  const processTextWithCitations = (children, sourceData) => {
    if (!children) return children

    const processNode = (node) => {
      if (typeof node === 'string') {
        // <cite page="N">text</cite> 패턴 찾기
        const citationRegex = /<cite page="(\d+)">(.*?)<\/cite>/g
        const parts = []
        let lastIndex = 0
        let match

        while ((match = citationRegex.exec(node)) !== null) {
          // 인용 태그 이전 텍스트
          if (match.index > lastIndex) {
            parts.push(node.substring(lastIndex, match.index))
          }

          // CitationBadge 컴포넌트
          const pageNumber = parseInt(match[1])
          const pageText = sourceData?.pageTexts?.find(p => p.pageNumber === pageNumber)?.text || match[2]

          parts.push(
            <CitationBadge
              key={`cite-${pageNumber}-${match.index}`}
              pageNumber={pageNumber}
              text={pageText}
              onPageClick={handlePageClick}
            />
          )

          lastIndex = match.index + match[0].length
        }

        // 마지막 남은 텍스트
        if (lastIndex < node.length) {
          parts.push(node.substring(lastIndex))
        }

        return parts.length > 0 ? parts : node
      } else if (Array.isArray(node)) {
        return node.map((child, idx) => <span key={idx}>{processNode(child)}</span>)
      } else if (node?.props?.children) {
        return {
          ...node,
          props: {
            ...node.props,
            children: processNode(node.props.children)
          }
        }
      }

      return node
    }

    return processNode(children)
  }

  // 소스 선택이 변경되면 자동 요약 및 추천 질문 생성
  useEffect(() => {
    const analyzeDocument = async () => {
      if (selectedSources.length > 0) {
        setIsAnalyzing(true)
        setMessages([])
        setSuggestedQuestions([])

        const sourceNames = selectedSources.map(s => s.name).join(', ')

        // 1. 분석 중 메시지
        const analyzingMessage = {
          id: Date.now(),
          type: 'assistant',
          content: language === 'ko'
            ? `📄 ${selectedSources.length}개의 문서를 분석하고 있습니다...\n${sourceNames}`
            : `📄 Analyzing ${selectedSources.length} document(s)...\n${sourceNames}`,
          timestamp: new Date().toISOString(),
          isAnalyzing: true
        }
        setMessages([analyzingMessage])

        try {
          // 문서 컨텍스트 검증
          console.log('[ChatInterface] 선택된 소스 데이터 검증:')
          console.log('- 파일명:', selectedSources[0].name)
          console.log('- parsedData 존재:', !!selectedSources[0].parsedData)
          console.log('- extractedText 길이:', selectedSources[0].parsedData?.extractedText?.length || 0)
          console.log('- extractedText 첫 200자:', selectedSources[0].parsedData?.extractedText?.substring(0, 200))

          // 2. 자동 요약 생성
          const summary = await generateDocumentSummary(
            { name: selectedSources[0].name, parsedData: selectedSources[0].parsedData },
            language
          )

          console.log('[ChatInterface] 요약 생성 완료:', summary?.substring(0, 100))

          // 3. 추천 질문 생성
          console.log('[ChatInterface] 추천 질문 생성 시작...')
          const questions = await generateSuggestedQuestions(
            { name: selectedSources[0].name, parsedData: selectedSources[0].parsedData },
            language
          )

          console.log('[ChatInterface] 추천 질문 생성 완료:', questions)
          console.log('[ChatInterface] 추천 질문 개수:', questions?.length || 0)

          setSuggestedQuestions(questions || [])

          // 4. 완료 메시지 (요약 포함)
          const hasQuestions = questions && questions.length > 0
          console.log('[ChatInterface] hasSuggestedQuestions:', hasQuestions)

          const summaryMessage = {
            id: Date.now() + 1,
            type: 'assistant',
            content: summary || (language === 'ko'
              ? `✅ 문서 분석 완료!\n\n${selectedSources.length}개의 문서가 준비되었습니다 (${sourceNames}).\n\n궁금하신 내용을 물어보세요!`
              : `✅ Document analysis complete!\n\n${selectedSources.length} document(s) ready (${sourceNames}).\n\nFeel free to ask questions!`),
            timestamp: new Date().toISOString(),
            isSummary: true,
            hasSuggestedQuestions: hasQuestions
          }
          setMessages([summaryMessage])

          console.log('[ChatInterface] summaryMessage 설정 완료:', summaryMessage)

        } catch (error) {
          console.error('문서 분석 오류:', error)
          const errorMessage = {
            id: Date.now() + 1,
            type: 'assistant',
            content: language === 'ko'
              ? `문서 분석 중 오류가 발생했습니다. 하지만 문서 기반 질문은 가능합니다.`
              : `An error occurred during analysis. However, you can still ask questions about the document.`,
            timestamp: new Date().toISOString()
          }
          setMessages([errorMessage])
        } finally {
          setIsAnalyzing(false)
        }
      } else {
        // 파일이 없으면 환영 메시지 표시
        setMessages([{
          id: Date.now(),
          type: 'assistant',
          content: language === 'ko'
            ? `안녕하세요! 저는 NotebookLM 스타일의 문서 분석 AI입니다.\n\n문서를 업로드하시면 그 내용을 바탕으로 대화를 시작할 수 있습니다. 왼쪽의 "+ 소스 추가" 버튼을 눌러 파일을 업로드하거나 웹 URL을 추가해주세요.\n\n물론 간단한 인사나 질문도 환영합니다!`
            : `Hello! I'm a NotebookLM-style document analysis AI.\n\nOnce you upload a document, I can start a conversation based on its content. Please click the "+ Add Source" button on the left to upload a file or add a web URL.\n\nOf course, simple greetings or questions are welcome too!`,
          timestamp: new Date().toISOString(),
          isWelcome: true
        }])
        setSuggestedQuestions([])
      }
    }

    analyzeDocument()
  }, [selectedSources.length, selectedSources.map(s => s.id).join(','), language])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    const userQuery = input
    setInput('')
    setIsTyping(true)

    try {
      // 언어 감지
      const detectedLang = detectLanguage(userQuery)

      // 엄격한 RAG 응답 생성 - 모든 선택된 소스 사용 (다중 소스 지원)
      const documentContext = selectedSources.length > 0
        ? selectedSources.map(source => ({
            name: source.name,
            fileName: source.name,
            parsedData: source.parsedData
          }))
        : null

      const response = await generateStrictRAGResponse(userQuery, documentContext, detectedLang, selectedModel === 'thinking')

      const aiMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString(),
        source: response.source,
        foundInDocument: response.foundInDocument,
        matchedKeywords: response.matchedKeywords,
        isReasoningBased: response.isReasoningBased, // 추론 기반 답변 플래그
        sourceData: selectedSources.length > 0 ? selectedSources[0].parsedData : null // 인용 태그 처리용
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: language === 'ko'
          ? '죄송합니다. 오류가 발생했습니다.'
          : 'Sorry, an error occurred.',
        timestamp: new Date().toISOString(),
        isError: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // 추천 질문 클릭 핸들러
  const handleSuggestedQuestionClick = (question) => {
    setInput(question)
    // 자동으로 질문 제출
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} }
      handleSubmit(fakeEvent)
    }, 100)
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Compact Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-800">{t('chat.title')}</h2>

          {/* Model Selector - Compact */}
          <div className="flex bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => onModelChange('instant')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
                selectedModel === 'instant'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>{language === 'ko' ? '빠름' : 'Fast'}</span>
            </button>
            <button
              onClick={() => onModelChange('thinking')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
                selectedModel === 'thinking'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Brain className="w-3 h-3" />
              <span>{language === 'ko' ? '심층' : 'Deep'}</span>
            </button>
          </div>
        </div>

        {/* Context Indicator - Compact */}
        {selectedSources.length > 0 ? (
          <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-3 h-3 text-blue-600 mr-1.5" />
                <span className="text-[10px] font-medium text-blue-800">
                  {language === 'ko' ? `${selectedSources.length}개 선택됨` : `${selectedSources.length} selected`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedSources.slice(0, 2).map(source => (
                  <span key={source.id} className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                    {source.name.length > 15 ? source.name.substring(0, 15) + '...' : source.name}
                  </span>
                ))}
                {selectedSources.length > 2 && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                    +{selectedSources.length - 2}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md flex items-center">
            <AlertCircle className="w-3 h-3 text-amber-600 mr-1.5" />
            <span className="text-[10px] text-amber-800">{t('chat.noContext')}</span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[80%] ${
                message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 ${
                  message.type === 'user' ? 'ml-3' : 'mr-3'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    message.type === 'user'
                      ? 'bg-blue-500'
                      : message.isError
                      ? 'bg-red-500'
                      : 'bg-gradient-to-br from-purple-500 to-blue-500'
                  }`}
                >
                  {message.type === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>
              </div>

              {/* Message Content */}
              <div className="flex-1">
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.isError
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                  }`}
                >
                  <div className="text-sm prose prose-sm max-w-none markdown-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // 커스텀 컴포넌트 스타일링
                        strong: ({node, ...props}) => <strong className="font-bold" style={{fontWeight: 700}} {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-semibold mt-3 mb-2" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-0.5" {...props} />,
                        li: ({node, children, ...props}) => (
                          <li className="ml-2" {...props}>
                            <span className="inline">{children}</span>
                          </li>
                        ),
                        p: ({node, children, ...props}) => {
                          // li 안의 p 태그는 inline으로 처리
                          const isInsideList = node?.position?.start?.line &&
                                               message.content.split('\n')[node.position.start.line - 1]?.trim().match(/^\d+\.|^[-*]/)

                          // 인용 태그 처리
                          const processedChildren = processTextWithCitations(children, message.sourceData)

                          return isInsideList ?
                            <span {...props}>{processedChildren}</span> :
                            <p className="my-1.5" {...props}>{processedChildren}</p>
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {/* 문서 참조 정보 */}
                  {message.source && message.foundInDocument && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-xs text-gray-500">
                          <FileText className="w-3 h-3 mr-1" />
                          <span>
                            {language === 'ko' ? '출처' : 'Source'}: {message.source}
                          </span>
                        </div>
                        {/* 추론 기반 답변 태그 */}
                        {message.isReasoningBased && (
                          <div className="flex items-center space-x-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                            <Lightbulb className="w-3 h-3" />
                            <span className="text-[9px] font-medium">
                              {language === 'ko' ? '맥락 기반 추론' : 'Reasoning'}
                            </span>
                          </div>
                        )}
                      </div>
                      {message.matchedKeywords && message.matchedKeywords.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {message.matchedKeywords.map((keyword, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 문서에서 못 찾은 경우 표시 */}
                  {message.source && !message.foundInDocument && (
                    <div className="mt-3 pt-3 border-t border-amber-200">
                      <div className="flex items-center text-xs text-amber-700">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        <span>{language === 'ko' ? '문서에서 찾을 수 없음' : 'Not found in document'}</span>
                      </div>
                    </div>
                  )}

                  {/* 추천 질문 버튼 (요약 메시지에만 표시) */}
                  {message.isSummary && message.hasSuggestedQuestions && suggestedQuestions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center mb-2">
                        <Sparkles className="w-4 h-4 text-purple-600 mr-1.5" />
                        <span className="text-xs font-medium text-gray-700">
                          {language === 'ko' ? '추천 질문' : 'Suggested Questions'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {suggestedQuestions.map((question, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestedQuestionClick(question)}
                            className="text-left px-3 py-2 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border border-purple-200 rounded-lg text-sm text-gray-700 transition-all hover:shadow-sm"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1 px-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex">
              <div className="mr-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  <span className="text-sm text-gray-600">{t('chat.typing')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Wide and Centered */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={selectedSources.length === 0
                ? (language === 'ko' ? '안녕하세요! 또는 문서에 대해 질문해주세요...' : 'Say hello! Or ask about documents...')
                : t('chat.placeholder')}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="1"
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-1.5"
          >
            <Send className="w-4 h-4" />
            <span className="text-sm font-medium">{t('chat.send')}</span>
          </button>
        </form>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          {selectedSources.length === 0
            ? (language === 'ko' ? '문서 없이도 대화 가능 · Enter로 전송' : 'Chat without docs · Press Enter to send')
            : (language === 'ko' ? 'Enter로 전송 · Shift+Enter로 줄바꿈' : 'Enter to send · Shift+Enter for new line')}
        </p>
      </div>
    </div>
  )
}

export default ChatInterface
