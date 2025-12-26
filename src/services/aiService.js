import { extractTextFromParsedData } from '../utils/fileParser'

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

// GPT 모델 설정
const GPT_MODELS = {
  INSTANT: 'gpt-4o-mini',  // 빠른 응답 (실제 모델)
  THINKING: 'gpt-4o'       // 심층 추론 (실제 모델)
}

// 언어 감지 (간단한 휴리스틱)
export const detectLanguage = (text) => {
  // 한글이 포함되어 있으면 한국어
  const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/
  return koreanRegex.test(text) ? 'ko' : 'en'
}

// 일상 대화 패턴 감지
const isSmallTalk = (query) => {
  const greetings = [
    '안녕', '반가워', '하이', 'hi', 'hello', '헬로', '좋은 아침', '좋은 저녁',
    '어떻게 지내', '잘 지내', '뭐해', '뭐하니', '고마워', '감사', 'thank',
    '잘했어', '좋아', '괜찮아', 'good', 'great', 'thanks', 'bye', '안녕히',
    '잘가', '또 봐'
  ]

  const queryLower = query.toLowerCase().trim()
  return greetings.some(greeting => queryLower.includes(greeting))
}

// OpenAI API 호출
const callOpenAI = async (messages, temperature = 0.3, useThinking = false) => {
  try {
    const model = useThinking ? GPT_MODELS.THINKING : GPT_MODELS.INSTANT

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: temperature,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'OpenAI API 호출 실패')
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('OpenAI API 오류:', error)
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

    const summary = await callOpenAI(messages, 0.3, false) // Instant 모델
    return summary

  } catch (error) {
    console.error('문서 요약 생성 오류:', error)
    return null
  }
}

