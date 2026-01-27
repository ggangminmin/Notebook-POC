// NotebookLM 스타일 노트북 데이터 관리 시스템
// IndexedDB 기반 데이터 보존 (대용량 지원)

import * as storage from './storage'

// 노트북에 사용할 Lucide 아이콘 목록 (검증된 아이콘만 사용)
export const NOTEBOOK_ICONS = [
  'FileText', 'BookOpen', 'Folder', 'File',
  'Lightbulb', 'Sparkles', 'Zap', 'Target',
  'Rocket', 'Star', 'Heart', 'Flag', 'Bookmark',
  'PenTool', 'Code', 'Terminal', 'Database', 'Server', 'Cloud',
  'Image', 'Camera', 'Video', 'Music', 'Mic',
  'Globe', 'Map', 'Compass', 'Send',
  'Users', 'User', 'Home',
  'Calendar', 'Clock',
  'TrendingUp', 'BarChart', 'PieChart', 'Activity',
  'Gift', 'Award', 'Box', 'Briefcase', 'Coffee',
  'Cpu', 'Layers', 'Layout', 'Mail', 'MessageSquare',
  'Package', 'Pen', 'Phone', 'Settings', 'Shield',
  'Sun', 'Tag', 'Truck', 'Umbrella', 'Wifi'
]

// 기본 폴백 아이콘
export const DEFAULT_ICON = 'FileText'

// 랜덤 아이콘 선택
export const getRandomIcon = () => {
  const randomIndex = Math.floor(Math.random() * NOTEBOOK_ICONS.length)
  return NOTEBOOK_ICONS[randomIndex]
}

// 노트북 데이터 구조
// {
//   id: string (고유 ID)
//   title: string (노트북 제목, 수정 가능)
//   emoji: string (이모지 아이콘)
//   createdAt: string (ISO 8601 날짜)
//   updatedAt: string (ISO 8601 날짜)
//   sources: Array<{id, name, parsedData}> (첨부된 파일 목록)
//   messages: Array<{id, type, content, timestamp, ...}> (채팅 메시지 내역)
//   selectedModel: string (선택된 AI 모델)
//   systemPromptOverrides: Array (사용자 정의 AI 지침)
//   analyzedSourceIds: Array<string> (이미 분석한 파일 ID 목록)
// }

// 더미 데이터 생성 (초기 6개 노트북)
const generateDummyNotebooks = () => {
  return [
    {
      id: 'notebook-1',
      title: 'AI Agent Lab Presentation Blueprint',
      emoji: '🤖',
      createdAt: new Date(2026, 0, 6).toISOString(),
      updatedAt: new Date(2026, 0, 6).toISOString(),
      sources: [],
      messages: [],
      selectedModel: 'thinking',
      systemPromptOverrides: [],
      analyzedSourceIds: []
    },
    {
      id: 'notebook-2',
      title: 'Smart Solutions for One-Person Household',
      emoji: '🍎',
      createdAt: new Date(2026, 0, 7).toISOString(),
      updatedAt: new Date(2026, 0, 7).toISOString(),
      sources: [],
      messages: [],
      selectedModel: 'instant',
      systemPromptOverrides: [],
      analyzedSourceIds: []
    },
    {
      id: 'notebook-3',
      title: 'Sam Altman and the Frontier of the AI Revolution',
      emoji: '🚀',
      createdAt: new Date(2026, 0, 6).toISOString(),
      updatedAt: new Date(2026, 0, 6).toISOString(),
      sources: [],
      messages: [],
      selectedModel: 'thinking',
      systemPromptOverrides: [],
      analyzedSourceIds: []
    },
    {
      id: 'notebook-4',
      title: 'Resonance of Gratitude: A Pillar in the Heart',
      emoji: '🌅',
      createdAt: new Date(2026, 0, 5).toISOString(),
      updatedAt: new Date(2026, 0, 5).toISOString(),
      sources: [],
      messages: [],
      selectedModel: 'gemini',
      systemPromptOverrides: [],
      analyzedSourceIds: []
    },
    {
      id: 'notebook-5',
      title: 'AI Agent Hub Interface for Blog Content Creation',
      emoji: '🤖',
      createdAt: new Date(2026, 0, 5).toISOString(),
      updatedAt: new Date(2026, 0, 5).toISOString(),
      sources: [],
      messages: [],
      selectedModel: 'instant',
      systemPromptOverrides: [],
      analyzedSourceIds: []
    },
    {
      id: 'notebook-6',
      title: 'DMP A-Bidding Keyword Management',
      emoji: '📊',
      createdAt: new Date(2025, 11, 30).toISOString(),
      updatedAt: new Date(2025, 11, 30).toISOString(),
      sources: [],
      messages: [],
      selectedModel: 'thinking',
      systemPromptOverrides: [],
      analyzedSourceIds: []
    }
  ]
}

