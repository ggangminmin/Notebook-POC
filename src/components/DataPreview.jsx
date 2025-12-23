import { useState } from 'react'
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

const DataPreview = ({ selectedFile }) => {
  const [expandedKeys, setExpandedKeys] = useState(new Set(['root']))
  const [isCopied, setIsCopied] = useState(false)
  const { t, language } = useLanguage()

  const handleCopyToClipboard = async () => {
    if (!selectedFile?.parsedData) return

    try {
      const jsonText = JSON.stringify(selectedFile.parsedData, null, 2)
      await navigator.clipboard.writeText(jsonText)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const toggleExpand = (key) => {
    setExpandedKeys(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const renderValue = (value, key, level = 0) => {
    const isExpanded = expandedKeys.has(key)

    if (value === null) {
      return <span className="text-purple-600">null</span>
    }

    if (typeof value === 'boolean') {
      return <span className="text-purple-600">{value.toString()}</span>
    }

    if (typeof value === 'number') {
      return <span className="text-blue-600">{value}</span>
    }

    if (typeof value === 'string') {
      // 긴 문자열은 축약
      if (value.length > 100 && !isExpanded) {
        return (
          <span>
            <span className="text-green-700">"{value.substring(0, 100)}..."</span>
            <button
              onClick={() => toggleExpand(key)}
              className="ml-2 text-xs text-blue-600 hover:underline"
            >
              [더보기]
            </button>
          </span>
        )
      }
      return <span className="text-green-700">"{value}"</span>
    }

    if (Array.isArray(value)) {
      return (
        <div>
          <div
            className="inline-flex items-center cursor-pointer hover:bg-gray-100 rounded px-1"
            onClick={() => toggleExpand(key)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
            <span className="text-gray-600 ml-1">
              Array[{value.length}]
            </span>
          </div>
          {isExpanded && (
            <div className="ml-6 mt-1">
              {value.map((item, index) => (
                <div key={`${key}-${index}`} className="my-1">
                  <span className="text-orange-600">{index}: </span>
                  {renderValue(item, `${key}-${index}`, level + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value)
      return (
        <div>
          <div
            className="inline-flex items-center cursor-pointer hover:bg-gray-100 rounded px-1"
            onClick={() => toggleExpand(key)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
            <span className="text-gray-600 ml-1">
              {'{'}...{'}'} ({entries.length} {entries.length === 1 ? 'property' : 'properties'})
            </span>
          </div>
          {isExpanded && (
            <div className="ml-6 mt-1">
              {entries.map(([k, v]) => (
                <div key={`${key}-${k}`} className="my-1">
                  <span className="text-red-600">"{k}"</span>
                  <span className="text-gray-600">: </span>
                  {renderValue(v, `${key}-${k}`, level + 1)}
                  {entries[entries.length - 1][0] !== k && (
                    <span className="text-gray-600">,</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return <span className="text-gray-700">{String(value)}</span>
  }

  return (
    <div className="h-full flex flex-col bg-white border-t border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{t('dataPreview.title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('dataPreview.subtitle')}</p>
        </div>
        {selectedFile && (
          <button
            onClick={handleCopyToClipboard}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              isCopied
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {language === 'ko' ? '복사됨!' : 'Copied!'}
                </span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {language === 'ko' ? '복사' : 'Copy'}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {!selectedFile ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-center">{t('dataPreview.noFileSelected')}</p>
          </div>
        ) : (
          <div className="font-mono text-sm bg-white border-2 border-gray-300 rounded-lg shadow-md p-6">
            <div className="mb-4 pb-4 border-b border-gray-300">
              <div className="text-xs text-gray-600 space-y-1">
                <div>
                  <span className="text-gray-500">File: </span>
                  <span className="text-gray-900 font-medium">{selectedFile.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Type: </span>
                  <span className="text-gray-900 font-medium">{selectedFile.parsedData?.fileType || 'unknown'}</span>
                </div>
              </div>
            </div>

            <div className="text-gray-600">{'{'}</div>
            <div className="ml-4">
              {selectedFile.parsedData && Object.entries(selectedFile.parsedData).map(([key, value]) => (
                <div key={key} className="my-1">
                  <span className="text-red-600">"{key}"</span>
                  <span className="text-gray-600">: </span>
                  {renderValue(value, `root-${key}`, 0)}
                  <span className="text-gray-600">,</span>
                </div>
              ))}
            </div>
            <div className="text-gray-600">{'}'}</div>
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{t('dataPreview.lastUpdated')}: {new Date(selectedFile.uploadedAt).toLocaleString()}</span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">{t('dataPreview.status')}: ready</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataPreview
