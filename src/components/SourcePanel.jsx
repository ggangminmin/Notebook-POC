import { useState, useRef } from 'react'
import { Plus, FileText, Upload, X, Globe, Search, Sparkles, ChevronDown } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { parseFileContent, fetchWebMetadata } from '../utils/fileParser'

const SourcePanel = ({ sources, onAddSources, selectedSourceIds, onToggleSource, onDeleteSource }) => {
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeTab, setActiveTab] = useState('file') // 'file' or 'url'
  const [urlInput, setUrlInput] = useState('')
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [researchType, setResearchType] = useState('fast')
  const fileInputRef = useRef(null)
  const { t } = useLanguage()

  const handleFileSelect = async (e) => {
    console.log('파일 선택 이벤트 발생:', e.target.files)
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      console.log('선택된 파일:', files.map(f => f.name))
      const parsedSources = await Promise.all(
        files.map(async (file) => {
          try {
            console.log('파일 파싱 시작:', file.name)
            const parsedData = await parseFileContent(file)
            console.log('파일 파싱 완료:', file.name, parsedData)
            return {
              id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              type: 'file',
              fileType: file.type,
              size: file.size,
              uploadedAt: new Date().toISOString(),
              parsedData: parsedData
            }
          } catch (error) {
            console.error('파일 파싱 오류:', error)
            return null
          }
        })
      )

      const validSources = parsedSources.filter(s => s !== null)
      console.log('유효한 소스:', validSources)
      onAddSources(validSources)
      setShowAddModal(false)
    }
    // input 초기화 - 같은 파일 재선택 가능하도록
    e.target.value = ''
  }

  const handleAddFileClick = () => {
    console.log('파일 추가 버튼 클릭, fileInputRef:', fileInputRef.current)
    if (fileInputRef.current) {
      fileInputRef.current.click()
    } else {
      console.error('fileInputRef가 null입니다!')
    }
  }

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      setUrlError(t('sources.urlRequired') || 'URL을 입력해주세요.')
      return
    }

    setIsLoadingUrl(true)
    setUrlError('')

    try {
      const metadata = await fetchWebMetadata(urlInput.trim())
      const newSource = {
        id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: metadata.metadata?.title || metadata.domain,
        type: 'web',
        url: urlInput.trim(),
        uploadedAt: new Date().toISOString(),
        parsedData: metadata
      }

      onAddSources([newSource])
      setShowAddModal(false)
      setUrlInput('')
      setUrlError('')
    } catch (error) {
      setUrlError(error.message || t('sources.urlError') || 'URL을 가져올 수 없습니다.')
    } finally {
      setIsLoadingUrl(false)
    }
  }

  const allSelected = sources.length > 0 && selectedSourceIds.length === sources.length

  const toggleAll = () => {
    if (allSelected) {
      // 모두 선택 해제
      sources.forEach(source => {
        if (selectedSourceIds.includes(source.id)) {
          onToggleSource(source.id)
        }
      })
    } else {
      // 모두 선택
      sources.forEach(source => {
        if (!selectedSourceIds.includes(source.id)) {
          onToggleSource(source.id)
        }
      })
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* NotebookLM Style Header */}
      <div className="p-4 space-y-3">
        {/* Add Source Button - Capsule Style */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 text-sm font-medium text-gray-700 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{t('sources.addSource')}</span>
        </button>

        {/* Deep Research Banner */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-100 via-blue-50 to-green-50 p-4 border border-purple-200/50">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-white/80 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 mb-1">
                {t('sources.deepResearchTitle')}
              </p>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                {t('sources.deepResearchDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Web Search Bar */}
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('sources.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>

          {/* Research Type Selector */}
          <div className="mt-2 flex items-center space-x-2">
            <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
              <Globe className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-xs text-gray-700">{t('sources.web')}</span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </button>

            <button
              onClick={() => setResearchType(researchType === 'fast' ? 'deep' : 'fast')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-xs text-gray-700">
                {researchType === 'fast' ? t('sources.fastResearch') : t('sources.deepResearch')}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Sources List Section */}
      <div className="flex-1 flex flex-col overflow-hidden border-t border-gray-200">
        {/* List Header */}
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-medium text-gray-700">
              {t('sources.allSources')} ({sources.length})
            </span>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto">
          {sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
              <FileText className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-600 mb-1">{t('sources.noSources')}</p>
              <p className="text-xs text-gray-400">{t('sources.addSourceHint')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors group ${
                    selectedSourceIds.includes(source.id) ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedSourceIds.includes(source.id)}
                      onChange={() => onToggleSource(source.id)}
                      className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />

                    <div
                      className="flex-shrink-0 cursor-pointer"
                      onClick={() => onToggleSource(source.id)}
                    >
                      {source.type === 'web' ? (
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                          <Globe className="w-4 h-4 text-blue-600" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                          <FileText className="w-4 h-4 text-red-600" />
                        </div>
                      )}
                    </div>

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => onToggleSource(source.id)}
                    >
                      <p className="text-sm font-medium text-gray-900 truncate" title={source.name}>
                        {source.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate" title={source.url || ''}>
                        {source.type === 'web' ? source.url : new Date(source.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteSource(source.id)
                      }}
                      className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="삭제"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('sources.addSource')}</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
              <button
                onClick={() => setActiveTab('file')}
                className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'file'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>{t('sources.uploadFile')}</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('url')}
                className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'url'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Globe className="w-4 h-4" />
                  <span>{t('sources.webUrl')}</span>
                </div>
              </button>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {activeTab === 'file' ? (
                // File Upload Tab
                <div className="space-y-3">
                  <button
                    onClick={handleAddFileClick}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center space-y-2"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Upload className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-900">{t('sources.uploadFile')}</p>
                      <p className="text-xs text-gray-500 mt-1">{t('sources.uploadFileDesc')}</p>
                    </div>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <p className="text-xs text-gray-500 text-center">
                    {t('sources.supportedFormats')}: PDF, Word, Excel, TXT, JSON
                  </p>
                </div>
              ) : (
                // URL Input Tab
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('sources.webUrlLabel')}
                    </label>
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isLoadingUrl) {
                          handleUrlSubmit()
                        }
                      }}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoadingUrl}
                    />
                    {urlError && (
                      <p className="mt-1 text-xs text-red-600">{urlError}</p>
                    )}
                  </div>

                  <button
                    onClick={handleUrlSubmit}
                    disabled={isLoadingUrl || !urlInput.trim()}
                    className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isLoadingUrl ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{t('sources.loading')}</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4" />
                        <span>{t('sources.addUrl')}</span>
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    {t('sources.urlHint')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SourcePanel
