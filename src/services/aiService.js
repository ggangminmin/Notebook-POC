import { extractTextFromParsedData } from '../utils/fileParser'
import { GoogleGenerativeAI } from '@google/generative-ai'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

// GPT 모델 설정 (2026년 1월 기준 최신)
const GPT_MODELS = {
  INSTANT: 'gpt-5.2-chat-latest',  // 빠른 응답 (GPT-5.2 Instant - 적응형 추론)
  THINKING: 'gpt-5.2',             // 심층 추론 (GPT-5.2 Thinking - 고급 추론)
  MINI: 'gpt-4o-mini'              // 초저비용/초고속 (제안/필터링용)
}

// Gemini 모델 설정 (2025년 12월 기준 최신)
const GEMINI_MODEL = 'gemini-3-flash-preview' // Gemini 3 Flash (공식 Preview 버전 - 2025.12.17 출시)

// Gemini AI 초기화
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null

// 언어 감지 (간단한 휴리스틱)
export const detectLanguage = (text) => {
  // 한글이 포함되어 있으면 한국어
  const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/
  return koreanRegex.test(text) ? 'ko' : 'en'
}

// 단순 인사말/의미 없는 입력인지 확인 (API 비용 절감용)
export const isMeaninglessQuery = (query) => {
  if (!query || query.trim().length < 2) return true

  const greetings = [
    '안녕', '반가워', '하이', 'hi', 'hello', '헬로', '좋은 아침', '좋은 저녁',
    '어떻게 지내', '잘 지내', '뭐해', '뭐하니', '고마워', '감사', 'thank',
    '잘했어', '좋아', '괜찮아', 'good', 'great', 'thanks', 'bye', '안녕히',
    '잘가', '또 봐', '테스트', 'test', '오늘 날씨', '날씨'
  ]

  const queryLower = query.toLowerCase().trim()
  // 너무 짧거나 리스트에 있는 인사말인 경우
  return queryLower.length < 2 || greetings.some(greeting => queryLower === greeting || queryLower.includes(greeting) && queryLower.length < 5)
}

// OpenAI API 호출
// GPT-5.2는 temperature를 지원하지 않음 (고정값 1)
const callOpenAI = async (messages, useThinking = false, useMini = false) => {
  try {
    let model = useThinking ? GPT_MODELS.THINKING : GPT_MODELS.INSTANT
    if (useMini) model = GPT_MODELS.MINI

    // GPT-5.2는 temperature, top_p, presence_penalty, frequency_penalty 모두 미지원
    // 내부적으로 temperature=1 고정
    // 심층 분석 모드는 더 긴 응답 허용 (4000 토큰)
    const requestBody = {
      model: model,
      messages: messages,
      max_completion_tokens: useThinking ? 4000 : 2000  // 심층 분석은 4000, 일반은 2000
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(120000)  // 120초 타임아웃 (심층 분석용)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'OpenAI API 호출 실패')
    }

    const data = await response.json()

    // 응답 길이 확인 및 로깅
    const content = data.choices[0].message.content
    console.log(`[OpenAI ${useThinking ? 'Thinking' : 'Instant'}] 응답 길이: ${content.length}자`)

    return content
  } catch (error) {
    console.error('OpenAI API 오류:', error)

    // 사용자 친화적 에러 메시지 처리 (한글화)
    const errMessage = error.message || ''
    if (errMessage.includes('rate_limit')) {
      throw new Error('OpenAI API 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.')
    } else if (errMessage.includes('insufficient_quota')) {
      throw new Error('OpenAI API 크레딧이 부족합니다. 결제 수단이나 한도를 확인해 주세요.')
    } else if (errMessage.includes('context_length_exceeded')) {
      throw new Error('입력 양이 너무 많아 모델의 컨텍스트 제한을 초과했습니다. 문서 선택을 줄여주세요.')
    } else if (errMessage.includes('invalid_api_key')) {
      throw new Error('OpenAI API 키가 유효하지 않습니다. 환경 변수를 확인해 주세요.')
    }

    throw error
  }
}

