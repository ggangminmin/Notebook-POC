import { useState, useRef, useEffect } from 'react'
import {
  Edit2, Check, X, MoreVertical, Trash2,
  // 검증된 Lucide 아이콘들
  FileText, BookOpen, Folder, File,
  Lightbulb, Sparkles, Zap, Target,
  Rocket, Star, Heart, Flag, Bookmark,
  PenTool, Code, Terminal, Database, Server, Cloud,
  Image, Camera, Video, Music, Mic,
  Globe, Map, Compass, Send,
  Users, User, Home,
  Calendar, Clock,
  TrendingUp, BarChart, PieChart, Activity,
  Gift, Award, Box, Briefcase, Coffee,
  Cpu, Layers, Layout, Mail, MessageSquare,
  Package, Pen, Phone, Settings, Shield,
  Sun, Tag, Truck, Umbrella, Wifi
} from 'lucide-react'
import { formatDate, NOTEBOOK_ICONS, DEFAULT_ICON } from '../utils/notebookManager'

// 아이콘 이름을 컴포넌트로 매핑 (검증된 아이콘만)
const iconComponents = {
  FileText, BookOpen, Folder, File,
  Lightbulb, Sparkles, Zap, Target,
  Rocket, Star, Heart, Flag, Bookmark,
  PenTool, Code, Terminal, Database, Server, Cloud,
  Image, Camera, Video, Music, Mic,
  Globe, Map, Compass, Send,
  Users, User, Home,
  Calendar, Clock,
  TrendingUp, BarChart, PieChart, Activity,
  Gift, Award, Box, Briefcase, Coffee,
  Cpu, Layers, Layout, Mail, MessageSquare,
  Package, Pen, Phone, Settings, Shield,
  Sun, Tag, Truck, Umbrella, Wifi
}

// 아이콘 이름으로 컴포넌트 가져오기 (fallback 포함)
const getIconComponent = (iconName) => {
  // 아이콘이 매핑에 있으면 해당 컴포넌트 반환, 없으면 기본 아이콘
  return iconComponents[iconName] || iconComponents[DEFAULT_ICON] || FileText
}

const NotebookCard = ({ notebook, onClick, onTitleUpdate, onDelete, onIconUpdate }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(notebook.title)
  const [showMenu, setShowMenu] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const menuRef = useRef(null)
  const iconPickerRef = useRef(null)

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

  // 아이콘 클릭 핸들러
  const handleIconClick = (e) => {
    e.stopPropagation()
    setShowIconPicker(true)
  }

  // 아이콘 선택 핸들러
  const handleIconSelect = (iconName) => {
    if (onIconUpdate) {
      onIconUpdate(notebook.id, iconName)
    }
    setShowIconPicker(false)
  }

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target)) {
        setShowIconPicker(false)
      }
    }

    if (showMenu || showIconPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu, showIconPicker])

  // 아이콘 배경색 (랜덤하게 다양한 색상)
  const getIconBgColor = (iconName) => {
    const colors = [
      'bg-blue-50 text-blue-600',
      'bg-purple-50 text-purple-600',
      'bg-green-50 text-green-600',
      'bg-orange-50 text-orange-600',
      'bg-pink-50 text-pink-600',
      'bg-cyan-50 text-cyan-600',
      'bg-amber-50 text-amber-600',
      'bg-indigo-50 text-indigo-600'
    ]
    // 아이콘 이름을 기반으로 일관된 색상 선택
    const index = iconName ? iconName.charCodeAt(0) % colors.length : 0
    return colors[index]
  }

  // 현재 아이콘 가져오기 (icon 필드 우선, 없으면 기본 아이콘)
  // 아이콘이 매핑에 없는 경우에도 fallback 처리
  const rawIconName = notebook.icon || DEFAULT_ICON
  const currentIconName = iconComponents[rawIconName] ? rawIconName : DEFAULT_ICON
  const IconComponent = getIconComponent(currentIconName)

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-gray-200 flex flex-col relative"
      style={{ aspectRatio: '240 / 200' }}
    >
      {/* 상단: 아이콘 + 더보기 메뉴 */}
      <div className="flex items-start justify-between mb-3">
        <div className="relative">
          <button
            onClick={handleIconClick}
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 ${getIconBgColor(currentIconName)}`}
            title="아이콘 변경"
          >
            <IconComponent className="w-6 h-6" />
          </button>

          {/* 아이콘 선택 모달 */}
          {showIconPicker && (
            <div
              ref={iconPickerRef}
              className="absolute left-0 top-14 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-50"
              style={{ width: '280px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs text-gray-500 mb-2 font-medium">아이콘 선택</p>
              <div className="grid grid-cols-8 gap-1 max-h-[200px] overflow-y-auto">
                {NOTEBOOK_ICONS.map((iconName) => {
                  const Icon = getIconComponent(iconName)
                  return (
                    <button
                      key={iconName}
                      onClick={() => handleIconSelect(iconName)}
                      className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                        currentIconName === iconName ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
                      }`}
                      title={iconName}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 더보기 메뉴 (점 3개) - 항상 표시 */}
        {!isEditing && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={handleMenuClick}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="더보기"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>

            {/* 드롭다운 메뉴 */}
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-10 min-w-[130px]">
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
