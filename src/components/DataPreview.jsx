import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Copy, Check, Database, Loader2, Lightbulb, FileText, List } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import Tooltip from './Tooltip'

// GPT-4o를 사용한 자연어 문서 분석 (NotebookLM 스타일)
const generateNaturalSummary = async (extractedText, language = 'ko') => {
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

  if (!extractedText || extractedText.length < 50) {
    return null
  }

  console.log('[DataPreview] 자연어 요약 생성 시작')
  console.log('[DataPreview] extractedText 길이:', extractedText.length)

  try {
    const prompt = language === 'ko'
      ? `다음 문서를 NotebookLM 스타일로 분석하여 아래 형식으로 요약해주세요:

**문서 내용:**
${extractedText.substring(0, 4000)}

**요구사항:**
1. **핵심 요약**: 이 문서의 핵심 내용을 2-3문장으로 명확하게 요약
2. **주요 내용**: 문서의 핵심 포인트를 3-5개의 간결한 문장으로 정리 (각 항목은 한 문장)
3. **핵심 키워드**: 문서에서 가장 중요한 단어 3-5개

JSON 형식으로 응답해주세요:
{
  "summary": "문서의 핵심 요약 (2-3문장)",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "keywords": ["키워드1", "키워드2", "키워드3"]
}`
      : `Analyze the following document in NotebookLM style:

**Document Content:**
${extractedText.substring(0, 4000)}

**Requirements:**
1. **Core Summary**: Clear summary of the document in 2-3 sentences
2. **Key Points**: 3-5 concise sentences highlighting core points (one sentence each)
3. **Key Keywords**: 3-5 most important words

Respond in JSON format:
{
  "summary": "Core summary (2-3 sentences)",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "keywords": ["keyword1", "keyword2", "keyword3"]
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
        max_tokens: 800
      })
    })

    if (!response.ok) {
      console.error('[DataPreview] OpenAI API 오류:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    const content = data.choices[0].message.content.trim()
    console.log('[DataPreview] GPT 응답 내용:', content)

    // JSON 파싱
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content

      const parsed = JSON.parse(jsonStr)
      console.log('[DataPreview] 파싱 성공:', parsed)
      return parsed
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
  // 독립적인 상태 관리 (ChatInterface와 분리)
  const [expandedKeys, setExpandedKeys] = useState(new Set(['root']))
  const [isCopied, setIsCopied] = useState(false)
  const [viewMode, setViewMode] = useState('natural') // 'natural' or 'json'
  const [naturalSummary, setNaturalSummary] = useState(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const { language } = useLanguage()

  // 파일 선택 시 자동으로 요약 생성 (Auto-Summary Trigger)
  useEffect(() => {
    const loadSummary = async () => {
      if (!selectedFile?.parsedData?.extractedText) {
        console.log('[DataPreview] extractedText 없음, 요약 생성 건너뜀')
        setNaturalSummary(null)
        setIsLoadingSummary(false)
        return
      }

      console.log('[DataPreview] 자동 요약 트리거 - 파일:', selectedFile.name)
      setIsLoadingSummary(true)

      const summary = await generateNaturalSummary(
        selectedFile.parsedData.extractedText,
        language
      )

      setNaturalSummary(summary)
      setIsLoadingSummary(false)
      console.log('[DataPreview] 요약 생성 완료')
    }

    // 파일이 선택되면 즉시 요약 생성 시작
    if (selectedFile) {
      loadSummary()
    } else {
      setNaturalSummary(null)
      setIsLoadingSummary(false)
    }
  }, [selectedFile?.id, language]) // selectedFile.id가 변경될 때만 재생성

  // 이벤트 전파 차단으로 리렌더링 범위 제한
  const handleCopyToClipboard = async (e) => {
    e.stopPropagation()
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

  // 모드 전환 시 이벤트 전파 차단
  const handleToggleViewMode = (e) => {
    e.stopPropagation()
    setViewMode(prev => prev === 'natural' ? 'json' : 'natural')
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
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-gray-900">
              {language === 'ko' ? '스튜디오' : 'Studio'}
            </h2>
            {viewMode === 'natural' && selectedFile && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-semibold">
                AI
              </span>
            )}
          </div>
          {selectedFile && (
            <div className="flex items-center space-x-2">
              {/* 데이터 보기 토글 버튼 */}
              <Tooltip
                content={language === 'ko' ? 'JSON 데이터 보기' : 'View JSON data'}
                position="bottom"
              >
                <button
                  onClick={handleToggleViewMode}
                  className={`p-2 rounded-lg text-xs font-medium transition-all ${
                    viewMode === 'json'
                      ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  <Database className="w-4 h-4" />
                </button>
              </Tooltip>

              {/* 복사 버튼 (JSON 모드일 때만 표시) */}
              {viewMode === 'json' && (
                <button
                  onClick={handleCopyToClipboard}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isCopied
                      ? 'bg-green-500 text-white shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{language === 'ko' ? '복사됨' : 'Copied'}</span>
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
        {selectedFile && viewMode === 'natural' && (
          <p className="text-xs text-gray-500">
            {language === 'ko' ? 'GPT-4o 기반 문서 분석' : 'GPT-4o Document Analysis'}
          </p>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#F9FAFB]">
        {!selectedFile ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-200 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                {language === 'ko' ? '소스를 선택하면\n분석 결과가 표시됩니다' : 'Select a source\nto view analysis'}
              </p>
            </div>
          </div>
        ) : viewMode === 'natural' ? (
          /* 자연어 분석 모드 (기본) */
          <div className="space-y-4">
            {isLoadingSummary ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 text-blue-600 animate-spin" />
                  <p className="text-sm font-medium text-gray-700">
                    {language === 'ko' ? 'AI 분석 중...' : 'AI analyzing...'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'ko' ? 'GPT-4o로 문서를 분석하고 있습니다' : 'Analyzing with GPT-4o'}
                  </p>
                </div>
              </div>
            ) : naturalSummary ? (
              <>
                {/* NotebookLM 스타일 핵심 요약 */}
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 shadow-sm border border-indigo-200">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wide mb-2">
                        {language === 'ko' ? '핵심 요약' : 'Core Summary'}
                      </h3>
                      <p className="text-sm text-gray-800 leading-relaxed font-medium">
                        {naturalSummary.summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* NotebookLM 스타일 주요 내용 리스트 */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <List className="w-4 h-4 text-gray-600" />
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      {language === 'ko' ? '주요 내용' : 'Key Points'}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {naturalSummary.keyPoints && naturalSummary.keyPoints.map((point, index) => (
                      <div key={index} className="flex items-start space-x-3 group">
                        <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                          {index + 1}
                        </div>
                        <p className="flex-1 text-sm text-gray-700 leading-relaxed pt-0.5">
                          {point}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 핵심 키워드 태그 */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
                    {language === 'ko' ? '핵심 키워드' : 'Keywords'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {naturalSummary.keywords && naturalSummary.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all cursor-default"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 문서 메타데이터 */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">{language === 'ko' ? '파일명' : 'File'}</span>
                      <span className="text-gray-900 font-medium truncate max-w-[100px]" title={selectedFile.name}>
                        {selectedFile.name}
                      </span>
                    </div>
                    {selectedFile.parsedData?.pageCount && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">{language === 'ko' ? '페이지' : 'Pages'}</span>
                        <span className="text-gray-900 font-medium">
                          {selectedFile.parsedData.pageCount}
                        </span>
                      </div>
                    )}
                    {selectedFile.parsedData?.extractedText && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">{language === 'ko' ? '문자 수' : 'Characters'}</span>
                        <span className="text-gray-900 font-medium">
                          {selectedFile.parsedData.extractedText.length.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">{language === 'ko' ? '타입' : 'Type'}</span>
                      <span className="text-gray-900 font-medium uppercase">
                        {selectedFile.type}
                      </span>
                    </div>
                  </div>
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
