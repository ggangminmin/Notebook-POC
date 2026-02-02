import { useState } from 'react'

/**
 * NotebookLM 스타일 인용 배지 컴포넌트 (동그란 숫자 아이콘)
 */
const CitationBadge = ({ pageNumber, onPageClick, startPage, endPage, pageContent, sourceId, localPageNumber, sourceName }) => {
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
      </button>
    </span>
  )
}

export default CitationBadge
