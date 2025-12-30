import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

// PDF.js worker 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

/**
 * NotebookLM 스타일 PDF 뷰어
 */
const PDFViewer = ({ file, initialPage = 1, onClose }) => {
  const [pdf, setPdf] = useState(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.0)
  const [isLoading, setIsLoading] = useState(true)
  const canvasRef = useRef(null)

  // PDF 파일 로드
  useEffect(() => {
    if (!file) return

    const loadPDF = async () => {
      try {
        setIsLoading(true)
        const arrayBuffer = await file.arrayBuffer()
        const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        setPdf(loadedPdf)
        setNumPages(loadedPdf.numPages)
        setIsLoading(false)
      } catch (error) {
        console.error('[PDFViewer] PDF 로드 오류:', error)
        setIsLoading(false)
      }
    }

    loadPDF()
  }, [file])

  // 페이지 렌더링
  useEffect(() => {
    if (!pdf || !canvasRef.current) return

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage)
        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise
      } catch (error) {
        console.error('[PDFViewer] 페이지 렌더링 오류:', error)
      }
    }

    renderPage()
  }, [pdf, currentPage, scale])

  // 초기 페이지로 이동
  useEffect(() => {
    if (initialPage && initialPage !== currentPage && numPages > 0) {
      const targetPage = Math.max(1, Math.min(initialPage, numPages))
      setCurrentPage(targetPage)
    }
  }, [initialPage, numPages])

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-900 truncate">{file?.name}</h3>
            {!isLoading && (
              <p className="text-xs text-gray-500">
                페이지 {currentPage} / {numPages}
              </p>
            )}
          </div>

          {/* 컨트롤 */}
          <div className="flex items-center space-x-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium min-w-[60px] text-center">{currentPage} / {numPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} disabled={scale <= 0.5} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium min-w-[45px] text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3.0, s + 0.2))} disabled={scale >= 3.0} className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30">
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-red-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 캔버스 */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4 flex items-center justify-center">
          {isLoading ? (
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-600">PDF 로딩 중...</p>
            </div>
          ) : (
            <canvas ref={canvasRef} className="shadow-lg bg-white" style={{ maxWidth: '100%', height: 'auto' }} />
          )}
        </div>
      </div>
    </div>
  )
}

export default PDFViewer
