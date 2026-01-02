import { useState, useEffect } from 'react'
import SourcePanel from './components/SourcePanel'
import ChatInterface from './components/ChatInterface'
import DataPreview from './components/DataPreview'
import PDFViewer from './components/PDFViewer'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import pdfViewerController from './utils/pdfViewerController'

function AppContent() {
  const [sources, setSources] = useState([])
  const [selectedSourceIds, setSelectedSourceIds] = useState([])
  const [selectedModel, setSelectedModel] = useState('thinking') // 'instant' or 'thinking'
  const [pdfViewerState, setPdfViewerState] = useState({ isOpen: false, file: null, page: 1 })
  const [rightPanelState, setRightPanelState] = useState({ mode: 'natural', pdfPage: null }) // 우측 패널 상태
  const [systemPromptOverrides, setSystemPromptOverrides] = useState([]) // AI 시스템 프롬프트 덮어쓰기
  const [chatHistory, setChatHistory] = useState([]) // 실시간 대화 이력 (JSON 데이터 동기화용)
  const [lastSyncTime, setLastSyncTime] = useState(null) // 마지막 동기화 시간
  const { t } = useLanguage()

  // 전역 PDF 뷰어 컨트롤러 초기화 (Event Bus 패턴)
  useEffect(() => {
    console.log('[App.jsx] PDF 뷰어 컨트롤러 리스너 등록')

    // 모드 변경 이벤트 리스너
    const handleModeChange = ({ mode, pageNumber }) => {
      console.log('[App.jsx] 모드 변경 이벤트 수신:', mode, '페이지:', pageNumber)
      setRightPanelState({ mode, pdfPage: pageNumber })
    }

    // 리스너 등록
    pdfViewerController.on('modeChange', handleModeChange)

    // 클린업: 컴포넌트 언마운트 시 리스너 제거
    return () => {
      console.log('[App.jsx] PDF 뷰어 컨트롤러 리스너 제거')
      pdfViewerController.off('modeChange', handleModeChange)
    }
  }, [])

  // 선택된 소스들 가져오기
  const selectedSources = sources.filter(s => selectedSourceIds.includes(s.id))

  const handleAddSources = (newSources) => {
    setSources(prev => [...prev, ...newSources])

    // 첫 번째 소스 자동 선택
    if (sources.length === 0 && newSources.length > 0) {
      setSelectedSourceIds([newSources[0].id])
    }
  }

  const handleToggleSource = (sourceId) => {
    setSelectedSourceIds(prev => {
      if (prev.includes(sourceId)) {
        return prev.filter(id => id !== sourceId)
      } else {
        return [...prev, sourceId]
      }
    })
  }

  const handleDeleteSource = (sourceId) => {
    setSources(prev => prev.filter(s => s.id !== sourceId))
    setSelectedSourceIds(prev => prev.filter(id => id !== sourceId))
  }

  // 인용 배지 기능 제거됨

  const handleClosePDFViewer = () => {
    setPdfViewerState({ isOpen: false, file: null, page: 1 })
  }

  // 소스 데이터 업데이트 함수 (양방향 동기화)
  const handleUpdateSourceData = (sourceId, field, newValue) => {
    setSources(prev => prev.map(source => {
      if (source.id === sourceId) {
        // parsedData 내부 필드 업데이트
        return {
          ...source,
          parsedData: {
            ...source.parsedData,
            [field]: newValue
          }
        }
      }
      return source
    }))
    console.log('[App] 소스 데이터 업데이트:', sourceId, field, newValue)
  }

  // 소스 이름 업데이트 함수
  const handleUpdateSourceName = (sourceId, newName) => {
    setSources(prev => prev.map(source => {
      if (source.id === sourceId) {
        return {
          ...source,
          name: newName
        }
      }
      return source
    }))
    console.log('[App] 소스 이름 업데이트:', sourceId, newName)
  }

  // 채팅 이력 업데이트 및 동기화 (ChatInterface → DataPreview)
  const handleChatUpdate = (messages) => {
    const formattedHistory = messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content,
      timestamp: msg.timestamp
    }))
    setChatHistory(formattedHistory)
    setLastSyncTime(new Date().toISOString())
    console.log('[App] 대화 이력 동기화:', formattedHistory.length, '개 메시지')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Header */}
      <div className="px-6 py-3 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('app.title')}</h1>
          <p className="text-sm text-gray-500">{t('app.subtitle')}</p>
        </div>
      </div>

      {/* Main Content - 3 Column Layout (16% | 42% | 42%) - 채팅과 PDF 뷰어 1:1 대칭 */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Sources (16%) */}
        <div className="border-r border-gray-200 bg-white overflow-hidden" style={{ width: '16%' }}>
          <SourcePanel
            sources={sources}
            onAddSources={handleAddSources}
            selectedSourceIds={selectedSourceIds}
            onToggleSource={handleToggleSource}
            onDeleteSource={handleDeleteSource}
          />
        </div>

        {/* Center Panel - Chat Interface (42%) - PDF 뷰어와 1:1 대칭 */}
        <div className="bg-white overflow-hidden" style={{ width: '42%' }}>
          <ChatInterface
            selectedSources={selectedSources}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            systemPromptOverrides={systemPromptOverrides}
            onChatUpdate={handleChatUpdate}
          />
        </div>

        {/* Right Panel - Studio/PDF Viewer (42%) - 채팅창과 1:1 대칭 */}
        <div className="border-l border-gray-200 bg-gray-50 overflow-hidden" style={{ width: '42%' }}>
          <DataPreview
            selectedFile={selectedSources[0]}
            rightPanelState={rightPanelState}
            onPanelModeChange={(mode) => setRightPanelState({ mode, pdfPage: null })}
            onUpdateData={handleUpdateSourceData}
            onUpdateName={handleUpdateSourceName}
            onSystemPromptUpdate={setSystemPromptOverrides}
            chatHistory={chatHistory}
            lastSyncTime={lastSyncTime}
            systemPromptOverrides={systemPromptOverrides}
          />
        </div>
      </div>

      {/* PDF 뷰어 모달 */}
      {pdfViewerState.isOpen && (
        <PDFViewer
          file={pdfViewerState.file}
          initialPage={pdfViewerState.page}
          onClose={handleClosePDFViewer}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  )
}

export default App
