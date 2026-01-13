import { useState, useEffect } from 'react'
import { Search, User, Settings as SettingsIcon, Plus, LayoutGrid, List } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import NotebookCard from './NotebookCard'
import {
  getAllNotebooks,
  createNotebook,
  updateNotebookTitle,
  deleteNotebook,
  sortNotebooksByDate,
  searchNotebooks
} from '../utils/notebookManager'

const Dashboard = ({ onNotebookSelect }) => {
  const [notebooks, setNotebooks] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const { language } = useLanguage()

  // 초기 로드 및 리프레시: IndexedDB에서 노트북 불러오기
  const loadNotebooks = async () => {
    console.log('[Dashboard] 노트북 데이터 불러오기 시작')
    const loadedNotebooks = await getAllNotebooks()
    const sortedNotebooks = sortNotebooksByDate(loadedNotebooks)
    setNotebooks(sortedNotebooks)
    console.log('[Dashboard] 불러온 노트북 개수:', sortedNotebooks.length)
  }

  useEffect(() => {
    loadNotebooks()
  }, [])

  // 컴포넌트가 다시 보일 때마다 노트북 목록 새로고침
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[Dashboard] 페이지 활성화 감지 - 노트북 목록 새로고침')
        loadNotebooks()
      }
    }

    // 포커스 이벤트로도 리프레시
    window.addEventListener('focus', loadNotebooks)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', loadNotebooks)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // 새 노트북 생성 핸들러
  const handleCreateNotebook = async () => {
    const newNotebook = await createNotebook(
      language === 'ko' ? '새 노트북' : 'New Notebook',
      '📄'
    )
    setNotebooks(prev => [newNotebook, ...prev])
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

  // 검색 핸들러
  const handleSearch = async (e) => {
    const query = e.target.value
    setSearchQuery(query)

    if (query.trim() === '') {
      // 검색어 없으면 전체 노트북 표시
      const allNotebooks = await getAllNotebooks()
      setNotebooks(sortNotebooksByDate(allNotebooks))
    } else {
      // 검색 실행
      const results = await searchNotebooks(query)
      setNotebooks(sortNotebooksByDate(results))
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* 로고 */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white text-sm font-bold tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Ag
                </span>
              </div>
              <h1 className="text-lg font-semibold text-gray-900 tracking-tight" style={{ fontFamily: 'Inter, Pretendard, sans-serif' }}>
                Agent Note
              </h1>
            </div>

            {/* 검색창 */}
            <div className="flex-1 max-w-3xl mx-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder={language === 'ko' ? '노트 검색...' : 'Search notes...'}
                  className="w-full pl-11 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            {/* 우측: 아이콘들 */}
            <div className="flex items-center space-x-2">
              {/* 뷰 모드 토글 */}
              <div className="flex items-center bg-gray-50 rounded-xl p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="그리드 뷰"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="리스트 뷰"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* 설정 아이콘 */}
              <button className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
                <SettingsIcon className="w-4 h-4 text-gray-400" />
              </button>

              {/* 프로필 아이콘 */}
              <button className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
                <User className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-8 py-6">
        {/* 노트북 그리드 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-800 mb-4">
            {language === 'ko' ? '최근 노트' : 'Recent Notes'}
          </h2>

          <div className={`grid gap-3 ${
            viewMode === 'grid'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'grid-cols-1'
          }`}>
            {/* 새 노트 만들기 카드 */}
            <div
              onClick={handleCreateNotebook}
              className="bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm p-6 cursor-pointer transition-all duration-200 hover:border-blue-600 hover:shadow-md flex flex-col items-center justify-center group"
              style={{ aspectRatio: '1 / 0.85' }}
            >
              <div className="w-11 h-11 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center mb-2.5 transition-colors">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-xs font-medium text-gray-500 group-hover:text-blue-600 transition-colors">
                {language === 'ko' ? '새 노트 만들기' : 'Create New Note'}
              </p>
            </div>

            {/* 노트북 카드들 */}
            {notebooks.map(notebook => (
              <NotebookCard
                key={notebook.id}
                notebook={notebook}
                onClick={() => onNotebookSelect(notebook)}
                onTitleUpdate={handleTitleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* 검색 결과 없음 */}
          {notebooks.length === 0 && searchQuery.trim() !== '' && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {language === 'ko'
                  ? '검색 결과가 없습니다.'
                  : 'No notebooks found.'}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Dashboard
