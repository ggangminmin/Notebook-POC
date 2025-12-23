import { useState, useRef } from 'react'
import { Plus, Search, FileText, Upload, Check, X, Globe } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { parseFileContent } from '../utils/fileParser'

const SourcePanel = ({ sources, onAddSources, selectedSourceIds, onToggleSource }) => {
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef(null)
  const { t } = useLanguage()

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      const parsedSources = await Promise.all(
        files.map(async (file) => {
          try {
            const parsedData = await parseFileContent(file)
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
      onAddSources(validSources)
      setShowAddModal(false)
    }
  }

  const handleAddFileClick = () => {
    fileInputRef.current?.click()
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
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 px-4 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2 text-gray-600 hover:text-blue-600"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">{t('sources.addSource')}</span>
        </button>
      </div>

      {/* Search Bar - 현재는 비활성화 */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('sources.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Research Options - 비활성화 */}
        <div className="mt-3 flex items-center space-x-2 opacity-50">
          <Globe className="w-4 h-4 text-gray-400" />
          <select
            disabled
            className="text-sm border border-gray-300 rounded px-2 py-1 disabled:bg-gray-50 disabled:cursor-not-allowed"
          >
            <option>{t('sources.fastResearch')}</option>
            <option>{t('sources.deepResearch')}</option>
          </select>
        </div>
      </div>

      {/* Sources List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            {t('sources.allSources')} ({sources.length})
          </h3>
          {sources.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <Check className="w-3 h-3" />
              <span>{allSelected ? t('sources.deselectAll') : t('sources.selectAll')}</span>
            </button>
          )}
        </div>

        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 mb-1">{t('sources.noSources')}</p>
            <p className="text-xs text-gray-400">{t('sources.addSourceHint')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((source) => (
              <div
                key={source.id}
                className={`flex items-start p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedSourceIds.includes(source.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
                onClick={() => onToggleSource(source.id)}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedSourceIds.includes(source.id)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {selectedSourceIds.includes(source.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>

                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {source.name}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(source.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('sources.addSource')}</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* File Upload Option */}
              <button
                onClick={handleAddFileClick}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center space-x-3"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{t('sources.uploadFile')}</p>
                  <p className="text-xs text-gray-500">{t('sources.uploadFileDesc')}</p>
                </div>
              </button>

              {/* Web Search Option - Disabled */}
              <button
                disabled
                className="w-full p-4 border-2 border-gray-200 rounded-lg opacity-50 cursor-not-allowed flex items-center space-x-3"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{t('sources.webSearch')}</p>
                  <p className="text-xs text-gray-500">{t('sources.webSearchDesc')}</p>
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SourcePanel
