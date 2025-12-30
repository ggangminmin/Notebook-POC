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

  // 페이지 렌더링 (반전 버그 완전 해결)
  useEffect(() => {
    if (!pdf || !canvasRef.current) return

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage)

        // PDF 페이지의 회전 정보를 무시하고 항상 0도로 고정 (정방향)
        const viewport = page.getViewport({ scale: scale * 2.0, rotation: 0 })
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        // Canvas 크기 설정 (고해상도)
        const outputScale = window.devicePixelRatio || 1
        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        canvas.style.width = Math.floor(viewport.width) + 'px'
        canvas.style.height = Math.floor(viewport.height) + 'px'

        // 배경 흰색으로 초기화
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)

        // Identity Matrix로 좌표계 완전 리셋 (반전 방지)
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0)

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise

        console.log('[PDFViewer] 페이지 렌더링 완료:', {
          pageNumber: currentPage,
          width: viewport.width,
          height: viewport.height,
          rotation: viewport.rotation,
          scale: scale,
          actualScale: scale * 2.0,
          outputScale: outputScale
        })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-7xl h-[90vh] flex flex-col" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        {/* 헤더 - 대형화 */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-2xl">
          <div className="flex-1 min-w-0 mr-4">
            <h3 className="text-lg font-bold text-gray-900 truncate mb-1">{file?.name}</h3>
            {!isLoading && (
              <p className="text-sm text-gray-600 font-medium">
                페이지 {currentPage} / {numPages}
              </p>
            )}
          </div>

          {/* 컨트롤 - 대형화 및 간격 조정 */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-3 rounded-xl hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold min-w-[70px] text-center bg-white px-3 py-2 rounded-lg shadow-sm">{currentPage} / {numPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages} className="p-3 rounded-xl hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="w-px h-8 bg-gray-300 mx-2" />
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} disabled={scale <= 0.5} className="p-3 rounded-xl hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold min-w-[60px] text-center bg-white px-3 py-2 rounded-lg shadow-sm">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3.0, s + 0.2))} disabled={scale >= 3.0} className="p-3 rounded-xl hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
              <ZoomIn className="w-5 h-5" />
            </button>
            <div className="w-px h-8 bg-gray-300 mx-2" />
            <button onClick={onClose} className="p-3 rounded-xl hover:bg-red-100 text-red-600 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 캔버스 - 대형 뷰어 */}
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-100 to-gray-200 p-8 flex items-center justify-center">
          {isLoading ? (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-base font-medium text-gray-700">PDF 로딩 중...</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="shadow-2xl bg-white rounded-lg"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                height: 'auto',
                transform: 'scale(1) rotate(0deg)', // 회전/반전 완전 방지
                transformOrigin: 'center',
                imageRendering: 'high-quality' // 최고 품질 렌더링
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default PDFViewer
