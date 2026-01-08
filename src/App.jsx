import { useState, useEffect, useCallback } from 'react'
import SourcePanel from './components/SourcePanel'
import ChatInterface from './components/ChatInterface'
import DataPreview from './components/DataPreview'
import PDFViewer from './components/PDFViewer'
import Dashboard from './components/Dashboard'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import pdfViewerController from './utils/pdfViewerController'
import {
  getNotebookById,
  updateNotebookSources,
  updateNotebookMessages,
  updateNotebookModel,
  updateNotebookSystemPrompt,
  updateNotebookAnalyzedSources
} from './utils/notebookManager'
import { ArrowLeft } from 'lucide-react'

function AppContent() {
  // 라우팅 상태
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard' or 'chat'
  const [currentNotebook, setCurrentNotebook] = useState(null) // 현재 선택된 노트북

  // 채팅 UI 상태
  const [sources, setSources] = useState([])
  const [selectedSourceIds, setSelectedSourceIds] = useState([])
  const [selectedModel, setSelectedModel] = useState('instant') // 'instant' or 'thinking' (기본값: 빠름 모드)
  const [pdfViewerState, setPdfViewerState] = useState({ isOpen: false, file: null, page: 1 })
  const [rightPanelState, setRightPanelState] = useState({ mode: 'natural', pdfPage: null }) // 우측 패널 상태
  const [systemPromptOverrides, setSystemPromptOverrides] = useState([]) // AI 시스템 프롬프트 덮어쓰기
  const [chatHistory, setChatHistory] = useState([]) // 실시간 대화 이력 (JSON 데이터 동기화용)
  const [lastSyncTime, setLastSyncTime] = useState(null) // 마지막 동기화 시간
  const [targetPage, setTargetPage] = useState(null) // PDF 뷰어 페이지 이동 타겟
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false) // AI 설정 패널 토글
  const [previousSourceId, setPreviousSourceId] = useState(null) // 이전 선택 파일 ID (지침 초기화 감지용)
  const [analyzedSourceIds, setAnalyzedSourceIds] = useState([]) // 이미 분석한 파일 ID 목록
  const { t } = useLanguage()

  // 선택된 소스들 가져오기
  const selectedSources = sources.filter(s => selectedSourceIds.includes(s.id))

  // 현재 노트북 데이터 저장 (IndexedDB)
  const saveCurrentNotebookData = useCallback(async () => {
    if (!currentNotebook) return

    console.log('[App] 현재 노트북 데이터 저장:', currentNotebook.id)

    try {
      // sources 업데이트 (IndexedDB는 대용량 지원)
      await updateNotebookSources(currentNotebook.id, sources)

      // selectedModel 업데이트
      await updateNotebookModel(currentNotebook.id, selectedModel)

      // systemPromptOverrides 업데이트
      await updateNotebookSystemPrompt(currentNotebook.id, systemPromptOverrides)

      console.log('[App] 노트북 데이터 저장 완료 (소스:', sources.length, '개)')
    } catch (error) {
      console.error('[App] 저장 실패:', error)
      alert('데이터 저장에 실패했습니다: ' + error.message)
    }
  }, [currentNotebook, sources, selectedModel, systemPromptOverrides])

  // 브라우저 뒤로가기/앞으로가기 지원
  useEffect(() => {
    const handlePopState = async (event) => {
      console.log('[App] popstate 이벤트:', event.state)

      if (event.state?.view === 'dashboard') {
        // 대시보드로 복귀
        if (currentNotebook) {
          await saveCurrentNotebookData()
        }
        setCurrentView('dashboard')
        setCurrentNotebook(null)
      } else if (event.state?.view === 'chat' && event.state?.notebookId) {
        // 특정 노트북으로 이동
        const savedNotebook = await getNotebookById(event.state.notebookId)
        if (savedNotebook) {
          setCurrentNotebook(savedNotebook)
          setSources(savedNotebook.sources || [])
          setSelectedSourceIds(savedNotebook.sources.map(s => s.id))
          setSelectedModel(savedNotebook.selectedModel || 'thinking')
          setSystemPromptOverrides(savedNotebook.systemPromptOverrides || [])

          // analyzedSourceIds 복원: 기존 메시지가 있으면 모든 소스를 분석됨으로 표시
          let restoredAnalyzedIds = savedNotebook.analyzedSourceIds || []
          if (savedNotebook.messages && savedNotebook.messages.length > 0 && savedNotebook.sources && savedNotebook.sources.length > 0) {
            const allSourceIds = savedNotebook.sources.map(s => s.id)
            restoredAnalyzedIds = [...new Set([...restoredAnalyzedIds, ...allSourceIds])]
          }
          setAnalyzedSourceIds(restoredAnalyzedIds)

          setCurrentView('chat')
        }
      }
    }

    window.addEventListener('popstate', handlePopState)

    // 초기 로드 시 URL 기반 라우팅
    const initializeRoute = async () => {
      const hash = window.location.hash
      if (hash.startsWith('#chat/')) {
        const notebookId = hash.replace('#chat/', '')
        const savedNotebook = await getNotebookById(notebookId)
        if (savedNotebook) {
          setCurrentNotebook(savedNotebook)
          setSources(savedNotebook.sources || [])
          setSelectedSourceIds(savedNotebook.sources.map(s => s.id))
          setSelectedModel(savedNotebook.selectedModel || 'thinking')
          setSystemPromptOverrides(savedNotebook.systemPromptOverrides || [])

          // analyzedSourceIds 복원: 기존 메시지가 있으면 모든 소스를 분석됨으로 표시
          let restoredAnalyzedIds = savedNotebook.analyzedSourceIds || []
          if (savedNotebook.messages && savedNotebook.messages.length > 0 && savedNotebook.sources && savedNotebook.sources.length > 0) {
            const allSourceIds = savedNotebook.sources.map(s => s.id)
            restoredAnalyzedIds = [...new Set([...restoredAnalyzedIds, ...allSourceIds])]
          }
          setAnalyzedSourceIds(restoredAnalyzedIds)

          setCurrentView('chat')
        }
      } else {
        // 기본값: 대시보드
        window.history.replaceState({ view: 'dashboard' }, '', '#dashboard')
      }
    }

    initializeRoute()

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 전역 PDF 뷰어 컨트롤러 초기화 (Event Bus 패턴)
  useEffect(() => {
    console.log('[App.jsx] PDF 뷰어 컨트롤러 리스너 등록')

    // 모드 변경 이벤트 리스너
    const handleModeChange = ({ mode, pageNumber }) => {
      console.log('[App.jsx] 모드 변경 이벤트 수신:', mode, '페이지:', pageNumber)
      setRightPanelState({ mode, pdfPage: pageNumber })
    }

    // 리스너 등록
    pdfViewerController.on('modeChange', handleModeChange)

    // 클린업: 컴포넌트 언마운트 시 리스너 제거
    return () => {
      console.log('[App.jsx] PDF 뷰어 컨트롤러 리스너 제거')
      pdfViewerController.off('modeChange', handleModeChange)
    }
  }, [])

  // 노트북 선택 핸들러 (Dashboard → Chat)
  const handleNotebookSelect = async (notebook) => {
    console.log('[App] 노트북 선택:', notebook.id, notebook.title)

    // 노트북 데이터 불러오기
    const savedNotebook = await getNotebookById(notebook.id)
    if (!savedNotebook) {
      console.error('[App] 노트북을 찾을 수 없음:', notebook.id)
      return
    }

    // 현재 노트북 설정
    setCurrentNotebook(savedNotebook)

    // 저장된 데이터로 상태 복원
    setSources(savedNotebook.sources || [])
    setSelectedSourceIds(savedNotebook.sources.map(s => s.id))
    setSelectedModel(savedNotebook.selectedModel || 'thinking')
    setSystemPromptOverrides(savedNotebook.systemPromptOverrides || [])

    // analyzedSourceIds 복원: 기존에 메시지가 있으면 모든 소스를 이미 분석한 것으로 간주
    let restoredAnalyzedIds = savedNotebook.analyzedSourceIds || []
    if (savedNotebook.messages && savedNotebook.messages.length > 0 && savedNotebook.sources && savedNotebook.sources.length > 0) {
      // 메시지가 있는 노트북이면 기존 파일들을 모두 분석됨으로 표시
      const allSourceIds = savedNotebook.sources.map(s => s.id)
      restoredAnalyzedIds = [...new Set([...restoredAnalyzedIds, ...allSourceIds])]
      console.log('[App] 📝 기존 메시지 존재 - 모든 소스를 분석됨으로 표시:', restoredAnalyzedIds)
    }
    setAnalyzedSourceIds(restoredAnalyzedIds)

    // 채팅 UI로 전환
    setCurrentView('chat')

    // 브라우저 히스토리에 상태 추가 (뒤로가기 지원)
    window.history.pushState({ view: 'chat', notebookId: notebook.id }, '', `#chat/${notebook.id}`)

    console.log('[App] 노트북 데이터 복원 완료')
    console.log('- 소스 개수:', savedNotebook.sources.length)
    console.log('- 메시지 개수:', savedNotebook.messages.length)
    console.log('- 선택된 모델:', savedNotebook.selectedModel)
    console.log('- 분석된 소스:', restoredAnalyzedIds.length)
  }

  // 대시보드로 돌아가기
  const handleBackToDashboard = async () => {
    console.log('[App] 대시보드로 복귀')

    // 현재 노트북 데이터 저장 (떠나기 전)
    if (currentNotebook) {
      await saveCurrentNotebookData()
    }

    setCurrentView('dashboard')
    setCurrentNotebook(null)

    // 브라우저 히스토리 업데이트
    window.history.pushState({ view: 'dashboard' }, '', '#dashboard')
  }

  // 소스 변경 시 자동 저장 (IndexedDB로 대용량 지원)
  useEffect(() => {
    if (currentNotebook && currentView === 'chat' && sources.length > 0) {
      console.log('[App] 소스 변경 감지 - 자동 저장')
      updateNotebookSources(currentNotebook.id, sources)
        .then(() => console.log('[App] 소스 자동 저장 완료:', sources.length, '개'))
        .catch(error => console.error('[App] 소스 저장 실패:', error))
    }
  }, [sources, currentNotebook, currentView])

  // 모델 변경 시 자동 저장
  useEffect(() => {
    if (currentNotebook && currentView === 'chat') {
      console.log('[App] 모델 변경 감지 - 자동 저장')
      updateNotebookModel(currentNotebook.id, selectedModel)
    }
  }, [selectedModel, currentNotebook, currentView])

  // 시스템 프롬프트 변경 시 자동 저장
  useEffect(() => {
    if (currentNotebook && currentView === 'chat') {
      console.log('[App] 시스템 프롬프트 변경 감지 - 자동 저장')
      updateNotebookSystemPrompt(currentNotebook.id, systemPromptOverrides)
    }
  }, [systemPromptOverrides, currentNotebook, currentView])

  // 파일 전환 감지 및 AI 지침 초기화
  useEffect(() => {
    const currentSourceId = selectedSources[0]?.id || null

    // 파일이 변경되었는지 확인 (처음 선택한 경우는 제외)
    if (previousSourceId !== null && currentSourceId !== previousSourceId) {
      console.log('[App.jsx] 🔄 파일 전환 감지! AI 지침 초기화')
      console.log('[App.jsx] 이전 파일 ID:', previousSourceId)
      console.log('[App.jsx] 새 파일 ID:', currentSourceId)

      // AI 지침 초기화
      setSystemPromptOverrides([])
    }

    // 현재 파일 ID 저장
    setPreviousSourceId(currentSourceId)
  }, [selectedSources[0]?.id])

  const handleAddSources = (newSources) => {
    setSources(prev => [...prev, ...newSources])

    // 첫 번째 소스 자동 선택
    if (sources.length === 0 && newSources.length > 0) {
      setSelectedSourceIds([newSources[0].id])
    }
  }

  const handleToggleSource = (sourceId) => {
    setSelectedSourceIds(prev => {
      if (prev.includes(sourceId)) {
        return prev.filter(id => id !== sourceId)
      } else {
        return [...prev, sourceId]
      }
    })
  }

  const handleDeleteSource = (sourceId) => {
    setSources(prev => prev.filter(s => s.id !== sourceId))
    setSelectedSourceIds(prev => prev.filter(id => id !== sourceId))
  }

  // 인용 배지 기능 제거됨

  const handleClosePDFViewer = () => {
    setPdfViewerState({ isOpen: false, file: null, page: 1 })
  }

  // 소스 데이터 업데이트 함수 (양방향 동기화)
  const handleUpdateSourceData = (sourceId, field, newValue) => {
    setSources(prev => prev.map(source => {
      if (source.id === sourceId) {
        // parsedData 내부 필드 업데이트
        return {
          ...source,
          parsedData: {
            ...source.parsedData,
            [field]: newValue
          }
        }
      }
      return source
    }))
    console.log('[App] 소스 데이터 업데이트:', sourceId, field, newValue)
  }

  // 소스 이름 업데이트 함수
  const handleUpdateSourceName = (sourceId, newName) => {
    setSources(prev => prev.map(source => {
      if (source.id === sourceId) {
        return {
          ...source,
          name: newName
        }
      }
      return source
    }))
    console.log('[App] 소스 이름 업데이트:', sourceId, newName)
  }

  // 채팅 이력 업데이트 및 동기화 (ChatInterface → DataPreview + localStorage)
  const handleChatUpdate = useCallback((messages) => {
    const formattedHistory = messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content,
      timestamp: msg.timestamp
    }))
    setChatHistory(formattedHistory)
    setLastSyncTime(new Date().toISOString())

    // 현재 노트북의 메시지 자동 저장 (용량 초과 시 경고)
    if (currentNotebook) {
      try {
        updateNotebookMessages(currentNotebook.id, messages)
        console.log('[App] 메시지 자동 저장:', messages.length, '개')
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          console.error('[App] localStorage 용량 초과 - 메시지 저장 실패')
          // 사용자에게 한 번만 알림 (중복 방지)
          if (!window._quotaWarningShown) {
            window._quotaWarningShown = true
            alert('저장 공간이 부족하여 대화 내용을 저장할 수 없습니다.\n\n해결 방법:\n1. 브라우저 콘솔(F12)에서 localStorage.clear() 실행\n2. 오래된 노트북 삭제\n3. 대화 내용이 길면 새 노트북으로 시작')
          }
        } else {
          console.error('[App] 메시지 저장 실패:', error)
        }
      }
    }

    console.log('[App] 대화 이력 동기화:', formattedHistory.length, '개 메시지')
  }, [currentNotebook])

  // 분석된 소스 ID 업데이트 (ChatInterface → IndexedDB)
  const handleAnalyzedSourcesUpdate = useCallback((newAnalyzedIds) => {
    console.log('[App] 분석된 소스 ID 업데이트:', newAnalyzedIds)
    setAnalyzedSourceIds(newAnalyzedIds)

    // IndexedDB에 자동 저장
    if (currentNotebook) {
      updateNotebookAnalyzedSources(currentNotebook.id, newAnalyzedIds)
        .then(() => console.log('[App] 분석된 소스 ID 저장 완료'))
        .catch(error => console.error('[App] 분석된 소스 ID 저장 실패:', error))
    }
  }, [currentNotebook])

  // 인용 배지 클릭 시 페이지 이동 핸들러
  const handlePageClick = useCallback((pageNumber) => {
    console.log('═══════════════════════════════════════════════════════')
    console.log('[App.jsx] 🔵 인용 배지 클릭 감지!')
    console.log('[App.jsx] 목표 페이지:', pageNumber)
    console.log('[App.jsx] 현재 우측 패널 모드:', rightPanelState.mode)
    console.log('[App.jsx] AI 설정 패널 열림 상태:', isSettingsPanelOpen)

    // 다중 파일 지원: 페이지 번호로 해당 파일 찾기
    let targetFile = selectedSources[0]
    let localPageNumber = pageNumber

    if (selectedSources.length > 1) {
      // 페이지 범위 계산
      let cumulativePageOffset = 0
      for (const source of selectedSources) {
        const pageCount = source.parsedData?.pageCount || source.parsedData?.pageTexts?.length || 0
        const startPage = cumulativePageOffset + 1
        const endPage = cumulativePageOffset + pageCount

        if (pageNumber >= startPage && pageNumber <= endPage) {
          targetFile = source
          localPageNumber = pageNumber - cumulativePageOffset
          console.log(`[App.jsx] ✅ 파일 찾음: ${source.name}, 로컬 페이지: ${localPageNumber}`)
          break
        }

        cumulativePageOffset = endPage
      }
    }

    // 선택된 파일의 파일 타입 확인
    const fileType = targetFile?.parsedData?.fileType
    console.log('[App.jsx] 파일 타입:', fileType)
    console.log('[App.jsx] 대상 파일:', targetFile?.name)
    console.log('[App.jsx] 로컬 페이지 번호:', localPageNumber)
    console.log('═══════════════════════════════════════════════════════')

    // PDF가 아닌 파일일 경우 (Word, Excel, TXT, JSON 등) - 텍스트 미리보기 표시
    if (fileType !== 'pdf') {
      console.log('[App.jsx] 📄 텍스트 파일 인용 클릭 - 우측 패널에 텍스트 표시. 파일 타입:', fileType)

      // 우측 패널이 닫혀있으면 자동으로 열기
      if (!isSettingsPanelOpen) {
        console.log('[App.jsx] ✅ 우측 패널 자동 열기')
        setIsSettingsPanelOpen(true)
      }

      // 해당 "페이지 번호"를 섹션 인덱스로 간주
      // 우측 패널을 텍스트 뷰어 모드로 전환 (전체 문서 표시 + 해당 섹션 하이라이트)
      setRightPanelState({
        mode: 'text-preview',
        highlightSectionIndex: pageNumber, // 하이라이트할 섹션
        targetFile: targetFile // 대상 파일 설정
      })

      // targetPage 설정 (DataPreview가 감지하여 스크롤 실행)
      setTargetPage(pageNumber)
      console.log('[App.jsx] ✅ 우측 패널 → 텍스트 뷰어 모드, 섹션', pageNumber, '으로 스크롤')

      // targetPage 리셋 (다음 클릭을 위해)
      setTimeout(() => {
        setTargetPage(null)
        console.log('[App.jsx] 🔄 targetPage 리셋 완료')
      }, 500)

      return
    }

    // 0️⃣ 설정 패널이 닫혀있으면 자동으로 열기
    if (!isSettingsPanelOpen) {
      console.log('[App.jsx] ✅ AI 설정 패널 자동 열기')
      setIsSettingsPanelOpen(true)
    }

    // 1️⃣ 즉시 PDF 뷰어 모드로 전환 (강제) - 로컬 페이지 번호 사용
    setRightPanelState({ mode: 'pdf', pdfPage: localPageNumber, targetFile: targetFile })
    console.log('[App.jsx] ✅ 우측 패널 모드 → PDF 뷰어로 전환 (로컬 페이지:', localPageNumber, ')')

    // 2️⃣ targetPage 설정 (DataPreview가 감지하여 스크롤 실행) - 로컬 페이지 번호 사용
    setTargetPage(localPageNumber)
    console.log('[App.jsx] ✅ targetPage 설정:', localPageNumber)

    // 3️⃣ targetPage 리셋 (다음 클릭을 위해)
    setTimeout(() => {
      setTargetPage(null)
      console.log('[App.jsx] 🔄 targetPage 리셋 완료')
    }, 500)
  }, [selectedSources, rightPanelState.mode, isSettingsPanelOpen])

  // 대시보드 뷰
  if (currentView === 'dashboard') {
    return <Dashboard onNotebookSelect={handleNotebookSelect} />
  }

  // 채팅 뷰
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Header - 뒤로가기 버튼 포함 */}
      <div className="px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          {/* 뒤로가기 버튼 */}
          <button
            onClick={handleBackToDashboard}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="대시보드로 돌아가기"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">대시보드</span>
          </button>

          {/* 현재 노트북 제목 */}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {currentNotebook?.emoji} {currentNotebook?.title || t('app.title')}
            </h1>
            <p className="text-xs text-gray-500">
              {currentNotebook?.sources?.length || 0}개의 소스 · {selectedModel === 'instant' ? '빠름 모드' : selectedModel === 'thinking' ? '심층 모드' : 'Gemini'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - 반응형 레이아웃 (토글형 우측 패널) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Sources (20%) - 파일 업로드 패널 */}
        <div className="border-r border-gray-200 bg-white overflow-hidden" style={{ width: '20%' }}>
          <SourcePanel
            sources={sources}
            onAddSources={handleAddSources}
            selectedSourceIds={selectedSourceIds}
            onToggleSource={handleToggleSource}
            onDeleteSource={handleDeleteSource}
          />
        </div>

        {/* Center Panel - Chat Interface (동적 너비: 80% or 45%) */}
        <div
          className="bg-white overflow-hidden border-r border-gray-200 transition-all duration-300 ease-in-out"
          style={{ width: isSettingsPanelOpen ? '45%' : '80%' }}
        >
          <ChatInterface
            selectedSources={selectedSources}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            systemPromptOverrides={systemPromptOverrides}
            onChatUpdate={handleChatUpdate}
            onPageClick={handlePageClick}
            isSettingsPanelOpen={isSettingsPanelOpen}
            onToggleSettingsPanel={() => setIsSettingsPanelOpen(!isSettingsPanelOpen)}
            initialMessages={currentNotebook?.messages || []}
            analyzedSourceIds={analyzedSourceIds}
            onAnalyzedSourcesUpdate={handleAnalyzedSourcesUpdate}
          />
        </div>

        {/* Right Panel - AI 설정 패널 (토글형, 35%) */}
        {isSettingsPanelOpen && (
          <div
            className="bg-gradient-to-b from-gray-50 to-gray-100 overflow-hidden transition-all duration-300 ease-in-out animate-slide-in"
            style={{ width: '35%' }}
          >
            <DataPreview
              selectedFile={rightPanelState.targetFile || selectedSources[0]}
              rightPanelState={rightPanelState}
              onPanelModeChange={(mode) => setRightPanelState({ mode, pdfPage: null })}
              onUpdateData={handleUpdateSourceData}
              onUpdateName={handleUpdateSourceName}
              onSystemPromptUpdate={setSystemPromptOverrides}
              chatHistory={chatHistory}
              lastSyncTime={lastSyncTime}
              systemPromptOverrides={systemPromptOverrides}
              targetPage={targetPage}
              onClose={() => setIsSettingsPanelOpen(false)}
            />
          </div>
        )}
      </div>

      {/* PDF 뷰어 모달 */}
      {pdfViewerState.isOpen && (
        <PDFViewer
          file={pdfViewerState.file}
          initialPage={pdfViewerState.page}
          onClose={handleClosePDFViewer}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  )
}

export default App
