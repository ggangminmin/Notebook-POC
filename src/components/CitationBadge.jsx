import { useState } from 'react'

/**
 * NotebookLM 스타일 인용 배지 컴포넌트 (동그란 숫자 아이콘)
 *
 * @param {number|string} pageNumber - 인용 페이지 번호 또는 범위 (예: 5 또는 "11-14")
 * @param {function} onPageClick - 클릭 시 실행할 함수 (페이지 이동)
 * @param {number} startPage - 범위 인용일 경우 시작 페이지 (옵션)
 * @param {number} endPage - 범위 인용일 경우 끝 페이지 (옵션)
 * @param {string} pageContent - 페이지 내용 (미리보기용)
 */
const CitationBadge = ({ pageNumber, onPageClick, startPage, endPage, pageContent }) => {
  const [showPreview, setShowPreview] = useState(false)

  // 범위 인용인지 확인
  const isRange = startPage && endPage && startPage !== endPage
  const displayText = isRange ? `${startPage}-${endPage}` : pageNumber

  // 미리보기 텍스트 생성 (처음 200자)
  const previewText = pageContent
    ? pageContent.slice(0, 200) + (pageContent.length > 200 ? '...' : '')
    : null

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()

    const targetPage = isRange ? startPage : pageNumber

    console.log('═══════════════════════════════════════════════════════')
    console.log('[CitationBadge] 🔵 클릭 이벤트 발생!')
    console.log('[CitationBadge] 목표 페이지:', targetPage)
    console.log('[CitationBadge] 인용 타입:', isRange ? `범위 (${startPage}-${endPage})` : '단일 페이지')
    console.log('[CitationBadge] onPageClick 핸들러 존재:', !!onPageClick)
    console.log('═══════════════════════════════════════════════════════')

    if (onPageClick) {
      try {
        // 범위 인용일 경우 시작 페이지로 이동
        onPageClick(targetPage)
        console.log('[CitationBadge] ✅ onPageClick 호출 성공:', targetPage)
      } catch (error) {
        console.error('[CitationBadge] ❌ onPageClick 호출 실패:', error)
      }
    } else {
      console.error('[CitationBadge] ❌ CRITICAL: onPageClick 핸들러가 연결되지 않았습니다!')
      alert(`디버그: onPageClick 핸들러가 없습니다. 페이지 ${targetPage}로 이동할 수 없습니다.`)
    }
  }

  return (
    <span
      className="relative inline-block align-middle"
      style={{ zIndex: 10 }}
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      {/* NotebookLM 스타일 인용 배지 - 둥근 숫자 버튼 */}
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center justify-center mx-0.5 bg-blue-50/80 hover:bg-blue-500 text-blue-600 hover:text-white rounded-full text-[10.5px] font-bold transition-all duration-150 cursor-pointer hover:shadow-md active:scale-95 relative group border border-blue-200/60 hover:border-blue-500 ${
          isRange ? 'px-2 h-[18px] min-w-[28px]' : 'w-[18px] h-[18px]'
        }`}
        title={isRange ? `페이지 ${startPage}-${endPage}` : `페이지 ${pageNumber}`}
        aria-label={isRange ? `페이지 ${startPage}부터 ${endPage}까지 보기` : `페이지 ${pageNumber} 보기`}
        style={{
          boxShadow: '0 1px 2px rgba(59, 130, 246, 0.15)',
          zIndex: 100,
          pointerEvents: 'auto',
          position: 'relative',
          backdropFilter: 'blur(4px)'
        }}
      >
        <span className={`${isRange ? 'whitespace-nowrap' : ''} transition-all group-hover:scale-110 group-active:scale-100`}>
          {displayText}
        </span>

        {/* Pulse 효과 (클릭 시) */}
        <span className="absolute inset-0 rounded-full opacity-0 group-active:opacity-40 bg-white transition-opacity duration-150"></span>
      </button>

      {/* 호버 시 미리보기 팝오버 (NotebookLM 스타일) */}
      {showPreview && previewText && (
        <div
          className="absolute z-[200] w-80 p-4 mt-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-2xl animate-fadeIn"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            top: '100%',
            pointerEvents: 'none',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)'
          }}
        >
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-blue-100">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs font-bold text-blue-700">
              Page {displayText}
            </span>
            <span className="ml-auto text-[10px] text-gray-400 uppercase tracking-wide">
              Preview
            </span>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">
            {previewText}
          </p>
          <div className="mt-2.5 pt-2 border-t border-gray-100">
            <p className="text-[10px] text-blue-600 font-medium">
              💡 Click to jump to this page
            </p>
          </div>
        </div>
      )}
    </span>
  )
}

export default CitationBadge
