import { useState } from 'react'

/**
 * NotebookLM 스타일 인용 배지 컴포넌트 (동그란 숫자 아이콘)
 */
const CitationBadge = ({ pageNumber, onPageClick, startPage, endPage, pageContent, sourceId, localPageNumber, sourceName }) => {
  const [isHovered, setIsHovered] = useState(false)
  // 범위 인용인지 확인
  const isRange = startPage && endPage && startPage !== endPage
  const displayText = isRange ? `${startPage}-${endPage}` : pageNumber

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()

    const targetPage = isRange ? startPage : pageNumber
    const targetLocalPage = localPageNumber || targetPage

    if (onPageClick) {
      onPageClick(targetPage, sourceId, targetLocalPage)
    }
  }

  return (
    <span
      className="relative inline-block align-middle"
      style={{ zIndex: 10 }}
    >
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`inline-flex items-center justify-center mx-0.5 bg-blue-50/80 hover:bg-blue-600 text-blue-600 hover:text-white rounded-full text-[10.5px] font-bold transition-all duration-150 cursor-pointer hover:shadow-lg active:scale-95 relative group border border-blue-200/60 hover:border-blue-600 ${isRange ? 'px-2 h-[18px] min-w-[28px]' : 'w-[18px] h-[18px]'
          }`}
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

        {/* Preview Tooltip */}
        {isHovered && pageContent && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white border border-gray-200 rounded-xl shadow-xl z-[999] animate-in fade-in zoom-in duration-200 pointer-events-none">
            <div className="flex items-center justify-between mb-1.5 border-b border-gray-100 pb-1.5">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                {sourceName || 'Source'}
              </span>
              <span className="text-[10px] font-bold text-gray-400">
                P.{pageNumber}
              </span>
            </div>
            <p className="text-[11px] text-gray-600 line-clamp-4 leading-[1.5] font-normal italic">
              "{pageContent.substring(0, 200)}..."
            </p>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-gray-200 rotate-45"></div>
          </div>
        )}
      </button>
    </span>
  )
}

export default CitationBadge
