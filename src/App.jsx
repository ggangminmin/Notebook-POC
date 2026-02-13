import React, { useState, useEffect, useCallback } from 'react'
import SourcePanel from './components/SourcePanel'
import SystemPromptPanel from './components/SystemPromptPanel'
import ChatInterface from './components/ChatInterface'
import DataPreview from './components/DataPreview'
import PDFViewer from './components/PDFViewer'
import Dashboard from './components/Dashboard'
import Agents from './components/Agents'
import OCRPoc from './components/OCRPoc'
import ChatAI from './components/ChatAI'
import AdminPanel from './components/AdminPanel'
import CompanyAdminPanel from './components/CompanyAdminPanel'
import NotebookManageModal from './components/NotebookManageModal'
import AuthModal from './components/AuthModal'
import LoginPage from './components/LoginPage'
import Notification from './components/Notification'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import pdfViewerController from './utils/pdfViewerController'
import { supabase } from './utils/supabaseClient'
import {
  getNotebookById,
  updateNotebookSources,
  updateNotebookMessages,
  updateNotebookModel,
  updateNotebookSystemPrompt,
  updateNotebookAnalyzedSources,
  updateNotebookSelectedSourceIds,
  updateNotebookSharing,
  updateNotebookSettings
} from './utils/notebookManager'
import { migrateFromIndexedDB, localClearAllNotebooks } from './utils/storage'
import { testSupabaseConnection } from './utils/supabaseClient'
import { ChevronLeft, User, LogOut, ChevronDown, MessageSquare, Zap } from 'lucide-react'

const CURRENT_USER_ID = 'user-minseok' // fallback (로컬 테스트용)

