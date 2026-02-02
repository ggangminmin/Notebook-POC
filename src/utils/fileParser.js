import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { parse as parseHWP } from '@hwp.js/parser'

// PDF.js worker 설정 - 로컬 워커 사용
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// 📄 텍스트 가상 페이지 분할 (약 2000자 단위)
export const virtualizeText = (text, pageSize = 2000) => {
  if (!text) return { pageCount: 1, pageTexts: [] }

  const trimmedText = text.trim()
  const pageTexts = []

  for (let i = 0; i < trimmedText.length; i += pageSize) {
    const pageNum = Math.floor(i / pageSize) + 1
    const content = trimmedText.substring(i, i + pageSize)
    pageTexts.push({
      pageNumber: pageNum,
      text: content,
      wordCount: content.split(/\s+/).length,
      thumbnail: null
    })
  }

  return {
    pageCount: pageTexts.length || 1,
    pageTexts: pageTexts
  }
}

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

// Word 파일에서 텍스트 추출 (구조 보존형)
const extractWordText = async (file) => {
  try {
    console.log('[Word 추출] 시작:', file.name, 'Size:', file.size)
    const arrayBuffer = await file.arrayBuffer()

    // HTML로 변환하여 구조 보존 (표, 목록, 제목 등)
    const result = await mammoth.convertToHtml({ arrayBuffer })
    const html = result.value

    // 단순 텍스트도 추출 (RAG용)
    const textResult = await mammoth.extractRawText({ arrayBuffer })
    const rawText = textResult.value

    // HTML을 단락 단위로 파싱하여 자연스러운 페이지 분할 시도
    // 여기서는 간단하게 <p>, <h1-6>, <table> 태그를 기준으로 나눔
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const elements = Array.from(doc.body.children)

    const pageTexts = []
    let currentPageContent = ''
    let currentPageWords = 0
    let pageNumber = 1
    const wordsPerPage = 600 // 자연스러운 단락 끊기를 고려하여 약간 상향 조정

    elements.forEach((el, index) => {
      const elText = el.textContent || ''
      const elWords = elText.split(/\s+/).filter(Boolean).length

      // 현재 요소의 HTML 추가
      currentPageContent += el.outerHTML
      currentPageWords += elWords

      // 페이지 구분 기준: 단어 수가 넘었거나, 다음 요소가 제목(h1, h2)이거나, 마지막 요소인 경우
      const nextEl = elements[index + 1]
      const isNextHeading = nextEl && ['H1', 'H2', 'H3'].includes(nextEl.tagName)

      if (currentPageWords >= wordsPerPage || isNextHeading || index === elements.length - 1) {
        if (currentPageContent.trim()) {
          pageTexts.push({
            pageNumber: pageNumber++,
            text: currentPageContent, // HTML 내용 저장
            isHtml: true, // HTML임을 표시
            wordCount: currentPageWords,
            thumbnail: null
          })
          currentPageContent = ''
          currentPageWords = 0
        }
      }
    })

    console.log('[Word 추출] 완료 - 페이지:', pageTexts.length)

    return {
      text: rawText,
      pageCount: pageTexts.length,
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

      // 🔥 임시: IndexedDB 저장을 위해 썸네일 비활성화 (Base64 이미지가 너무 큼)
      // const thumbnail = await renderPDFPageToImage(page, 0.6)
      const thumbnail = null // 썸네일 비활성화

      // 페이지별 데이터 저장
      pageTexts.push({
        pageNumber: i,
        text: pageText,
        wordCount: pageText.split(/\s+/).length,
        thumbnail: thumbnail // null로 저장
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

// HWPX 파일에서 텍스트 추출 (ZIP + XML)
const extractHWPXText = async (file) => {
  try {
    console.log('[HWPX 추출] 시작:', file.name, 'Size:', file.size)
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    // Contents 폴더 내의 section*.xml 파일들을 순회하며 텍스트 추출
    let fullText = ''
    const sectionFiles = Object.keys(zip.files).filter(name => name.startsWith('Contents/section') && name.endsWith('.xml'))

    // 섹션 순서대로 정렬 (section0.xml, section1.xml ...)
    sectionFiles.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0])
      const numB = parseInt(b.match(/\d+/)[0])
      return numA - numB
    })

    console.log('[HWPX 추출] 발견된 섹션:', sectionFiles)

    for (const fileName of sectionFiles) {
      const xmlContent = await zip.files[fileName].async('text')
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')

      // <hp:t> 태그 내의 텍스트가 실제 본문 내용임
      const textNodes = xmlDoc.getElementsByTagName('hp:t')
      let sectionText = ''
      for (let i = 0; i < textNodes.length; i++) {
        sectionText += textNodes[i].textContent + ' '
      }
      fullText += sectionText + '\n\n'
    }

    const { pageCount, pageTexts } = virtualizeText(fullText)

    return {
      text: fullText,
      pageCount,
      pageTexts,
      pageImages: []
    }
  } catch (error) {
    console.error('[HWPX 추출] 오류:', error)
    throw new Error('HWPX 파일을 읽을 수 없습니다.')
  }
}

// HWP 파일에서 텍스트 추출 (@hwp.js/parser 사용)
const extractHWPText = async (file) => {
  try {
    console.log('[HWP 추출] 시작:', file.name, 'Size:', file.size)
    const arrayBuffer = await file.arrayBuffer()

    // @hwp.js/parser 사용
    const hwpDoc = parseHWP(arrayBuffer)
    let fullText = ''

    // 섹션 -> 문단 -> 글자 순으로 순회하며 텍스트 추출
    hwpDoc.sections.forEach(section => {
      section.paragraphs.forEach(paragraph => {
        // paragraph.chars는 반복 가능한 객체 (CharList)
        for (const char of paragraph.chars) {
          if (char && typeof char.toString === 'function') {
            const charStr = char.toString()
            if (charStr) {
              fullText += charStr
            }
          }
        }
        fullText += '\n'
      })
      fullText += '\n'
    })

    console.log('[HWP 추출] 텍스트 추출 완료, 길이:', fullText.length)

    const { pageCount, pageTexts } = virtualizeText(fullText)

    return {
      text: fullText,
      pageCount,
      pageTexts,
      pageImages: []
    }
  } catch (error) {
    console.error('[HWP 추출] 오류:', error)
    throw new Error('HWP 파일을 읽을 수 없습니다. (지원되지 않는 버전이거나 손상된 파일일 수 있습니다.)')
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
      } else if (file.name.endsWith('.hwpx')) {
        // HWPX 파일 (한글 신버전)
        console.log('[파일 파싱] HWPX 파일 감지:', file.name)
        const hwpxData = await extractHWPXText(file)

        parsedData = {
          fileType: 'hwp',
          fileName: file.name,
          fileSize: file.size,
          content: hwpxData.text.substring(0, 500) + '...',
          extractedText: hwpxData.text,
          pageCount: hwpxData.pageCount,
          pageTexts: hwpxData.pageTexts,
          metadata: {
            format: 'HWPX',
            pages: hwpxData.pageCount
          }
        }
        resolve(parsedData)
      } else if (file.name.endsWith('.hwp')) {
        // HWP 파일 (한글 구버전)
        console.log('[파일 파싱] HWP 파일 감지:', file.name)
        const hwpData = await extractHWPText(file)

        parsedData = {
          fileType: 'hwp',
          fileName: file.name,
          fileSize: file.size,
          content: hwpData.text.substring(0, 500) + '...',
          extractedText: hwpData.text,
          pageCount: hwpData.pageCount,
          pageTexts: hwpData.pageTexts,
          metadata: {
            format: 'HWP',
            pages: hwpData.pageCount
          }
        }
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

// 유튜브 자막 추출 전용 함수
const getYoutubeTranscript = async (videoId) => {
  try {
    console.log(`[Youtube] 자막 추출 시도: ${videoId}`)

    // 1. 유튜브 비디오 페이지에서 자막 설정 정보 추출 시도
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(videoUrl)}`

    const response = await fetch(proxyUrl)
    if (!response.ok) return null

    const data = await response.json()
    const html = data.contents

    // ytInitialPlayerResponse 객체 찾기
    const regex = /ytInitialPlayerResponse\s*=\s*({.+?});/
    const match = html.match(regex)
    if (!match) return null

    const playerResponse = JSON.parse(match[1])
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks

    if (!captionTracks || captionTracks.length === 0) {
      console.warn('[Youtube] 자막 트랙을 찾을 수 없습니다.')
      return null
    }

    // 한국어 자막 우선, 없으면 첫 번째 자막 선택
    const track = captionTracks.find(t => t.languageCode === 'ko') ||
      captionTracks.find(t => t.languageCode === 'en') ||
      captionTracks[0]

    console.log(`[Youtube] 사용될 자막 언어: ${track.languageCode}`)

    // 2. 실제 자막 텍스트 가져오기 (XML/JSON3 형식)
    const transcriptProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(track.baseUrl + '&fmt=json3')}`
    const transcriptRes = await fetch(transcriptProxyUrl)
    if (!transcriptRes.ok) return null

    const transcriptData = await transcriptRes.json()
    const transcriptJson = JSON.parse(transcriptData.contents)

    // 텍스트 조각들을 합쳐 하나의 본문으로 생성
    const transcriptText = transcriptJson.events
      .filter(event => event.segs)
      .map(event => event.segs.map(s => s.utf8).join(''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    return transcriptText
  } catch (error) {
    console.error('[Youtube] 자막 추출 중 상세 오류:', error)
    return null
  }
}

// 웹 URL에서 메타데이터 추출 (실제 크롤링 시도)
export const fetchWebMetadata = async (url) => {
  try {
    const urlObj = new URL(url)
    const isYouTube = urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')
    let videoId = null

    if (isYouTube) {
      if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v')
      } else if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1)
      }
    }

    console.log(`[fileParser] 웹 URL 크롤링 시작 (${isYouTube ? 'YouTube' : 'Web'}): ${url}`)

    let extractedText = ""
    let title = `${urlObj.hostname}의 웹페이지`

    // 1. YouTube 전용 특화 처리
    if (isYouTube && videoId) {
      // A. 제목 가져오기 (oEmbed)
      try {
        const oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`
        const response = await fetch(oembedUrl)
        if (response.ok) {
          const data = await response.json()
          if (data.title) title = data.title
        }
      } catch (e) {
        console.warn('[fileParser] YouTube oEmbed 실패')
      }

      // B. 자막 추출 시도 (강력한 신규 엔진)
      const transcript = await getYoutubeTranscript(videoId)
      if (transcript && transcript.length > 50) {
        extractedText = `# 영상 제목: ${title}\n\n## 유튜브 자막 내용\n\n${transcript}`
        console.log('[fileParser] 유튜브 자막 추출 성공!')
      }
    }

    // 2. 일반 웹 크롤링 또는 유튜브 자막 실패 시 대체 시도 (Jina Reader)
    if (!extractedText) {
      const jinaUrl = `https://r.jina.ai/${url}`
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(jinaUrl)}`
        const response = await fetch(proxyUrl)
        if (response.ok) {
          const data = await response.json()
          const content = data.contents
          if (content && content.length > 200 && !content.includes('Captcha')) {
            extractedText = content
            if (title.includes(urlObj.hostname)) {
              const titleMatch = content.match(/^#\s+(.*)$/m)
              if (titleMatch) title = titleMatch[1].trim()
            }
          }
        }
      } catch (err) {
        console.error('[fileParser] 대체 크롤링 실패:', err)
      }
    }

    // 최종 결과 구성
    if (!extractedText) {
      extractedText = isYouTube
        ? `영상 제목: ${title}\n\nURL: ${url}\n\n유튜브 자막을 자동으로 가져오지 못했습니다. 본문 아래의 영상 플레이어에서 직접 영상을 시청하거나 브라우저에서 '자막 보기'를 이용해주세요.`
        : `웹페이지 제목: ${title}\n\nURL: ${url}\n\n내용을 가져오는데 실패했습니다. 비공개 사이트이거나 크롤링이 차단되었을 수 있습니다.`
    }

    const metadata = {
      fileType: 'web',
      url: url,
      domain: urlObj.hostname,
      protocol: urlObj.protocol,
      fetchedAt: new Date().toISOString(),
      metadata: {
        title: title,
        description: extractedText.substring(0, 300).replace(/\n/g, ' ') + '...',
        author: isYouTube ? 'YouTube Creator' : 'Unknown',
        language: 'ko',
        publishedDate: new Date().toISOString()
      },
      extractedText: extractedText
    }

    // 가상 페이지 추가
    const virtualization = virtualizeText(metadata.extractedText)
    metadata.pageCount = virtualization.pageCount
    metadata.pageTexts = virtualization.pageTexts

    return metadata
  } catch (error) {
    console.error('URL 메타데이터 추출 오류:', error)
    throw new Error('유효하지 않은 URL이거나 요청이 거부되었습니다.')
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
