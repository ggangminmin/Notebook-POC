import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, FileText, AlertCircle, Sparkles, Zap, Brain } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { generateStrictRAGResponse, detectLanguage, generateDocumentSummary, generateSuggestedQuestions } from '../services/aiService'

const ChatInterface = ({ selectedSources = [], selectedModel = 'thinking', onModelChange }) => {
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
        matchedKeywords: response.matchedKeywords
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{t('chat.title')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('chat.subtitle')}</p>
          </div>

          {/* Model Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 font-medium">
              {language === 'ko' ? 'AI 모델' : 'AI Model'}:
            </span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onModelChange('instant')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  selectedModel === 'instant'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{language === 'ko' ? '빠른 응답' : 'Instant'}</span>
              </button>
              <button
                onClick={() => onModelChange('thinking')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  selectedModel === 'thinking'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>{language === 'ko' ? '심층 분석' : 'Thinking'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Context Indicator */}
        {selectedSources.length > 0 ? (
          <div className="mt-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center mb-1">
              <FileText className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">
                {language === 'ko' ? `${selectedSources.length}개의 소스 선택됨` : `${selectedSources.length} source(s) selected`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedSources.map(source => (
                <span key={source.id} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                  {source.name}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center">
            <AlertCircle className="w-4 h-4 text-amber-600 mr-2" />
            <span className="text-sm text-amber-800">{t('chat.noContext')}</span>
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
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* 문서 참조 정보 */}
                  {message.source && message.foundInDocument && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center text-xs text-gray-500">
                        <FileText className="w-3 h-3 mr-1" />
                        <span>
                          {language === 'ko' ? '출처' : 'Source'}: {message.source}
                        </span>
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

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={selectedSources.length === 0
                ? (language === 'ko' ? '안녕하세요! 또는 문서에 대해 질문해주세요...' : 'Say hello! Or ask about documents...')
                : t('chat.placeholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="1"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Send className="w-5 h-5" />
            <span className="font-medium">{t('chat.send')}</span>
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          {selectedSources.length === 0
            ? (language === 'ko' ? '문서 없이도 대화할 수 있습니다. Enter로 전송하세요.' : 'You can chat without documents. Press Enter to send.')
            : t('chat.enterToSend')}
        </p>
      </div>
    </div>
  )
}

export default ChatInterface
