import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

// PDF.js worker 설정 - 로컬 워커 사용
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// PDF 페이지를 이미지로 변환 (썸네일용 - 회전 정보 정규화 + 고해상도)
const renderPDFPageToImage = async (page, scale = 0.6) => {
  try {
    // PDF 페이지의 회전 정보를 무시하고 항상 0도로 고정 (정방향)
    const viewport = page.getViewport({ scale, rotation: 0 })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    // 고해상도 렌더링을 위한 픽셀 밀도 조정 (3.0배로 매우 선명하게)
    const outputScale = 3.0
    canvas.width = Math.floor(viewport.width * outputScale)
    canvas.height = Math.floor(viewport.height * outputScale)

    // 컨텍스트 초기화 및 배경 흰색으로 설정
    context.fillStyle = 'white'
    context.fillRect(0, 0, canvas.width, canvas.height)

    // Identity Matrix로 좌표계 완전 리셋 (반전 방지 - 전역 적용)
    context.setTransform(outputScale, 0, 0, outputScale, 0, 0)

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise

    // Canvas를 Base64 이미지로 변환 (최고 품질)
    return canvas.toDataURL('image/png', 1.0)
  } catch (error) {
    console.error('[PDF 이미지 변환] 오류:', error)
    return null
  }
}

// Word 파일에서 텍스트 추출
const extractWordText = async (file) => {
  try {
    console.log('[Word 추출] 시작:', file.name, 'Size:', file.size)
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    const text = result.value

    // Word 파일을 페이지 단위로 나누기 (500단어당 1페이지로 가정)
    const wordsPerPage = 500
    const words = text.split(/\s+/)
    const totalPages = Math.max(1, Math.ceil(words.length / wordsPerPage))
    const pageTexts = []

    for (let i = 0; i < totalPages; i++) {
      const startIdx = i * wordsPerPage
      const endIdx = Math.min((i + 1) * wordsPerPage, words.length)
      const pageContent = words.slice(startIdx, endIdx).join(' ')

      pageTexts.push({
        pageNumber: i + 1,
        text: pageContent,
        wordCount: endIdx - startIdx,
        thumbnail: null // Word 파일은 썸네일 없음
      })
    }

    console.log('[Word 추출] 완료 - 총 길이:', text.length, '페이지:', totalPages)

    return {
      text: text,
      pageCount: totalPages,
      pageTexts: pageTexts,
      pageImages: []
    }
  } catch (error) {
    console.error('[Word 추출] 오류:', error)
    throw new Error('Word 파일을 읽을 수 없습니다.')
  }
}

// Excel 파일에서 텍스트 추출
const extractExcelText = async (file) => {
  try {
    console.log('[Excel 추출] 시작:', file.name, 'Size:', file.size)
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    let fullText = ''
    const sheets = {}
    const pageTexts = []
    let pageNumber = 1

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

      // 시트 데이터를 텍스트로 변환
      let sheetText = `[시트: ${sheetName}]\n\n`

      jsonData.forEach((row, rowIndex) => {
        if (row.some(cell => cell !== '')) { // 빈 행 제외
          const rowText = row.map((cell, colIndex) => {
            return cell !== '' ? `${cell}` : ''
          }).filter(cell => cell !== '').join(' | ')

          if (rowText) {
            sheetText += rowText + '\n'
          }
        }
      })

      fullText += sheetText + '\n\n'

      // 시트별 페이지 생성 (각 시트를 별도 페이지로)
      pageTexts.push({
        pageNumber: pageNumber++,
        text: sheetText,
        wordCount: sheetText.split(/\s+/).length,
        thumbnail: null,
        sheetName: sheetName
      })

      sheets[sheetName] = {
        name: sheetName,
        data: jsonData,
        rowCount: jsonData.length,
        columnCount: jsonData[0]?.length || 0
      }
    })

    console.log('[Excel 추출] 완료 - 총 시트:', workbook.SheetNames.length)

    return {
      text: fullText,
      pageCount: workbook.SheetNames.length,
      pageTexts: pageTexts,
      pageImages: [],
      sheets: sheets,
      sheetNames: workbook.SheetNames
    }
  } catch (error) {
    console.error('[Excel 추출] 오류:', error)
    throw new Error('Excel 파일을 읽을 수 없습니다.')
  }
}

