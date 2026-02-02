import { useState, useEffect } from 'react'
import { Save, X, Edit2, Settings, Sparkles, Lightbulb } from 'lucide-react'

/**
 * AI 지침(System Prompt) 설정 모달 컴포넌트
 * - 팝업 형식으로 변경됨
 * - 사용자가 AI의 응답 스타일/규칙을 직접 제어
 */
const SystemPromptPanel = ({ language = 'ko', onSystemPromptUpdate, onClose, currentOverrides = [] }) => {
  const [customPrompt, setCustomPrompt] = useState('')
  const [lastManualPrompt, setLastManualPrompt] = useState('')
  const [activePreset, setActivePreset] = useState(null)
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

  // 초기 로드시 기존 지침이 있으면 불러오기
  useEffect(() => {
    if (currentOverrides && currentOverrides.length > 0) {
      const lastPrompt = currentOverrides[0].content
      setCustomPrompt(lastPrompt)
      setIsCustomPromptOpen(true)

      // 프리셋과 일치하지 않는 경우 '사용자 정의' 텍스트로 보관
      const foundPreset = Object.entries(presets).find(([key, p]) => p[language].prompt === lastPrompt)
      if (foundPreset) {
        setActivePreset(foundPreset[0])
      } else {
        setLastManualPrompt(lastPrompt)
      }
    }
  }, [currentOverrides, language])

  // 프리셋 적용 핸들러
  const handlePresetClick = (presetKey) => {
    const preset = presets[presetKey][language]
    setCustomPrompt(preset.prompt)
    setActivePreset(presetKey)
    setIsCustomPromptOpen(true) // 프리셋 선택 시 텍스트 영역 자동 열기
  }

  // 지침 적용 핸들러
  const handleApply = () => {
    if (customPrompt.trim()) {
      onSystemPromptUpdate?.([
        {
          id: Date.now(),
          content: customPrompt.trim(),
          timestamp: new Date().toISOString(),
          isActive: true
        }
      ])
      onClose?.() // 적용 후 닫기
    } else {
      // App.jsx에서 에러 알림 처리 등이 필요할 수 있으나 여기서는 단순히 무시하거나 상위로 에러 전달 가능
    }
  }

  // 초기화 핸들러
  const handleReset = () => {
    setCustomPrompt('')
    setActivePreset(null)
    setIsCustomPromptOpen(false)
    onSystemPromptUpdate?.([])
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* 모달 컨테이너 */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-purple-100 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-6 flex flex-col h-full overflow-y-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-8 flex-shrink-0">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[#9B4DEE] rounded-2xl flex items-center justify-center shadow-lg shadow-purple-100">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                  {language === 'ko' ? 'AI 행동 지침 설정' : 'AI Behavior Guidelines'}
                </h3>
                <p className="text-[13px] text-[#9B4DEE] font-medium">
                  {language === 'ko' ? 'AI의 페르소나와 응답 스타일을 정의합니다.' : 'Define AI persona and response style.'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/60 rounded-full transition-colors text-slate-400"
            >
              <X className="w-7 h-7" />
            </button>
          </div>

          {/* 프리셋 버튼 */}
          <div className="mb-8 flex-shrink-0">
            <p className="text-sm text-slate-500 mb-4 font-bold">
              {language === 'ko' ? '추천 프리셋' : 'Recommended Presets'}
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              {Object.entries(presets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handlePresetClick(key)}
                  className={`h-11 px-6 rounded-[14px] text-[14px] font-bold transition-all duration-300 transform active:scale-95 border-2 ${activePreset === key
                    ? 'bg-[#F5F1FF] text-[#9B4DEE] border-[#E8DEF8] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-50 hover:border-slate-100 hover:bg-slate-50'
                    }`}
                >
                  {preset[language].label}
                </button>
              ))}
              <button
                onClick={() => {
                  if (activePreset || !isCustomPromptOpen) {
                    setCustomPrompt(lastManualPrompt)
                    setActivePreset(null)
                    setIsCustomPromptOpen(true)
                  } else {
                    setIsCustomPromptOpen(false)
                  }
                }}
                className={`h-11 px-6 rounded-[14px] text-[14px] font-bold transition-all duration-300 transform active:scale-95 border-2 flex items-center space-x-2 ${(isCustomPromptOpen && !activePreset) || (customPrompt.trim() && !activePreset)
                  ? 'bg-[#F5F1FF] text-[#9B4DEE] border-[#E8DEF8] shadow-sm'
                  : 'bg-white text-slate-600 border-slate-50 hover:border-slate-100 hover:bg-slate-50'
                  }`}
              >
                <Edit2 className="w-4 h-4" />
                <span>{language === 'ko' ? '사용자 정의' : 'Custom'}</span>
              </button>
            </div>
          </div>

          {/* 커스텀 지침 입력 (토글) */}
          {isCustomPromptOpen && (
            <div className="mb-6 transition-all duration-300 animate-fade-in flex flex-col flex-grow min-h-0">
              <textarea
                value={customPrompt}
                onChange={(e) => {
                  const val = e.target.value
                  setCustomPrompt(val)
                  setLastManualPrompt(val)
                }}
                placeholder={language === 'ko'
                  ? '여기에 원하는 AI의 역할이나 답변 스타일을 자유롭게 적어주세요'
                  : 'Enter the AI role or response style you want here'}
                className="w-full px-5 py-4 text-[15px] border-2 border-purple-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 bg-white text-gray-800 leading-relaxed resize-none transition-all flex-grow shadow-inner"
                style={{ minHeight: '300px' }}
              />
              <p className="text-[11px] text-purple-500 mt-2 flex items-center font-medium">
                <Sparkles className="w-3 h-3 mr-1.5" />
                {language === 'ko'
                  ? '이 지침은 모든 AI 답변 생성 시 최우선으로 적용됩니다.'
                  : 'This guideline is applied with priority to all AI responses.'}
              </p>
            </div>
          )}

          {/* 작성 팁 섹션 */}
          {!isCustomPromptOpen && (
            <div className="mb-8 flex-grow bg-white rounded-[32px] p-8 border border-purple-50 shadow-sm animate-fade-in">
              <p className="text-lg font-bold text-[#4B2C82] mb-6 flex items-center">
                <Lightbulb className="w-5 h-5 mr-3 text-amber-400 fill-amber-50" />
                {language === 'ko' ? '작성 팁' : 'Writing Tips'}
              </p>
              <ul className="text-[15px] text-slate-600 space-y-5 leading-relaxed font-medium">
                <li className="flex items-center">
                  <div className="w-7 h-7 bg-[#F5F1FF] rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                    <span className="text-[#9B4DEE] text-[13px] font-bold">1</span>
                  </div>
                  <span>{language === 'ko'
                    ? '답변 톤을 "격식 있게", "친절하게", "전문적으로" 등으로 지정해보세요'
                    : 'Specify tone as "formal", "friendly", "professional", etc.'}</span>
                </li>
                <li className="flex items-center">
                  <div className="w-7 h-7 bg-[#F5F1FF] rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                    <span className="text-[#9B4DEE] text-[13px] font-bold">2</span>
                  </div>
                  <span>{language === 'ko'
                    ? '전문가 역할을 부여하면 더 정확하고 깊이 있는 답변을 얻을 수 있습니다'
                    : 'Assigning expert roles yields more accurate, in-depth responses'}</span>
                </li>
                <li className="flex items-center">
                  <div className="w-7 h-7 bg-[#F5F1FF] rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                    <span className="text-[#9B4DEE] text-[13px] font-bold">3</span>
                  </div>
                  <span>{language === 'ko'
                    ? '특정 형식(리스트, 표, 단락)으로 답변을 요청할 수 있습니다'
                    : 'You can request responses in specific formats (lists, tables, paragraphs)'}</span>
                </li>
              </ul>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            <button
              onClick={handleApply}
              className={`flex-1 flex items-center justify-center space-x-2 h-14 text-white rounded-2xl text-[15px] font-bold transition-all duration-300 active:scale-[0.98] shadow-sm ${customPrompt.trim().length > 0
                ? 'bg-[#9B4DEE] hover:bg-[#8A3DDE] shadow-purple-100'
                : 'bg-[#D1D5DB] cursor-not-allowed'
                }`}
            >
              <Save className="w-5 h-5" />
              <span>{language === 'ko' ? '지침 적용하기' : 'Apply Guidelines'}</span>
            </button>
            <button
              onClick={handleReset}
              className="px-8 h-14 bg-white hover:bg-slate-50 text-slate-700 border border-slate-100 rounded-2xl text-[15px] font-bold transition-all shadow-sm active:scale-[0.98]"
            >
              {language === 'ko' ? '초기화' : 'Reset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SystemPromptPanel
