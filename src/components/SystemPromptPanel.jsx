import { useState } from 'react'
import { Settings, Save, X, Edit2 } from 'lucide-react'

/**
 * AI 지침(System Prompt) 설정 패널 컴포넌트
 * - 우측 패널 하단에 위치
 * - 사용자가 AI의 응답 스타일/규칙을 직접 제어
 * - 동적 페르소나 추천 시스템 (문서 기반)
 */
const SystemPromptPanel = ({ language = 'ko', onSystemPromptUpdate, suggestedPersonas = null, detectedEntity = null, documentType = null }) => {
  const [customPrompt, setCustomPrompt] = useState('')
  const [activePreset, setActivePreset] = useState(null)
  const [activeSuggestedPersona, setActiveSuggestedPersona] = useState(null)
  const [isCustomPromptOpen, setIsCustomPromptOpen] = useState(false)

  // 프리셋 지침 정의
  const presets = {
    operator: {
      ko: {
        label: '서비스 운영자',
        prompt: `당신은 이 문서가 설명하는 서비스의 전문 운영자입니다. 문서를 바탕으로 고객의 문의에 대해 친절하고 전문적인 톤으로 응대하세요. 문서에 없는 내용은 지어내지 말고 확인이 필요하다고 답하세요.

**핵심 역할:**
- 문서에 명시된 서비스 내용을 바탕으로 정확한 정보 제공
- 고객 문의에 대해 친절하고 전문적으로 응대
- 문서에 없는 내용은 추측하지 않고 확인 필요 사항으로 안내

**응답 스타일:**
- 친절하고 전문적인 어조 유지
- 문서 내용을 근거로 구체적이고 정확한 정보 제공
- 문서에 없는 내용은 "문서에 명시되지 않아 확인이 필요합니다"라고 명확히 안내
- 실용적이고 도움이 되는 조언 포함`
      },
      en: {
        label: 'Service Operator',
        prompt: `You are a professional operator of the service described in this document. Based on the document, respond to customer inquiries in a friendly and professional tone. Do not make up content that is not in the document, and inform them that confirmation is needed.

**Core Role:**
- Provide accurate information based on the service content specified in the document
- Respond to customer inquiries in a friendly and professional manner
- For content not in the document, guide them as items requiring confirmation rather than speculating

**Response Style:**
- Maintain a friendly and professional tone
- Provide specific and accurate information based on document content
- Clearly inform that "This is not specified in the document and requires confirmation" for content not in the document
- Include practical and helpful advice`
      }
    },
    analyst: {
      ko: {
        label: '일반 문서 분석가',
        prompt: `당신은 전문적인 문서 분석가입니다.

**핵심 역할:**
- 문서의 핵심 내용을 간결하고 명확하게 요약
- 논리적 구조에 따라 정보를 체계적으로 정리
- 중요한 수치, 날짜, 인명을 정확히 추출

**응답 스타일:**
- 중립적이고 객관적인 어조 유지
- 불필요한 해석이나 추론 최소화
- 근거가 명확한 사실만 제시
- 구조화된 형식(헤더, 리스트) 사용`
      },
      en: {
        label: 'General Document Analyst',
        prompt: `You are a professional document analyst.

**Core Role:**
- Summarize key content concisely and clearly
- Organize information systematically according to logical structure
- Accurately extract important numbers, dates, and names

**Response Style:**
- Maintain neutral and objective tone
- Minimize unnecessary interpretation or inference
- Present only facts with clear evidence
- Use structured format (headers, lists)`
      }
    }
  }

  // 프리셋 적용 핸들러
  const handlePresetClick = (presetKey) => {
    const preset = presets[presetKey][language]
    setCustomPrompt(preset.prompt)
    setActivePreset(presetKey)
    setActiveSuggestedPersona(null) // 추천 페르소나 해제
    setIsCustomPromptOpen(true) // 프리셋 선택 시 텍스트 영역 자동 열기
  }

  // 동적 추천 페르소나 적용 핸들러
  const handleSuggestedPersonaClick = (persona) => {
    setCustomPrompt(persona.prompt)
    setActiveSuggestedPersona(persona.label)
    setActivePreset(null) // 고정 프리셋 해제
    setIsCustomPromptOpen(true) // 추천 페르소나 선택 시 텍스트 영역 자동 열기
  }

  // 지침 적용 핸들러
  const handleApply = () => {
    if (customPrompt.trim()) {
      onSystemPromptUpdate?.([
        {
          id: Date.now(),
          content: customPrompt.trim(),
          timestamp: new Date().toISOString()
        }
      ])
      alert(language === 'ko' ? '✅ AI 지침이 적용되었습니다.' : '✅ AI guidelines applied.')
    } else {
      alert(language === 'ko' ? '⚠️ 지침을 입력해주세요.' : '⚠️ Please enter guidelines.')
    }
  }

  // 초기화 핸들러
  const handleReset = () => {
    setCustomPrompt('')
    setActivePreset(null)
    setActiveSuggestedPersona(null)
    setIsCustomPromptOpen(false)
    onSystemPromptUpdate?.([])
    alert(language === 'ko' ? '🔄 AI 지침이 초기화되었습니다.' : '🔄 AI guidelines reset.')
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-xl p-5 shadow-sm border border-purple-200">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-bold text-purple-900">
            {language === 'ko' ? 'AI 행동 지침 설정' : 'AI Behavior Guidelines'}
          </h3>
        </div>
      </div>

      {/* 동적 추천 페르소나 (문서 기반) */}
      {suggestedPersonas && suggestedPersonas.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-purple-800">
              {language === 'ko' ? '✨ 추천 페르소나' : '✨ Recommended Personas'}
            </p>
            {(detectedEntity || documentType) && (
              <span className="text-[10px] text-gray-500">
                {detectedEntity && `${detectedEntity}`}
                {detectedEntity && documentType && ' · '}
                {documentType && `${documentType}`}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedPersonas.map((persona, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedPersonaClick(persona)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeSuggestedPersona === persona.label
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'bg-white text-purple-700 border-2 border-purple-300 hover:bg-purple-50 hover:border-purple-400'
                }`}
              >
                {persona.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            {language === 'ko'
              ? '💡 문서 내용을 분석하여 자동으로 추천된 페르소나입니다. 클릭하면 해당 역할에 맞는 지침이 자동 입력됩니다.'
              : '💡 These personas are automatically recommended based on document analysis. Click to auto-fill guidelines for that role.'}
          </p>
        </div>
      )}

      {/* 고정 프리셋 버튼 + 사용자 정의 지침 토글 버튼 */}
      <div className="mb-3">
        <p className="text-xs text-gray-600 mb-2">
          {language === 'ko' ? '기본 설정:' : 'Default Presets:'}
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          {Object.entries(presets).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetClick(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activePreset === key
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-100'
              }`}
            >
              {preset[language].label}
            </button>
          ))}
          {/* 사용자 정의 지침 토글 버튼 */}
          <button
            onClick={() => {
              // 프리셋이나 추천 페르소나가 선택된 상태이거나, 텍스트 영역이 닫혀있을 때
              if (activePreset || activeSuggestedPersona || !isCustomPromptOpen) {
                // 텍스트를 비우고 프리셋 해제
                setCustomPrompt('')
                setActivePreset(null)
                setActiveSuggestedPersona(null)
                setIsCustomPromptOpen(true) // 항상 열기
              } else {
                // 이미 열려있고 프리셋이 없는 경우 닫기
                setIsCustomPromptOpen(false)
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              // 프리셋이나 추천 페르소나가 선택되지 않고, 사용자 정의 지침이 열려있거나 직접 입력한 경우만 활성화
              (isCustomPromptOpen && !activePreset && !activeSuggestedPersona) || 
              (customPrompt.trim() && !activePreset && !activeSuggestedPersona)
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-100'
            }`}
          >
            <Edit2 className="w-3 h-3" />
            <span>{language === 'ko' ? '사용자 정의 지침' : 'Custom Guidelines'}</span>
          </button>
        </div>
      </div>

      {/* 커스텀 지침 입력 (토글) */}
      {isCustomPromptOpen && (
        <div className="mb-3 transition-all duration-200 ease-in-out">
          <textarea
            value={customPrompt}
            onChange={(e) => {
              setCustomPrompt(e.target.value)
              setActivePreset(null) // 수동 입력 시 프리셋 해제
            }}
            placeholder={language === 'ko'
              ? '여기에 원하는 AI의 역할이나 답변 스타일을 자유롭게 적어주세요...'
              : 'Enter the AI role or response style you want here...'}
            className="w-full px-3 py-2.5 text-xs border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-800 leading-relaxed resize-none transition-all"
            rows={6}
          />
          <p className="text-[10px] text-gray-500 mt-1">
            {language === 'ko'
              ? '💡 이 지침은 모든 AI 답변 생성 시 우선 적용됩니다.'
              : '💡 This guideline will be applied to all AI responses.'}
          </p>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleApply}
          disabled={!customPrompt.trim()}
          className="flex-1 flex items-center justify-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{language === 'ko' ? '적용' : 'Apply'}</span>
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1"
        >
          <X className="w-3.5 h-3.5" />
          <span>{language === 'ko' ? '초기화' : 'Reset'}</span>
        </button>
      </div>

    </div>
  )
}

export default SystemPromptPanel