// 추천 질문 생성 (Instant 모델 사용 - 빠른 생성)
export const generateSuggestedQuestions = async (documentContext, language = 'ko') => {
  try {
    if (!documentContext || !documentContext.parsedData) {
      return []
    }

    const documentText = extractTextFromParsedData(documentContext.parsedData)
    const fileName = documentContext.name || '문서'

    // 문서가 너무 짧으면 스킵
    if (!documentText || documentText.length < 100) {
      return []
    }

    const questionsPrompt = language === 'ko'
      ? `다음 문서를 읽고, 사용자가 물어볼 만한 흥미로운 질문 3개를 생성해주세요.

**문서 제목:** ${fileName}

**문서 내용:**
${documentText.substring(0, 3000)}

**질문 생성 규칙:**
- 문서 내용을 기반으로 답변 가능한 질문만 생성
- 각 질문은 15자 이내로 간결하게
- 문서의 핵심 내용을 다루는 질문
- JSON 배열 형식으로만 응답: ["질문1", "질문2", "질문3"]
- 다른 텍스트 없이 JSON만 출력`
      : `Read the following document and generate 3 interesting questions users might ask.

**Document Title:** ${fileName}

**Document Content:**
${documentText.substring(0, 3000)}

**Question Generation Rules:**
- Only generate questions answerable from the document
- Keep each question under 15 words
- Focus on key content
- Respond only in JSON array format: ["Question 1", "Question 2", "Question 3"]
- Output only JSON, no other text`

    const messages = [
      { role: 'system', content: questionsPrompt },
      { role: 'user', content: language === 'ko' ? '질문 3개를 생성해주세요.' : 'Generate 3 questions.' }
    ]

    const response = await callOpenAI(messages, 0.5, false) // Instant 모델

    // JSON 파싱 시도
    try {
      const questions = JSON.parse(response)
      if (Array.isArray(questions) && questions.length > 0) {
        return questions.slice(0, 3)
      }
    } catch (e) {
      console.warn('질문 JSON 파싱 실패, 텍스트 파싱 시도')
      // JSON 파싱 실패 시 텍스트에서 추출 시도
      const lines = response.split('\n').filter(line => line.trim() && !line.includes('{') && !line.includes('}'))
      if (lines.length > 0) {
        return lines.slice(0, 3).map(q => q.replace(/^[-*•]\s*/, '').replace(/^["']|["']$/g, '').trim())
      }
    }

    return []
  } catch (error) {
    console.error('추천 질문 생성 오류:', error)
    return []
  }
}

// 하이브리드 RAG 응답 생성 (일상 대화 + 엄격한 문서 기반)
// useThinking: true면 Thinking 모델 사용 (심층 추론), false면 Instant 모델 사용 (빠른 응답)
// documentContext: 단일 객체 또는 배열 모두 지원
export const generateStrictRAGResponse = async (query, documentContext, language = 'ko', useThinking = true) => {
  try {
    // 1. 일상 대화 모드 - 문서 없이도 응답 가능
    if (isSmallTalk(query)) {
      const casualPrompt = language === 'ko'
        ? '당신은 친절한 AI 어시스턴트입니다. 사용자와 자연스럽고 따뜻하게 대화하세요. 간단명료하게 답변하되, 지나치게 길지 않게 해주세요.'
        : 'You are a friendly AI assistant. Have a natural and warm conversation with the user. Keep your responses concise and not too long.'

      const messages = [
        { role: 'system', content: casualPrompt },
        { role: 'user', content: query }
      ]

      const answer = await callOpenAI(messages, 0.8, false) // Instant 모델 - 일상 대화

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

    // 3. 엄격한 문서 기반 답변 모드 - 다중 소스 지원
    const allTexts = documentContextArray.map(doc => {
      const text = extractTextFromParsedData(doc.parsedData)
      const name = doc.name || doc.fileName || '문서'
      return { name, text }
    }).filter(item => item.text && item.text.trim().length >= 10)

    if (allTexts.length === 0) {
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
    const combinedDocumentText = allTexts.map(item =>
      `[출처: ${item.name}]\n${item.text}`
    ).join('\n\n---\n\n')

    const sourceNames = allTexts.map(item => item.name).join(', ')
    const documentText = combinedDocumentText
    const fileName = allTexts.length > 1
      ? `${allTexts.length}개의 문서 (${sourceNames})`
      : allTexts[0].name

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

    // NotebookLM 스타일 엄격한 시스템 프롬프트 (실시간 데이터 강제 + 출처 표시 강화)
    const systemPrompt = language === 'ko'
      ? `당신은 NotebookLM 스타일의 엄격한 문서 분석 AI입니다. 다음 규칙을 절대적으로 따라야 합니다:

**⚠️ 중요: 실시간 데이터 사용 강제**
- 오늘 날짜: ${today}
- 당신의 과거 학습 데이터나 내부 지식을 절대 사용하지 마세요
- 반드시 아래 제공된 문서 내용만 사용하세요
- 이 문서는 실시간 웹 검색으로 수집된 최신 정보입니다
- 문서에 명시되지 않은 어떤 정보도 추측하거나 보충하지 마세요

**핵심 규칙:**
1. ❌ 과거 학습 데이터 사용 금지 - 제공된 문서에 명시적으로 작성된 내용만 사용하세요
2. ❌ 외부 지식 사용 금지 - 문서에 없는 정보는 절대 추측하거나 보충하지 마세요
3. ✅ 정직한 답변 - 답변할 수 없으면 "제공된 문서에서 해당 내용을 찾을 수 없습니다"라고 말하세요
4. ✅ 출처 명시 필수 - 답변 시 문서의 어느 부분에서 정보를 가져왔는지 반드시 명확히 밝히세요

**제공된 실시간 웹 검색 결과:**
파일명: ${fileName}
수집 시간: ${today}

**문서 내용 (최신 웹 데이터):**
${documentText}

**답변 형식 (필수):**
- 답변 시작 시 "제공된 웹 검색 결과에 따르면," 또는 "최신 자료의 [섹션명]에서," 등으로 시작하세요
- 문서에서 직접 인용할 때는 반드시 큰따옴표("...")를 사용하세요
- 여러 정보를 종합할 때도 각각의 출처를 명시하세요
- 예시: "실시간 검색 결과에 따르면, 삼성전자 주가는 \"${today} 기준 75,000원\"입니다."
- ⚠️ 불확실하거나 문서에 명시되지 않은 내용은 절대 답변하지 마세요
- ⚠️ 당신의 학습 데이터가 아닌, 제공된 문서의 실시간 데이터만 사용하세요
- 답변 마지막에 "\n\n📄 출처: ${fileName} (${today} 수집)"을 추가하세요`
      : `You are a NotebookLM-style strict document analysis AI. You must absolutely follow these rules:

**⚠️ CRITICAL: Real-Time Data Usage Enforcement**
- Today's date: ${today}
- You MUST NOT use your past training data or internal knowledge
- You MUST ONLY use the provided document content below
- This document contains the latest information collected from real-time web searches
- Do NOT guess or supplement any information not explicitly stated in the document

**Core Rules:**
1. ❌ NO Historical Knowledge - Only use information explicitly written in the provided document
2. ❌ NO External Knowledge - Never guess or supplement information not in the document
3. ✅ Honest Answers - If you cannot answer, say "I could not find this information in the provided document"
4. ✅ Mandatory Citations - You must clearly state which part of the document the information came from

**Provided Real-Time Web Search Results:**
File name: ${fileName}
Collection time: ${today}

**Document Content (Latest Web Data):**
${documentText}

**Response Format (Required):**
- Start your answer with "According to the latest web search results," or "In the [section name] of the latest data,"
- Always use quotation marks ("...") when directly quoting from the document
- When synthesizing multiple pieces of information, cite the source for each
- Example: "According to real-time search results, Samsung stock price is \"75,000 KRW as of ${today}\"."
- ⚠️ Never answer anything uncertain or not stated in the document
- ⚠️ Use ONLY the real-time data from the provided document, NOT your training data
- Add "\n\n📄 Source: ${fileName} (Collected on ${today})" at the end of your response`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ]

    const answer = await callOpenAI(messages, 0.3, useThinking) // Thinking 모델로 심층 분석

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

    return {
      answer: answer,
      source: fileName,
      foundInDocument: foundInDocument,
      citedText: foundInDocument ? documentText.substring(0, 200) : null
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