// 초기화 플래그
let initialized = false

// IndexedDB 초기화 (최초 실행 시 더미 데이터 생성)
const initializeDB = async () => {
  if (initialized) return

  try {
    // IndexedDB에서 노트북 확인
    const notebooks = await storage.getAllNotebooks()

    // 데이터가 없으면 더미 데이터 생성
    if (notebooks.length === 0) {
      console.log('[notebookManager] 초기 더미 데이터 생성')
      const dummyData = generateDummyNotebooks()
      for (const notebook of dummyData) {
        await storage.saveNotebook(notebook)
      }
    }

    initialized = true
    console.log('[notebookManager] 초기화 완료')
  } catch (error) {
    console.error('[notebookManager] 초기화 실패:', error)
  }
}

// IndexedDB에서 모든 노트북 불러오기
export const getAllNotebooks = () => {
  // 동기 함수로 유지하기 위해 초기화와 분리
  // 실제 데이터는 비동기로 로드되지만, 호출자는 동기적으로 처리
  return storage.getAllNotebooks().catch(error => {
    console.error('[notebookManager] 노트북 불러오기 실패:', error)
    return []
  })
}

// 특정 노트북 불러오기 (ID 기반)
export const getNotebookById = (id) => {
  return storage.getNotebookById(id).catch(error => {
    console.error('[notebookManager] 노트북 조회 실패:', error)
    return null
  })
}

// 중복 제목 방지를 위한 고유 제목 생성
export const generateUniqueTitle = async (baseTitle = '새 노트북') => {
  const notebooks = await storage.getAllNotebooks()
  const existingTitles = notebooks.map(nb => nb.title)

  // 기본 제목이 중복되지 않으면 그대로 반환
  if (!existingTitles.includes(baseTitle)) {
    return baseTitle
  }

  // 중복되면 숫자를 붙여서 고유한 제목 생성
  let counter = 1
  let newTitle = `${baseTitle}(${counter})`

  while (existingTitles.includes(newTitle)) {
    counter++
    newTitle = `${baseTitle}(${counter})`
  }

  return newTitle
}

// 새 노트북 생성
export const createNotebook = async (title = '새 노트북', icon = null) => {
  // 중복 제목 방지
  const uniqueTitle = await generateUniqueTitle(title)

  // 아이콘이 지정되지 않으면 랜덤 선택
  const notebookIcon = icon || getRandomIcon()

  const newNotebook = {
    id: `notebook-${Date.now()}`,
    title: uniqueTitle,
    icon: notebookIcon, // emoji 대신 icon 필드 사용
    emoji: notebookIcon, // 호환성을 위해 emoji도 유지
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sources: [],
    messages: [],
    selectedModel: 'instant', // 기본값: GPT Instant (빠른 응답)
    systemPromptOverrides: [],
    analyzedSourceIds: []
  }

  await storage.saveNotebook(newNotebook)
  console.log('[notebookManager] 새 노트북 생성:', newNotebook.id, '제목:', uniqueTitle, '아이콘:', notebookIcon)
  return newNotebook
}

