import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, FileText, AlertCircle, Sparkles, Zap, Brain, Lightbulb, Gem } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLanguage } from '../contexts/LanguageContext'
import { generateStrictRAGResponse, detectLanguage, generateDocumentSummary, generateSuggestedQuestions } from '../services/aiService'

const ChatInterface = ({ selectedSources = [], selectedModel = 'thinking', onModelChange, onChatUpdate }) => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState([])
  const messagesEndRef = useRef(null)
  const { t, language } = useLanguage()

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
  }, [messages, onChatUpdate])

  // 인용 배지 기능 제거됨

  // 소스 선택이 변경되면 자동 요약 및 추천 질문 생성
  useEffect(() => {
    const analyzeDocument = async () => {
      if (selectedSources.length > 0) {
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
            setMessages([fallbackMessage])
          } else {
            const errorMessage = {
              id: Date.now() + 1,
              type: 'assistant',
              content: language === 'ko'
                ? `문서 분석 중 오류가 발생했습니다. 하지만 문서 기반 질문은 가능합니다.`
                : `An error occurred during analysis. However, you can still ask questions about the document.`,
              timestamp: new Date().toISOString()
            }
            setMessages([errorMessage])
          }
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
  }, [selectedSources.length, selectedSources.map(s => s.id).join(',')])

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

      // 이전 대화 기록을 API 형식으로 변환 (GPT ↔ Gemini 전환 시에도 대화 맥락 유지)
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))

      const response = await generateStrictRAGResponse(userQuery, documentContext, detectedLang, selectedModel, conversationHistory)

      // 디버깅: AI 응답 내용 확인
      console.log('[AI 응답] 내용 미리보기:', response.answer.substring(0, 200))
      let processedAnswer = response.answer
      const citationMatches = processedAnswer.match(/\[\d+\]|\[\d+-\d+\]|<cite page="\d+">/g)
      console.log('[AI 응답] 인용 패턴 확인:', citationMatches)
      console.log('[AI 응답] 인용 개수:', citationMatches?.length || 0)

      // 🚨 강제 인용 배지 삽입: AI가 인용을 생성하지 않았을 경우 자동 추가 (최소화)
      if (selectedSources.length > 0 && selectedSources[0].parsedData?.pageCount) {
        const pageCount = selectedSources[0].parsedData.pageCount

        if (!citationMatches || citationMatches.length === 0) {
          console.warn('⚠️ [인용 누락 → 최소 삽입] AI가 인용을 생성하지 않아 대표 페이지 1개만 추가합니다')
          // 문서 중간 대표 페이지 1개만 추가 (과도한 인용 방지)
          const representativePage = Math.max(1, Math.floor(pageCount / 2))
          processedAnswer += ` [${representativePage}]`
        }
        // 1-2개 있으면 그대로 두고, 추가하지 않음 (자연스러움 우선)
      }

      // allSources 데이터 검증
      const allSourcesData = selectedSources.map(s => ({
        id: s.id,
        name: s.name,
        fileName: s.parsedData?.fileName || s.name,
        pageTexts: s.parsedData?.pageTexts || [],
        pageCount: s.parsedData?.pageCount || 0
      }))

      console.log('[allSources 검증] 총', allSourcesData.length, '개 파일, 페이지 데이터:', allSourcesData.map(s => `${s.name}(${s.pageTexts.length}페이지)`).join(', '))

      const aiMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: processedAnswer, // 강제 인용 배지가 추가된 버전 사용
        timestamp: new Date().toISOString(),
        source: response.source,
        foundInDocument: response.foundInDocument,
        matchedKeywords: response.matchedKeywords,
        isReasoningBased: response.isReasoningBased, // 추론 기반 답변 플래그
        sourceData: selectedSources.length > 0 ? selectedSources[0].parsedData : null, // 인용 태그 처리용 (기본: 첫 번째 파일)
        allSources: allSourcesData // 다중 파일 지원 (파일ID + 이름 포함)
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

          {/* Model Selector - Compact (3 models) */}
          <div className="flex bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => onModelChange('instant')}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
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
              className={`flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
                selectedModel === 'thinking'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Brain className="w-3 h-3" />
              <span>{language === 'ko' ? '심층' : 'Deep'}</span>
            </button>
            <button
              onClick={() => onModelChange('gemini')}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
                selectedModel === 'gemini'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Gem className="w-3 h-3" />
              <span>{language === 'ko' ? 'Gemini' : 'Gemini'}</span>
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

      {/* Messages Area - NotebookLM 스타일 슬림화 (스크롤바 고정으로 레이아웃 안정화) */}
      <div className="flex-1 p-5 space-y-3 bg-gray-50" style={{ overflowY: 'scroll' }}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[85%] ${
                message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar - Compact */}
              <div
                className={`flex-shrink-0 ${
                  message.type === 'user' ? 'ml-2' : 'mr-2'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user'
                      ? 'bg-blue-500'
                      : message.isError
                      ? 'bg-red-500'
                      : 'bg-gradient-to-br from-purple-500 to-blue-500'
                  }`}
                >
                  {message.type === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>

              {/* Message Content - NotebookLM 스타일 슬림 말풍선 */}
              <div className="flex-1">
                <div
                  className={`px-3.5 py-2.5 rounded-xl ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.isError
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                  }`}
                >
                  <div className="text-[13px] leading-[1.55] prose prose-sm max-w-none markdown-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // 커스텀 컴포넌트 스타일링 - NotebookLM 스타일 (슬림화)
                        strong: ({node, ...props}) => <strong className="font-bold" style={{fontWeight: 600}} {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-[13.5px] font-semibold mt-2 mb-1.5" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside my-1.5 space-y-0.5" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside my-1.5 space-y-0.5" {...props} />,
                        li: ({node, children, ...props}) => (
                          <li className="ml-2" {...props}>
                            <span className="inline">{children}</span>
                          </li>
                        ),
                        p: ({node, children, ...props}) => {
                          // li 안의 p 태그는 inline으로 처리
                          const isInsideList = node?.position?.start?.line &&
                                               message.content.split('\n')[node.position.start.line - 1]?.trim().match(/^\d+\.|^[-*]/)

                          return isInsideList ?
                            <span {...props}>{children}</span> :
                            <p className="my-1" {...props}>{children}</p>
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {/* 문서 참조 정보 - 슬림화 */}
                  {message.source && message.foundInDocument && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-[11px] text-gray-500">
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
                              className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 문서에서 못 찾은 경우 표시 - 슬림화 */}
                  {message.source && !message.foundInDocument && (
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <div className="flex items-center text-[11px] text-amber-700">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        <span>{language === 'ko' ? '문서에서 찾을 수 없음' : 'Not found in document'}</span>
                      </div>
                    </div>
                  )}

                  {/* 추천 질문 버튼 (요약 메시지에만 표시) - 슬림화 */}
                  {message.isSummary && message.hasSuggestedQuestions && suggestedQuestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center mb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 mr-1" />
                        <span className="text-[11px] font-medium text-gray-700">
                          {language === 'ko' ? '추천 질문' : 'Suggested Questions'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {suggestedQuestions.map((question, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestedQuestionClick(question)}
                            className="text-left px-2.5 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border border-purple-200 rounded-lg text-[12px] text-gray-700 transition-all hover:shadow-sm"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 px-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator - Compact */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex">
              <div className="mr-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-1.5">
                  <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  <span className="text-[12px] text-gray-600">{t('chat.typing')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Compact */}
      <div className="px-4 py-2.5 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={selectedSources.length === 0
                ? (language === 'ko' ? '안녕하세요! 또는 문서에 대해 질문해주세요...' : 'Say hello! Or ask about documents...')
                : t('chat.placeholder')}
              className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="1"
              style={{ minHeight: '36px', maxHeight: '100px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="text-[12px] font-medium">{t('chat.send')}</span>
          </button>
        </form>
        <p className="text-[9px] text-gray-400 mt-1 text-center">
          {selectedSources.length === 0
            ? (language === 'ko' ? '문서 없이도 대화 가능 · Enter로 전송' : 'Chat without docs · Press Enter to send')
            : (language === 'ko' ? 'Enter로 전송 · Shift+Enter로 줄바꿈' : 'Enter to send · Shift+Enter for new line')}
        </p>
      </div>
    </div>
  )
}

export default ChatInterface
