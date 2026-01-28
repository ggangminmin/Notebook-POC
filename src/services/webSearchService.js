// 웹 검색 및 크롤링 서비스
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const TAVILY_API_KEY = import.meta.env.VITE_TAVILY_API_KEY // 선택사항

// ⚡ 타임아웃이 포함된 Fetch 유틸리티
const fetchWithTimeout = async (url, options = {}, timeout = 30000) => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    if (error.name === 'AbortError') {
      throw new Error('요청 시간이 초과되었습니다 (Timeout)')
    }
    throw error
  }
}

// 텍스트 청킹: 긴 텍스트를 의미 있는 단위로 분할 (약 500자)
const chunkText = (text, chunkSize = 500) => {
  const chunks = []
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

  let currentChunk = ''

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= chunkSize) {
      currentChunk += sentence
    } else {
      if (currentChunk) chunks.push(currentChunk.trim())
      currentChunk = sentence
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim())

  return chunks
}

// 간단한 코사인 유사도 계산 (키워드 기반)
const calculateSimilarity = (query, text) => {
  const queryWords = query.toLowerCase().split(/\s+/)
  const textLower = text.toLowerCase()

  let matchCount = 0
  for (const word of queryWords) {
    if (word.length > 2 && textLower.includes(word)) {
      matchCount++
    }
  }

  return matchCount / queryWords.length
}

// 가장 관련성 높은 청크 선택 (상위 3-5개)
const selectRelevantChunks = (chunks, query, topK = 5) => {
  const scoredChunks = chunks.map(chunk => ({
    text: chunk,
    score: calculateSimilarity(query, chunk)
  }))

  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(chunk => chunk.score > 0) // 최소한의 관련성 필터
}

// GPT-4o를 사용한 웹 페이지 요약 (질문에 최적화된 3줄 요약)
const summarizeWebPage = async (text, query, language = 'ko') => {
  try {
    const prompt = language === 'ko'
      ? `다음 웹 페이지 내용을 사용자의 질문에 최적화된 형태로 3줄 요약해주세요.

**사용자 질문**: "${query}"

**웹 페이지 내용**:
${text.substring(0, 3000)}

**요구사항:**
- 질문과 관련된 핵심 정보만 포함
- 3줄 이내로 간결하게
- 불필요한 광고, 메뉴, 푸터 내용 제외
- 중요한 수치, 날짜, 이름은 반드시 포함`
      : `Summarize the following web page content in 3 lines, optimized for the user's question.

**User Question**: "${query}"

**Web Page Content**:
${text.substring(0, 3000)}

**Requirements:**
- Include only key information related to the question
- Keep it concise (3 lines max)
- Exclude ads, menus, footer content
- Include important numbers, dates, names`

    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert at extracting relevant information from web pages.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 300
      })
    }, 45000) // 요약은 최대 45초

    const data = await response.json()
    return data.choices[0].message.content.trim()
  } catch (error) {
    console.error('[WebSearch] 요약 오류:', error)
    return text.substring(0, 500) // 실패 시 앞 500자 반환
  }
}