// 노트북 업데이트 (전체 데이터 덮어쓰기)
export const updateNotebook = async (id, updates) => {
  try {
    const notebook = await storage.getNotebookById(id)

    if (!notebook) {
      console.error('[notebookManager] 노트북을 찾을 수 없음:', id)
      return null
    }

    const updatedNotebook = {
      ...notebook,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    await storage.saveNotebook(updatedNotebook)
    console.log('[notebookManager] 노트북 업데이트:', id)
    return updatedNotebook
  } catch (error) {
    console.error('[notebookManager] 노트북 업데이트 실패:', error)
    return null
  }
}

// 노트북 제목 수정
export const updateNotebookTitle = (id, newTitle) => {
  return updateNotebook(id, { title: newTitle })
}

// 노트북 이모지 변경
export const updateNotebookEmoji = (id, newEmoji) => {
  return updateNotebook(id, { emoji: newEmoji })
}

// 노트북 아이콘 변경
export const updateNotebookIcon = (id, newIcon) => {
  return updateNotebook(id, { icon: newIcon, emoji: newIcon })
}

// 노트북의 소스 업데이트 (파일 추가/제거)
export const updateNotebookSources = (id, sources) => {
  return updateNotebook(id, { sources })
}

// 노트북의 메시지 업데이트 (채팅 내역)
export const updateNotebookMessages = (id, messages) => {
  return updateNotebook(id, { messages })
}

// 노트북의 AI 모델 업데이트
export const updateNotebookModel = (id, selectedModel) => {
  return updateNotebook(id, { selectedModel })
}

// 노트북의 시스템 프롬프트 업데이트
export const updateNotebookSystemPrompt = (id, systemPromptOverrides) => {
  return updateNotebook(id, { systemPromptOverrides })
}

// 노트북의 분석된 소스 ID 업데이트
export const updateNotebookAnalyzedSources = (id, analyzedSourceIds) => updateNotebook(id, { analyzedSourceIds })

// 노트북의 선택된 소스 ID 업데이트
export const updateNotebookSelectedSourceIds = (id, selectedSourceIds) => updateNotebook(id, { selectedSourceIds })

// 노트북 삭제
export const deleteNotebook = async (id) => {
  await storage.deleteNotebook(id)
  console.log('[notebookManager] 노트북 삭제:', id)
  return true
}

// 노트북 정렬 (최신순)
export const sortNotebooksByDate = (notebooks) => {
  return [...notebooks].sort((a, b) => {
    return new Date(b.updatedAt) - new Date(a.updatedAt)
  })
}

// 노트북 검색 (제목 기반)
export const searchNotebooks = async (query) => {
  const notebooks = await getAllNotebooks()
  if (!query || query.trim() === '') return notebooks

  const lowerQuery = query.toLowerCase()
  return notebooks.filter(nb =>
    nb.title.toLowerCase().includes(lowerQuery)
  )
}

// 전체 데이터 초기화 (개발용)
export const resetAllNotebooks = async () => {
  await storage.clearAllNotebooks()
  const dummyData = generateDummyNotebooks()
  for (const notebook of dummyData) {
    await storage.saveNotebook(notebook)
  }
  console.log('[notebookManager] 전체 데이터 초기화 완료')
  return dummyData
}

// 날짜 포맷팅 (예: 2026. 1. 7.)
export const formatDate = (isoString) => {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}. ${month}. ${day}.`
}

// 노트북 데이터 검증 (마이그레이션용)
export const validateNotebookData = (notebook) => {
  const required = ['id', 'title', 'emoji', 'createdAt', 'updatedAt', 'sources', 'messages']
  for (const key of required) {
    if (!(key in notebook)) {
      console.warn(`[notebookManager] 필수 필드 누락: ${key}`)
      return false
    }
  }
  return true
}

// 앱 시작 시 자동 초기화
initializeDB()