// Gemini API 호출
const callGemini = async (messages, temperature = 0.3, isDeepAnalysis = false) => {
  try {
    if (!genAI) {
      throw new Error('Gemini API 키가 설정되지 않았습니다')
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

    // messages 배열을 Gemini 형식으로 변환
    // Gemini는 system role을 직접 지원하지 않으므로, system 메시지를 첫 user 메시지에 포함
    const systemMessage = messages.find(m => m.role === 'system')
    const conversationMessages = messages.filter(m => m.role !== 'system')

    // Gemini 대화 기록 형식으로 변환
    const geminiContents = []

    // 첫 번째 메시지에 system 프롬프트 포함
    if (conversationMessages.length > 0) {
      const firstUserMsg = conversationMessages[0]
      const contentWithSystem = systemMessage
        ? `${systemMessage.content}\n\n사용자 질문: ${firstUserMsg.content}`
        : firstUserMsg.content

      geminiContents.push({
        role: 'user',
        parts: [{ text: contentWithSystem }]
      })

      // 나머지 대화 기록 추가 (user ↔ assistant 번갈아가며)
      for (let i = 1; i < conversationMessages.length; i++) {
        const msg = conversationMessages[i]
        geminiContents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',  // Gemini는 'model' role 사용
          parts: [{ text: msg.content }]
        })
      }
    } else if (systemMessage) {
      // 대화 기록이 없고 system 메시지만 있는 경우
      geminiContents.push({
        role: 'user',
        parts: [{ text: systemMessage.content }]
      })
    }

    const result = await model.generateContent({
      contents: geminiContents,
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: isDeepAnalysis ? 4000 : 2000,  // 심층 분석은 4000, 일반은 2000
      },
    })

    const response = result.response
    const content = response.text()

    // 응답 길이 확인 및 로깅
    console.log(`[Gemini ${isDeepAnalysis ? 'Deep Analysis' : 'Standard'}] 응답 길이: ${content.length}자, 대화 기록: ${conversationMessages.length}개`)

    return content
  } catch (error) {
    console.error('Gemini API 오류:', error)

    // 사용자 친화적 에러 메시지 처리 (한글화)
    const errMessage = error.message || ''

    if (errMessage.includes('404') || errMessage.includes('not found')) {
      throw new Error(`지원하지 않는 Gemini 모델 설정입니다 (${GEMINI_MODEL}). 모델명을 확인해주세요.`)
    } else if (errMessage.includes('API key')) {
      throw new Error('Gemini API 키가 유효하지 않거나 설정되지 않았습니다. 환경 변수를 확인해주세요.')
    } else if (errMessage.includes('quota') || errMessage.includes('limit') || errMessage.includes('consumed')) {
      throw new Error('Gemini API 사용량 한도를 초과했습니다. 잠시 후 다시 시도하거나 다른 모델을 선택해 주세요.')
    } else if (errMessage.includes('permission')) {
      throw new Error('Gemini API 키에 해당 모델 사용 권한이 없습니다.')
    } else if (errMessage.includes('exceed') && errMessage.includes('token')) {
      throw new Error('입력 데이터가 너무 커서 토큰 제한을 초과했습니다. 선택된 문서의 양을 줄이거나 메시지 길이를 줄여주세요.')
    } else if (errMessage.includes('safety') || errMessage.includes('finish_reason: SAFETY')) {
      throw new Error('안전 가이드라인에 따른 차단으로 응답을 생성할 수 없습니다. 질문 내용을 검토해 주세요.')
    }

    throw error
  }
}

// 문서 자동 요약 생성 (Instant 모델 사용 - 빠른 요약)
export const generateDocumentSummary = async (documentContext, language = 'ko') => {
  try {
    if (!documentContext || !documentContext.parsedData) {
      return null
    }

    const documentText = extractTextFromParsedData(documentContext.parsedData)
    const fileName = documentContext.name || '문서'

    // 요약이 너무 짧으면 스킵
    if (!documentText || documentText.length < 100) {
      return null
    }

    const summaryPrompt = language === 'ko'
      ? `다음 문서의 핵심 내용을 3-5줄로 간결하게 요약해주세요. 문서에 명시된 내용만 사용하세요.

**문서 제목:** ${fileName}

**문서 내용:**
${documentText.substring(0, 3000)}

**요약 규칙:**
- 3-5개의 핵심 문장으로 작성
- 문서의 주요 주제와 핵심 내용 포함
- 명확하고 간결하게
- 불필요한 인사말 없이 바로 요약 시작`
      : `Please summarize the following document in 3-5 concise sentences. Only use information from the document.

**Document Title:** ${fileName}

**Document Content:**
${documentText.substring(0, 3000)}

**Summary Rules:**
- Write 3-5 key sentences
- Include main topics and core content
- Clear and concise
- Start directly without greetings`

    const messages = [
      { role: 'system', content: summaryPrompt },
      { role: 'user', content: language === 'ko' ? '이 문서를 요약해주세요.' : 'Please summarize this document.' }
    ]

    const summary = await callOpenAI(messages, false) // Instant 모델 (GPT-5.2)
    return summary

  } catch (error) {
    console.error('문서 요약 생성 오류:', error)
    return null
  }
}