// PDF 파일에서 텍스트 추출 (페이지별 메타데이터 + 이미지 포함)
const extractPDFText = async (file) => {
  try {
    console.log('[PDF 추출] 시작:', file.name, 'Size:', file.size)
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ''
    const pageTexts = [] // 페이지별 텍스트 + 이미지 저장
    const pageImages = [] // 페이지별 썸네일 이미지

    console.log('[PDF 추출] PDF 로드 성공, 총 페이지:', pdf.numPages)

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()

      // 디버깅: 첫 번째 페이지의 첫 5개 아이템 출력
      if (i === 1) {
        console.log('[PDF 추출] 첫 페이지 텍스트 아이템 샘플:',
          textContent.items.slice(0, 5).map(item => ({
            str: item.str,
            length: item.str.length,
            charCodes: Array.from(item.str).map(c => c.charCodeAt(0))
          }))
        )
      }

      // 각 텍스트 아이템을 공백으로 연결
      const pageText = textContent.items
        .map(item => item.str)
        .filter(str => str.trim().length > 0) // 빈 문자열 제거
        .join(' ')

      // 페이지를 이미지로 렌더링 (고해상도 썸네일용 - 스케일 증가)
      const thumbnail = await renderPDFPageToImage(page, 0.6) // 고해상도 썸네일

      // 페이지별 데이터 저장
      pageTexts.push({
        pageNumber: i,
        text: pageText,
        wordCount: pageText.split(/\s+/).length,
        thumbnail: thumbnail // 썸네일 이미지 (Base64)
      })

      pageImages.push({
        pageNumber: i,
        thumbnail: thumbnail
      })

      fullText += pageText + '\n\n'

      if (i === 1) {
        console.log('[PDF 추출] 첫 페이지 추출 결과 (첫 200자):', pageText.substring(0, 200))
        console.log('[PDF 추출] 썸네일 생성:', thumbnail ? '성공' : '실패')
      }
    }

    const finalText = fullText.trim()
    console.log('[PDF 추출] 완료 - 총 길이:', finalText.length, '썸네일 개수:', pageImages.length)

    return {
      text: finalText,
      pageCount: pdf.numPages,
      pageTexts: pageTexts, // 페이지별 텍스트 + 썸네일 배열
      pageImages: pageImages // 페이지별 썸네일만 별도 저장
    }
  } catch (error) {
    console.error('[PDF 추출] 오류:', error)
    throw new Error('PDF 파일을 읽을 수 없습니다.')
  }
}

