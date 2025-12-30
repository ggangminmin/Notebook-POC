import { useState, useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

// PDF.js worker 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const PDFViewer = ({ file, targetPage = null }) => {
  const [pdf, setPdf] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [highlightPage, setHighlightPage] = useState(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  // PDF 로드
  useEffect(() => {
    const loadPDF = async () => {
      if (!file) return

      try {
        const arrayBuffer = await file.arrayBuffer()
        const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        setPdf(loadedPdf)
        setTotalPages(loadedPdf.numPages)
      } catch (error) {
        console.error('[PDF Viewer] PDF 로드 오류:', error)
      }
    }

    loadPDF()
  }, [file])

  // 페이지 렌더링
  useEffect(() => {
    const renderPage = async () => {
      if (!pdf || !canvasRef.current) return

      try {
        const page = await pdf.getPage(currentPage)
        const viewport = page.getViewport({ scale })

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        }

        await page.render(renderContext).promise

        // 하이라이트 효과
        if (highlightPage === currentPage) {
          context.fillStyle = 'rgba(255, 255, 0, 0.2)'
          context.fillRect(0, 0, canvas.width, canvas.height)

          // 3초 후 하이라이트 제거
          setTimeout(() => setHighlightPage(null), 3000)
        }
      } catch (error) {
        console.error('[PDF Viewer] 페이지 렌더링 오류:', error)
      }
    }

    renderPage()
  }, [pdf, currentPage, scale, highlightPage])

  // 외부에서 페이지 이동 요청 시
  useEffect(() => {
    if (targetPage && targetPage !== currentPage) {
      setCurrentPage(targetPage)
      setHighlightPage(targetPage)

      // 스크롤하여 뷰어로 이동
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [targetPage])

  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum)
    }
  }

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        PDF를 선택하면 미리보기가 표시됩니다
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-gray-100">
      {/* 컨트롤 바 */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-700">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={zoomOut}
            className="p-1 rounded hover:bg-gray-100"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-700">{Math.round(scale * 100)}%</span>
          <button
            onClick={zoomIn}
            className="p-1 rounded hover:bg-gray-100"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF 캔버스 */}
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <canvas
          ref={canvasRef}
          className={`shadow-lg ${highlightPage === currentPage ? 'ring-4 ring-yellow-400' : ''}`}
        />
      </div>
    </div>
  )
}

export default PDFViewer
