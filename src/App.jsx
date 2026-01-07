import { useState, useEffect, useCallback } from 'react'
import SourcePanel from './components/SourcePanel'
import ChatInterface from './components/ChatInterface'
import DataPreview from './components/DataPreview'
import PDFViewer from './components/PDFViewer'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import pdfViewerController from './utils/pdfViewerController'

function AppContent() {
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
  const { t } = useLanguage()

  // 선택된 소스들 가져오기
  const selectedSources = sources.filter(s => selectedSourceIds.includes(s.id))

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

  // 채팅 이력 업데이트 및 동기화 (ChatInterface → DataPreview)
  const handleChatUpdate = useCallback((messages) => {
    const formattedHistory = messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content,
      timestamp: msg.timestamp
    }))
    setChatHistory(formattedHistory)
    setLastSyncTime(new Date().toISOString())
    console.log('[App] 대화 이력 동기화:', formattedHistory.length, '개 메시지')
  }, [])

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
        highlightSectionIndex: pageNumber // 하이라이트할 섹션
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Header */}
      <div className="px-6 py-3 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('app.title')}</h1>
          <p className="text-sm text-gray-500">{t('app.subtitle')}</p>
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
