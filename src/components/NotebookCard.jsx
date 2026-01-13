import { useState, useRef, useEffect } from 'react'
import { Edit2, Check, X, MoreVertical, Trash2 } from 'lucide-react'
import { formatDate } from '../utils/notebookManager'

const NotebookCard = ({ notebook, onClick, onTitleUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(notebook.title)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  const handleEditClick = (e) => {
    e.stopPropagation() // 카드 클릭 이벤트 방지
    setIsEditing(true)
    setEditedTitle(notebook.title)
  }

  const handleSave = (e) => {
    e.stopPropagation()
    if (editedTitle.trim() !== '') {
      onTitleUpdate(notebook.id, editedTitle.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = (e) => {
    e.stopPropagation()
    setEditedTitle(notebook.title)
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave(e)
    } else if (e.key === 'Escape') {
      handleCancel(e)
    }
  }

  const handleMenuClick = (e) => {
    e.stopPropagation()
    setShowMenu(!showMenu)
  }

  const handleEditFromMenu = (e) => {
    e.stopPropagation()
    setShowMenu(false)
    setIsEditing(true)
    setEditedTitle(notebook.title)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    setShowMenu(false)
    if (window.confirm('이 노트북을 삭제하시겠습니까?')) {
      onDelete(notebook.id)
    }
  }

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  // 배경색 매핑 (이모지 기반)
  const getBackgroundColor = (emoji) => {
    const colorMap = {
      '🤖': 'bg-blue-50',
      '🍎': 'bg-red-50',
      '🚀': 'bg-purple-50',
      '🌅': 'bg-orange-50',
      '📊': 'bg-green-50',
      '📄': 'bg-gray-50',
      '💡': 'bg-yellow-50',
      '🎯': 'bg-pink-50'
    }
    return colorMap[emoji] || 'bg-gray-50'
  }

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-200 flex flex-col"
      style={{ aspectRatio: '1 / 0.85' }}
    >
      {/* 상단: 이모지 + 더보기 메뉴 */}
      <div className="flex items-start justify-between mb-3">
        <div className={`${getBackgroundColor(notebook.emoji)} w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
          {notebook.emoji}
        </div>

        {/* 더보기 메뉴 (점 3개) */}
        {!isEditing && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={handleMenuClick}
              className="p-1 hover:bg-gray-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              title="더보기"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>

            {/* 드롭다운 메뉴 */}
            {showMenu && (
              <div className="absolute right-0 top-7 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-10 min-w-[130px]">
                <button
                  onClick={handleEditFromMenu}
                  className="w-full px-3 py-2 text-left text-xs text-gray-800 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>제목 수정</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center space-x-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>삭제</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 중앙: 제목 (편집 가능) */}
      <div className="flex-1 mb-3">
        {isEditing ? (
          <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-2 py-1 text-sm font-semibold text-gray-800 border border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="p-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-shrink-0"
              title="저장"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex-shrink-0"
              title="취소"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <h3 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">
            {notebook.title}
          </h3>
        )}
      </div>

      {/* 하단: 생성일 + 소스 개수 */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 mt-auto">
        <span>{formatDate(notebook.createdAt)}</span>
        <span className="text-blue-600 font-medium">소스 {notebook.sources.length}개</span>
      </div>
    </div>
  )
}

export default NotebookCard
