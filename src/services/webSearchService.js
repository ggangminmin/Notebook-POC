// 웹 검색 및 크롤링 서비스
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const TAVILY_API_KEY = import.meta.env.VITE_TAVILY_API_KEY // 선택사항

// 웹 페이지 텍스트 추출 (CORS 우회용 프록시 사용)
const fetchWebPageContent = async (url) => {
  try {
    console.log(`[WebSearch] 웹 페이지 크롤링 시작: ${url}`)

    // CORS 우회를 위한 프록시 서버 사용 (무료 대안)
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`

    const response = await fetch(proxyUrl)
    const data = await response.json()

    if (!data.contents) {
      throw new Error('웹 페이지 내용을 가져올 수 없습니다.')
    }

    // HTML에서 텍스트 추출
    const parser = new DOMParser()
    const doc = parser.parseFromString(data.contents, 'text/html')

    // 스크립트, 스타일 태그 제거
    const scripts = doc.querySelectorAll('script, style, nav, footer, header')
    scripts.forEach(el => el.remove())

    // 본문 텍스트 추출
    const bodyText = doc.body?.innerText || doc.body?.textContent || ''

    // 불필요한 공백 제거
    const cleanedText = bodyText
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim()

    console.log(`[WebSearch] 추출된 텍스트 길이: ${cleanedText.length}자`)

    return {
      url,
      text: cleanedText.substring(0, 10000), // 최대 10,000자
      title: doc.title || url,
      success: true
    }
  } catch (error) {
    console.error('[WebSearch] 크롤링 오류:', error)
    return {
      url,
      text: '',
      title: url,
      success: false,
      error: error.message
    }
  }
}

// Tavily API를 사용한 웹 검색 (선택사항)
const searchWithTavily = async (query, maxResults = 5) => {
  if (!TAVILY_API_KEY) {
    console.warn('[WebSearch] Tavily API 키가 없습니다. 대체 검색 사용')
    return null
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        max_results: maxResults,
        include_raw_content: true
      })
    })

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('[WebSearch] Tavily API 오류:', error)
    return null
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

// Fast Research: 빠른 웹 검색 및 요약 (10개 소스)
export const performFastResearch = async (query, language = 'ko') => {
  try {
    console.log(`[WebSearch] Fast Research 시작: ${query}`)

    // 1. 검색 쿼리 최적화 (실시간 정보 검색)
    const optimizedQuery = await optimizeSearchQuery(query, language)

    // 2. GPT로 추천 URL 생성 (10개)
    const urls = await generateSearchUrls(optimizedQuery, language)

    if (urls.length === 0) {
      throw new Error('검색 URL을 생성할 수 없습니다.')
    }

    console.log('[WebSearch] 추천 URL:', urls)

    // 3. 각 URL에서 콘텐츠 크롤링 (병렬 처리) - 최대 10개
    const crawlPromises = urls.slice(0, 10).map(url => fetchWebPageContent(url))
    const results = await Promise.all(crawlPromises)

    // 4. 성공한 결과만 필터링 (최소 100자 이상)
    const successfulResults = results.filter(r => r.success && r.text.length > 100)

    console.log(`[WebSearch] 크롤링 성공: ${successfulResults.length}/${results.length}`)

    // 최소 5개 이상의 결과가 없으면 경고
    if (successfulResults.length < 5) {
      console.warn('[WebSearch] 크롤링 성공 결과가 5개 미만입니다.')
    }

    return {
      query,
      sources: successfulResults,
      totalSources: successfulResults.length,
      mode: 'fast'
    }
  } catch (error) {
    console.error('[WebSearch] Fast Research 오류:', error)
    throw error
  }
}

// Deep Research: 심층 웹 리서치 및 종합 리포트 생성
export const performDeepResearch = async (query, language = 'ko', onProgress) => {
  try {
    console.log(`[WebSearch] Deep Research 시작: ${query}`)

    // 진행률 업데이트
    onProgress?.(10, language === 'ko' ? '검색 URL 생성 중...' : 'Generating search URLs...')

    // 1. GPT로 추천 URL 생성 (더 많은 소스)
    const urls = await generateSearchUrls(query, language)

    if (urls.length === 0) {
      throw new Error('검색 URL을 생성할 수 없습니다.')
    }

    onProgress?.(30, language === 'ko' ? `${urls.length}개의 웹 페이지 크롤링 중...` : `Crawling ${urls.length} web pages...`)

    // 2. 모든 URL 크롤링 (최대 5개)
    const crawlPromises = urls.slice(0, 5).map(url => fetchWebPageContent(url))
    const results = await Promise.all(crawlPromises)

    const successfulResults = results.filter(r => r.success && r.text.length > 100)

    onProgress?.(60, language === 'ko' ? '수집한 정보 분석 중...' : 'Analyzing collected information...')

    // 3. GPT로 종합 리포트 생성
    const combinedText = successfulResults
      .map(r => `[출처: ${r.title}]\n${r.text}`)
      .join('\n\n---\n\n')

    const reportPrompt = language === 'ko'
      ? `다음은 웹에서 수집한 "${query}"에 대한 정보입니다. 이를 바탕으로 포괄적인 리서치 리포트를 작성해주세요.

**수집된 정보:**
${combinedText.substring(0, 8000)}

**리포트 요구사항:**
1. 1,000자 이상의 상세한 브리핑
2. 주요 발견사항을 5-7개의 섹션으로 구조화
3. 각 정보의 출처를 명시
4. 객관적이고 균형잡힌 시각
5. 핵심 인사이트와 결론 포함

마크다운 형식으로 작성해주세요.`
      : `The following is information about "${query}" collected from the web. Please write a comprehensive research report based on this.

**Collected Information:**
${combinedText.substring(0, 8000)}

**Report Requirements:**
1. Detailed briefing of 1,000+ words
2. Structure key findings into 5-7 sections
3. Cite sources for each piece of information
4. Objective and balanced perspective
5. Include key insights and conclusions

Write in markdown format.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Deep Research는 강력한 모델 사용
        messages: [
          {
            role: 'system',
            content: 'You are a professional research analyst. Create comprehensive, well-structured reports.'
          },
          { role: 'user', content: reportPrompt }
        ],
        temperature: 0.5,
        max_tokens: 3000
      })
    })

    const data = await response.json()
    const report = data.choices[0].message.content

    onProgress?.(100, language === 'ko' ? '리포트 생성 완료!' : 'Report generated!')

    return {
      query,
      sources: successfulResults,
      report,
      totalSources: successfulResults.length,
      mode: 'deep'
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
      text: result.text,
      success: true
    }
  } catch (error) {
    console.error('[WebSearch] URL 소스 추가 오류:', error)
    throw error
  }
}
