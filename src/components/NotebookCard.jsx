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
      className="group bg-white rounded-lg border border-gray-200 p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 flex flex-col h-full"
    >
      {/* 상단: 이모지 + 더보기 메뉴 */}
      <div className="flex items-start justify-between mb-4">
        <div className={`${getBackgroundColor(notebook.emoji)} w-14 h-14 rounded-lg flex items-center justify-center text-2xl`}>
          {notebook.emoji}
        </div>

        {/* 더보기 메뉴 (점 3개) */}
        {!isEditing && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={handleMenuClick}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="더보기"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {/* 드롭다운 메뉴 */}
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[140px]">
                <button
                  onClick={handleEditFromMenu}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>제목 수정</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
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
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-2 py-1 text-sm font-semibold border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              title="저장"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              title="취소"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <h3 className="text-[15px] font-semibold text-gray-900 leading-snug line-clamp-2">
            {notebook.title}
          </h3>
        )}
      </div>

      {/* 하단: 생성일 + 소스 개수 */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{formatDate(notebook.createdAt)}</span>
        <span>소스 {notebook.sources.length}개</span>
      </div>
    </div>
  )
}

export default NotebookCard
