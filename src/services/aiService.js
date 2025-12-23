import { extractTextFromParsedData } from '../utils/fileParser'

// 언어 감지 (간단한 휴리스틱)
export const detectLanguage = (text) => {
  // 한글이 포함되어 있으면 한국어
  const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/
  return koreanRegex.test(text) ? 'ko' : 'en'
}

// 엄격한 RAG 기반 응답 생성 (시뮬레이션)
export const generateStrictRAGResponse = async (query, documentContext, language = 'ko') => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 문서가 없는 경우
      if (!documentContext || !documentContext.parsedData) {
        const noDocMessage = language === 'ko'
          ? '현재 선택된 문서가 없습니다. 좌측에서 문서를 선택해주세요.'
          : 'No document is currently selected. Please select a document from the left.'

        resolve({
          answer: noDocMessage,
          source: null,
          foundInDocument: false
        })
        return
      }

      // 문서 내용 추출
      const documentText = extractTextFromParsedData(documentContext.parsedData)
      const documentLower = documentText.toLowerCase()
      const queryLower = query.toLowerCase()

      // 키워드 기반 검색 (간단한 시뮬레이션)
      const keywords = queryLower.split(' ').filter(w => w.length > 1)
      const foundKeywords = keywords.filter(keyword =>
        documentLower.includes(keyword) ||
        documentLower.includes(keyword.replace(/[?.!]/g, ''))
      )

      // 문서에서 관련 내용을 찾지 못한 경우
      if (foundKeywords.length === 0) {
        const notFoundMessage = language === 'ko'
          ? `죄송합니다. 선택하신 문서 "${documentContext.fileName}"에서 관련 내용을 찾을 수 없습니다. 문서에 포함된 정보에 대해서만 답변드릴 수 있습니다.

문서에는 다음과 같은 내용이 포함되어 있습니다:
${getDocumentSummary(documentContext.parsedData, language)}`
          : `Sorry, I could not find relevant information in the selected document "${documentContext.fileName}". I can only answer based on the information contained in the document.

The document contains the following information:
${getDocumentSummary(documentContext.parsedData, language)}`

        resolve({
          answer: notFoundMessage,
          source: documentContext.fileName,
          foundInDocument: false
        })
        return
      }

      // 문서에서 관련 내용을 찾은 경우 - 실제로는 여기서 벡터 검색이나 의미론적 검색을 수행
      const response = generateContextualAnswer(query, documentContext, foundKeywords, language)

      resolve({
        answer: response,
        source: documentContext.fileName,
        foundInDocument: true,
        matchedKeywords: foundKeywords
      })
    }, 1500) // 시뮬레이션 지연
  })
}

// 문서 요약 생성
const getDocumentSummary = (parsedData, language) => {
  if (!parsedData) return ''

  let summary = ''

  if (parsedData.fileType === 'text') {
    summary = language === 'ko'
      ? `- 총 ${parsedData.totalLines}줄의 텍스트
- ${parsedData.metadata?.words || 0}개의 단어
- ${parsedData.metadata?.paragraphs || 0}개의 문단`
      : `- Total ${parsedData.totalLines} lines of text
- ${parsedData.metadata?.words || 0} words
- ${parsedData.metadata?.paragraphs || 0} paragraphs`
  } else if (parsedData.fileType === 'pdf') {
    summary = language === 'ko'
      ? `- PDF 문서, ${parsedData.metadata?.pages || 0}페이지
- 주제: AI 기술 개요
- 주요 섹션: 머신러닝, 딥러닝, NLP, 컴퓨터 비전`
      : `- PDF document, ${parsedData.metadata?.pages || 0} pages
- Topic: AI Technology Overview
- Main sections: Machine Learning, Deep Learning, NLP, Computer Vision`
  } else if (parsedData.fileType === 'word') {
    summary = language === 'ko'
      ? `- Word 문서, ${parsedData.metadata?.pages || 0}페이지
- 문서 유형: 프로젝트 제안서
- 주요 내용: 개요, 목표, 일정`
      : `- Word document, ${parsedData.metadata?.pages || 0} pages
- Document type: Project Proposal
- Main content: Overview, Goals, Schedule`
  } else if (parsedData.fileType === 'excel') {
    summary = language === 'ko'
      ? `- Excel 파일
- ${parsedData.sheets ? Object.keys(parsedData.sheets).length : 0}개의 시트
- 직원 정보 데이터 (${parsedData.sheets?.Sheet1?.data?.length || 0}명)`
      : `- Excel file
- ${parsedData.sheets ? Object.keys(parsedData.sheets).length : 0} sheets
- Employee data (${parsedData.sheets?.Sheet1?.data?.length || 0} people)`
  }

  return summary
}

// 컨텍스트 기반 답변 생성
const generateContextualAnswer = (query, documentContext, foundKeywords, language) => {
  const { parsedData, fileName } = documentContext

  // 파일 타입별 답변 생성
  if (parsedData.fileType === 'excel') {
    return generateExcelAnswer(query, parsedData, language)
  } else if (parsedData.fileType === 'pdf') {
    return generatePDFAnswer(query, parsedData, language)
  } else if (parsedData.fileType === 'word') {
    return generateWordAnswer(query, parsedData, language)
  } else if (parsedData.fileType === 'text') {
    return generateTextAnswer(query, parsedData, language)
  }

  return language === 'ko'
    ? `"${fileName}" 문서에서 귀하의 질문과 관련된 내용을 찾았습니다. 일치하는 키워드: ${foundKeywords.join(', ')}`
    : `Found relevant content in "${fileName}" for your question. Matched keywords: ${foundKeywords.join(', ')}`
}

// Excel 데이터 기반 답변
const generateExcelAnswer = (query, parsedData, language) => {
  const sheet = parsedData.sheets?.Sheet1
  if (!sheet || !sheet.data) return ''

  const queryLower = query.toLowerCase()

  // 직원 수 질문
  if (queryLower.includes('몇') || queryLower.includes('how many') || queryLower.includes('count')) {
    return language === 'ko'
      ? `문서에 따르면, 총 ${sheet.data.length}명의 직원 정보가 기록되어 있습니다.`
      : `According to the document, there are ${sheet.data.length} employees recorded.`
  }

  // 평균 연봉
  if (queryLower.includes('평균') || queryLower.includes('average') || queryLower.includes('연봉') || queryLower.includes('salary')) {
    return language === 'ko'
      ? `문서의 직원 데이터에 따르면, 평균 연봉은 ${sheet.summary?.averageSalary?.toLocaleString()}원입니다.

직원별 연봉 정보:
${sheet.data.map(emp => `- ${emp.이름} (${emp.직급}): ${emp.연봉?.toLocaleString()}원`).join('\n')}`
      : `According to the employee data in the document, the average salary is ${sheet.summary?.averageSalary?.toLocaleString()} KRW.

Salary by employee:
${sheet.data.map(emp => `- ${emp.이름} (${emp.직급}): ${emp.연봉?.toLocaleString()} KRW`).join('\n')}`
  }

  // 부서 정보
  if (queryLower.includes('부서') || queryLower.includes('department') || queryLower.includes('팀')) {
    const deptCount = {}
    sheet.data.forEach(emp => {
      deptCount[emp.부서] = (deptCount[emp.부서] || 0) + 1
    })

    return language === 'ko'
      ? `문서에 기록된 부서별 인원은 다음과 같습니다:
${Object.entries(deptCount).map(([dept, count]) => `- ${dept}: ${count}명`).join('\n')}`
      : `Employees by department according to the document:
${Object.entries(deptCount).map(([dept, count]) => `- ${dept}: ${count} people`).join('\n')}`
  }

  // 기본 답변
  return language === 'ko'
    ? `문서에는 ${sheet.data.length}명의 직원 정보가 포함되어 있습니다. 부서, 직급, 연봉 등의 정보가 기록되어 있습니다.`
    : `The document contains information about ${sheet.data.length} employees, including department, position, and salary.`
}

// PDF 답변 생성
const generatePDFAnswer = (query, parsedData, language) => {
  const queryLower = query.toLowerCase()

  if (queryLower.includes('주제') || queryLower.includes('topic') || queryLower.includes('about')) {
    return language === 'ko'
      ? `이 PDF 문서는 AI 기술에 대한 개요를 다룹니다. 총 ${parsedData.metadata?.pages}페이지로 구성되어 있습니다.

주요 내용:
1. 머신러닝 기초
2. 딥러닝 아키텍처
3. 자연어 처리
4. 컴퓨터 비전

각 섹션은 상세한 설명과 예제를 포함합니다.`
      : `This PDF document covers an overview of AI technology. It consists of ${parsedData.metadata?.pages} pages.

Main content:
1. Machine Learning Basics
2. Deep Learning Architecture
3. Natural Language Processing
4. Computer Vision

Each section includes detailed explanations and examples.`
  }

  return language === 'ko'
    ? `문서에서 관련 내용을 찾았습니다. 이 PDF는 AI 기술(머신러닝, 딥러닝, NLP, 컴퓨터 비전)에 대해 설명하고 있습니다.`
    : `Found relevant content in the document. This PDF explains AI technology (Machine Learning, Deep Learning, NLP, Computer Vision).`
}

// Word 답변 생성
const generateWordAnswer = (query, parsedData, language) => {
  const queryLower = query.toLowerCase()

  if (queryLower.includes('프로젝트') || queryLower.includes('project')) {
    return language === 'ko'
      ? `이 문서는 AI 기반 문서 분석 시스템 구축 프로젝트 제안서입니다.

주요 목표:
- 자동 문서 분류
- 핵심 정보 추출
- 질의응답 시스템

프로젝트 일정:
- 1단계: 요구사항 분석 (2주)
- 2단계: 설계 및 개발 (8주)
- 3단계: 테스트 및 배포 (2주)`
      : `This document is a project proposal for building an AI-based document analysis system.

Main goals:
- Automatic document classification
- Key information extraction
- Q&A system

Project schedule:
- Phase 1: Requirements analysis (2 weeks)
- Phase 2: Design and development (8 weeks)
- Phase 3: Testing and deployment (2 weeks)`
  }

  return language === 'ko'
    ? `문서에서 관련 내용을 찾았습니다. 이 제안서는 AI 기반 문서 분석 시스템의 목표와 일정을 설명합니다.`
    : `Found relevant content in the document. This proposal explains the goals and schedule of an AI-based document analysis system.`
}

// Text 답변 생성
const generateTextAnswer = (query, parsedData, language) => {
  // 실제 내용에서 관련 부분 추출
  const lines = parsedData.lines || []
  const queryLower = query.toLowerCase()
  const relevantLines = lines.filter(line =>
    queryLower.split(' ').some(keyword =>
      line.toLowerCase().includes(keyword)
    )
  )

  if (relevantLines.length > 0) {
    return language === 'ko'
      ? `문서에서 다음 내용을 찾았습니다:

${relevantLines.slice(0, 5).join('\n')}

${relevantLines.length > 5 ? `(${relevantLines.length - 5}개의 추가 관련 내용이 있습니다)` : ''}`
      : `Found the following content in the document:

${relevantLines.slice(0, 5).join('\n')}

${relevantLines.length > 5 ? `(${relevantLines.length - 5} more relevant lines found)` : ''}`
  }

  return language === 'ko'
    ? `문서는 총 ${parsedData.totalLines}줄로 구성되어 있으며, ${parsedData.metadata?.words}개의 단어를 포함합니다.`
    : `The document consists of ${parsedData.totalLines} lines and contains ${parsedData.metadata?.words} words.`
}