// 🌐 Jina AI Reader를 사용한 본문 추출 (직접 요청 시도 후 실패 시 프록시 사용)
const fetchWebPageContent = async (url, query = '', useSmartExtraction = false) => {
  try {
    console.log(`[WebSearch] Jina Reader 본문 추출 시도: ${url}`);
    const jinaUrl = `https://r.jina.ai/${url}`;

    let jinaContent = '';

    // 1. 직접 추출 시도 (가장 빠름)
    try {
      const response = await fetchWithTimeout(jinaUrl, {
        headers: { 'Accept': 'text/plain' }
      }, 15000); // 15초 제한

      if (response.ok) {
        jinaContent = await response.text();
      }
    } catch (directError) {
      console.warn('[WebSearch] 직접 추출 실패, 프록시 전환:', directError.message);
    }

    // 2. 실패 시 프록시 자동 전환 (allorigins 또는 다른 안정적인 프록시)
    if (!jinaContent) {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(jinaUrl)}`;
      const response = await fetchWithTimeout(proxyUrl, {}, 20000); // 20초 제한

      if (response.ok) {
        const proxyData = await response.json();
        jinaContent = proxyData.contents;
      }
    }

    if (!jinaContent || jinaContent.trim().length < 50) {
      throw new Error('내용을 가져오지 못했습니다.');
    }

    const titleMatch = jinaContent.match(/^#\s+(.*)$/m);
    const title = titleMatch ? titleMatch[1].trim() : url;
    let finalText = jinaContent;

    if (useSmartExtraction && query && jinaContent.length > 3000) {
      const chunks = chunkText(jinaContent, 800);
      const relevantChunks = selectRelevantChunks(chunks, query, 5);
      finalText = relevantChunks.map(chunk => chunk.text).join('\n\n---\n\n');
    }

    return {
      url,
      extractedText: finalText, // 🔥 text 대신 extractedText 사용 (표준화)
      fullText: jinaContent,
      title: title,
      success: true,
      mode: 'jina'
    };
  } catch (error) {
    console.error('[WebSearch] 크롤링 실패:', error);
    return { url, extractedText: '', title: url, success: false, error: error.message };
  }
}

// Tavily API를 사용한 웹 검색 (Context 모드: 관련성 높은 핵심 컨텍스트만 추출)
const searchWithTavily = async (query, maxResults = 5) => {
  if (!TAVILY_API_KEY) {
    console.warn('[WebSearch] Tavily API 키가 없습니다. 대체 검색 사용')
    return { success: false, reason: 'no_api_key', results: null }
  }

  try {
    console.log('[WebSearch] Tavily API 호출 - Context 모드')

    const response = await fetchWithTimeout('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        max_results: maxResults,
        search_depth: 'advanced', // 심층 검색
        include_answer: false, // 답변 포함 X (컨텍스트만)
        include_raw_content: true, // 전체 본문 O (사용자 요청: 전체 내용 가져오기)
        include_domains: [], // 모든 도메인
        exclude_domains: [] // 제외할 도메인 없음
      })
    }, 25000)

    const data = await response.json()

    // Tavily API 에러 응답 확인
    if (data.error) {
      console.error('[WebSearch] Tavily API 에러:', data.error)

      // 크레딧 소진 감지
      if (data.error.includes('credit') || data.error.includes('limit') || data.error.includes('quota')) {
        return { success: false, reason: 'credits_exhausted', error: data.error, results: null }
      }

      // 기타 에러
      return { success: false, reason: 'api_error', error: data.error, results: null }
    }

    // Tavily는 기본 snippet 외에 raw_content가 있으면 이를 우선 사용 (전체 내용 수집용)
    const results = (data.results || []).map(result => ({
      url: result.url,
      title: result.title,
      content: result.raw_content || result.content, // raw_content 우선 사용 (전체 내용)
      score: result.score || 0 // 관련성 점수
    }))

    console.log(`[WebSearch] Tavily 결과: ${results.length}개`)
    return {
      success: true,
      results: results.sort((a, b) => b.score - a.score) // 관련성 순 정렬
    }

  } catch (error) {
    console.error('[WebSearch] Tavily API 오류:', error)
    return { success: false, reason: 'network_error', error: error.message, results: null }
  }
}

// 검색 쿼리 최적화 (실시간 정보 검색을 위한 쿼리 변환)
const optimizeSearchQuery = async (userQuery, language = 'ko') => {
  try {
    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

    const prompt = language === 'ko'
      ? `사용자의 질문을 '최신 실시간 정보를 찾기 위한 최적의 검색어'로 변환해주세요.

**오늘 날짜**: ${today}

**사용자 질문**: "${userQuery}"

**변환 규칙:**
1. 날짜를 포함하여 최신성 강조 (예: "2025년 12월 26일")
2. "실시간", "최신", "현재" 등의 키워드 추가
3. 구체적이고 검색에 최적화된 형태로 변환
4. 20자 이내로 간결하게

**예시:**
- "삼성전자 주가 어때?" → "2025년 12월 삼성전자 실시간 주가"
- "AI 트렌드" → "2025년 최신 AI 산업 트렌드"
- "날씨" → "2025년 12월 26일 서울 날씨"

최적화된 검색어만 출력하세요 (다른 텍스트 없이):`
      : `Convert the user's question into an optimized search query for finding the latest real-time information.

**Today's Date**: ${today}

**User Question**: "${userQuery}"

**Conversion Rules:**
1. Include date to emphasize recency (e.g., "December 26, 2025")
2. Add keywords like "real-time", "latest", "current"
3. Make it specific and search-optimized
4. Keep it concise (under 20 words)

**Examples:**
- "Samsung stock?" → "December 2025 Samsung real-time stock price"
- "AI trends" → "Latest AI industry trends 2025"
- "weather" → "December 26, 2025 Seoul weather"

Output only the optimized search query (no other text):`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.3,
        max_tokens: 100
      })
    })

    const data = await response.json()
    const optimizedQuery = data.choices[0].message.content.trim()

    console.log('[WebSearch] 원본 쿼리:', userQuery)
    console.log('[WebSearch] 최적화된 쿼리:', optimizedQuery)

    return optimizedQuery
  } catch (error) {
    console.error('[WebSearch] 쿼리 최적화 오류:', error)
    return userQuery // 실패 시 원본 쿼리 사용
  }
}

// GPT를 이용한 스마트 웹 검색 (검색어 → URL 추천) - 10개로 증가
const generateSearchUrls = async (query, language = 'ko') => {
  try {
    const prompt = language === 'ko'
      ? `다음 검색 질문에 대해 신뢰할 수 있는 웹사이트 URL 10개를 추천해주세요:

질문: "${query}"

**요구사항:**
- 최신 정보를 제공하는 신뢰성 있는 웹사이트만 추천
- 한국어 질문이면 한국 사이트 우선 (.kr, 네이버, 다음, 조선일보 등)
- 영어 질문이면 글로벌 사이트 우선
- 다양한 관점의 소스 포함 (뉴스, 공식 문서, 블로그, 위키피디아 등)
- 실시간 정보가 있는 사이트 우선

JSON 배열로만 응답하세요:
["https://example1.com", "https://example2.com", ...]`
      : `Recommend 5 trustworthy website URLs for the following search query:

Query: "${query}"

**Requirements:**
- Only recommend reliable websites with up-to-date information
- Include diverse perspectives (news, official docs, blogs, Wikipedia, etc.)
- For Korean queries, prioritize Korean sites
- For English queries, prioritize global sites

Respond only with a JSON array:
["https://example1.com", "https://example2.com", ...]`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a web search expert. Return only valid JSON arrays of URLs for the latest real-time information.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    })

    const data = await response.json()
    const content = data.choices[0].message.content

    // JSON 파싱
    try {
      const urls = JSON.parse(content)
      if (Array.isArray(urls)) {
        return urls.slice(0, 5)
      }
    } catch (e) {
      console.warn('[WebSearch] JSON 파싱 실패, 텍스트에서 URL 추출 시도')
      // URL 패턴 추출
      const urlPattern = /https?:\/\/[^\s"'\]]+/g
      const extractedUrls = content.match(urlPattern) || []
      return extractedUrls.slice(0, 10)
    }

    return []
  } catch (error) {
    console.error('[WebSearch] URL 생성 오류:', error)
    return []
  }
}

// Fast Research: 빠른 웹 검색 및 요약 (Tavily 우선, 대체 크롤링)
export const performFastResearch = async (query, language = 'ko') => {
  try {
    console.log(`[WebSearch] Fast Research 시작: ${query}`)
    console.log(`[WebSearch] OpenAI API Key 존재: ${!!OPENAI_API_KEY}`)
    console.log(`[WebSearch] Tavily API Key 존재: ${!!TAVILY_API_KEY}`)

    // 1. 검색 쿼리 최적화 (실시간 정보 검색)
    const optimizedQuery = await optimizeSearchQuery(query, language)
    console.log(`[WebSearch] 최적화된 쿼리: ${optimizedQuery}`)

    // 2. Tavily API 우선 시도
    const tavilyResponse = await searchWithTavily(optimizedQuery, 5)

    // Tavily 크레딧 소진 체크
    if (tavilyResponse.reason === 'credits_exhausted') {
      const warningMessage = language === 'ko'
        ? '⚠️ Tavily API 크레딧이 소진되었습니다. 대체 검색 방식을 사용합니다.'
        : '⚠️ Tavily API credits exhausted. Using alternative search method.'
      console.warn('[WebSearch]', warningMessage)

      return {
        query,
        sources: [],
        totalSources: 0,
        mode: 'fast',
        source: 'tavily_failed',
        warning: warningMessage
      }
    }

    if (tavilyResponse.success && tavilyResponse.results && tavilyResponse.results.length > 0) {
      console.log(`[WebSearch] Tavily에서 ${tavilyResponse.results.length}개 결과 가져옴`)

      // Tavily 결과를 소스 형식으로 변환 + GPT 요약
      const sources = await Promise.all(
        tavilyResponse.results.map(async (result) => {
          // GPT-4o로 3줄 요약 생성
          const summary = await summarizeWebPage(result.content, query, language)

          return {
            url: result.url,
            title: result.title,
            extractedText: result.content, // Tavily의 관련 컨텍스트
            summary, // GPT 요약
            success: true
          }
        })
      )

      return {
        query,
        sources,
        totalSources: sources.length,
        mode: 'fast',
        source: 'tavily'
      }
    }

    // 3. Tavily 실패 시 대체 방법: GPT URL 생성 + 크롤링
    const fallbackReason = tavilyResponse.reason || 'unknown'
    console.log(`[WebSearch] Tavily 사용 불가 (이유: ${fallbackReason}), 대체 크롤링 시작`)

    const urls = await generateSearchUrls(optimizedQuery, language)

    if (urls.length === 0) {
      throw new Error('검색 URL을 생성할 수 없습니다.')
    }

    console.log('[WebSearch] 추천 URL:', urls)

    // 4. 각 URL에서 콘텐츠 크롤링 (전체 내용 수집 모드)
    const crawlPromises = urls.slice(0, 5).map(url => fetchWebPageContent(url, query, false))
    const results = await Promise.all(crawlPromises)

    // 5. 성공한 결과만 필터링 + GPT 요약
    const successfulResults = results.filter(r => r.success && (r.extractedText?.length > 100))

    const sources = await Promise.all(
      successfulResults.map(async (result) => {
        const summary = await summarizeWebPage(result.extractedText, query, language)
        return {
          ...result,
          summary
        }
      })
    )

    console.log(`[WebSearch] 크롤링 성공: ${sources.length}/${results.length}`)

    return {
      query,
      sources,
      totalSources: sources.length,
      mode: 'fast',
      source: 'crawl'
    }
  } catch (error) {
    console.error('[WebSearch] Fast Research 오류:', error)
    throw error
  }
}

// Deep Research: 심층 웹 리서치 및 종합 리포트 생성 (Tavily + GPT-4o 요약)
export const performDeepResearch = async (query, language = 'ko', onProgress) => {
  try {
    console.log(`[WebSearch] Deep Research 시작: ${query}`)

    onProgress?.(10, language === 'ko' ? '검색 최적화 중...' : 'Optimizing search...')

    // 1. 검색 쿼리 최적화
    const optimizedQuery = await optimizeSearchQuery(query, language)

    onProgress?.(20, language === 'ko' ? '신뢰할 수 있는 소스 검색 중...' : 'Searching reliable sources...')

    // 2. Tavily API 우선 시도 (더 많은 결과)
    const tavilyResponse = await searchWithTavily(optimizedQuery, 5)

    let sources = []
    let warning = null

    // Tavily 크레딧 소진 체크
    if (tavilyResponse.reason === 'credits_exhausted') {
      warning = language === 'ko'
        ? '⚠️ Tavily API 크레딧이 소진되었습니다. 대체 검색 방식을 사용합니다.'
        : '⚠️ Tavily API credits exhausted. Using alternative search method.'
      console.warn('[WebSearch]', warning)
      onProgress?.(30, warning)
    }

    if (tavilyResponse.success && tavilyResponse.results && tavilyResponse.results.length > 0) {
      console.log(`[WebSearch] Tavily에서 ${tavilyResponse.results.length}개 결과 수집`)

      onProgress?.(40, language === 'ko' ? '핵심 정보 요약 중...' : 'Summarizing key information...')

      // Tavily 결과 요약
      sources = await Promise.all(
        tavilyResponse.results.map(async (result) => {
          const summary = await summarizeWebPage(result.content, query, language)
          return {
            url: result.url,
            title: result.title,
            extractedText: result.content,
            summary,
            success: true
          }
        })
      )
    } else {
      // 대체: URL 생성 + 크롤링
      const fallbackReason = tavilyResponse.reason || 'unknown'
      console.log(`[WebSearch] Tavily 사용 불가 (이유: ${fallbackReason})`)
      onProgress?.(30, language === 'ko' ? 'URL 생성 중...' : 'Generating URLs...')

      const urls = await generateSearchUrls(optimizedQuery, language)

      onProgress?.(40, language === 'ko' ? `${urls.length}개 페이지 크롤링 중...` : `Crawling ${urls.length} pages...`)

      const crawlPromises = urls.slice(0, 5).map(url => fetchWebPageContent(url, query, false))
      const results = await Promise.all(crawlPromises)

      const successfulResults = results.filter(r => r.success && (r.extractedText?.length > 100))

      sources = await Promise.all(
        successfulResults.map(async (result) => {
          const summary = await summarizeWebPage(result.extractedText, query, language)
          return {
            ...result,
            summary
          }
        })
      )
    }

    onProgress?.(60, language === 'ko' ? '종합 리포트 작성 중...' : 'Writing comprehensive report...')

    // 3. GPT-4o로 종합 리포트 생성 (요약된 내용 기반)
    const combinedText = sources
      .map(s => `[출처: ${s.title}]\n**요약:** ${s.summary}\n**상세:** ${s.extractedText?.substring(0, 500)}`)
      .join('\n\n---\n\n')

    const reportPrompt = language === 'ko'
      ? `다음은 "${query}"에 대해 웹에서 수집하고 요약한 정보입니다. 이를 바탕으로 심층 리서치 리포트를 작성해주세요.

**수집된 정보:**
${combinedText.substring(0, 10000)}

**리포트 요구사항:**
1. **1,000자 이상** 상세한 분석
2. 주요 발견사항을 **5-7개 섹션**으로 구조화
3. 각 주장에 **출처 명시** (예: [출처: 사이트명])
4. 객관적이고 균형잡힌 시각 유지
5. **핵심 인사이트**와 **결론** 포함
6. **관련 구절은 굵게** 표시

마크다운 형식으로 작성해주세요.`
      : `The following is information about "${query}" collected and summarized from the web. Please write a comprehensive research report.

**Collected Information:**
${combinedText.substring(0, 10000)}

**Report Requirements:**
1. **1,000+ words** detailed analysis
2. Structure into **5-7 sections**
3. **Cite sources** for each claim (e.g., [Source: Site Name])
4. Maintain objective and balanced perspective
5. Include **key insights** and **conclusions**
6. **Bold** relevant passages

Write in markdown format.`

    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a professional research analyst. Create comprehensive, well-structured reports with proper source attribution.'
          },
          { role: 'user', content: reportPrompt }
        ],
        temperature: 0.5,
        max_tokens: 3000
      })
    }, 90000) // 리포트 생성은 최대 90초

    const data = await response.json()
    const report = data.choices[0].message.content

    onProgress?.(100, language === 'ko' ? '리포트 생성 완료!' : 'Report generated!')

    return {
      query,
      sources,
      report,
      totalSources: sources.length,
      mode: 'deep',
      warning // Tavily 크레딧 소진 경고 포함
    }
  } catch (error) {
    console.error('[WebSearch] Deep Research 오류:', error)
    throw error
  }
}

// 단일 URL 소스 추가
export const addWebSource = async (url) => {
  try {
    console.log(`[WebSearch] 단일 URL 소스 추가: ${url}`)

    const result = await fetchWebPageContent(url)

    if (!result.success) {
      throw new Error(result.error || '웹 페이지를 가져올 수 없습니다.')
    }

    return {
      url: result.url,
      title: result.title,
      extractedText: result.extractedText,
      success: true
    }
  } catch (error) {
    console.error('[WebSearch] URL 소스 추가 오류:', error)
    throw error
  }
}
