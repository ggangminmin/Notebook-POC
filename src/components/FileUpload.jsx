import { useState, useRef } from 'react'
import { Upload, File, X, FileText, FileSpreadsheet, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { formatFileSize } from '../utils/fileParser'

const FileUpload = ({ onFileUpload, files, selectedFileId, onSelectFile, onDeleteFile }) => {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const { t } = useLanguage()

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files).filter(file =>
      ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
       'application/msword'].includes(file.type) || file.name.endsWith('.txt')
    )

    if (droppedFiles.length > 0) {
      onFileUpload(droppedFiles)
    }
  }

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (selectedFiles.length > 0) {
      onFileUpload(selectedFiles)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const getFileIcon = (type) => {
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />
    if (type.includes('word')) return <FileText className="w-5 h-5 text-blue-500" />
    return <File className="w-5 h-5 text-gray-500" />
  }

  return (
    <div className="h-full flex flex-col p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('fileUpload.title')}</h2>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600 mb-2">
          {t('fileUpload.dragDrop')}
        </p>
        <p className="text-sm text-gray-500">
          {t('fileUpload.supportedFormats')}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File List */}
      <div className="mt-6 flex-1 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          {t('fileUpload.uploadedFiles')} ({files.length})
        </h3>
        {files.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">{t('fileUpload.noFiles')}</p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-3 border rounded-lg transition-all cursor-pointer ${
                  selectedFileId === file.id
                    ? 'bg-blue-50 border-blue-500 shadow-md'
                    : 'bg-white border-gray-200 hover:shadow-sm'
                }`}
                onClick={() => onSelectFile(file.id)}
              >
                <div className="flex items-center flex-1 min-w-0">
                  {getFileIcon(file.fileType)}
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-2">
                  {selectedFileId === file.id && (
                    <div className="flex items-center text-blue-600">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      <span className="text-xs font-medium">{t('fileUpload.selected')}</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteFile(file.id)
                    }}
                    className="p-1 hover:bg-red-100 rounded-full transition-colors"
                    title={t('fileUpload.delete')}
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default FileUpload
