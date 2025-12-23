import { useState } from 'react'
import { Globe } from 'lucide-react'
import FileUpload from './components/FileUpload'
import DataPreview from './components/DataPreview'
import ChatInterface from './components/ChatInterface'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { parseFileContent } from './utils/fileParser'

function AppContent() {
  const [files, setFiles] = useState([])
  const [selectedFileId, setSelectedFileId] = useState(null)
  const { language, toggleLanguage, t } = useLanguage()

  const selectedFile = files.find(f => f.id === selectedFileId)

  const handleFileUpload = async (newFiles) => {
    const parsedFiles = await Promise.all(
      newFiles.map(async (file) => {
        try {
          const parsedData = await parseFileContent(file)
          return {
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            size: file.size,
            fileType: file.type,
            uploadedAt: new Date().toISOString(),
            parsedData: parsedData
          }
        } catch (error) {
          console.error('파일 파싱 오류:', error)
          return null
        }
      })
    )

    const validFiles = parsedFiles.filter(f => f !== null)
    setFiles(prev => [...prev, ...validFiles])

    // 첫 번째 파일 자동 선택
    if (files.length === 0 && validFiles.length > 0) {
      setSelectedFileId(validFiles[0].id)
    }
  }

  const handleSelectFile = (fileId) => {
    setSelectedFileId(fileId)
  }

  const handleDeleteFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
    if (selectedFileId === fileId) {
      const remainingFiles = files.filter(f => f.id !== fileId)
      setSelectedFileId(remainingFiles.length > 0 ? remainingFiles[0].id : null)
    }
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

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - 40% */}
        <div className="w-2/5 flex flex-col border-r border-gray-200">
          {/* File Upload Section - Top Half */}
          <div className="h-1/2 border-b border-gray-200 bg-white overflow-hidden">
            <FileUpload
              onFileUpload={handleFileUpload}
              files={files}
              selectedFileId={selectedFileId}
              onSelectFile={handleSelectFile}
              onDeleteFile={handleDeleteFile}
            />
          </div>

          {/* Data Preview Section - Bottom Half */}
          <div className="h-1/2 bg-gray-900 overflow-hidden">
            <DataPreview selectedFile={selectedFile} />
          </div>
        </div>

        {/* Right Panel - 60% */}
        <div className="w-3/5 bg-white overflow-hidden">
          <ChatInterface selectedFile={selectedFile} />
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
