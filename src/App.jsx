import { useState } from 'react'
import { Globe } from 'lucide-react'
import SourcePanel from './components/SourcePanel'
import ChatInterface from './components/ChatInterface'
import DataPreview from './components/DataPreview'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'

function AppContent() {
  const [sources, setSources] = useState([])
  const [selectedSourceIds, setSelectedSourceIds] = useState([])
  const [selectedModel, setSelectedModel] = useState('thinking') // 'instant' or 'thinking'
  const [targetPdfPage, setTargetPdfPage] = useState(null)
  const { language, toggleLanguage, t } = useLanguage()

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

  const handlePageNavigate = (pageNumber) => {
    setTargetPdfPage(pageNumber)
    // TODO: 향후 PDF 뷰어 구현 시 사용
    console.log('[페이지 이동 요청]', pageNumber)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Header */}
      <div className="px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('app.title')}</h1>
          <p className="text-sm text-gray-500">{t('app.subtitle')}</p>
        </div>
        <button
          onClick={toggleLanguage}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          title={t('language.switch')}
        >
          <Globe className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {language === 'ko' ? '한국어' : 'English'}
          </span>
        </button>
      </div>

      {/* Main Content - 3 Column Layout (25% | 50% | 25%) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Sources (25%) */}
        <div className="w-1/4 border-r border-gray-200 bg-white overflow-hidden">
          <SourcePanel
            sources={sources}
            onAddSources={handleAddSources}
            selectedSourceIds={selectedSourceIds}
            onToggleSource={handleToggleSource}
            onDeleteSource={handleDeleteSource}
          />
        </div>

        {/* Center Panel - Chat Interface (50%) */}
        <div className="w-1/2 bg-white overflow-hidden">
          <ChatInterface
            selectedSources={selectedSources}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onPageNavigate={handlePageNavigate}
          />
        </div>

        {/* Right Panel - Studio/JSON Preview (25%) */}
        <div className="w-1/4 border-l border-gray-200 bg-gray-50 overflow-hidden">
          <DataPreview selectedFile={selectedSources[0]} />
        </div>
      </div>
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
