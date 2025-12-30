import { useState } from 'react'
import { FileText } from 'lucide-react'

const CitationBadge = ({ pageNumber, text, onPageClick }) => {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      <button
        onClick={() => onPageClick(pageNumber)}
        className="inline-flex items-center px-2 py-0.5 mx-0.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-[10px] font-medium transition-colors cursor-pointer border border-blue-300"
      >
        <FileText className="w-2.5 h-2.5 mr-0.5" />
        <span>p.{pageNumber}</span>
      </button>

      {/* 페이지 미리보기 툴팁 */}
      {showPreview && text && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-white border-2 border-blue-300 rounded-lg shadow-xl p-3 max-w-xs">
            {/* 화살표 */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-0.5">
              <div className="border-8 border-transparent border-t-blue-300"></div>
            </div>

            {/* 페이지 번호 헤더 */}
            <div className="flex items-center space-x-1.5 mb-2 pb-2 border-b border-gray-200">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-gray-800">페이지 {pageNumber}</span>
            </div>

            {/* 미리보기 텍스트 */}
            <div className="text-[10px] text-gray-700 leading-relaxed max-h-32 overflow-y-auto">
              {text.length > 200 ? text.substring(0, 200) + '...' : text}
            </div>

            {/* 클릭 안내 */}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <span className="text-[9px] text-blue-600 font-medium">클릭하여 원본 페이지로 이동</span>
            </div>
          </div>
        </div>
      )}
    </span>
  )
}

export default CitationBadge
