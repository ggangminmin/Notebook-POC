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
  Sun, Tag, Truck, Umbrella, Wifi, Share2
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

const NotebookCard = ({ notebook, onClick, onTitleUpdate, onDelete, onIconUpdate, onShare, currentUserId }) => {
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

  const handleShare = (e) => {
    e.stopPropagation()
    setShowMenu(false)
    if (onShare) {
      onShare(notebook)
    }
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

  // 역할 구분: 소유자가 본인이면 생산자(Producer), 아니면 수신자(Receiver)
  const isProducer = !notebook.ownerId || notebook.ownerId === currentUserId
  const isShared = notebook.ownerId && notebook.ownerId !== currentUserId
  const IconComponent = getIconComponent(currentIconName)

  // 생산자 이름/이메일 정보 (수신자 카드 표시용)
  const providerInfo = notebook.ownerId ? (allCompanyMembers.find(m => m.email === notebook.ownerId)?.name || notebook.ownerId) : '생산자'

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 flex flex-col relative ${isShared ? 'border-indigo-100 bg-slate-50/30' : 'border-gray-100'
        }`}
      style={{ aspectRatio: '320 / 280' }}
    >
      {/* 상단: 아이콘 + 더보기 메뉴 */}
      <div className="flex items-start justify-between mb-3 p-5 pb-0">
        <div className="relative">
          <button
            onClick={handleIconClick}
            disabled={!isProducer}
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isProducer ? 'group-hover:scale-110' : ''} shadow-sm border border-transparent ${getIconBgColor(currentIconName)}`}
            title={isProducer ? "아이콘 변경" : ""}
          >
            <IconComponent className="w-6 h-6" />
          </button>

          {/* 아이콘 선택 모달 (생산자만 가능) */}
          {showIconPicker && isProducer && (
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
                      className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${currentIconName === iconName ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
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

        {/* 더보기 메뉴 - 생산자 또는 관리자만 전체 메뉴, 수신자는 재공유만 가능하거나 일부 제한 */}
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
                {isProducer && (
                  <>
                    <button
                      onClick={handleEditFromMenu}
                      className="w-full px-3 py-2 text-left text-xs text-gray-800 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>설정 및 공유</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>삭제</span>
                    </button>
                  </>
                )}
                {isShared && (
                  <button
                    onClick={handleShare}
                    className="w-full px-3 py-2 text-left text-xs text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>재공유</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 중앙: 제목 */}
      <div className="flex-1 mb-3 px-5">
        {isEditing ? (
          <div className="flex items-center w-full space-x-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-0 px-2 py-1 text-sm font-semibold text-gray-800 border border-blue-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
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
          <div className="space-y-1">
            <h3 className="text-[15px] font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
              {notebook.title}
            </h3>
            {isShared && (
              <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                Provided by <span className="text-slate-500 font-bold">{providerInfo}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* 하단: 생성일 + 소스 개수 */}
      <div className="flex items-center justify-between p-5 py-4 border-t border-gray-50 text-[12px] text-gray-500 mt-auto">
        <span className="font-medium">{formatDate(notebook.createdAt)}</span>
        <div className="flex items-center space-x-1.5">
          {isProducer && notebook.sharingSettings?.sharedWith?.length > 0 && (
            <div className="flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold mr-1">
              <Shield className="w-2.5 h-2.5 mr-1" />
              관리 중
            </div>
          )}
          {isShared && (
            <div className="flex items-center px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold mr-1">
              <Users className="w-2.5 h-2.5 mr-1" />
              공유받음
            </div>
          )}
          <div className={`w-1.5 h-1.5 rounded-full ${isShared ? 'bg-indigo-400' : 'bg-blue-500'}`}></div>
          <span className={`${isShared ? 'text-indigo-600' : 'text-blue-600'} font-bold`}>소스 {notebook.sources.length}개</span>
        </div>
      </div>
    </div>
  )
}

// 명단 데이터 (NotebookCard 내부에 임시로 두거나 constants로 분리 필요)
const allCompanyMembers = [
  { name: '황용운 이사', email: 'yw.hwang@gptko.co.kr' },
  { name: '안수찬 실장', email: 'sc.ahn@gptko.co.kr' },
  { name: '구일완 대리', email: 'iw.ku@gptko.co.kr' },
  { name: '권용재 사원', email: 'yj.kwon@gptko.co.kr' },
  { name: '송제성 팀장', email: 'js.song@gptko.co.kr' },
  { name: '석준용 대리', email: 'jy.seok@gptko.co.kr' },
  { name: '임승연 사원', email: 'sy.lim@gptko.co.kr' },
  { name: '박진영 팀장', email: 'jy.park@gptko.co.kr' },
  { name: '이아영 대리', email: 'ay.lee@gptko.co.kr' },
  { name: '김학종 사원', email: 'hj.kim@gptko.co.kr' },
  { name: '방효윤 사원', email: 'hy.bang@gptko.co.kr' },
  { name: '소병우 실장', email: 'bw.so@aiweb.kr' },
  { name: '전주희 팀장', email: 'jh.jun@aiweb.kr' },
  { name: '박선영 팀장', email: 'sy.park@aiweb.kr' }
];

export default NotebookCard
