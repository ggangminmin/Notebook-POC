import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, FileText, AlertCircle } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { generateStrictRAGResponse, detectLanguage } from '../services/aiService'

const ChatInterface = ({ selectedFile }) => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const { t, language } = useLanguage()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 파일 선택이 변경되면 초기 메시지 추가
  useEffect(() => {
    if (selectedFile) {
      const greetingMessage = {
        id: Date.now(),
        type: 'assistant',
        content: language === 'ko'
          ? `"${selectedFile.name}" 파일이 선택되었습니다. 이 문서의 내용에 대해 질문해주세요.`
          : `"${selectedFile.name}" has been selected. Please ask questions about this document.`,
        timestamp: new Date().toISOString(),
        isSystemMessage: true
      }
      setMessages([greetingMessage])
    } else {
      setMessages([{
        id: Date.now(),
        type: 'assistant',
        content: t('chat.greeting'),
        timestamp: new Date().toISOString()
      }])
    }
  }, [selectedFile?.id])

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

      // 엄격한 RAG 응답 생성
      const documentContext = selectedFile ? {
        fileName: selectedFile.name,
        parsedData: selectedFile.parsedData
      } : null

      const response = await generateStrictRAGResponse(userQuery, documentContext, detectedLang)

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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <h2 className="text-xl font-semibold text-gray-800">{t('chat.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('chat.subtitle')}</p>

        {/* Context Indicator */}
        {selectedFile ? (
          <div className="mt-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
            <FileText className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-sm text-blue-800">
              {t('chat.currentContext').replace('[{fileName}]', selectedFile.name)}
            </span>
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
        {!selectedFile && (
          <div className="mb-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">{t('chat.noDocumentContext')}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('chat.placeholder')}
              disabled={!selectedFile}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows="1"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isTyping || !selectedFile}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Send className="w-5 h-5" />
            <span className="font-medium">{t('chat.send')}</span>
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          {t('chat.enterToSend')}
        </p>
      </div>
    </div>
  )
}

export default ChatInterface
