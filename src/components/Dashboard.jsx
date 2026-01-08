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

  // 초기 로드: IndexedDB에서 노트북 불러오기
  useEffect(() => {
    console.log('[Dashboard] 노트북 데이터 불러오기 시작')
    getAllNotebooks().then(loadedNotebooks => {
      const sortedNotebooks = sortNotebooksByDate(loadedNotebooks)
      setNotebooks(sortedNotebooks)
      console.log('[Dashboard] 불러온 노트북 개수:', sortedNotebooks.length)
    })
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
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* 로고 */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {language === 'ko' ? 'NotebookLM 대시보드' : 'NotebookLM Dashboard'}
                </h1>
                <p className="text-xs text-gray-500">
                  {language === 'ko' ? '문서 기반 AI 분석 도구' : 'AI-Powered Document Analysis Tool'}
                </p>
              </div>
            </div>

            {/* 검색창 */}
            <div className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder={language === 'ko' ? '노트북 검색...' : 'Search notebooks...'}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-transparent rounded-full text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>
            </div>

            {/* 우측: 뷰 모드 + 프로필 */}
            <div className="flex items-center space-x-3">
              {/* 뷰 모드 토글 */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded ${
                    viewMode === 'grid'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="그리드 뷰"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="리스트 뷰"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* 프로필 아이콘 */}
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <User className="w-5 h-5 text-gray-600" />
              </button>

              {/* 설정 아이콘 */}
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <SettingsIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* 탭 */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button className="pb-3 border-b-2 border-blue-600 text-blue-600 font-medium text-sm">
              {language === 'ko' ? '전체' : 'All'}
            </button>
          </nav>
        </div>

        {/* 노트북 그리드 */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {language === 'ko' ? '최근 노트북' : 'Recent Notebooks'}
          </h2>

          <div className={`grid gap-4 ${
            viewMode === 'grid'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'grid-cols-1'
          }`}>
            {/* 새 노트 만들기 카드 */}
            <div
              onClick={handleCreateNotebook}
              className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 cursor-pointer transition-all duration-200 hover:border-blue-500 hover:bg-blue-50 flex flex-col items-center justify-center min-h-[200px] group"
            >
              <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-full flex items-center justify-center mb-3 transition-colors">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
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
