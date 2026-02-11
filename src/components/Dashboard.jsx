import { useState, useEffect, useMemo } from 'react'
import { Search, Plus } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import NotebookCard from './NotebookCard'
import {
  getAllNotebooks,
  createNotebook,
  updateNotebookTitle,
  updateNotebookIcon,
  deleteNotebook,
  sortNotebooksByDate
} from '../utils/notebookManager'

const MAX_NOTEBOOKS = 50 // 최대 노트북 개수
const NOTEBOOKS_PER_PAGE = 12 // 페이지당 노트북 개수 (4x3 그리드)
const MAX_PAGES = 5 // 최대 페이지 수

const Dashboard = ({ onNotebookSelect, showNotification, onShare, currentUserId }) => {
  const [notebooks, setNotebooks] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const { language } = useLanguage()

  // 초기 로드 및 리프레시: IndexedDB에서 노트북 불러오기
  const loadNotebooks = async () => {
    console.log('[Dashboard] 노트북 데이터 불러오기 시작')
    const loadedNotebooks = await getAllNotebooks(currentUserId)
    const sortedNotebooks = [...loadedNotebooks].sort((a, b) => {
      // 1. 공유받은 노트를 최상단으로 (소유자가 내가 아닌 경우)
      const aIsShared = a.ownerId && a.ownerId !== currentUserId;
      const bIsShared = b.ownerId && b.ownerId !== currentUserId;

      if (aIsShared && !bIsShared) return -1;
      if (!aIsShared && bIsShared) return 1;

      // 2. 나머지는 최신순 정렬
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    setNotebooks(sortedNotebooks)
    console.log('[Dashboard] 불러온 노트북 개수:', sortedNotebooks.length)
  }

  useEffect(() => {
    loadNotebooks()
  }, [currentUserId])

  // 컴포넌트가 다시 보일 때마다 노트북 목록 새로고침
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[Dashboard] 페이지 활성화 감지 - 노트북 목록 새로고침')
        loadNotebooks()
      }
    }

    window.addEventListener('focus', loadNotebooks)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', loadNotebooks)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // 검색 필터링 (클라이언트 사이드 실시간 필터링)
  const filteredNotebooks = useMemo(() => {
    if (searchQuery.trim() === '') {
      return notebooks
    }
    const query = searchQuery.toLowerCase()
    return notebooks.filter(nb =>
      nb.title.toLowerCase().includes(query)
    )
  }, [notebooks, searchQuery])

  // 페이지네이션 계산
  const totalPages = Math.min(
    Math.ceil(filteredNotebooks.length / NOTEBOOKS_PER_PAGE),
    MAX_PAGES
  )

  // 현재 페이지의 노트북들 ("새 노트 만들기" 카드 제외한 실제 노트북)
  const paginatedNotebooks = useMemo(() => {
    // 첫 페이지에서는 "새 노트 만들기" 카드가 1칸 차지하므로 11개만 표시
    const isFirstPage = currentPage === 1
    const offset = isFirstPage ? 0 : (currentPage - 1) * NOTEBOOKS_PER_PAGE - 1
    const limit = isFirstPage ? NOTEBOOKS_PER_PAGE - 1 : NOTEBOOKS_PER_PAGE

    return filteredNotebooks.slice(offset, offset + limit)
  }, [filteredNotebooks, currentPage])

  // 페이지 변경 시 범위 체크
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  // 새 노트북 생성 핸들러
  const handleCreateNotebook = async () => {
    if (notebooks.length >= MAX_NOTEBOOKS) {
      showNotification?.(
        language === 'ko' ? '노트북 생성 제한' : 'Notebook Limit Reached',
        language === 'ko'
          ? `노트북은 최대 ${MAX_NOTEBOOKS}개까지 생성할 수 있습니다.`
          : `You can create up to ${MAX_NOTEBOOKS} notebooks.`,
        'error'
      );
      return
    }

    const newNotebook = await createNotebook(
      language === 'ko' ? '새 노트북' : 'New Notebook',
      null,
      currentUserId
    )
    setNotebooks(prev => [newNotebook, ...prev])
    setCurrentPage(1) // 새 노트 생성 시 첫 페이지로 이동
    console.log('[Dashboard] 새 노트북 생성:', newNotebook.id)

    // 즉시 새 노트북으로 이동
    onNotebookSelect(newNotebook)
  }

  // 노트북 제목 수정 핸들러
  const handleTitleUpdate = async (id, newTitle) => {
    const updated = await updateNotebookTitle(id, newTitle)
    if (updated) {
      setNotebooks(prev =>
        prev.map(nb => (nb.id === id ? updated : nb))
      )
      console.log('[Dashboard] 노트북 제목 수정:', id, newTitle)
    }
  }

  // 노트북 삭제 핸들러
  const handleDelete = async (id) => {
    await deleteNotebook(id)
    setNotebooks(prev => prev.filter(nb => nb.id !== id))
    console.log('[Dashboard] 노트북 삭제:', id)
  }

  // 노트북 아이콘 변경 핸들러
  const handleIconUpdate = async (id, newIcon) => {
    const updated = await updateNotebookIcon(id, newIcon)
    if (updated) {
      setNotebooks(prev =>
        prev.map(nb => (nb.id === id ? updated : nb))
      )
      console.log('[Dashboard] 노트북 아이콘 변경:', id, newIcon)
    }
  }

  // 검색 핸들러 (실시간 필터링)
  const handleSearch = (e) => {
    const query = e.target.value
    setSearchQuery(query)
    setCurrentPage(1) // 검색 시 첫 페이지로 이동
  }

  // 페이지 버튼 클릭 핸들러
  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  return (
    <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
      {/* Mesh Gradient Background Orbs (Agents.jsx와 일관성 유지) */}
      <div className="absolute top-[-5%] right-[-5%] w-[600px] h-[600px] bg-blue-50/20 rounded-full blur-[110px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-50/20 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="flex-1 flex flex-col relative z-10 w-full overflow-y-auto">
        <main className="flex-1 flex flex-col max-w-7xl mx-auto px-10 py-12 w-full">
          {/* 검색창 - 그리드 바로 위 */}
          <div className="flex items-center justify-center mb-12">
            <div className="w-full max-w-2xl">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder={language === 'ko' ? '노트 검색' : 'Search notes'}
                  className="w-full pl-14 pr-6 py-4 bg-white/60 backdrop-blur-md border border-gray-100 rounded-2xl text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* 노트북 그리드 */}
          <section className="flex-1">
            {/* 4x3 그리드 */}
            <div className="grid grid-cols-4 gap-6">
              {/* 새 노트 만들기 카드 - 항상 첫 번째 위치 (1페이지에서만 표시) */}
              {currentPage === 1 && (
                <div
                  onClick={handleCreateNotebook}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 flex flex-col items-center justify-center group p-6"
                  style={{ aspectRatio: '320 / 280' }}
                >
                  <div className="w-14 h-14 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 shadow-sm border border-transparent">
                    <Plus className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-[17px] font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {language === 'ko' ? '새 노트 만들기' : 'Create New Note'}
                  </p>
                </div>
              )}

              {/* 노트북 카드들 */}
              {paginatedNotebooks.map(notebook => (
                <NotebookCard
                  key={notebook.id}
                  notebook={notebook}
                  onClick={() => onNotebookSelect(notebook)}
                  onTitleUpdate={handleTitleUpdate}
                  onDelete={handleDelete}
                  onIconUpdate={handleIconUpdate}
                  onShare={onShare}
                  currentUserId={currentUserId}
                />
              ))}
            </div>

            {/* 검색 결과 없음 */}
            {filteredNotebooks.length === 0 && searchQuery.trim() !== '' && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {language === 'ko'
                    ? '검색 결과가 없습니다.'
                    : 'No notebooks found.'}
                </p>
              </div>
            )}
          </section>

          {/* 페이지네이션 - 하단 고정 */}
          <div className="flex justify-center items-center py-8">
            {totalPages > 1 ? (
              <div className="flex space-x-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${currentPage === page
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-9" /> // 페이지가 1개일 때도 공간 유지
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
