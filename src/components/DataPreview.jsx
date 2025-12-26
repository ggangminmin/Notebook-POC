import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Copy, Check, Database, Loader2 } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import Tooltip from './Tooltip'

// GPT-4o를 사용한 자연어 문서 분석
const generateNaturalSummary = async (extractedText, language = 'ko') => {
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

  if (!extractedText || extractedText.length < 50) {
    return null
  }

  try {
    const prompt = language === 'ko'
      ? `다음 문서를 분석하여 아래 형식으로 요약해주세요:

**문서 내용:**
${extractedText.substring(0, 3000)}

**요구사항:**
1. **문서 요약**: 이 문서가 무엇인지 한 문장으로 정의 (굵게 표시)
2. **핵심 키워드**: 문서에서 가장 많이 언급된 단어 3~5개 (쉼표로 구분)
3. **구조 분석**: 문서가 어떤 섹션들로 나뉘어 있는지 간단히 설명 (2-3줄)

JSON 형식으로 응답해주세요:
{
  "summary": "문서에 대한 한 문장 정의",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "structure": "구조 분석 설명"
}`
      : `Analyze the following document and summarize it in this format:

**Document Content:**
${extractedText.substring(0, 3000)}

**Requirements:**
1. **Document Summary**: Define what this document is in one sentence (bold)
2. **Key Keywords**: 3-5 most frequently mentioned words (comma-separated)
3. **Structure Analysis**: Briefly describe how the document is organized (2-3 lines)

Respond in JSON format:
{
  "summary": "One sentence definition of the document",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "structure": "Structure analysis description"
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert document analyst. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    })

    const data = await response.json()
    const content = data.choices[0].message.content.trim()

    // JSON 파싱
    try {
      // JSON 코드 블록 제거
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content
      return JSON.parse(jsonStr)
    } catch (e) {
      console.error('[DataPreview] JSON 파싱 실패:', e)
      return null
    }
  } catch (error) {
    console.error('[DataPreview] 자연어 요약 생성 오류:', error)
    return null
  }
}

const DataPreview = ({ selectedFile }) => {
  const [expandedKeys, setExpandedKeys] = useState(new Set(['root']))
  const [isCopied, setIsCopied] = useState(false)
  const [viewMode, setViewMode] = useState('natural') // 'natural' or 'json'
  const [naturalSummary, setNaturalSummary] = useState(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const { t, language } = useLanguage()

  // 파일이 변경되면 자연어 요약 생성
  useEffect(() => {
    const loadSummary = async () => {
      if (!selectedFile?.parsedData?.extractedText) {
        setNaturalSummary(null)
        return
      }

      setIsLoadingSummary(true)
      const summary = await generateNaturalSummary(
        selectedFile.parsedData.extractedText,
        language
      )
      setNaturalSummary(summary)
      setIsLoadingSummary(false)
    }

    if (viewMode === 'natural') {
      loadSummary()
    }
  }, [selectedFile, language, viewMode])

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
    <div className="h-full flex flex-col bg-white">
      {/* Studio Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-800">
            {language === 'ko' ? '스튜디오' : 'Studio'}
          </h2>
          {selectedFile && (
            <div className="flex items-center space-x-2">
              {/* 데이터 보기 토글 버튼 */}
              <Tooltip
                content={language === 'ko' ? '관리자용 원본 데이터 보기' : 'View raw data (admin)'}
                position="bottom"
              >
                <button
                  onClick={() => setViewMode(viewMode === 'natural' ? 'json' : 'natural')}
                  className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === 'json'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                </button>
              </Tooltip>

              {/* 복사 버튼 (JSON 모드일 때만 활성화) */}
              {viewMode === 'json' && (
                <button
                  onClick={handleCopyToClipboard}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isCopied
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{language === 'ko' ? '복사됨!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{language === 'ko' ? '복사' : 'Copy'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
        {selectedFile && (
          <p className="text-xs text-gray-500 truncate" title={selectedFile.name}>
            {selectedFile.name}
          </p>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#F9FAFB]">
        {!selectedFile ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-200 rounded-lg flex items-center justify-center">
                <Copy className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                {language === 'ko' ? '소스를 선택하면\n데이터가 표시됩니다' : 'Select a source\nto view data'}
              </p>
            </div>
          </div>
        ) : viewMode === 'natural' ? (
          /* 자연어 설명 모드 */
          <div className="space-y-4">
            {isLoadingSummary ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 text-blue-600 animate-spin" />
                  <p className="text-sm text-gray-600">
                    {language === 'ko' ? '문서 분석 중...' : 'Analyzing document...'}
                  </p>
                </div>
              </div>
            ) : naturalSummary ? (
              <>
                {/* 문서 요약 */}
                <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                    {language === 'ko' ? '문서 요약' : 'Document Summary'}
                  </h3>
                  <p className="text-base text-gray-900 font-semibold leading-relaxed">
                    {naturalSummary.summary}
                  </p>
                </div>

                {/* 핵심 키워드 */}
                <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                    {language === 'ko' ? '핵심 키워드' : 'Key Keywords'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {naturalSummary.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 구조 분석 */}
                <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                    {language === 'ko' ? '구조 분석' : 'Structure Analysis'}
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {naturalSummary.structure}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    {language === 'ko' ? '문서 분석 정보를 생성할 수 없습니다.' : 'Cannot generate document analysis.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* JSON 데이터 모드 */
          <div className="space-y-3">
            {/* File Info Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{language === 'ko' ? '파일명' : 'File'}</span>
                  <span className="text-gray-900 font-medium text-right truncate max-w-[150px]" title={selectedFile.name}>
                    {selectedFile.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{language === 'ko' ? '타입' : 'Type'}</span>
                  <span className="text-gray-900 font-medium">
                    {selectedFile.type === 'web' ? '🌐 Web' : selectedFile.type === 'report' ? '📊 Report' : '📄 File'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{language === 'ko' ? '상태' : 'Status'}</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                    {language === 'ko' ? '준비완료' : 'Ready'}
                  </span>
                </div>
              </div>
            </div>

            {/* JSON Data */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="mb-2">
                <h3 className="text-xs font-semibold text-gray-700">
                  {language === 'ko' ? '구조화된 데이터' : 'Structured Data'}
                </h3>
              </div>
              <div className="font-mono text-xs bg-gray-50 rounded-md p-3 overflow-x-auto">
                <div className="text-gray-600">{'{'}</div>
                <div className="ml-3">
                  {selectedFile.parsedData && Object.entries(selectedFile.parsedData).map(([key, value]) => (
                    <div key={key} className="my-0.5">
                      <span className="text-red-600">"{key}"</span>
                      <span className="text-gray-600">: </span>
                      {renderValue(value, `root-${key}`, 0)}
                      <span className="text-gray-600">,</span>
                    </div>
                  ))}
                </div>
                <div className="text-gray-600">{'}'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {selectedFile && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            <span>{language === 'ko' ? '업데이트' : 'Updated'}: {new Date(selectedFile.uploadedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataPreview
