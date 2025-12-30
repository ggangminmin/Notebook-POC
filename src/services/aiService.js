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

    // Universal Document Analyzer 시스템 프롬프트 (문서 종류 무관 맥락 기반 자율 분석)
    const systemPrompt = language === 'ko'
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

**✨ 시각적 강조 규칙 (필수)**
- **핵심 명사, 기능명, 고유 대명사, 중요 수치**는 반드시 \`**굵게**\` 처리
- 문단 구분점에는 \`###\` 헤더 사용하여 시각적 위계 구성
- 3줄 이상의 나열은 반드시 글머리 기호(Bullet Points) 사용
- **리스트 형식 규칙**: "1. **서론**" 또는 "- **핵심 내용**"처럼 숫자/기호와 텍스트를 같은 줄에 작성 (줄바꿈 금지)
- **인용 태그 규칙 (PDF 문서인 경우)**: 특정 페이지의 내용을 인용할 때 \`<cite page="페이지번호">인용 텍스트</cite>\` 형식 사용
  - 예: "문서 3페이지에 따르면 <cite page="3">AI 시장 규모는 500조원</cite>으로 추정됩니다"
  - 인용 태그는 해당 페이지의 실제 내용만 포함하고, 페이지 번호는 정확해야 함
- 예: "이 서비스의 핵심은 **AI 기술**, **24시간 운영**, **99.9% 정확도**입니다"

**핵심 규칙:**
1. ✅ **직접 근거 우선** - 문서에 명시된 내용을 먼저 제시하되, 핵심 키워드는 굵게 표시
2. ✅ **맥락 기반 추론 필수** - 문서의 여러 정보를 종합하여 논리적 결론 도출 (추론 태그 사용)
3. ✅ **구조적 답변** - 개요 → 세부 분석 → 출처/참조 순서로 구성
4. ✅ **정중하고 분석적인 톤** - NotebookLM처럼 전문적이고 신뢰감 있게

**제공된 문서:**
파일명: ${fileName}
분석 시간: ${today}

**문서 내용:**
${documentText}

**답변 구조화 템플릿 (필수):**

### [핵심 요약]
질문에 대한 답변을 **1~2줄로 강렬하게 요약** (핵심 단어는 굵게)

예: "이 문서는 **삼성전자의 2024년 실적**을 다루며, **영업이익 35조원**, **시장점유율 1위** 달성이 핵심입니다"

### [상세 분석]
문서 데이터를 기반으로 한 **세부 설명** (리스트 형식 필수, 각 항목은 한 줄로):

**📄 직접 근거**
1. 문서에 명시된 내용 (큰따옴표로 인용, 핵심 단어 굵게)
2. 예: 문서에 따르면 "**반도체 부문 실적이 전년 대비 40% 증가**"했습니다

**🔍 맥락 기반 분석** [문서 맥락 기반 추론]
1. 문서의 여러 정보를 종합한 통찰 (추론 태그 명시)
2. 예: 문서 전반에 걸쳐 **AI 칩**, **5nm 공정**, **글로벌 시장**이 반복 언급되므로, **기술 선도 전략**으로 파악됩니다

### [AI 인사이트/추론]
명시되지 않았지만 문서 흐름상 유추 가능한 정보나 제언

예: 이러한 실적 추세로 볼 때, **2025년 목표 달성 가능성**이 높으며, **투자 확대** 전략이 예상됩니다 [문서 맥락 기반 추론]

### [출처/참조]
답변 근거가 된 문서의 **섹션이나 데이터 위치** 명시

예: **2장 재무 현황**, **3페이지 실적 표**, **경영진 인터뷰** 섹션에서 도출

**특별 규칙:**
- 목차, 구조, 전체 요약 등을 물어볼 경우: 문서 전체를 분석하여 **[가상 목차]** 또는 **[구조 분석]**을 직접 생성하세요
- 직접 언급이 없는 경우: "문서에 직접 언급은 없으나, **문서의 전체 맥락을 분석한 결과** [추론 내용]으로 파악됩니다 [문서 맥락 기반 추론]"
- 외부 지식 사용 금지: 오직 **제공된 문서 내용(extractedText)**의 범위 안에서만 논리적으로 추론하세요
- 답변 마지막에 "\n\n📄 **출처**: ${fileName} (${today} 분석)"을 추가하세요
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

**✨ Visual Emphasis Rules (Mandatory)**
- **Key nouns, feature names, proper nouns, important numbers** must be \`**bolded**\`
- Use \`###\` headers at paragraph breaks to create visual hierarchy
- Lists of 3+ items must use bullet points
- **List Format Rule**: Write number/symbol and text on the same line like "1. **Introduction**" or "- **Key Point**" (no line breaks)
- **Citation Tag Rule (for PDF documents)**: When citing content from a specific page, use \`<cite page="page_number">quoted text</cite>\` format
  - Example: "According to page 3, <cite page="3">AI market size is estimated at $500 billion</cite>"
  - Citation tags must contain only actual content from that page, and page numbers must be accurate
- Example: "The core is **AI technology**, **24/7 operation**, **99.9% accuracy**"

**Core Rules:**
1. ✅ **Direct Evidence First** - Present information explicitly stated in the document first, with key keywords in bold
2. ✅ **Context-Based Reasoning Required** - Synthesize multiple pieces of information to draw logical conclusions (use reasoning tag)
3. ✅ **Structured Answers** - Overview → Detailed Analysis → Source/Reference order
4. ✅ **Polite and Analytical Tone** - Professional and trustworthy like NotebookLM

**Provided Document:**
File name: ${fileName}
Analysis time: ${today}

**Document Content:**
${documentText}

**Answer Structuring Template (Mandatory):**

### [Core Summary]
Answer the question in **1-2 powerful summary sentences** (key words bolded)

Example: "This document covers **Samsung's 2024 performance**, with **operating profit of 35 trillion won** and **market share #1** as key achievements"

### [Detailed Analysis]
Detailed explanation based on document data (**list format required, each item on one line**):

**📄 Direct Evidence**
1. Information explicitly stated in the document (quoted, key words bolded)
2. Example: According to the document, "**semiconductor division performance increased by 40% year-over-year**"

**🔍 Context-Based Analysis** [Context-Based Reasoning]
1. Insights from synthesizing document information (reasoning tag specified)
2. Example: Throughout the document, **AI chips**, **5nm process**, **global market** are repeatedly mentioned, indicating a **technology leadership strategy**

### [AI Insights/Reasoning]
Information or recommendations that can be inferred from document flow but not explicitly stated

Example: Based on this performance trend, **2025 goal achievement likelihood** is high, and **investment expansion** strategy is expected [Context-Based Reasoning]

### [Source/Reference]
Specify **section or data location** in the document that served as basis

Example: Derived from **Chapter 2 Financial Status**, **Page 3 Performance Table**, **Executive Interview** section

**Special Rules:**
- When asked about table of contents, structure, or overall summary: Analyze the entire document to generate a **[Virtual Table of Contents]** or **[Structure Analysis]**
- When not directly mentioned: "While not directly mentioned in the document, **based on analyzing the document's overall context**, [inferred content] is identified [Context-Based Reasoning]"
- No external knowledge: Only reason logically within the scope of **the provided document content (extractedText)**
- Add "\n\n📄 **Source**: ${fileName} (Analyzed on ${today})" at the end of your response
- Always tag reasoning sections with **[Context-Based Reasoning]** for transparency`

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
