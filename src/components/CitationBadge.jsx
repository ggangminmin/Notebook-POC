/**
 * NotebookLM 스타일 인용 배지 컴포넌트 (동그란 숫자 아이콘)
 *
 * @param {number|string} pageNumber - 인용 페이지 번호 또는 범위 (예: 5 또는 "11-14")
 * @param {function} onPageClick - 클릭 시 실행할 함수 (페이지 이동)
 * @param {number} startPage - 범위 인용일 경우 시작 페이지 (옵션)
 * @param {number} endPage - 범위 인용일 경우 끝 페이지 (옵션)
 */
const CitationBadge = ({ pageNumber, onPageClick, startPage, endPage }) => {
  // 범위 인용인지 확인
  const isRange = startPage && endPage && startPage !== endPage
  const displayText = isRange ? `${startPage}-${endPage}` : pageNumber

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
    <span className="relative inline-block align-middle" style={{ zIndex: 10 }}>
      {/* NotebookLM 스타일 동그란 회색 숫자 배지 (강화된 UI/UX 피드백) */}
      <button
        type="button"
        onClick={handleClick}
        onMouseDown={(e) => {
          console.log('[CitationBadge] 🖱️ mouseDown 이벤트:', pageNumber)
        }}
        className={`inline-flex items-center justify-center mx-0.5 bg-gray-200 hover:bg-blue-500 text-gray-700 hover:text-white rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-125 active:scale-95 active:bg-blue-600 relative group ${
          isRange ? 'px-2 h-5 min-w-[32px]' : 'w-5 h-5'
        }`}
        title={isRange ? `페이지 ${startPage}-${endPage}로 이동` : `페이지 ${pageNumber}로 이동`}
        style={{
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          zIndex: 100,
          pointerEvents: 'auto',
          position: 'relative'
        }}
      >
        <span className={`${isRange ? 'whitespace-nowrap' : ''} transition-transform group-hover:scale-110`}>
          {displayText}
        </span>
        {/* V자 표시 - 호버 시 회전 효과 */}
        <svg
          className="absolute -top-0.5 -right-0.5 w-2 h-2 text-gray-500 group-hover:text-white transition-all group-hover:rotate-90"
          viewBox="0 0 8 8"
          fill="currentColor"
        >
          <path d="M4 0L8 4L4 8z" />
        </svg>

        {/* Ripple 효과 (클릭 시) */}
        <span className="absolute inset-0 rounded-full opacity-0 group-active:opacity-30 bg-white transition-opacity duration-300"></span>
      </button>
    </span>
  )
}

export default CitationBadge