// 문서 기반 동적 페르소나 분석 (조직/회사명, 문서 유형, 추천 페르소나 추출)
export const analyzeDocumentForPersonas = async (documentContext, language = 'ko') => {
  try {
    if (!documentContext || !documentContext.parsedData) {
      return null
    }

    const documentText = extractTextFromParsedData(documentContext.parsedData)
    const fileName = documentContext.name || '문서'

    // 문서가 너무 짧으면 스킵
    if (!documentText || documentText.length < 100) {
      return null
    }

    const personaPrompt = language === 'ko'
      ? `다음 문서를 분석하여 조직/회사명, 문서 유형, 그리고 이 문서에 적합한 AI 페르소나 3개를 추출해주세요.

**문서 제목:** ${fileName}

**문서 내용:**
${documentText.substring(0, 4000)}

**분석 요구사항:**
1. **detectedEntity**: 문서에서 언급된 주요 조직/회사명 (예: "에이비딩", "삼성전자", "네이버")
2. **documentType**: 문서의 성격/유형 (예: "서비스 소개서", "제품 카탈로그", "연구 보고서", "마케팅 자료", "기술 문서")
3. **suggestedPersonas**: 이 문서에 맞는 AI 페르소나 3개를 배열로 생성
   - 각 페르소나는 { label: "페르소나 이름", prompt: "상세 시스템 프롬프트" } 형식
   - 예: [
       {
         "label": "에이비딩 운영자",
         "prompt": "당신은 에이비딩 서비스의 수석 운영자입니다. 문서를 기반으로 고객의 문의에 친절하고 전문적으로 응대하고, 우리 서비스의 장점을 부각하여 답변하세요."
       },
       {
         "label": "도입 검토 중인 마케터",
         "prompt": "당신은 에이비딩 서비스를 도입 검토 중인 마케팅 담당자입니다. 문서를 분석하여 서비스의 실용성, ROI, 도입 시 고려사항을 중립적 관점에서 평가하세요."
       },
       {
         "label": "경쟁사 분석가",
         "prompt": "당신은 경쟁사 분석 전문가입니다. 이 문서를 분석하여 해당 서비스/제품의 강점과 약점, 시장 포지셔닝, 경쟁 우위 요소를 객관적으로 평가하세요."
       }
     ]

**JSON 형식으로만 응답:**
{
  "detectedEntity": "조직/회사명",
  "documentType": "문서 유형",
  "suggestedPersonas": [
    {
      "label": "페르소나 이름",
      "prompt": "상세 시스템 프롬프트"
    }
  ]
}`
      : `Analyze the following document to extract organization/company name, document type, and 3 suitable AI personas.

**Document Title:** ${fileName}

**Document Content:**
${documentText.substring(0, 4000)}

**Analysis Requirements:**
1. **detectedEntity**: Main organization/company name mentioned (e.g., "ABiding", "Samsung", "Naver")
2. **documentType**: Document nature/type (e.g., "Service Introduction", "Product Catalog", "Research Report", "Marketing Material", "Technical Document")
3. **suggestedPersonas**: Generate 3 AI personas suitable for this document as an array
   - Each persona format: { label: "Persona Name", prompt: "Detailed System Prompt" }
   - Example: [
       {
         "label": "ABiding Operator",
         "prompt": "You are the chief operator of ABiding service. Based on the document, respond to customer inquiries in a friendly and professional manner, highlighting our service advantages."
       },
       {
         "label": "Marketing Manager Considering Adoption",
         "prompt": "You are a marketing manager considering adopting ABiding service. Analyze the document to evaluate the service's practicality, ROI, and adoption considerations from a neutral perspective."
       },
       {
         "label": "Competitor Analyst",
         "prompt": "You are a competitor analysis expert. Analyze this document to objectively evaluate the service/product's strengths, weaknesses, market positioning, and competitive advantages."
       }
     ]

**Respond only in JSON format:**
{
  "detectedEntity": "Organization/Company Name",
  "documentType": "Document Type",
  "suggestedPersonas": [
    {
      "label": "Persona Name",
      "prompt": "Detailed System Prompt"
    }
  ]
}`

    const messages = [
      { role: 'system', content: 'You are an expert document analyzer. Always respond with valid JSON only, no additional text.' },
      { role: 'user', content: personaPrompt }
    ]

    const response = await callOpenAI(messages, false) // Instant 모델 (GPT-5.2)

    // JSON 파싱
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response
      const parsed = JSON.parse(jsonStr)

      console.log('[페르소나 분석] 결과:', parsed)
      return parsed
    } catch (e) {
      console.error('[페르소나 분석] JSON 파싱 실패:', e)
      console.error('[페르소나 분석] 원본 응답:', response)
      return null
    }
  } catch (error) {
    console.error('페르소나 분석 오류:', error)
    return null
  }
}

