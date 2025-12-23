import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

const DataPreview = ({ selectedFile }) => {
  const [expandedKeys, setExpandedKeys] = useState(new Set(['root']))
  const { t } = useLanguage()

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
      return <span className="text-purple-400">null</span>
    }

    if (typeof value === 'boolean') {
      return <span className="text-purple-400">{value.toString()}</span>
    }

    if (typeof value === 'number') {
      return <span className="text-green-400">{value}</span>
    }

    if (typeof value === 'string') {
      // 긴 문자열은 축약
      if (value.length > 100 && !isExpanded) {
        return (
          <span>
            <span className="text-yellow-300">"{value.substring(0, 100)}..."</span>
            <button
              onClick={() => toggleExpand(key)}
              className="ml-2 text-xs text-blue-400 hover:underline"
            >
              [더보기]
            </button>
          </span>
        )
      }
      return <span className="text-yellow-300">"{value}"</span>
    }

    if (Array.isArray(value)) {
      return (
        <div>
          <div
            className="inline-flex items-center cursor-pointer hover:bg-gray-800 rounded px-1"
            onClick={() => toggleExpand(key)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-gray-400 ml-1">
              Array[{value.length}]
            </span>
          </div>
          {isExpanded && (
            <div className="ml-6 mt-1">
              {value.map((item, index) => (
                <div key={`${key}-${index}`} className="my-1">
                  <span className="text-blue-400">{index}: </span>
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
            className="inline-flex items-center cursor-pointer hover:bg-gray-800 rounded px-1"
            onClick={() => toggleExpand(key)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-gray-400 ml-1">
              {'{'}...{'}'} ({entries.length} {entries.length === 1 ? 'property' : 'properties'})
            </span>
          </div>
          {isExpanded && (
            <div className="ml-6 mt-1">
              {entries.map(([k, v]) => (
                <div key={`${key}-${k}`} className="my-1">
                  <span className="text-blue-400">"{k}"</span>
                  <span className="text-gray-500">: </span>
                  {renderValue(v, `${key}-${k}`, level + 1)}
                  {entries[entries.length - 1][0] !== k && (
                    <span className="text-gray-500">,</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return <span className="text-gray-300">{String(value)}</span>
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      <div className="px-6 py-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-gray-100">{t('dataPreview.title')}</h2>
        <p className="text-sm text-gray-400 mt-1">{t('dataPreview.subtitle')}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!selectedFile ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center">{t('dataPreview.noFileSelected')}</p>
          </div>
        ) : (
          <div className="font-mono text-sm">
            <div className="mb-4 pb-4 border-b border-gray-700">
              <div className="text-xs text-gray-500 space-y-1">
                <div>
                  <span className="text-gray-400">File: </span>
                  <span className="text-white">{selectedFile.name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Type: </span>
                  <span className="text-white">{selectedFile.parsedData?.fileType || 'unknown'}</span>
                </div>
              </div>
            </div>

            <div className="text-gray-500">{'{'}</div>
            <div className="ml-4">
              {selectedFile.parsedData && Object.entries(selectedFile.parsedData).map(([key, value]) => (
                <div key={key} className="my-1">
                  <span className="text-blue-400">"{key}"</span>
                  <span className="text-gray-500">: </span>
                  {renderValue(value, `root-${key}`, 0)}
                  <span className="text-gray-500">,</span>
                </div>
              ))}
            </div>
            <div className="text-gray-500">{'}'}</div>
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="px-6 py-3 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{t('dataPreview.lastUpdated')}: {new Date(selectedFile.uploadedAt).toLocaleString()}</span>
            <span>{t('dataPreview.status')}: ready</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataPreview
