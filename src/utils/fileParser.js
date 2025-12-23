// 파일 내용을 파싱하여 구조화된 JSON으로 변환
export const parseFileContent = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const content = e.target.result
      let parsedData = {}

      try {
        if (file.type === 'application/json') {
          // JSON 파일인 경우
          parsedData = JSON.parse(content)
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          // TXT 파일인 경우
          const lines = content.split('\n').filter(line => line.trim())
          parsedData = {
            fileType: 'text',
            fileName: file.name,
            fileSize: file.size,
            encoding: 'utf-8',
            totalLines: lines.length,
            content: content,
            lines: lines,
            metadata: {
              paragraphs: content.split('\n\n').filter(p => p.trim()).length,
              words: content.split(/\s+/).length,
              characters: content.length
            }
          }
        } else if (file.type.includes('pdf')) {
          // PDF 파일 (시뮬레이션)
          parsedData = {
            fileType: 'pdf',
            fileName: file.name,
            fileSize: file.size,
            content: '이 PDF 파일의 내용입니다. 실제 구현에서는 PDF.js 등을 사용하여 파싱합니다.',
            metadata: {
              pages: Math.floor(Math.random() * 50) + 1,
              author: 'Unknown',
              createdDate: new Date().toISOString()
            },
            // 시뮬레이션 데이터
            extractedText: 'PDF 문서 샘플 내용입니다.\n\n이 문서는 AI 기술에 대한 개요를 다룹니다.\n\n주요 내용:\n1. 머신러닝 기초\n2. 딥러닝 아키텍처\n3. 자연어 처리\n4. 컴퓨터 비전\n\n각 섹션은 상세한 설명과 예제를 포함합니다.'
          }
        } else if (file.type.includes('word') || file.name.endsWith('.docx')) {
          // Word 파일 (시뮬레이션)
          parsedData = {
            fileType: 'word',
            fileName: file.name,
            fileSize: file.size,
            content: '이 Word 문서의 내용입니다. 실제 구현에서는 mammoth.js 등을 사용하여 파싱합니다.',
            metadata: {
              author: 'Unknown',
              lastModified: new Date().toISOString(),
              pages: Math.floor(Math.random() * 20) + 1
            },
            extractedText: 'Word 문서 샘플 내용입니다.\n\n프로젝트 제안서\n\n1. 개요\n본 프로젝트는 AI 기반 문서 분석 시스템을 구축하는 것을 목표로 합니다.\n\n2. 목표\n- 자동 문서 분류\n- 핵심 정보 추출\n- 질의응답 시스템\n\n3. 일정\n- 1단계: 요구사항 분석 (2주)\n- 2단계: 설계 및 개발 (8주)\n- 3단계: 테스트 및 배포 (2주)'
          }
        } else if (file.type.includes('sheet') || file.type.includes('excel')) {
          // Excel 파일 (시뮬레이션)
          parsedData = {
            fileType: 'excel',
            fileName: file.name,
            fileSize: file.size,
            metadata: {
              sheets: ['Sheet1', 'Sheet2'],
              totalRows: Math.floor(Math.random() * 1000) + 10,
              totalColumns: Math.floor(Math.random() * 20) + 5
            },
            // 시뮬레이션 데이터
            sheets: {
              'Sheet1': {
                name: 'Sheet1',
                data: [
                  { 'ID': 1, '이름': '홍길동', '부서': '개발팀', '직급': '대리', '연봉': 45000000 },
                  { 'ID': 2, '이름': '김철수', '부서': '마케팅팀', '직급': '과장', '연봉': 55000000 },
                  { 'ID': 3, '이름': '이영희', '부서': '개발팀', '직급': '차장', '연봉': 65000000 },
                  { 'ID': 4, '이름': '박민수', '부서': '인사팀', '직급': '대리', '연봉': 48000000 },
                  { 'ID': 5, '이름': '정수진', '부서': '개발팀', '직급': '사원', '연봉': 38000000 }
                ],
                summary: {
                  totalRows: 5,
                  columns: ['ID', '이름', '부서', '직급', '연봉'],
                  averageSalary: 50200000
                }
              }
            },
            extractedText: '직원 정보 데이터:\n총 5명의 직원 데이터\n평균 연봉: 50,200,000원\n부서: 개발팀, 마케팅팀, 인사팀'
          }
        } else {
          // 기타 파일
          parsedData = {
            fileType: 'unknown',
            fileName: file.name,
            fileSize: file.size,
            content: '지원하지 않는 파일 형식입니다.',
            rawContent: content.substring(0, 1000) // 처음 1000자만
          }
        }

        // 공통 메타데이터 추가
        parsedData.uploadedAt = new Date().toISOString()
        parsedData.fileInfo = {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: new Date(file.lastModified).toISOString()
        }

        resolve(parsedData)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = (error) => reject(error)

    // 파일 타입에 따라 읽기 방식 결정
    if (file.type === 'application/json' || file.type === 'text/plain' || file.name.endsWith('.txt')) {
      reader.readAsText(file)
    } else {
      reader.readAsText(file) // 시뮬레이션을 위해 텍스트로 읽기
    }
  })
}

// 파일 크기 포맷팅
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// JSON 데이터에서 텍스트 추출 (RAG용)
export const extractTextFromParsedData = (parsedData) => {
  if (!parsedData) return ''

  let text = ''

  // 파일 기본 정보
  text += `파일명: ${parsedData.fileName || parsedData.fileInfo?.name}\n`
  text += `파일 타입: ${parsedData.fileType}\n\n`

  // 내용 추출
  if (parsedData.content) {
    text += parsedData.content + '\n\n'
  }

  if (parsedData.extractedText) {
    text += parsedData.extractedText + '\n\n'
  }

  // 줄 단위 내용 (TXT)
  if (parsedData.lines && Array.isArray(parsedData.lines)) {
    text += parsedData.lines.join('\n') + '\n\n'
  }

  // Excel 데이터
  if (parsedData.sheets) {
    Object.values(parsedData.sheets).forEach(sheet => {
      if (sheet.data && Array.isArray(sheet.data)) {
        text += `[${sheet.name}]\n`
        sheet.data.forEach(row => {
          text += JSON.stringify(row) + '\n'
        })
        text += '\n'
      }
    })
  }

  // 메타데이터
  if (parsedData.metadata) {
    text += `메타데이터: ${JSON.stringify(parsedData.metadata, null, 2)}\n`
  }

  return text
}
