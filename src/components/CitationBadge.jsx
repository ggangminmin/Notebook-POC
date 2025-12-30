import { useState } from 'react'
import { FileText } from 'lucide-react'

/**
 * NotebookLM 스타일 인용 배지 컴포넌트 (동그란 숫자 아이콘)
 *
 * @param {number|string} pageNumber - 인용 페이지 번호 또는 범위 (예: 5 또는 "11-14")
 * @param {string} text - 페이지 미리보기 텍스트
 * @param {string} thumbnail - 페이지 썸네일 이미지 (Base64)
 * @param {string} fileName - 파일명 (툴팁에 표시)
 * @param {function} onPageClick - 클릭 시 실행할 함수 (페이지 이동)
 * @param {number} startPage - 범위 인용일 경우 시작 페이지 (옵션)
 * @param {number} endPage - 범위 인용일 경우 끝 페이지 (옵션)
 */
const CitationBadge = ({ pageNumber, text, thumbnail, fileName, onPageClick, startPage, endPage }) => {
  const [showPreview, setShowPreview] = useState(false)

  // 범위 인용인지 확인
  const isRange = startPage && endPage && startPage !== endPage
  const displayText = isRange ? `${startPage}-${endPage}` : pageNumber

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onPageClick) {
      // 범위 인용일 경우 시작 페이지로 이동
      onPageClick(isRange ? startPage : pageNumber)
    }
  }

  return (
    <span
      className="relative inline-block align-middle"
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      {/* NotebookLM 스타일 동그란 회색 숫자 배지 (V자 모양 포함) - 범위 지원 */}
      <button
        onClick={handleClick}
        className={`inline-flex items-center justify-center mx-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-[10px] font-semibold transition-all cursor-pointer hover:shadow-lg hover:scale-110 relative ${
          isRange ? 'px-2 h-5 min-w-[32px]' : 'w-5 h-5'
        }`}
        title={isRange ? `페이지 ${startPage}-${endPage}로 이동` : `페이지 ${pageNumber}로 이동`}
        style={{
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        }}
      >
        <span className={isRange ? 'whitespace-nowrap' : ''}>{displayText}</span>
        {/* V자 표시 (선택적) */}
        <svg
          className="absolute -top-0.5 -right-0.5 w-2 h-2 text-gray-500"
          viewBox="0 0 8 8"
          fill="currentColor"
        >
          <path d="M4 0L8 4L4 8z" />
        </svg>
      </button>

      {/* NotebookLM 스타일 호버 미리보기 툴팁 (대형 버전) */}
      {showPreview && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-50 pointer-events-none">
          <div
            className="bg-white border-2 border-indigo-300 rounded-2xl overflow-hidden"
            style={{
              width: '750px',
              maxWidth: '92vw',
              boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.3), 0 0 20px rgba(99, 102, 241, 0.15)'
            }}
          >
            {/* 썸네일 이미지 (있을 경우) - 대형 고해상도 */}
            {thumbnail ? (
              <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-8 border-b border-gray-200">
                <img
                  src={thumbnail}
                  alt={`Page ${pageNumber} preview`}
                  className="w-full h-auto max-h-[500px] object-contain rounded-xl shadow-lg border-2 border-gray-300"
                  style={{
                    imageRendering: '-webkit-optimize-contrast',
                    transform: 'scale(1) rotate(0deg)', // 회전 방지 - 전역 적용
                    transformOrigin: 'center',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden'
                  }}
                />
              </div>
            ) : (
              <div className="bg-gradient-to-b from-gray-50 to-gray-100 p-16 border-b border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-20 h-20 text-gray-400 mx-auto mb-4" />
                  <p className="text-base text-gray-600 font-medium">페이지 미리보기 준비 중...</p>
                </div>
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
                <div className={`bg-blue-600 rounded-full flex items-center justify-center ${
                  isRange ? 'px-2 h-5 min-w-[24px]' : 'w-5 h-5'
                }`}>
                  <span className="text-[10px] font-bold text-white">{displayText}</span>
                </div>
                <span className="text-xs text-gray-600">{isRange ? '페이지 범위' : '페이지'}</span>
              </div>
            </div>

            {/* 텍스트 미리보기 - 확대 */}
            {text ? (
              <div className="p-5 bg-white">
                <div className="text-sm text-gray-700 leading-relaxed max-h-32 overflow-y-auto">
                  {text.length > 400 ? text.substring(0, 400) + '...' : text}
                </div>
              </div>
            ) : (
              <div className="p-5 bg-white">
                <div className="text-sm text-gray-500 leading-relaxed text-center">
                  텍스트 내용을 불러오는 중...
                </div>
              </div>
            )}

            {/* 클릭 안내 푸터 - 확대 */}
            <div className="px-5 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-t border-indigo-200">
              <span className="text-xs text-indigo-700 font-semibold">
                💡 클릭하여 원본 페이지로 이동{isRange && ` (페이지 ${startPage}부터 시작)`}
              </span>
            </div>

            {/* 화살표 - 확대 */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[14px] border-transparent border-t-indigo-300" />
            </div>
          </div>
        </div>
      )}
    </span>
  )
}

export default CitationBadge