// 파일 내용을 파싱하여 구조화된 JSON으로 변환
export const parseFileContent = async (file) => {
  return new Promise(async (resolve, reject) => {
    try {
      let parsedData = {}

      if (file.type === 'application/json') {
        // JSON 파일인 경우
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            parsedData = JSON.parse(e.target.result)
            resolve(parsedData)
          } catch (error) {
            reject(new Error('JSON 파일 파싱 실패'))
          }
        }
        reader.onerror = () => reject(new Error('파일 읽기 실패'))
        reader.readAsText(file)
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        // TXT 파일인 경우 - 실제 내용 읽기 + 페이지 구조 추가
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target.result
          const lines = content.split('\n').filter(line => line.trim())

          // TXT 파일을 페이지 단위로 나누기 (500단어당 1페이지로 가정)
          const wordsPerPage = 500
          const words = content.split(/\s+/)
          const totalPages = Math.max(1, Math.ceil(words.length / wordsPerPage))
          const pageTexts = []

          for (let i = 0; i < totalPages; i++) {
            const startIdx = i * wordsPerPage
            const endIdx = Math.min((i + 1) * wordsPerPage, words.length)
            const pageContent = words.slice(startIdx, endIdx).join(' ')

            pageTexts.push({
              pageNumber: i + 1,
              text: pageContent,
              wordCount: endIdx - startIdx,
              thumbnail: null // TXT 파일은 썸네일 없음
            })
          }

          parsedData = {
            fileType: 'text',
            fileName: file.name,
            fileSize: file.size,
            encoding: 'utf-8',
            totalLines: lines.length,
            pageCount: totalPages,
            content: content,
            lines: lines,
            extractedText: content, // 실제 파일 내용
            pageTexts: pageTexts, // 페이지별 텍스트 구조 추가
            metadata: {
              paragraphs: content.split('\n\n').filter(p => p.trim()).length,
              words: content.split(/\s+/).length,
              characters: content.length
            }
          }
          resolve(parsedData)
        }
        reader.onerror = () => reject(new Error('파일 읽기 실패'))
        reader.readAsText(file)
      } else if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
        // PDF 파일 - 실제 내용 추출
        console.log('[파일 파싱] PDF 파일 감지:', file.name)
        const pdfData = await extractPDFText(file)

        console.log('[파일 파싱] PDF 추출 완료 - 텍스트 길이:', pdfData.text.length)
        console.log('[파일 파싱] extractedText 첫 300자:', pdfData.text.substring(0, 300))

        parsedData = {
          fileType: 'pdf',
          fileName: file.name,
          fileSize: file.size,
          content: pdfData.text.substring(0, 500) + '...', // 미리보기용
          extractedText: pdfData.text, // 실제 전체 내용
          pageTexts: pdfData.pageTexts, // 페이지별 텍스트 + 썸네일 배열
          pageImages: pdfData.pageImages, // 페이지별 썸네일만 별도 저장
          pageCount: pdfData.pageCount, // 전체 페이지 수
          metadata: {
            pages: pdfData.pageCount,
            author: 'Unknown',
            createdDate: new Date().toISOString()
          }
        }

        console.log('[파일 파싱] parsedData 생성 완료:', {
          fileType: parsedData.fileType,
          fileName: parsedData.fileName,
          extractedTextLength: parsedData.extractedText.length,
          pageTextsCount: parsedData.pageTexts.length,
          pageImagesCount: parsedData.pageImages?.length || 0,
          extractedTextPreview: parsedData.extractedText.substring(0, 100)
        })

        resolve(parsedData)
      } else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        // Word 파일 - 실제 내용 추출
        console.log('[파일 파싱] Word 파일 감지:', file.name)
        const wordData = await extractWordText(file)

        console.log('[파일 파싱] Word 추출 완료 - 텍스트 길이:', wordData.text.length)

        parsedData = {
          fileType: 'word',
          fileName: file.name,
          fileSize: file.size,
          content: wordData.text.substring(0, 500) + '...', // 미리보기용
          extractedText: wordData.text, // 실제 전체 내용
          pageTexts: wordData.pageTexts, // 페이지별 텍스트
          pageImages: wordData.pageImages,
          pageCount: wordData.pageCount, // 전체 페이지 수
          metadata: {
            pages: wordData.pageCount,
            author: 'Unknown',
            lastModified: new Date().toISOString()
          }
        }

        console.log('[파일 파싱] Word parsedData 생성 완료:', {
          fileType: parsedData.fileType,
          fileName: parsedData.fileName,
          extractedTextLength: parsedData.extractedText.length,
          pageTextsCount: parsedData.pageTexts.length
        })

        resolve(parsedData)
      } else if (file.type.includes('sheet') || file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Excel 파일 - 실제 내용 추출
        console.log('[파일 파싱] Excel 파일 감지:', file.name)
        const excelData = await extractExcelText(file)

        console.log('[파일 파싱] Excel 추출 완료 - 텍스트 길이:', excelData.text.length)

        parsedData = {
          fileType: 'excel',
          fileName: file.name,
          fileSize: file.size,
          content: excelData.text.substring(0, 500) + '...', // 미리보기용
          extractedText: excelData.text, // 실제 전체 내용
          pageTexts: excelData.pageTexts, // 시트별 텍스트 (페이지로 취급)
          pageImages: excelData.pageImages,
          pageCount: excelData.pageCount, // 전체 시트 수
          sheets: excelData.sheets, // 시트별 원본 데이터
          sheetNames: excelData.sheetNames,
          metadata: {
            sheets: excelData.sheetNames,
            totalSheets: excelData.pageCount,
            totalRows: Object.values(excelData.sheets).reduce((sum, sheet) => sum + sheet.rowCount, 0),
            totalColumns: Math.max(...Object.values(excelData.sheets).map(sheet => sheet.columnCount), 0)
          }
        }

        console.log('[파일 파싱] Excel parsedData 생성 완료:', {
          fileType: parsedData.fileType,
          fileName: parsedData.fileName,
          extractedTextLength: parsedData.extractedText.length,
          sheetsCount: parsedData.sheetNames.length
        })

        resolve(parsedData)
      } else {
        // 기타 파일 - 지원하지 않음
        parsedData = {
          fileType: 'unknown',
          fileName: file.name,
          fileSize: file.size,
          content: '지원하지 않는 파일 형식입니다.',
          extractedText: `이 파일(${file.name})은 현재 지원하지 않는 형식입니다.\n\n지원 형식: PDF, TXT, JSON\n\nWord나 Excel 파일은 PDF 또는 TXT로 변환하여 업로드해주세요.`
        }
        resolve(parsedData)
      }
    } catch (error) {
      console.error('파일 파싱 오류:', error)
      reject(error)
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

// 웹 URL에서 메타데이터 추출
export const fetchWebMetadata = async (url) => {
  try {
    // URL 유효성 검사
    const urlObj = new URL(url)

    // CORS 프록시를 사용하거나 백엔드 API를 통해 메타데이터를 가져와야 함
    // 현재는 시뮬레이션 데이터를 반환

    // 실제 구현 시: fetch를 통해 HTML을 가져온 후 메타 태그 파싱
    // const response = await fetch(url)
    // const html = await response.text()
    // const parser = new DOMParser()
    // const doc = parser.parseFromString(html, 'text/html')

    // 시뮬레이션 데이터 생성
    const metadata = {
      fileType: 'web',
      url: url,
      domain: urlObj.hostname,
      protocol: urlObj.protocol,
      fetchedAt: new Date().toISOString(),
      metadata: {
        title: `${urlObj.hostname}의 웹페이지`,
        description: '이 웹페이지는 다양한 정보를 포함하고 있습니다. 실제 구현에서는 메타 태그에서 추출됩니다.',
        author: 'Unknown',
        keywords: ['AI', '기술', '문서', '분석'],
        language: 'ko',
        publishedDate: new Date().toISOString()
      },
      content: {
        headings: [
          'AI 기반 문서 분석 시스템',
          '주요 기능',
          '기술 스택',
          '사용 방법'
        ],
        paragraphs: [
          '본 시스템은 첨단 AI 기술을 활용하여 문서를 자동으로 분석하고 이해합니다.',
          '사용자가 업로드한 문서나 웹 페이지의 내용을 파싱하여 구조화된 데이터로 변환합니다.',
          '자연어 처리 기술을 통해 문서의 핵심 내용을 추출하고 질의응답을 지원합니다.',
          '다양한 파일 형식(PDF, Word, Excel, TXT, JSON)을 지원하며, 웹 URL로부터 직접 정보를 가져올 수 있습니다.'
        ],
        links: [
          { text: 'GitHub', url: 'https://github.com' },
          { text: 'Documentation', url: `${url}/docs` },
          { text: 'API Reference', url: `${url}/api` }
        ]
      },
      extractedText: `웹페이지 제목: ${urlObj.hostname}의 웹페이지\n\nURL: ${url}\n\n주요 내용:\n\nAI 기반 문서 분석 시스템\n본 시스템은 첨단 AI 기술을 활용하여 문서를 자동으로 분석하고 이해합니다.\n\n주요 기능\n사용자가 업로드한 문서나 웹 페이지의 내용을 파싱하여 구조화된 데이터로 변환합니다.\n자연어 처리 기술을 통해 문서의 핵심 내용을 추출하고 질의응답을 지원합니다.\n\n기술 스택\n- React 18\n- Vite\n- Tailwind CSS\n- 자연어 처리 AI\n\n사용 방법\n1. 파일을 업로드하거나 웹 URL을 입력합니다\n2. 시스템이 자동으로 내용을 분석합니다\n3. 채팅 인터페이스를 통해 질문을 입력합니다\n4. AI가 문서 내용을 기반으로 답변을 제공합니다`,
      stats: {
        wordCount: 250,
        paragraphCount: 8,
        linkCount: 3,
        imageCount: 5
      }
    }

    return metadata
  } catch (error) {
    console.error('URL 메타데이터 추출 오류:', error)
    throw new Error('유효하지 않은 URL입니다.')
  }
}

// JSON 데이터에서 텍스트 추출 (RAG용)
export const extractTextFromParsedData = (parsedData) => {
  console.log('[extractTextFromParsedData] 시작 - parsedData:', {
    exists: !!parsedData,
    fileType: parsedData?.fileType,
    fileName: parsedData?.fileName,
    hasExtractedText: !!parsedData?.extractedText,
    extractedTextLength: parsedData?.extractedText?.length || 0
  })

  if (!parsedData) {
    console.log('[extractTextFromParsedData] parsedData가 없음')
    return ''
  }

  let text = ''

  // 파일 기본 정보
  if (parsedData.fileType === 'web') {
    // 웹 소스인 경우
    text += `웹페이지 제목: ${parsedData.metadata?.title || parsedData.url}\n`
    text += `URL: ${parsedData.url}\n`
    text += `도메인: ${parsedData.domain}\n\n`

    if (parsedData.metadata?.description) {
      text += `설명: ${parsedData.metadata.description}\n\n`
    }
  } else {
    // 파일 소스인 경우
    text += `파일명: ${parsedData.fileName || parsedData.fileInfo?.name}\n`
    text += `파일 타입: ${parsedData.fileType}\n\n`
  }

  // 내용 추출
  if (parsedData.content) {
    if (typeof parsedData.content === 'string') {
      text += parsedData.content + '\n\n'
    } else if (typeof parsedData.content === 'object') {
      // 웹 콘텐츠 객체인 경우
      if (parsedData.content.headings) {
        text += '제목들:\n' + parsedData.content.headings.join('\n') + '\n\n'
      }
      if (parsedData.content.paragraphs) {
        text += '본문:\n' + parsedData.content.paragraphs.join('\n\n') + '\n\n'
      }
    }
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

  console.log('[extractTextFromParsedData] 완료 - 추출된 텍스트 길이:', text.length)
  console.log('[extractTextFromParsedData] 추출된 텍스트 첫 300자:', text.substring(0, 300))

  return text
}