function AppContent() {
  // 언어 설정
  const { language, t } = useLanguage()

  // 라우팅 상태
  const [currentView, setCurrentView] = useState('chat-ai') // 'chat-ai' as default view
  const [currentNotebook, setCurrentNotebook] = useState(null) // 현재 선택된 노트북

  // 채팅 UI 상태
  const [sources, setSources] = useState([])
  const [selectedSourceIds, setSelectedSourceIds] = useState([])
  const [selectedModel, setSelectedModel] = useState('instant') // 'instant' or 'instant' (기본값: 빠름 모드)
  const [pdfViewerState, setPdfViewerState] = useState({ isOpen: false, file: null, page: 1 })
  const [rightPanelState, setRightPanelState] = useState({ mode: 'natural', pdfPage: null }) // 우측 패널 상태
  const [systemPromptOverrides, setSystemPromptOverrides] = useState([]) // AI 시스템 프롬프트 덮어쓰기
  const [chatHistory, setChatHistory] = useState([]) // 실시간 대화 이력 (JSON 데이터 동기화용)
  const [lastSyncTime, setLastSyncTime] = useState(null) // 마지막 동기화 시간
  const [targetPage, setTargetPage] = useState(null) // PDF 뷰어 페이지 이동 타겟
  const [targetTime, setTargetTime] = useState(null) // 유튜브 영상 시간 이동 타겟
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false) // AI 설정 패널 토글
  const [previousSourceId, setPreviousSourceId] = useState(null) // 이전 선택 파일 ID (지침 초기화 감지용)
  const [analyzedSourceIds, setAnalyzedSourceIds] = useState([]) // 이미 분석한 파일 ID 목록
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false) // 소스 추가 모달 열림 상태
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false) // AI 지침 설정 모달 상태
  const [isNotebookSettingsOpen, setIsNotebookSettingsOpen] = useState(false) // 노트북 설정 모달 상태
  const [isShareModalOpen, setIsShareModalOpen] = useState(false) // 공유 설정 모달 상태
  const [shareTargetNotebook, setShareTargetNotebook] = useState(null) // 공유 대상 노트북
  const [isSourcePanelCollapsed, setIsSourcePanelCollapsed] = useState(false) // 소스 패널 접힘 상태

  // Auth 관련 상태
  const [user, setUser] = useState(null)
  const [isAuthRestored, setIsAuthRestored] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  // 알림(Notification) 상태
  const [notification, setNotification] = useState({
    isVisible: false,
    message: '',
    subMessage: '',
    type: 'success'
  })

  const currentUserId = user?.email || user?.id || CURRENT_USER_ID;
  const isMasterAdmin =
    user?.email === 'admin@test.com' ||
    user?.email === 'admin.master@gptko.co.kr';
  const isCompanyAdmin =
    user?.email === 'admin@gptko.co.kr' ||
    user?.email === 'admin@aiweb.kr' ||
    user?.user_metadata?.role === 'company_admin';
  const isAdmin = isMasterAdmin || isCompanyAdmin;
  const isReadOnly = currentNotebook?.ownerId && currentNotebook.ownerId !== currentUserId && !isAdmin;

  // 알림 표시 함수
  const showNotification = useCallback((message, subMessage = '', type = 'success') => {
    setNotification({
      isVisible: true,
      message,
      subMessage,
      type
    })
  }, [])

  // 초기 마운트 감지 (useRef) - 각 자동 저장마다 별도로 관리
  const isInitialMountSources = React.useRef(true)
  const isInitialMountModel = React.useRef(true)
  const isInitialMountSystemPrompt = React.useRef(true)

  // 마지막 저장된 sources ID 목록 추적 (무한 루프 방지)
  const lastSavedSourceIds = React.useRef([])

  // 디바운스 타이머 ref (자동 저장 최적화)
  const saveMessagesTimerRef = React.useRef(null)


  // 상태 추적용 ref (이벤트 리스너에서 최신 값 참조용)
  const currentNotebookRef = React.useRef(currentNotebook)
  const currentViewRef = React.useRef(currentView)

  // 상태가 변경될 때마다 ref 업데이트
  useEffect(() => {
    currentNotebookRef.current = currentNotebook
  }, [currentNotebook])

  useEffect(() => {
    currentViewRef.current = currentView
  }, [currentView])

  // ArrayBuffer를 File 객체로 변환하는 헬퍼 함수
  const bufferToFile = (buffer, metadata) => {
    if (!buffer || !metadata) return null
    try {
      const blob = new Blob([buffer], { type: metadata.type })
      return new File([blob], metadata.name, {
        type: metadata.type,
        lastModified: metadata.lastModified
      })
    } catch (error) {
      console.error('[App] File 객체 변환 실패:', error)
      return null
    }
  }

  // 선택된 소스들 가져오기 (fileBuffer를 file로 변환)
  const selectedSources = sources
    .filter(s => selectedSourceIds.includes(s.id))
    .map(source => {
      // fileBuffer가 있으면 File 객체로 변환
      if (source.fileBuffer && source.fileMetadata && !source.file) {
        return {
          ...source,
          file: bufferToFile(source.fileBuffer, source.fileMetadata)
        }
      }
      return source
    })

  // 현재 노트북 데이터 저장 (통합 저장 방식으로 개선)
  const saveCurrentNotebookData = useCallback(async (targetNotebook = null) => {
    const notebookToSave = targetNotebook || currentNotebook
    if (!notebookToSave) return

    console.log('[App] 💾 노트북 데이터 통합 저장 시작:', notebookToSave.id)

    try {
      // 모든 변경 사항을 하나의 객체로 모아 한 번에 업데이트 (성능 및 안정성 향상)
      const updates = {
        sources,
        selectedModel,
        systemPromptOverrides,
        analyzedSourceIds,
        messages: chatHistory // 채팅 내역 포함
      }

      // notebookManager의 통합 업데이트 호출
      await updateNotebook(notebookToSave.id, updates, currentUserId)

      console.log('[App] ✅ 모든 노트북 데이터 저장 완료 (Sources, Messages, Settings)')
    } catch (error) {
      console.error('[App] ❌ 통합 저장 실패:', error)
    }
  }, [currentNotebook, sources, selectedModel, systemPromptOverrides, chatHistory, analyzedSourceIds, currentUserId])

  // 브라우저 뒤로가기/앞으로가기 지원
  useEffect(() => {
    const handlePopState = async (event) => {
      console.log('[App] popstate 이벤트:', event.state)
      const state = event.state
      const hash = window.location.hash
      const currentView = currentViewRef.current
      const currentNotebook = currentNotebookRef.current

      // 1. 대시보드 브라우저 백/포워드 처리
      if (state?.view === 'dashboard' || (!state && (hash === '' || hash === '#dashboard'))) {
        // UI 즉시 전환
        setCurrentView('dashboard')
        setCurrentNotebook(null)

        // 백그라운드 저장
        if (currentNotebook && currentView === 'chat') {
          saveCurrentNotebookData(currentNotebook)
        }
      }
      // 2. 채팅 뷰 브라우저 백/포워드 처리
      else if ((state?.view === 'chat' && state?.notebookId) || (!state && hash.startsWith('#chat/'))) {
        const notebookId = state?.notebookId || hash.replace('#chat/', '')

        if (currentNotebook?.id === notebookId && currentView === 'chat') {
          return
        }

        // 채팅 뷰 이동은 데이터를 불러와야 하므로 await 필요
        const savedNotebook = await getNotebookById(notebookId, currentUserId)
        if (savedNotebook) {
          // 상태 복원 전 mount 플래그 설정 (자동 저장 방지)
          isInitialMountSources.current = true
          isInitialMountModel.current = true
          isInitialMountSystemPrompt.current = true

          setCurrentNotebook(savedNotebook)
          setSources(savedNotebook.sources || [])
          setSelectedSourceIds(savedNotebook.selectedSourceIds && savedNotebook.selectedSourceIds.length > 0
            ? savedNotebook.selectedSourceIds
            : (savedNotebook.sources || []).map(s => s.id)
          )
          setSelectedModel(savedNotebook.selectedModel || 'instant')
          setSystemPromptOverrides(savedNotebook.systemPromptOverrides || [])

          // 대화 이력 복원
          if (savedNotebook.messages) {
            setChatHistory(savedNotebook.messages.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp
            })))
          } else {
            setChatHistory([])
          }

          // analyzedSourceIds 복원
          let restoredAnalyzedIds = savedNotebook.analyzedSourceIds || []
          if (savedNotebook.messages && savedNotebook.messages.length > 0 && savedNotebook.sources && savedNotebook.sources.length > 0) {
            const allSourceIds = savedNotebook.sources.map(s => s.id)
            restoredAnalyzedIds = [...new Set([...restoredAnalyzedIds, ...allSourceIds])]
          }
          setAnalyzedSourceIds(restoredAnalyzedIds)

          setCurrentView('chat')
        }
      }
      // 3. 기타 뷰 처리
      else if (state?.view === 'agents' || (!state && hash === '#agents')) {
        setCurrentView('agents')
        setCurrentNotebook(null)
        if (currentNotebook && currentView === 'chat') {
          saveCurrentNotebookData(currentNotebook)
        }
      } else if (state?.view === 'ocr-poc' || (!state && hash === '#ocr-poc')) {
        setCurrentView('ocr-poc')
      } else if (state?.view === 'chat-ai' || (!state && hash === '#chat-ai')) {
        setCurrentView('chat-ai')
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // 초기 로드 시 URL 기반 라우팅 (Auth 복구 후 실행)
  useEffect(() => {
    if (!isAuthRestored) return

    const initializeRoute = async () => {
      const hash = window.location.hash

      if (hash.startsWith('#chat/')) {
        const notebookId = hash.replace('#chat/', '')
        const savedNotebook = await getNotebookById(notebookId, currentUserId)
        if (savedNotebook) {
          // 🔥 중요: 초기 로드 시 자동 저장 방지
          isInitialMountSources.current = true
          isInitialMountModel.current = true
          isInitialMountSystemPrompt.current = true
          lastSavedSourceIds.current = (savedNotebook.sources || []).map(s => s.id).sort().join(',')

          setCurrentNotebook(savedNotebook)
          setSources(savedNotebook.sources || [])

          if (savedNotebook.selectedSourceIds && savedNotebook.selectedSourceIds.length > 0) {
            setSelectedSourceIds(savedNotebook.selectedSourceIds)
          } else {
            setSelectedSourceIds((savedNotebook.sources || []).map(s => s.id))
          }

          setSelectedModel(savedNotebook.selectedModel || 'instant')
          setSystemPromptOverrides(savedNotebook.systemPromptOverrides || [])

          // 대화 이력 복원 (소유자이거나 마스터인 경우)
          const isMaster = isAdmin || (user?.email && (user.email === 'admin@test.com' || user.email === 'demo-admin'));
          const isOwner = savedNotebook.ownerId === currentUserId || !savedNotebook.ownerId || isMaster;

          if (isOwner && savedNotebook.messages) {
            setChatHistory(savedNotebook.messages.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp
            })))
          } else {
            setChatHistory([])
          }

          // analyzedSourceIds 복원
          let restoredAnalyzedIds = savedNotebook.analyzedSourceIds || []
          if (savedNotebook.messages && savedNotebook.messages.length > 0 && savedNotebook.sources && savedNotebook.sources.length > 0) {
            const allSourceIds = savedNotebook.sources.map(s => s.id)
            restoredAnalyzedIds = [...new Set([...restoredAnalyzedIds, ...allSourceIds])]
          }
          setAnalyzedSourceIds(restoredAnalyzedIds)

          setCurrentView('chat')
        }
      } else if (hash === '#agents') {
        setCurrentView('agents')
      } else if (hash === '#ocr-poc') {
        setCurrentView('ocr-poc')
      } else if (hash === '#chat-ai') {
        setCurrentView('chat-ai')
      } else {
        // 기본값: Chat AI (사용자 요청)
        if (!hash || hash === '#dashboard' || hash === '') {
          window.history.replaceState({ view: 'chat-ai' }, '', '#chat-ai')
          setCurrentView('chat-ai')
        }
      }
    }

    initializeRoute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthRestored, currentUserId])

  // Supabase 연결 테스트 (앱 시작 시 1회)
  useEffect(() => {
    const initializeSupabase = async () => {
      console.log('[Supabase] 연결 테스트 시작...')

      const isConnected = await testSupabaseConnection()

      if (isConnected) {
        console.log('[Supabase] ✅ 연결 성공!')
        console.log('[Supabase] 이제 모든 데이터가 클라우드에 저장됩니다.')
      } else {
        console.error('[Supabase] ❌ 연결 실패!')
        console.error('[Supabase] Supabase URL과 API 키를 확인하세요.')
      }

      // 🔥 마이그레이션은 비활성화 (중복 저장 방지)
      // 필요 시 브라우저 콘솔에서 수동 실행:
      // import { migrateFromIndexedDB } from './utils/storage'
      // migrateFromIndexedDB()
    }

    initializeSupabase()
  }, [])

  // 🔥 Auth 세션 감시
  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setIsAuthRestored(true)
    })

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      setIsAuthRestored(true)
    })

    return () => subscription.unsubscribe()
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

    // 노트북 데이터 불러오기 (현재 유저 ID 전달 필수)
    const savedNotebook = await getNotebookById(notebook.id, currentUserId)
    if (!savedNotebook) {
      console.error('[App] 노트북을 찾을 수 없음:', notebook.id)
      return
    }

    // 🔥 중요: 데이터 복원 전에 모든 자동 저장 ref를 초기화 (무한 루프 방지)
    isInitialMountSources.current = true
    isInitialMountModel.current = true
    isInitialMountSystemPrompt.current = true
    lastSavedSourceIds.current = (savedNotebook.sources || []).map(s => s.id).sort().join(',')

    // 현재 노트북 설정 및 Ref 업데이트 (저장용)
    setCurrentNotebook(savedNotebook)
    currentNotebookRef.current = savedNotebook

    // 저장된 데이터로 상태 복원
    setSources(savedNotebook.sources || [])

    // 이전에 선택된 ID가 있으면 그것으로 복원, 없으면 전체 선택
    if (savedNotebook.selectedSourceIds && savedNotebook.selectedSourceIds.length > 0) {
      setSelectedSourceIds(savedNotebook.selectedSourceIds)
    } else {
      setSelectedSourceIds((savedNotebook.sources || []).map(s => s.id))
    }
    setSelectedModel(savedNotebook.selectedModel || 'instant')
    setSystemPromptOverrides(savedNotebook.systemPromptOverrides || [])

    // 대화 이력 상태 복원
    // getNotebookById에서 이미 유저별로 필터링된 메시지를 반환함
    if (savedNotebook.messages && savedNotebook.messages.length > 0) {
      const formattedHistory = savedNotebook.messages.map(msg => ({
        ...msg,
        role: msg.role || msg.type || 'assistant',
        type: msg.type || msg.role || 'assistant'
      }))
      setChatHistory(formattedHistory)
    } else {
      setChatHistory([])
    }

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
    console.log('- 소스 개수:', savedNotebook.sources?.length || 0)
    console.log('- 소스 상세:', savedNotebook.sources)
    console.log('- 메시지 개수:', savedNotebook.messages?.length || 0)
    console.log('- 선택된 모델:', savedNotebook.selectedModel)
    console.log('- 분석된 소스:', restoredAnalyzedIds.length)
  }

  // 에이전트 실행 핸들러
  const handleAgentExecute = (agent) => {
    console.log('[App] 에이전트 실행:', agent.title, agent.id)
    if (agent.id === 26) {
      setCurrentView('ocr-poc')
      // 브라우저 히스토리 업데이트
      window.history.pushState({ view: 'ocr-poc' }, '', '#ocr-poc')
    } else {
      showNotification(
        language === 'ko' ? '서비스 준비 중' : 'Service Coming Soon',
        language === 'ko' ? `[${agent.title}] 기능은 현재 개발 중입니다.` : `The [${agent.title}] feature is currently under development.`,
        'info'
      )
    }
  }

  // 대시보드로 돌아가기
  const handleBackToDashboard = async () => {
    console.log('[App] 대시보드로 복귀')

    // 1. UI 상태 즉시 변경 (사용자 체감 속도 향상)
    setCurrentView('dashboard')
    const notebookToSave = currentNotebook // 현재 노트북 캡처
    setCurrentNotebook(null)

    // 2. 브라우저 히스토리 업데이트
    if (window.location.hash !== '#dashboard') {
      window.history.pushState({ view: 'dashboard' }, '', '#dashboard')
    }

    // 3. 백그라운드에서 데이터 저장
    if (notebookToSave) {
      try {
        // 명시적으로 저장할 대상을 전달하여 상태가 null이 되어도 저장 보장
        saveCurrentNotebookData(notebookToSave)
      } catch (error) {
        console.error('[App] 대시보드 복귀 중 저장 실패:', error)
      }
    }
  }

  // 소스 변경 시 자동 저장 (IndexedDB로 대용량 지원)
  useEffect(() => {
    const currentSourceIds = sources.map(s => s.id).sort().join(',')

    // 초기 마운트 시에는 저장하지 않음
    if (isInitialMountSources.current) {
      console.log('[App] 🔵 소스 초기 마운트 - 저장 스킵')
      isInitialMountSources.current = false
      lastSavedSourceIds.current = currentSourceIds
      return
    }

    // 🔥 중요: 소스 ID 목록이 변경되지 않았으면 저장하지 않음 (무한 루프 방지)
    if (currentSourceIds === lastSavedSourceIds.current) {
      console.log('[App] ⏭️ 소스 변경 없음 - 저장 스킵 (무한루프 방지)')
      return
    }

    if (currentNotebook && currentView === 'chat') {
      console.log('[App] 🟢 소스 변경 감지 - 자동 저장 시작')
      console.log('[App] 이전 IDs:', lastSavedSourceIds.current)
      console.log('[App] 현재 IDs:', currentSourceIds)
      console.log('[App] 소스 개수:', sources.length)

      // 저장 전에 ID 목록 업데이트
      lastSavedSourceIds.current = currentSourceIds

      updateNotebookSources(currentNotebook.id, sources, currentUserId)
        .then(() => {
          console.log('[App] ✅ 소스 자동 저장 완료:', sources.length, '개')
          console.log('[App] 노트북 ID:', currentNotebook.id)
        })
        .catch(error => console.error('[App] ❌ 소스 저장 실패:', error))
    } else {
      console.log('[App] ⚠️ 소스 저장 조건 미충족:', {
        hasNotebook: !!currentNotebook,
        view: currentView
      })
    }
  }, [sources, currentNotebook, currentView])

  // 모델 변경 시 자동 저장
  useEffect(() => {
    // 초기 마운트 시에는 저장하지 않음
    if (isInitialMountModel.current) {
      isInitialMountModel.current = false
      return
    }

    if (currentNotebook && currentView === 'chat') {
      console.log('[App] 모델 변경 감지 - 자동 저장')
      updateNotebookModel(currentNotebook.id, selectedModel, currentUserId)
    }
  }, [selectedModel, currentNotebook, currentView])

  // 시스템 프롬프트 변경 시 자동 저장
  useEffect(() => {
    // 초기 마운트 시에는 저장하지 않음
    if (isInitialMountSystemPrompt.current) {
      isInitialMountSystemPrompt.current = false
      return
    }

    if (currentNotebook && currentView === 'chat') {
      console.log('[App] 시스템 프롬프트 변경 감지 - 자동 저장')
      updateNotebookSystemPrompt(currentNotebook.id, systemPromptOverrides, currentUserId)
    }
  }, [systemPromptOverrides, currentNotebook, currentView])

  // 🔥 파일 전환 추적 (AI 지침은 유지)
  useEffect(() => {
    const currentSourceId = selectedSources[0]?.id || null

    // 파일이 변경되었는지 확인 (로깅만)
    if (previousSourceId !== null && currentSourceId !== previousSourceId) {
      console.log('[App.jsx] 🔄 파일 전환 감지 (AI 지침 유지)')
      console.log('[App.jsx] 이전 파일 ID:', previousSourceId)
      console.log('[App.jsx] 새 파일 ID:', currentSourceId)

      // ✅ AI 지침은 초기화하지 않음 (사용자 설정 유지)
    }

    // 현재 파일 ID 저장
    setPreviousSourceId(currentSourceId)
  }, [selectedSources[0]?.id])

  // 선택된 소스 ID 변경 시 자동 저장
  useEffect(() => {
    if (currentNotebook && currentView === 'chat') {
      updateNotebookSelectedSourceIds(currentNotebook.id, selectedSourceIds, currentUserId)
    }
  }, [selectedSourceIds, currentNotebook, currentView, currentUserId])

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

  // 채팅 이력 업데이트 및 동기화 (ChatInterface → DataPreview + Supabase)
  const handleChatUpdate = useCallback(async (messages) => {
    // 🔥 중요: 모든 메타데이터(citations, sources 등)를 유지하며 정규화
    const formattedHistory = messages.map(msg => ({
      ...msg,
      role: msg.type === 'user' ? 'user' : (msg.role || 'assistant')
    }))

    setChatHistory(formattedHistory)
    setLastSyncTime(new Date().toISOString())

    // 🔥 디바운스 처리: 메시지 자동 저장 (500ms 대기)
    if (currentNotebook) {
      if (saveMessagesTimerRef.current) {
        clearTimeout(saveMessagesTimerRef.current)
      }

      saveMessagesTimerRef.current = setTimeout(async () => {
        try {
          // 개별 테이블(messages)과 노트북 데이터 모두 업데이트
          await updateNotebookMessages(currentNotebook.id, formattedHistory, currentUserId)
          console.log('[App] 메시지 자동 저장 완료:', formattedHistory.length, '개')
        } catch (error) {
          console.error('[App] 메시지 저장 실패:', error)
        }
      }, 500)
    }
  }, [currentNotebook, currentUserId])

  // 분석된 소스 ID 업데이트 (ChatInterface → IndexedDB)
  const handleAnalyzedSourcesUpdate = useCallback((newAnalyzedIds) => {
    console.log('[App] 분석된 소스 ID 업데이트:', newAnalyzedIds)
    setAnalyzedSourceIds(newAnalyzedIds)

    // IndexedDB에 자동 저장
    if (currentNotebook) {
      updateNotebookAnalyzedSources(currentNotebook.id, newAnalyzedIds, currentUserId)
        .then(() => console.log('[App] 분석된 소스 ID 저장 완료'))
        .catch(error => console.error('[App] 분석된 소스 ID 저장 실패:', error))
    }
  }, [currentNotebook])

  // 인용 배지 클릭 시 페이지 이동 핸들러
  // 🔥 멀티 파일 지원: (globalPageNumber, sourceId, localPageNumber) 형식으로 호출됨
  const handlePageClick = useCallback((pageNumber, sourceId = null, localPage = null) => {
    console.log('═══════════════════════════════════════════════════════')
    console.log('[App.jsx] 🔵 인용 배지 클릭 감지!')
    console.log('[App.jsx] 전역 페이지:', pageNumber)
    console.log('[App.jsx] 전달받은 sourceId:', sourceId)
    console.log('[App.jsx] 전달받은 localPage:', localPage)
    console.log('[App.jsx] 현재 우측 패널 모드:', rightPanelState.mode)
    console.log('[App.jsx] AI 설정 패널 열림 상태:', isSettingsPanelOpen)

    // 🔥 멀티 파일 지원: sourceId로 직접 파일 찾기 (더 정확함)
    let targetFile = selectedSources[0]
    let localPageNumber = localPage || pageNumber

    if (sourceId) {
      // sourceId가 제공된 경우 해당 파일을 직접 찾기
      const foundFile = selectedSources.find(s => s.id === sourceId)
      if (foundFile) {
        targetFile = foundFile
        console.log(`[App.jsx] ✅ sourceId로 파일 찾음: ${foundFile.name}`)
      } else {
        console.warn(`[App.jsx] ⚠️ sourceId(${sourceId})에 해당하는 파일을 찾지 못함!`)
      }
    } else if (selectedSources.length > 1) {
      // sourceId가 없으면 기존 페이지 범위 계산 방식 사용 (하위 호환성)
      let cumulativePageOffset = 0
      for (const source of selectedSources) {
        const pageCount = source.parsedData?.pageCount || source.parsedData?.pageTexts?.length || 0
        const startPage = cumulativePageOffset + 1
        const endPage = cumulativePageOffset + pageCount

        if (pageNumber >= startPage && pageNumber <= endPage) {
          targetFile = source
          localPageNumber = pageNumber - cumulativePageOffset
          console.log(`[App.jsx] ✅ 페이지 범위로 파일 찾음: ${source.name}, 로컬 페이지: ${localPageNumber}`)
          break
        }

        cumulativePageOffset = endPage
      }
    }

    // 선택된 파일의 파일 타입 확인
    const fileType = targetFile?.parsedData?.fileType
    console.log('[App.jsx] 파일 타입:', fileType)
    console.log('[App.jsx] 대상 파일:', targetFile?.name)
    console.log('[App.jsx] 대상 파일 ID:', targetFile?.id)
    console.log('[App.jsx] 최종 로컬 페이지 번호:', localPageNumber)
    console.log('═══════════════════════════════════════════════════════')

    // 🌐 웹 검색 소스인 경우 - 텍스트 미리보기 모드(페이지 네비게이션 지원)로 표시
    if (fileType === 'web' || targetFile?.type === 'web' || targetFile?.parsedData?.fileType === 'web') {
      console.log('[App.jsx] 🌐 웹 소스 인용 클릭 - 텍스트 미리보기 모드 또는 유튜브 이동')

      // 우측 패널이 닫혀있으면 자동으로 열기
      if (!isSettingsPanelOpen) {
        console.log('[App.jsx] ✅ 우측 패널 자동 열기')
        setIsSettingsPanelOpen(true)
      }

      // 유튜브 영상인 경우 시간 이동 로직으로 토스
      const isYouTube = targetFile?.url?.includes('youtube.com') || targetFile?.url?.includes('youtu.be') ||
        targetFile?.parsedData?.url?.includes('youtube.com') || targetFile?.parsedData?.url?.includes('youtu.be')

      if (isYouTube) {
        // localPageNumber를 청크 ID로 전달
        handleTimeClick(localPageNumber.toString(), sourceId)
        return
      }

      setRightPanelState({
        mode: 'text-preview', // 페이지 네비게이션이 가능한 텍스트 뷰어 모드 사용
        highlightSectionIndex: localPageNumber,
        targetFile: targetFile
      })

      setTargetPage(localPageNumber)

      setTimeout(() => {
        setTargetPage(null)
      }, 500)

      return
    }

    // PDF가 아닌 일반 텍스트 파일일 경우 (Word, Excel, TXT, JSON 등) - 텍스트 미리보기 표시
    if (fileType !== 'pdf') {
      console.log('[App.jsx] 📄 텍스트 파일 인용 클릭 - 우측 패널에 텍스트 표시. 파일 타입:', fileType)

      // 우측 패널이 닫혀있으면 자동으로 열기
      if (!isSettingsPanelOpen) {
        console.log('[App.jsx] ✅ 우측 패널 자동 열기')
        setIsSettingsPanelOpen(true)
      }

      setRightPanelState({
        mode: 'text-preview',
        highlightSectionIndex: localPageNumber,
        targetFile: targetFile
      })

      setTargetPage(localPageNumber)
      console.log('[App.jsx] ✅ 우측 패널 → 텍스트 뷰어 모드, 섹션', localPageNumber, '으로 스크롤')

      setTimeout(() => {
        setTargetPage(null)
      }, 500)

      return
    }

    // 0️⃣ 설정 패널이 닫혀있으면 자동으로 열기
    if (!isSettingsPanelOpen) {
      console.log('[App.jsx] ✅ AI 설정 패널 자동 열기')
      setIsSettingsPanelOpen(true)
    }

    // 1️⃣ 즉시 PDF 뷰어 모드로 전환 (강제) - 로컬 페이지 번호 사용
    // 🔥 targetFile 전달로 파일 스위칭 지원
    setRightPanelState({ mode: 'pdf', pdfPage: localPageNumber, targetFile: targetFile })
    console.log('[App.jsx] ✅ 우측 패널 모드 → PDF 뷰어로 전환 (파일:', targetFile?.name, ', 로컬 페이지:', localPageNumber, ')')

    // 2️⃣ targetPage 설정 (DataPreview가 감지하여 스크롤 실행) - 로컬 페이지 번호 사용
    setTargetPage(localPageNumber)
    console.log('[App.jsx] ✅ targetPage 설정:', localPageNumber)

    // 3️⃣ targetPage 리셋 (다음 클릭을 위해)
    setTimeout(() => {
      setTargetPage(null)
      console.log('[App.jsx] 🔄 targetPage 리셋 완료')
    }, 500)
  }, [selectedSources, rightPanelState.mode, isSettingsPanelOpen])

  // 시간 인용 클릭 핸들러
  const handleTimeClick = useCallback((time, sourceId) => {
    console.log('[App.jsx] 🕒 시간 인용 클릭:', time, '소스 ID:', sourceId)

    // 대상 파일 찾기
    const targetFile = selectedSources.find(s => s.id === sourceId) || selectedSources[0]

    // 우측 패널이 닫혀있으면 자동으로 열기
    if (!isSettingsPanelOpen) {
      setIsSettingsPanelOpen(true)
    }

    // 아티클 모드(또는 유튜브 뷰어)로 전환
    setRightPanelState({
      mode: 'article',
      targetFile: targetFile
    })

    // 대상 시간 설정
    setTargetTime(time)

    // 리셋
    setTimeout(() => {
      setTargetTime(null)
    }, 500)
  }, [selectedSources, isSettingsPanelOpen])


  // 공통 레이아웃 (헤더 포함)
  if (!user) {
    return (
      <LoginPage
        onLoginSuccess={async (userData) => {
          setUser(userData)

          // 데모 계정 데이터 강제 초기화 (사용자 요청)
          const isDemoAccount = userData.email === 'ms.kang@gptko.co.kr' ||
            userData.email === 'ms.kang2@gptko.co.kr' ||
            userData.email === 'cort53@naver.com';

          if (isDemoAccount) {
            console.log('[App] 데모 계정 로컬 데이터 초기화 수행');
            await localClearAllNotebooks();
          }

          setCurrentView('chat-ai')
          window.history.pushState({ view: 'chat-ai' }, '', '#chat-ai')
        }}
        language={language}
        onNotification={showNotification}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top Header - Premium Dark Navigation Bar */}
      <div className="h-16 bg-[#121212] border-b border-white/5 flex items-center px-6 flex-shrink-0 z-50">
        {/* Left: Logo (Occupies left third) */}
        <div className="flex-1 flex justify-start">
          <div className="flex items-center group cursor-pointer" onClick={handleBackToDashboard}>
            {/* Custom Stylized Symbol from Image (Reduced size for better balance) */}
            <div className="mr-3 flex items-center">
              <svg width="30" height="22" viewBox="0 0 42 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* 1. Left Circle */}
                <circle cx="8" cy="22" r="5" fill="white" fillOpacity="0.95" />

                {/* 2. Middle Diagonal Pill */}
                <path d="M12.5 25.5C11.5 24.5 11.5 22.8 12.5 21.8L22.5 10.8C23.5 9.8 25.2 9.8 26.2 10.8L28.2 12.8C29.2 13.8 29.2 15.5 28.2 16.5L18.2 27.5C17.2 28.5 15.5 28.5 14.5 27.5L12.5 25.5Z" fill="white" />

                {/* 3. Right Vertical Pill */}
                <path d="M31 24V8C31 4.7 33.7 2 37 2C40.3 2 43 4.7 43 8V24C43 27.3 40.3 30 37 30C33.7 30 31 27.3 31 24Z" fill="white" />
              </svg>
            </div>
            <span className="text-white font-bold text-[20px] tracking-tight leading-none">Agent Hub</span>
          </div>
        </div>

        {/* Center: Navigation (Centered in the bar) */}
        <div className="hidden lg:flex items-center space-x-1">
          <button
            onClick={() => {
              setCurrentView('chat-ai')
              window.history.pushState({ view: 'chat-ai' }, '', '#chat-ai')
            }}
            className={`px-5 py-2 text-[14px] font-bold transition-all rounded-xl hover:bg-white/5 ${currentView === 'chat-ai' ? 'bg-[#3B3B3B] text-[#00E5FF] border border-white/5 shadow-sm' : 'text-gray-400 hover:text-white'}`}
          >
            Chat AI
          </button>
          <button
            onClick={handleBackToDashboard}
            className={`px-5 py-2 text-[14px] font-bold transition-all rounded-xl hover:bg-white/5 ${currentView === 'dashboard' || currentView === 'chat' ? 'bg-[#3B3B3B] text-[#00E5FF] border border-white/5 shadow-sm' : 'text-gray-400 hover:text-white'}`}
          >
            Note Chat
          </button>
          <button
            onClick={() => {
              setCurrentView('agents')
              window.history.pushState({ view: 'agents' }, '', '#agents')
            }}
            className={`px-5 py-2 text-[14px] font-bold transition-all rounded-xl hover:bg-white/5 ${currentView === 'agents' || currentView === 'ocr-poc' ? 'bg-[#3B3B3B] text-[#00E5FF] border border-white/5 shadow-sm' : 'text-gray-400 hover:text-white'}`}
          >
            에이전트
          </button>
          <button className="px-5 py-2 text-[14px] font-bold text-gray-400 hover:text-white transition-all rounded-xl hover:bg-white/5">
            크레딧 충전
          </button>
          <button className="px-5 py-2 text-[14px] font-bold text-gray-400 hover:text-white transition-all rounded-xl hover:bg-white/5">
            FAQ
          </button>
          <button className="px-5 py-2 text-[14px] font-bold text-gray-400 hover:text-white transition-all rounded-xl hover:bg-white/5">
            고객지원
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setCurrentView('admin')
                window.history.pushState({ view: 'admin' }, '', '#admin')
              }}
              className={`px-5 py-2 text-[14px] font-bold transition-all rounded-xl ${currentView === 'admin'
                ? 'bg-gray-700 text-white border border-white/10 shadow-lg'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
            >
              {isMasterAdmin ? '관리자' : '회사 관리'}
            </button>
          )}
        </div>

        {/* Right: User Section (Occupies right third) */}
        <div className="flex-1 flex justify-end items-center space-x-5">
          {user ? (
            <>
              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-sm font-bold text-gray-200 leading-none">
                  {user.user_metadata?.full_name || user.email}
                </span>
                <span className="text-[11px] text-gray-500 mt-1 font-medium bg-gray-800/50 px-2 py-0.5 rounded-md">
                  {isAdmin ? (user.email === 'admin@test.com' ? '플랫폼 관리자' : '회사 관리자') : (user.user_metadata?.company ? '회사 사용자' : '일반 사용자')}
                </span>
              </div>

              <div className="flex items-center space-x-2 border-l border-white/10 pl-5">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1A1A1A] hover:bg-[#252525] border border-white/5 text-gray-400 hover:text-white transition-all shadow-sm"
                >
                  <User className="w-5 h-5" />
                </button>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    showNotification('로그아웃', '정상적으로 로그아웃되었습니다.');
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1A1A1A] hover:bg-red-900/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all shadow-sm"
                  title="로그아웃"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              {language === 'ko' ? '로그인 / 가입' : 'Sign In'}
            </button>
          )}
        </div>
      </div>

      {currentView === 'dashboard' ? (
        <div className="flex-1 overflow-y-auto">
          <Dashboard
            onNotebookSelect={handleNotebookSelect}
            showNotification={showNotification}
            onShare={(notebook) => {
              setShareTargetNotebook(notebook)
              setIsShareModalOpen(true)
            }}
            currentUserId={currentUserId}
          />
        </div>
      ) : currentView === 'agents' ? (
        <Agents onExecute={handleAgentExecute} />
      ) : currentView === 'ocr-poc' ? (
        <OCRPoc onBack={() => window.history.back()} />
      ) : currentView === 'chat-ai' ? (
        <ChatAI onBack={() => handleBackToDashboard()} currentUserId={currentUserId} />
      ) : currentView === 'admin' ? (
        <div className="flex-1 overflow-hidden">
          {isMasterAdmin ? <AdminPanel /> : <CompanyAdminPanel companyName={user?.user_metadata?.company} />}
        </div>
      ) : (
        <>
          {/* Sub Header: Notebook Title Bar */}
          <div className="h-11 bg-white border-b border-gray-200 flex items-center px-4 flex-shrink-0 z-40 bg-white/80 backdrop-blur-md">
            <button
              onClick={handleBackToDashboard}
              className="flex items-center space-x-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-all group mr-3"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              <span className="text-[13px] font-medium text-slate-500 group-hover:text-slate-800 transition-colors">
                {language === 'ko' ? '목록으로' : 'Back to List'}
              </span>
            </button>
            <div className="h-4 w-[1px] bg-slate-200 mr-4" />
            <h2 className="text-[15px] font-bold text-slate-700 tracking-tight">
              {currentNotebook?.title || (language === 'ko' ? '새노트' : 'New Notebook')}
            </h2>
          </div>

          {/* Main Content - 반응형 레이아웃 (토글형 우측 패널) */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Panel - Sources (파일 업로드 패널) */}
            <div
              className="border-r border-gray-200 bg-white overflow-hidden transition-all duration-300 ease-in-out"
              style={{ width: isSourcePanelCollapsed ? '64px' : '20%' }}
            >
              <SourcePanel
                sources={sources}
                onAddSources={handleAddSources}
                selectedSourceIds={selectedSourceIds}
                onToggleSource={handleToggleSource}
                onDeleteSource={handleDeleteSource}
                isAddModalOpen={isAddSourceModalOpen}
                onAddModalChange={setIsAddSourceModalOpen}
                isCollapsed={isSourcePanelCollapsed}
                onToggleCollapse={() => setIsSourcePanelCollapsed(!isSourcePanelCollapsed)}
                showNotification={showNotification}
                isReadOnly={isReadOnly}
              />
            </div>

            {/* Center Panel - Chat Interface (동적 너비) */}
            <div
              className="bg-white overflow-hidden border-r border-gray-200 transition-all duration-300 ease-in-out"
              style={{
                width: isSettingsPanelOpen
                  ? (isSourcePanelCollapsed ? 'calc(100% - 64px - 35%)' : '45%')
                  : (isSourcePanelCollapsed ? 'calc(100% - 64px)' : '80%')
              }}
            >
              <ChatInterface
                selectedSources={selectedSources}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                systemPromptOverrides={systemPromptOverrides}
                onChatUpdate={handleChatUpdate}
                onPageClick={handlePageClick}
                onTimeClick={handleTimeClick}
                initialMessages={currentNotebook?.messages || []}
                analyzedSourceIds={analyzedSourceIds}
                onAnalyzedSourcesUpdate={handleAnalyzedSourcesUpdate}
                onOpenAddSource={() => setIsAddSourceModalOpen(true)}
                onTogglePromptModal={() => setIsPromptModalOpen(true)}
                onOpenNotebookSettings={() => setIsNotebookSettingsOpen(true)}
                onOpenShare={() => {
                  setShareTargetNotebook(currentNotebook)
                  setIsShareModalOpen(true)
                }}
                isReadOnly={isReadOnly}
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
                  targetTime={targetTime}
                  onClose={() => setIsSettingsPanelOpen(false)}
                  showNotification={showNotification}
                  isReadOnly={isReadOnly}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* AI 행동 지침 설정 모달 (팝업 형식) - 공유받은 유저는 접근 불가 */}
      {isPromptModalOpen && !isReadOnly && (
        <SystemPromptPanel
          language={language}
          onSystemPromptUpdate={(overrides) => {
            setSystemPromptOverrides(overrides);
            if (overrides.length > 0) {
              showNotification(
                language === 'ko' ? 'AI 지침 적용 완료' : 'AI Guidelines Applied',
                language === 'ko' ? '새로운 지침이 시스템에 반영되었습니다.' : 'New guidelines have been applied to the system.'
              );
            } else {
              showNotification(
                language === 'ko' ? 'AI 지침 초기화' : 'AI Guidelines Reset',
                language === 'ko' ? '지침이 초기 상태로 돌아갔습니다.' : 'Guidelines have been reset to default.',
                'info'
              );
            }
          }}
          currentOverrides={systemPromptOverrides}
          onClose={() => setIsPromptModalOpen(false)}
        />
      )}

      {/* 통합 노트북 관리 모달 (제목 수정 + 공유 설정 + 프롬프트 설정) */}
      <NotebookManageModal
        isOpen={isShareModalOpen || isNotebookSettingsOpen}
        onClose={() => {
          setIsShareModalOpen(false)
          setIsNotebookSettingsOpen(false)
          setShareTargetNotebook(null)
        }}
        notebook={shareTargetNotebook || currentNotebook}
        user={user}
        onSave={async (updatedData) => {
          const targetId = updatedData.id;
          try {
            // 모든 변경 사항을 한 번에 업데이트 (IDB + Cloud)
            const result = await updateNotebookSettings(targetId, {
              title: updatedData.title,
              sharingSettings: updatedData.sharingSettings,
              chatPrompt: updatedData.chatPrompt,
              summaryPrompt: updatedData.summaryPrompt
            }, currentUserId);

            if (result) {
              // 현재 열린 노트북이면 상태 동기화
              if (currentNotebook?.id === targetId) {
                setCurrentNotebook(result);
                // 프롬프트는 로컬 상태에도 반영
                setSystemPromptOverrides([
                  { id: 'chat-prompt', role: 'system', content: result.chatPrompt },
                  { id: 'summary-prompt', role: 'system', content: result.summaryPrompt }
                ]);
              }

              showNotification(
                language === 'ko' ? '설정 저장 완료' : 'Settings Saved',
                language === 'ko' ? '노트북 설정이 모두 업데이트되었습니다.' : 'Notebook settings updated successfully.'
              );
            }
          } catch (e) {
            console.error('[App] 관리 모달 저장 실패:', e);
            showNotification(t('errors.saveFailed'), '', 'error');
          }
        }}
      />

      {/* Auth 모달 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        language={language}
        onNotification={showNotification}
        setUser={setUser}
      />

      {/* 전역 알림 컴포넌트 */}
      <Notification
        isVisible={notification.isVisible}
        message={notification.message}
        subMessage={notification.subMessage}
        type={notification.type}
        language={language}
        onClose={() => setNotification(prev => ({ ...prev, isVisible: false }))}
      />

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
