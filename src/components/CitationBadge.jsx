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
    console.log('[CitationBadge 클릭] 페이지 이동 요청:', targetPage, isRange ? `(범위: ${startPage}-${endPage})` : '(단일 페이지)')
    if (onPageClick) {
      // 범위 인용일 경우 시작 페이지로 이동
      onPageClick(targetPage)
    } else {
      console.warn('[CitationBadge] onPageClick 핸들러가 연결되지 않았습니다!')
    }
  }

  return (
    <span className="relative inline-block align-middle">
      {/* NotebookLM 스타일 동그란 회색 숫자 배지 (V자 모양 포함) - 범위 지원 */}
      <button
        onClick={handleClick}
        className={`inline-flex items-center justify-center mx-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-xs font-semibold transition-all cursor-pointer hover:shadow-lg hover:scale-110 relative ${
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
    </span>
  )
}

export default CitationBadge