// 추천 질문 생성 (Instant 모델 사용 - 빠른 생성)
export const generateSuggestedQuestions = async (documentContext, language = 'ko') => {
  try {
    if (!documentContext) return []

    let documentText = ''
    let contextName = ''

    if (Array.isArray(documentContext)) {
      documentText = documentContext.map(s => extractTextFromParsedData(s.parsedData)).join('\n\n---\n\n')
      contextName = documentContext.map(s => s.name).join(', ')
    } else if (documentContext.parsedData) {
      documentText = extractTextFromParsedData(documentContext.parsedData)
      contextName = documentContext.name || '문서'
    }

    // 문서 내용이 너무 짧으면 스킵
    if (!documentText || documentText.length < 50) {
      return []
    }

    const questionsPrompt = language === 'ko'
      ? `다음 문서를 읽고, 사용자가 물어볼 만한 흥미로운 질문 4개를 생성해주세요.
 
 **문서:** ${contextName}
 
 **문서 내용:**
 ${documentText.substring(0, 5000)}

**질문 생성 규칙:**
- 문서 내용을 기반으로 답변 가능한 질문만 생성
- 각 질문은 15자 이내로 간결하게
- 문서의 핵심 내용을 다루는 질문
- JSON 배열 형식으로만 응답: ["질문1", "질문2", "질문3", "질문4"]
- 다른 텍스트 없이 JSON만 출력`
      : `Read the following document and generate 4 interesting questions users might ask.

**Document Title:** ${contextName}

**Document Content:**
${documentText.substring(0, 5000)}

**Question Generation Rules:**
- Only generate questions answerable from the document
- Keep each question under 15 words
- Focus on key content
- Respond only in JSON array format: ["Question 1", "Question 2", "Question 3", "Question 4"]
- Output only JSON, no other text`

    const messages = [
      { role: 'system', content: questionsPrompt },
      { role: 'user', content: language === 'ko' ? '질문 4개를 생성해주세요.' : 'Generate 4 questions.' }
    ]

    const response = await callOpenAI(messages, false) // Instant 모델 (GPT-5.2)

    // JSON 파싱 시도
    try {
      const questions = JSON.parse(response)
      if (Array.isArray(questions) && questions.length > 0) {
        return questions.slice(0, 4)
      }
    } catch (e) {
      console.warn('질문 JSON 파싱 실패, 텍스트 파싱 시도')
      // JSON 파싱 실패 시 텍스트에서 추출 시도
      const lines = response.split('\n').filter(line => line.trim() && !line.includes('{') && !line.includes('}'))
      if (lines.length > 0) {
        return lines.slice(0, 4).map(q => q.replace(/^[-*•]\s*/, '').replace(/^["']|["']$/g, '').trim())
      }
    }

    return []
  } catch (error) {
    console.error('추천 질문 생성 오류:', error)
    return []
  }
}

// 검색 키워드 기반 추천 질문 생성 (웹 검색 최적화용)
export const generateQuerySuggestions = async (query, language = 'ko') => {
  try {
    if (!query || query.trim().length === 0) {
      return []
    }

    const suggestionsPrompt = language === 'ko'
      ? `사용자가 "${query}"에 대해 웹 검색을 하려고 합니다. 
 
 이 검색어와 관련하여 심층 리서치에 실질적으로 도움이 될 수 있는 4개의 구체적이고 깊이 있는 질문을 생성해주세요.
 
 **규칙:**
 - 검색어의 의도를 꿰뚫어보는 실질적이고 구체적인 리서치 소주제 생성
 - 단순히 단어를 나열하지 말고, 명확한 분석 방향을 제시하는 문장형으로 작성 (30자 내외)
 - 주제 예: "OO 서비스의 시장 점유율 분석" (X) -> "최근 3년간 OO 서비스의 글로벌 시장 점유율 변화 및 주요 경쟁사 비교 분석" (O)
 - JSON 배열 형식으로만 응답: ["질문1", "질문2", "질문3", "질문4"]
 - 다른 텍스트 없이 JSON만 출력`
      : `The user wants to search for "${query}" on the web.
 
 Generate 4 deep, specific, and professional research questions to help with a comprehensive investigation.
 
 **Rules:**
 - Create substantial research sub-topics that go beyond simple keywords
 - Provide clear analytical directions in sentence form (around 15-20 words)
 - Example: "Market share of X" (X) -> "Analysis of X's global market share trends over the last 3 years and comparison with key competitors" (O)
 - Respond only in JSON array format: ["Question 1", "Question 2", "Question 3", "Question 4"]
 - Output only JSON, no other text`

    const messages = [
      { role: 'system', content: suggestionsPrompt },
      { role: 'user', content: language === 'ko' ? '추천 질문 4개를 생성해주세요.' : 'Generate 4 suggestions.' }
    ]

    const response = await callOpenAI(messages, false, true) // 세 번째 인자로 mini 모델 사용 여부 전달

    try {
      const suggestions = JSON.parse(response)
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        return suggestions.slice(0, 4)
      }
    } catch (e) {
      const lines = response.split('\n').filter(line => line.trim() && !line.includes('{') && !line.includes('}'))
      if (lines.length > 0) {
        return lines.slice(0, 4).map(q => q.replace(/^[-*•]\s*/, '').replace(/^["']|["']$/g, '').trim())
      }
    }

    return []
  } catch (error) {
    console.error('검색어 기반 추천 생성 오류:', error)
    return []
  }
}

// 하이브리드 RAG 응답 생성 (일상 대화 + 엄격한 문서 기반)
// selectedModel: 'instant', 'thinking', 'gemini' 중 하나
// documentContext: 단일 객체 또는 배열 모두 지원
// conversationHistory: 이전 대화 기록 배열 (옵션)
// systemPromptOverrides: 사용자 정의 AI 지침 배열 (옵션)
export const generateStrictRAGResponse = async (query, documentContext, language = 'ko', selectedModel = 'thinking', conversationHistory = [], systemPromptOverrides = []) => {
  try {
    // 1. 일상 대화 모드 - 문서 없이도 응답 가능
    if (isMeaninglessQuery(query)) {
      const baseCasualPrompt = language === 'ko'
        ? '당신은 친절한 AI 어시스턴트입니다. 사용자와 자연스럽고 따뜻하게 대화하세요. 간단명료하게 답변하되, 지나치게 길지 않게 해주세요.'
        : 'You are a friendly AI assistant. Have a natural and warm conversation with the user. Keep your responses concise and not too long.'

      // 사용자 정의 지침 병합 (일상 대화 모드에서도 적용)
      const customGuidelines = systemPromptOverrides.length > 0
        ? systemPromptOverrides.map(override => override.content).join('\n\n') + '\n\n---\n\n'
        : ''

      const casualPrompt = customGuidelines + baseCasualPrompt

      const messages = [
        { role: 'system', content: casualPrompt },
        ...conversationHistory,  // 이전 대화 기록 포함
        { role: 'user', content: query }
      ]

      // 일상 대화는 항상 빠른 모델 사용
      const answer = selectedModel === 'gemini'
        ? await callGemini(messages, 0.8)
        : await callOpenAI(messages, false)

      return {
        answer: answer,
        source: null,
        foundInDocument: false,
        isSmallTalk: true
      }
    }

    // 2. 문서 기반 질문인데 문서가 없는 경우
    const documentContextArray = Array.isArray(documentContext) ? documentContext : (documentContext ? [documentContext] : [])

    if (documentContextArray.length === 0) {
      const noDocMessage = language === 'ko'
        ? '문서에 대해 질문하시려면 먼저 좌측에서 문서를 선택해주세요. 파일을 업로드하거나 웹 URL을 추가할 수 있습니다.'
        : 'To ask questions about a document, please first select a document from the left. You can upload a file or add a web URL.'

      return {
        answer: noDocMessage,
        source: null,
        foundInDocument: false
      }
    }

    // 3. 엄격한 문서 기반 답변 모드 - 다중 소스 지원 (각 문서별 독립 페이지 번호)
    const sourceContexts = []
    const allSourceNames = []

    documentContextArray.forEach((doc, index) => {
      const docName = doc.name || doc.fileName || `문서 ${index + 1}`
      const pageTexts = doc.parsedData?.pageTexts || []
      const extractedText = doc.parsedData?.extractedText || ''

      let docContent = ''

      if (pageTexts.length > 0) {
        // 각 문서별로 1페이지부터 시작
        docContent = pageTexts.map(page =>
          `[페이지 ${page.pageNumber}]\n${page.text}`
        ).join('\n\n')
      } else if (extractedText.trim().length >= 10) {
        // 텍스트/기타 문서: 가상의 1페이지 할당
        docContent = `[페이지 1]\n${extractedText}`
      }

      if (docContent) {
        sourceContexts.push({
          id: index + 1, // 문서 인덱스 (1부터 시작)
          name: docName,
          content: docContent
        })
        allSourceNames.push(`${index + 1}. ${docName}`)
      }
    })

    if (sourceContexts.length === 0) {
      const invalidDocMessage = language === 'ko'
        ? `죄송합니다. 문서 내용을 읽을 수 없습니다.\n\n파일이 비어있거나 지원하지 않는 형식일 수 있습니다. PDF의 경우 텍스트가 포함되어 있는지 확인해주세요.`
        : `Sorry, I cannot read the document content.\n\nThe file may be empty or in an unsupported format. For PDFs, please ensure they contain text.`

      return {
        answer: invalidDocMessage,
        source: null,
        foundInDocument: false,
        error: 'Invalid or empty document text'
      }
    }

    // 모든 문서 텍스트 종합
    const documentText = sourceContexts.map(ctx =>
      `[문서 ${ctx.id}: ${ctx.name}]\n${ctx.content}`
    ).join('\n\n---\n\n')

    const sourceNames = allSourceNames.join(', ')
    const fileName = allSourceNames.length > 1
      ? `${allSourceNames.length}개의 문서 (${sourceNames})`
      : allSourceNames[0]

    // extractedText 유효성 검증
    if (!documentText || documentText.trim().length < 10) {
      const invalidDocMessage = language === 'ko'
        ? `죄송합니다. 문서 내용을 읽을 수 없습니다.\n\n파일이 비어있거나 지원하지 않는 형식일 수 있습니다. PDF의 경우 텍스트가 포함되어 있는지 확인해주세요.`
        : `Sorry, I cannot read the document content.\n\nThe file may be empty or in an unsupported format. For PDFs, please ensure they contain text.`

      return {
        answer: invalidDocMessage,
        source: null,
        foundInDocument: false,
        error: 'Invalid or empty document text'
      }
    }

    console.log(`[RAG] 문서 텍스트 길이: ${documentText.length}자, 파일명: ${fileName}`)

    // 현재 날짜 (실시간 검색 강조용)
    const today = new Date().toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // 사용자 정의 지침 병합 (systemPromptOverrides가 있으면 기본 프롬프트 앞에 추가)
    const customGuidelines = systemPromptOverrides.length > 0
      ? systemPromptOverrides.map(override => override.content).join('\n\n') + '\n\n---\n\n'
      : ''

    // Universal Document Analyzer 시스템 프롬프트 (문서 종류 무관 맥락 기반 자율 분석)
    const baseSystemPrompt = language === 'ko'
      ? `당신은 모든 문서의 구조를 꿰뚫어 보는 **Universal Document Analyzer**입니다. 문서의 종류(PDF, TXT, Web)에 상관없이 다음 규칙을 무조건 적용하세요.

**🔍 맥락 기반 자율 분석 (No "No" Policy)**
- 오늘 날짜: ${today}
- **절대 "정보가 없습니다"라는 답변을 하지 마세요**
- 질문에 대한 직접적인 답이 문서에 없어도, 다음 순서로 분석하세요:
  1. **문서의 성격 파악**: 소개서, 논문, 뉴스, 보고서 등 문서 유형 식별
  2. **전체 맥락 분석**: 문서 전체의 톤, 페이지 헤더, 섹션 제목, 표, 데이터, 반복 키워드
  3. **논리적 추론**: 위 정보를 종합하여 **가장 타당한 답변** 도출
- **[가상 목차] 자동 생성**: 목차가 없는 문서는 페이지별 헤더나 문맥을 분석해 스스로 생성
- 추론 시 반드시 명시: "**문서의 전체 맥락을 분석한 결과**, [추론 내용]으로 파악됩니다 [문서 맥락 기반 추론]"

**✨ 시각적 강조 및 인용 규칙 (필수)**
- **핵심 지표 및 중요 정보**: 강조 없이 일반 텍스트로 작성하세요. 불필요한 굵게(Bold) 처리를 절대 하지 마세요.
- **인라인 시테이션 활성화**: 모든 주요 주장이나 설명이 끝나는 지점에 반드시 \`[문서번호:페이지번호]\`를 추가하세요. (예: ...라고 파악됩니다 [1:5].)
  * **문서번호**: 제공된 문서 리스트의 순서 (1, 2, 3...)
  * **페이지번호**: 해당 문서 내의 로컬 페이지 번호 (각 문서마다 1부터 시작)
  * 예시: 1번 문서의 5페이지는 \`[1:5]\`, 2번 문서의 12페이지는 \`[2:12]\`
- 문단 구분점에는 \`###\` 헤더 사용하여 시각적 위계 구성
- 3줄 이상의 나열은 반드시 글머리 기호(Bullet Points) 사용
- **리스트 형식 규칙**: "1. **서론**" 또는 "- **핵심 내용**"처럼 숫자/기호와 텍스트를 같은 줄에 작성 (줄바꿈 금지)

**핵심 규칙:**
1. ✅ **직접 근거 우선** - 문서에 명시된 내용을 먼저 제시하세요.
2. ✅ **맥락 기반 추론 필수** - 문서의 여러 정보를 종합하여 논리적 결론 도출 (추론 태그 사용)
3. ✅ **구조적 답변** - 개요 → 세부 분석 → AI 인사이트 순서로 구성
4. ✅ **정중하고 분석적인 톤** - NotebookLM처럼 전문적이고 신뢰감 있게
5. ✅ **텍스트 내 페이지 직접 언급 금지** - "3페이지에 따르면", "Page 5"와 같은 텍스트 형태의 페이지 언급을 절대 하지 마세요. 모든 출처는 오직 인용 배지 [N] 또는 [N-M] 형태로만 문장 끝에 표기하세요.

**제공된 문서:**
파일명: ${fileName}
분석 시간: ${today}

**문서 내용:**
${documentText}

**답변 구조화 템플릿 (필수):**

### [핵심 요약]
질문에 대한 답변을 **1~2줄로 강렬하게 요약** (강조 효과 없이 일반 텍스트 사용)

예: "이 문서는 **삼성전자의 2024년 실적**을 다루며, **영업이익 35조원**, **시장점유율 1위** 달성이 핵심입니다"

### [상세 분석]
문서 데이터를 기반으로 한 **세부 설명** (리스트 형식 필수, 각 항목은 한 줄로):

**📄 직접 근거**
1. 문서에 명시된 내용 (큰따옴표로 인용, 핵심 단어 굵게)
2. 예: 문서에 따르면 "**반도체 부문 실적이 전년 대비 40% 증가**"했습니다

**🔍 맥락 기반 분석** [문서 맥락 기반 추론]
1. 문서의 여러 정보를 종합한 통찰 (추론 태그 명시, **페이지 배지 필수**)
2. 예: 문서 전반에 걸쳐 **AI 칩**, **5nm 공정**, **글로벌 시장**이 반복 언급되므로[3, 7, 15, 23], **기술 선도 전략**으로 파악됩니다

### [AI 인사이트/추론]
명시되지 않았지만 문서 흐름상 유추 가능한 정보나 제언 (**페이지 배지 필수**)

예: 이러한 실적 추세로 볼 때[5, 12, 18], **2025년 목표 달성 가능성**이 높으며, **투자 확대** 전략이 예상됩니다 [문서 맥락 기반 추론]

**특별 규칙:**
- 목차, 구조, 전체 요약 등을 물어볼 경우: 문서 전체를 분석하여 **[가상 목차]** 또는 **[구조 분석]**을 직접 생성하세요
- **목차 생성 시 페이지 번호 자동 계산 (100% 필수)**:
  * 각 목차 항목의 키워드가 문서에서 처음 등장하는 페이지를 검색하여 인용 배지 부착
  * 예: "1. **서론**[1-2]", "2. **본론**[3-10]", "3. **결론**[11-15]"
  * 페이지 범위가 명확하지 않으면 대표 페이지 하나라도 반드시 표시: "- **핵심 내용**[5]"
  * 목차 항목 없이 페이지 번호 누락은 절대 불가
- 직접 언급이 없는 경우: "문서에 직접 언급은 없으나, **문서의 전체 맥락을 분석한 결과** [추론 내용]으로 파악됩니다 [문서 맥락 기반 추론]"
- 외부 지식 사용 금지: 오직 **제공된 문서 내용(extractedText)**의 범위 안에서만 논리적으로 추론하세요
- 추론 부분에는 반드시 **[문서 맥락 기반 추론]** 태그를 달아 투명성을 확보하세요`
      : `You are the **Universal Document Analyzer** that penetrates the structure of all documents. Apply the following rules unconditionally regardless of document type (PDF, TXT, Web).

**🔍 Context-Based Autonomous Analysis (No "No" Policy)**
- Today's date: ${today}
- **Never answer with "information not available"**
- Even if there's no direct answer in the document, analyze in this order:
  1. **Identify document nature**: Introduction, paper, news, report, etc.
  2. **Overall context analysis**: Document tone, page headers, section titles, tables, data, recurring keywords
  3. **Logical reasoning**: Synthesize above information to derive **the most reasonable answer**
- **Auto-generate [Virtual Table of Contents]**: For documents without TOC, analyze page headers or context to create one
- When reasoning, must specify: "**Based on analyzing the document's overall context**, [inferred content] is identified [Context-Based Reasoning]"

**✨ 시각적 강조 및 인용 규칙 (필수)**
- **Key metrics and info**: Write in regular text without emphasis. Do NOT use **bold** markers.
- Use \`###\` headers at paragraph breaks to create visual hierarchy
- Lists of 3+ items must use bullet points
- **List Format Rule**: Write number/symbol and text on the same line like "1. **Introduction**" or "- **Key Point**" (no line breaks)

- **🔴 Absolute Rule: Always include citation badges in [DocIndex:PageNumber] format!**
- **Format**: \`[Document_Number:Local_Page_Number]\`
  - Document 1, Page 5: [1:5]
  - Document 2, Page 12: [2:12]
  - Range (same doc): [1:5-8]
  - Multiple pages (same doc): [1:3, 7]
  - Multiple documents: [1:5, 2:12]
- **Page numbering**: Each document starts from Page 1. Use the local page number found in "[페이지 N]" markers within each source.
- **🚨 ALWAYS CITATION: Forced Citation Generation Rules (No Exceptions)**:
  - **Every answer must include citation badges in [DocIndex:PageNumber] format**
  - AI must infer pages if unclear and generate badges based on the provided source indices.
- **Examples**:
  - "AI market size is estimated at $500 billion[1:3]"
  - "2024 target is operating profit of $35 billion[2:1]"
  - **"Detailed pricing policy is presented[1:11-14]"** (range citation)
  - **"Based on analyzing the document's overall context**, main target is identified as B2B market[1:5, 2:12, 3:18]"** (reasoning-based multiple citations)
- **Citation Badge Usage Principles (Natural and Intuitive)**:
  - Add page numbers to key information, but **not excessively** (about 1-2 per paragraph)
  - **Use badges only for direct citations**: Cite only when content is clearly in the document; no badges needed for reasoning or general explanations
  - **Utilize range citations**: Use [N-M] format for content spanning multiple pages
  - **When generating TOC**: Show only 1 representative page per item (e.g., "1. **Introduction**[1]")
  - **When generating summaries**: Include only 1-2 representative pages per paragraph (avoid excessive citations)
  - When multiple files are selected, clearly distinguish and cite information from each file
  - **Range citation usage rule**: If a topic or content spans multiple pages, always use [start-end] format
- **Answers without citations are strictly prohibited**: Every sentence must include at least 1 page number
- **Special TOC Rule**: Format each item as "1. **Introduction**[1-3]" or "- **Key Content**[5]" with page range or representative page mandatory

**Core Rules:**
1. ✅ **Direct Evidence First** - Present information explicitly stated in the document first.
2. ✅ **Context-Based Reasoning Required** - Synthesize multiple pieces of information to draw logical conclusions (use reasoning tag).
3. ✅ **Structured Answers** - Overview → Detailed Analysis → AI Insights order
4. ✅ **Professional Tone** - Professional and trustworthy like NotebookLM
5. ✅ **No Textual Page Mentions** - Never use phrases like "According to page 3" or "Page 5 says". Use ONLY citation badges like [N] or [N-M] at the end of sentences. No exceptions.

**Provided Document:**
File name: ${fileName}
Analysis time: ${today}

**Document Content:**
${documentText}

**Answer Structuring Template (Mandatory):**

### [Core Summary]
Answer the question in **1-2 powerful summary sentences** (regular text, no bolding)

Example: "This document covers **Samsung's 2024 performance**, with **operating profit of 35 trillion won** and **market share #1** as key achievements"

### [Detailed Analysis]
Detailed explanation based on document data (**list format required, each item on one line**):

**📄 Direct Evidence**
1. Information explicitly stated in the document (quoted, key words bolded)
2. Example: According to the document, "**semiconductor division performance increased by 40% year-over-year**"

**🔍 Context-Based Analysis** [Context-Based Reasoning]
1. Insights from synthesizing document information (reasoning tag specified, **page badges mandatory**)
2. Example: Throughout the document, **AI chips**, **5nm process**, **global market** are repeatedly mentioned[3, 7, 15, 23], indicating a **technology leadership strategy**

### [AI Insights/Reasoning]
Information or recommendations that can be inferred from document flow but not explicitly stated (**page badges mandatory**)

Example: Based on this performance trend[5, 12, 18], **2025 goal achievement likelihood** is high, and **investment expansion** strategy is expected [Context-Based Reasoning]

**Special Rules:**
- When asked about table of contents, structure, or overall summary: Analyze the entire document to generate a **[Virtual Table of Contents]** or **[Structure Analysis]**
- **Auto-calculate page numbers for TOC generation (100% Mandatory)**:
  * Search for the first page where each TOC item's keyword appears in the document and attach citation badge
  * Example: "1. **Introduction**[1-2]", "2. **Main Body**[3-10]", "3. **Conclusion**[11-15]"
  * If page range is unclear, display at least one representative page: "- **Key Content**[5]"
  * TOC items without page numbers are absolutely prohibited
- When not directly mentioned: "While not directly mentioned in the document, **based on analyzing the document's overall context**, [inferred content] is identified [Context-Based Reasoning]"
- No external knowledge: Only reason logically within the scope of **the provided document content (extractedText)**
- Always tag reasoning sections with **[Context-Based Reasoning]** for transparency`

    // 사용자 정의 지침을 기본 프롬프트 앞에 추가
    const systemPrompt = customGuidelines + baseSystemPrompt

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,  // 이전 대화 기록 포함 (GPT ↔ Gemini 전환 시에도 유지)
      { role: 'user', content: query }
    ]

    // 선택된 모델에 따라 API 호출
    let answer
    const useThinking = selectedModel === 'thinking'

    if (selectedModel === 'gemini') {
      answer = await callGemini(messages, 0.3, useThinking)  // 심층 분석 여부 전달
    } else {
      answer = await callOpenAI(messages, useThinking)
    }

    // 응답 검증: 빈 응답 방지
    if (!answer || answer.trim().length < 10) {
      console.error('[심층 분석 오류] 비정상적으로 짧은 응답:', answer)
      throw new Error('AI 모델이 충분한 응답을 생성하지 못했습니다. 다시 시도해주세요.')
    }

    // 답변에서 "찾을 수 없습니다" 패턴 감지
    const notFoundPatterns = [
      '찾을 수 없',
      'could not find',
      'cannot find',
      '없습니다',
      'not available',
      'not mentioned',
      '언급되지 않'
    ]

    const foundInDocument = !notFoundPatterns.some(pattern =>
      answer.toLowerCase().includes(pattern.toLowerCase())
    )

    // 추론 기반 답변 여부 감지
    const isReasoningBased = answer.includes('[문서 맥락 기반 추론]') || answer.includes('[Context-Based Reasoning]')

    return {
      answer: answer,
      source: fileName,
      foundInDocument: foundInDocument,
      citedText: foundInDocument ? documentText.substring(0, 200) : null,
      isReasoningBased: isReasoningBased // 추론 기반 답변 플래그
    }
  } catch (error) {
    console.error('RAG 응답 생성 오류:', error)

    const errorMessage = language === 'ko'
      ? `죄송합니다. 응답 생성 중 오류가 발생했습니다: ${error.message}`
      : `Sorry, an error occurred while generating a response: ${error.message}`

    return {
      answer: errorMessage,
      source: null,
      foundInDocument: false,
      error: error.message
    }
  }
}
