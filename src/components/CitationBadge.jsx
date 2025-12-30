import { useState } from 'react'
import { FileText } from 'lucide-react'

/**
 * NotebookLM 스타일 인용 배지 컴포넌트 (동그란 숫자 아이콘)
 *
 * @param {number} pageNumber - 인용 페이지 번호
 * @param {string} text - 페이지 미리보기 텍스트
 * @param {string} thumbnail - 페이지 썸네일 이미지 (Base64)
 * @param {string} fileName - 파일명 (툴팁에 표시)
 * @param {function} onPageClick - 클릭 시 실행할 함수 (페이지 이동)
 */
const CitationBadge = ({ pageNumber, text, thumbnail, fileName, onPageClick }) => {
  const [showPreview, setShowPreview] = useState(false)

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onPageClick) {
      onPageClick(pageNumber)
    }
  }

  return (
    <span
      className="relative inline-block align-middle"
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      {/* NotebookLM 스타일 동그란 숫자 배지 */}
      <button
        onClick={handleClick}
        className="inline-flex items-center justify-center w-5 h-5 mx-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold transition-all cursor-pointer border border-blue-200 hover:border-blue-400 hover:shadow-md"
        title={`페이지 ${pageNumber}로 이동`}
      >
        <span>{pageNumber}</span>
      </button>

      {/* NotebookLM 스타일 호버 미리보기 툴팁 */}
      {showPreview && (text || thumbnail) && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-50 pointer-events-none">
          <div className="bg-white border-2 border-blue-200 rounded-xl shadow-2xl overflow-hidden" style={{ width: '280px' }}>
            {/* 썸네일 이미지 (있을 경우) */}
            {thumbnail && (
              <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-3 border-b border-gray-200">
                <img
                  src={thumbnail}
                  alt={`Page ${pageNumber} preview`}
                  className="w-full h-auto max-h-48 object-contain rounded-md shadow-sm border border-gray-200"
                />
              </div>
            )}

            {/* 헤더: 파일명 + 페이지 번호 */}
            <div className="px-3 pt-3 pb-2 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center space-x-2 mb-1">
                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-xs font-bold text-gray-900 truncate" title={fileName}>
                  {fileName || '문서'}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">{pageNumber}</span>
                </div>
                <span className="text-xs text-gray-600">페이지</span>
              </div>
            </div>

            {/* 텍스트 미리보기 */}
            {text && (
              <div className="p-3 bg-white">
                <div className="text-[10px] text-gray-700 leading-relaxed max-h-20 overflow-y-auto">
                  {text.length > 200 ? text.substring(0, 200) + '...' : text}
                </div>
              </div>
            )}

            {/* 클릭 안내 푸터 */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
              <span className="text-[9px] text-blue-600 font-semibold">💡 클릭하여 원본 페이지로 이동</span>
            </div>

            {/* 화살표 */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-transparent border-t-blue-200" />
            </div>
          </div>
        </div>
      )}
    </span>
  )
}

export default CitationBadge
